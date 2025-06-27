// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "https://deno.land/x/zod@v3.23.4/mod.ts";
import { fromZodError } from "https://deno.land/x/zod_validation_error@v3.0.3/mod.ts";

// --- Supabase Client Initialization ---
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // For admin operations

// --- Zod Schema for User Creation (simplified) ---
const createUserSchema = z.object({
  email: z.string().email("Formato de email inválido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  role: z.enum(["admin", "marketing", "comercial", "trainer"], {
    errorMap: () => ({ message: "Perfil inválido. Valores permitidos: admin, marketing, comercial, trainer." })
  }),
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres.").optional(), // username can be part of user_metadata
});

// --- Request Handler ---
Deno.serve(async (req) => {
  // Use admin client for operations requiring elevated privileges
  const adminSupabaseClient = createClient(supabaseUrl, serviceRoleKey);
  // Use anon key client for user context, passing through Authorization header
  const userSupabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } }
  });

  const { data: { user: callingUser }, error: authError } = await userSupabaseClient.auth.getUser();

  if (authError || !callingUser) {
    return new Response(JSON.stringify({ message: "Não autenticado" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  // Fetch calling user's role from your custom 'users' or 'profiles' table
  // This assumes you have a table (e.g., 'profiles') that stores user roles linked by user.id
  let callingUserRole = 'user'; // Default role
  const { data: profile, error: profileError } = await adminSupabaseClient
    .from('profiles') // Or your custom user table name
    .select('role')
    .eq('id', callingUser.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') { // PGRST116: single row not found
    console.error("Error fetching calling user's role:", profileError.message);
    // Potentially return 500 if role check is critical and fails unexpectedly
  }
  if (profile) {
    callingUserRole = profile.role;
  }


  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(part => part);
  const targetUserId = pathParts[3]; // Potential user ID for DELETE operations

  try {
    // --- GET all users (admin only) ---
    if (req.method === 'GET' && !targetUserId) {
      if (callingUserRole !== 'admin') {
        return new Response(JSON.stringify({ message: "Acesso negado. Somente administradores." }), { status: 403 });
      }
      // Supabase `listUsers` is an admin function.
      const { data: { users }, error } = await adminSupabaseClient.auth.admin.listUsers();
      if (error) throw error;

      // Optionally, enrich with data from your 'profiles' or 'users' table if roles/usernames are there
      const enrichedUsers = await Promise.all(users.map(async (u) => {
        const {data: userProfile, error: profError} = await adminSupabaseClient
            .from('profiles') // or your custom user table
            .select('role, username') // Adjust columns as needed
            .eq('id', u.id)
            .single();
        return {
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            role: profError || !userProfile ? 'N/A' : userProfile.role,
            username: profError || !userProfile ? u.email : userProfile.username, // Fallback username
        };
      }));

      return new Response(JSON.stringify(enrichedUsers), { status: 200 });
    }

    // --- POST create user (admin only) ---
    if (req.method === 'POST' && !targetUserId) {
      if (callingUserRole !== 'admin') {
        return new Response(JSON.stringify({ message: "Acesso negado. Somente administradores." }), { status: 403 });
      }
      const body = await req.json();
      const validationResult = createUserSchema.safeParse(body);
      if (!validationResult.success) {
        return new Response(JSON.stringify({ message: "Dados inválidos", details: fromZodError(validationResult.error).toString() }), { status: 400 });
      }
      const { email, password, role, username } = validationResult.data;

      // Create user in Supabase Auth
      const { data: { user: newUser }, error: createAuthUserError } = await adminSupabaseClient.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email for simplicity, adjust as needed
        user_metadata: { role: role, username: username || email.split('@')[0] } // Store role and username in metadata
      });

      if (createAuthUserError) {
        if (createAuthUserError.message.includes("User already registered")) {
             return new Response(JSON.stringify({ message: "Usuário já existe com este email." }), { status: 409 }); // 409 Conflict
        }
        throw createAuthUserError;
      }
      if (!newUser) throw new Error("Falha ao criar usuário no Auth.");

      // Also create a corresponding entry in your public 'profiles' or 'users' table
      // This is where you typically store public profile information and custom roles.
      const { error: createProfileError } = await adminSupabaseClient
        .from('profiles') // Or your custom user table name
        .insert({
          id: newUser.id, // Link to the auth.users table
          username: username || email.split('@')[0], // Or any other fields
          role: role,
          // Add other fields as necessary
        });

      if (createProfileError) {
        // If profile creation fails, you might want to delete the auth user to keep things consistent
        console.error("Error creating user profile, attempting to clean up auth user:", createProfileError);
        await adminSupabaseClient.auth.admin.deleteUser(newUser.id);
        throw createProfileError;
      }

      // Return only non-sensitive info
      const safeNewUser = { id: newUser.id, email: newUser.email, role: role, username: username || email.split('@')[0] };
      return new Response(JSON.stringify(safeNewUser), { status: 201 });
    }

    // --- DELETE user (admin only) ---
    if (req.method === 'DELETE' && targetUserId) {
      if (callingUserRole !== 'admin') {
        return new Response(JSON.stringify({ message: "Acesso negado. Somente administradores." }), { status: 403 });
      }
      if (targetUserId === callingUser.id) {
        return new Response(JSON.stringify({ message: "Não é possível excluir o próprio usuário." }), { status: 400 });
      }

      // Deleting from auth.users will cascade to your public.profiles if FK is set up with ON DELETE CASCADE
      // Otherwise, delete from public.profiles first or handle potential errors.
      const { error: deleteProfileError } = await adminSupabaseClient
        .from('profiles') // Or your custom user table name
        .delete()
        .eq('id', targetUserId);

      // Log if profile deletion failed but proceed to delete auth user, as that's primary.
      if (deleteProfileError && deleteProfileError.code !== 'PGRST116') { // PGRST116: no rows found, which is fine
          console.warn(`Could not delete profile for user ${targetUserId}: ${deleteProfileError.message}`);
      }

      const { error: deleteAuthUserError } = await adminSupabaseClient.auth.admin.deleteUser(targetUserId);
      if (deleteAuthUserError) {
        if (deleteAuthUserError.message.includes("User not found")) {
            return new Response(JSON.stringify({ message: "Usuário não encontrado." }), { status: 404 });
        }
        throw deleteAuthUserError;
      }

      return new Response(JSON.stringify({ message: "Usuário excluído com sucesso." }), { status: 200 });
    }

    return new Response(JSON.stringify({ message: "Rota de usuário não encontrada ou método não permitido" }), { status: 404 });

  } catch (error) {
    console.error('Erro na função User Management:', error);
    return new Response(JSON.stringify({ message: error.message || "Erro interno do servidor de gerenciamento de usuários" }), { status: 500 });
  }
});

/*
Table Dependencies:
- `auth.users` (managed by Supabase Auth)
- `profiles` (or your custom public user table, e.g., `users`):
  - `id` (UUID or TEXT, primary key, references auth.users.id, ideally with ON DELETE CASCADE)
  - `username` (TEXT)
  - `role` (TEXT, e.g., 'admin', 'user', 'marketing', 'comercial', 'trainer')
  - Any other public profile information.

Invocation Examples:

GET all users (admin only):
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/user-management' \
  --header 'Authorization: Bearer ADMIN_USER_JWT'

POST create user (admin only):
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/user-management' \
  --header 'Authorization: Bearer ADMIN_USER_JWT' \
  --header 'Content-Type: application/json' \
  --data '{"email":"newuser@example.com", "password":"password123", "role":"trainer", "username":"newtrainer"}'

DELETE user by ID (admin only):
curl -i --location --request DELETE 'http://127.0.0.1:54321/functions/v1/user-management/USER_UUID_TO_DELETE' \
  --header 'Authorization: Bearer ADMIN_USER_JWT'
*/
