// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2'
import { z, ZodError } from "https://deno.land/x/zod@v3.23.4/mod.ts";

// --- Supabase Client Initialization & Env Vars ---
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // For admin operations
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error("Supabase URL, Service Role Key, or Anon Key is missing.");
}

// --- Zod Schema for User Creation (ensure roles match your system) ---
const userRoleEnum = z.enum(["admin", "marketing", "comercial", "trainer", "user"], { // Added 'user' as a general role
    errorMap: () => ({ message: "Perfil inválido. Valores permitidos: admin, marketing, comercial, trainer, user." })
});

const createUserSchema = z.object({
  email: z.string().email("Formato de email inválido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."), // Increased min length
  role: userRoleEnum,
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres."),
  fullName: z.string().min(1, "Nome completo é obrigatório.").optional(),
});
type CreateUserPayload = z.infer<typeof createUserSchema>;

const updateUserSchema = z.object({ // For updating existing users (e.g. role, metadata)
    email: z.string().email("Formato de email inválido.").optional(),
    role: userRoleEnum.optional(),
    username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres.").optional(),
    fullName: z.string().min(1, "Nome completo deve ter pelo menos 1 caractere.").optional(),
    // Password updates should be handled by a separate, more secure flow (e.g., user-initiated password reset)
});
type UpdateUserPayload = z.infer<typeof updateUserSchema>;


// --- Request Handler ---
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const headers = { 
    "Content-Type": "application/json",
    ...corsHeaders
  };
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return new Response(JSON.stringify({ error: "Configuração do servidor incompleta." }), { status: 503, headers });
  }

  const adminSupabaseClient = createClient(supabaseUrl, serviceRoleKey);
  const userSupabaseClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } }
  });

  const { data: { user: callingUser }, error: authError } = await userSupabaseClient.auth.getUser();

  if (authError || !callingUser) {
    return new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401, headers });
  }

  let callingUserRole = 'user'; // Default role
  const { data: profile, error: profileError } = await adminSupabaseClient
    .from('profiles') // Ensure 'profiles' table exists with required columns
    .select('role, username, full_name')
    .eq('id', callingUser.id) // 'id' in profiles references auth.users.id (UUID)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error("Error fetching calling user's role:", profileError.message);
    // Potentially return 500 if role check is critical
  }
  if (profile) {
    callingUserRole = profile.role;
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(part => part);
  const targetUserId = pathParts[3]; // Potential user ID (UUID) for GET (one), PATCH, DELETE

  try {
    // --- GET all users (admin only, paginated) ---
    if (req.method === 'GET' && !targetUserId) {
      if (callingUserRole !== 'admin') {
        return new Response(JSON.stringify({ error: "Acesso negado. Somente administradores podem listar usuários." }), { status: 403, headers });
      }
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const { data, error } = await adminSupabaseClient.auth.admin.listUsers({ page, perPage: limit });

      if (error) throw error;

      // Enrich with profile data (role, username)
      const userIds = data.users.map(u => u.id);
      let profilesMap = new Map();
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await adminSupabaseClient
            .from('profiles')
            .select('id, role, username, full_name')
            .in('id', userIds);
        if (profilesError) console.warn("Could not fetch all profiles for user list:", profilesError.message);
        else profilesData?.forEach(p => profilesMap.set(p.id, p));
      }

      const enrichedUsers = data.users.map(u => {
        const userProfile = profilesMap.get(u.id);
        return {
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            role: userProfile?.role || u.user_metadata?.role || 'N/A', // Prefer profile role, then metadata
            username: userProfile?.username || u.user_metadata?.username || u.email?.split('@')[0],
            fullName: userProfile?.full_name || u.user_metadata?.fullName || null,
            // Add other relevant fields from Supabase user object or profile
        };
      });

      return new Response(JSON.stringify({ data: enrichedUsers, meta: { total: data.users.length, page, limit } }), { headers, status: 200 });
    }

    // --- GET specific user by ID (admin only) ---
    if (req.method === 'GET' && targetUserId) {
        if (callingUserRole !== 'admin') {
            return new Response(JSON.stringify({ error: "Acesso negado." }), { status: 403, headers });
        }
        const { data: { user: targetUserDetails } , error } = await adminSupabaseClient.auth.admin.getUserById(targetUserId);
        if (error) {
            if (error.message.includes("User not found")) return new Response(JSON.stringify({ error: "Usuário não encontrado." }), { status: 404, headers });
            throw error;
        }
        // Enrich with profile
        const { data: targetProfile } = await adminSupabaseClient
          .from('profiles')
          .select('role, username, full_name')
          .eq('id', targetUserId)
          .single();
        const responseUser = {
            ...targetUserDetails,
            role: targetProfile?.role || targetUserDetails.user_metadata?.role,
            username: targetProfile?.username || targetUserDetails.user_metadata?.username,
            fullName: targetProfile?.full_name || targetUserDetails.user_metadata?.fullName,
        };
        return new Response(JSON.stringify({ data: responseUser }), { headers, status: 200 });
    }


    // --- POST create user (admin only) ---
    if (req.method === 'POST' && !targetUserId) {
      if (callingUserRole !== 'admin') {
        return new Response(JSON.stringify({ error: "Acesso negado. Somente administradores podem criar usuários." }), { status: 403, headers });
      }
      const body = await req.json();
      const validationResult = createUserSchema.safeParse(body);
      if (!validationResult.success) {
        return new Response(JSON.stringify({ error: "Dados de criação de usuário inválidos.", details: validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ') }), { status: 400, headers });
      }
      const { email, password, role, username, fullName } = validationResult.data;

      const { data: { user: newUser }, error: createAuthUserError } = await adminSupabaseClient.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm for simplicity; set to false for email verification flow
        user_metadata: { role, username, fullName } // Store role and other metadata
      });

      if (createAuthUserError) {
        if (createAuthUserError.message.includes("User already registered") || createAuthUserError.message.includes("already exists")) {
             return new Response(JSON.stringify({ error: "Usuário já existe com este email." }), { status: 409, headers }); // 409 Conflict
        }
        throw createAuthUserError;
      }
      if (!newUser) throw new Error("Falha ao criar usuário no Supabase Auth.");

      // Create corresponding entry in 'profiles' table
      const { error: createProfileError } = await adminSupabaseClient
        .from('profiles')
        .insert({
          id: newUser.id, // References auth.users.id (UUID) directly - no FK constraint to users table
          username: username || email.split('@')[0],
          role: role,
          full_name: fullName || null, // Using snake_case for database column
          // Add other fields from your profiles table schema
        });

      if (createProfileError) {
        console.error("Erro ao criar perfil, limpando usuário do Auth:", createProfileError.message);
        // Attempt to rollback Auth user creation
        try {
          await adminSupabaseClient.auth.admin.deleteUser(newUser.id);
        } catch (rollbackError) {
          console.error("Falha ao fazer rollback do usuário Auth:", rollbackError);
        }
        throw new Error(`Falha ao criar perfil do usuário: ${createProfileError.message}`);
      }

      const safeNewUserResponse = { 
        id: newUser.id, 
        email: newUser.email, 
        role, 
        username: username || email.split('@')[0],
        fullName: fullName || null
      };
      return new Response(JSON.stringify({ data: safeNewUserResponse }), { headers, status: 201 });
    }

    // --- PATCH update user (admin only) ---
    if (req.method === 'PATCH' && targetUserId) {
        if (callingUserRole !== 'admin') {
            return new Response(JSON.stringify({ error: "Acesso negado. Somente administradores podem atualizar usuários." }), { status: 403, headers });
        }
        const body = await req.json();
        const validationResult = updateUserSchema.safeParse(body);
        if(!validationResult.success) {
            return new Response(JSON.stringify({ error: "Dados de atualização inválidos.", details: validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ') }), { status: 400, headers });
        }
        const { role, username, fullName, email: newEmail } = validationResult.data;

        // Update Auth user (email, metadata)
        const authUpdatePayload: any = { user_metadata: {} };
        if (newEmail) authUpdatePayload.email = newEmail;
        if (role) authUpdatePayload.user_metadata.role = role;
        if (username) authUpdatePayload.user_metadata.username = username;
        if (fullName !== undefined) authUpdatePayload.user_metadata.fullName = fullName;
        // Note: Supabase admin.updateUserById does not allow direct password change.

        const { data: { user: updatedAuthUser }, error: updateAuthError } = await adminSupabaseClient.auth.admin.updateUserById(targetUserId, authUpdatePayload);
        if (updateAuthError) {
            if (updateAuthError.message.includes("User not found")) return new Response(JSON.stringify({ error: "Usuário não encontrado para atualizar." }), { status: 404, headers });
            throw updateAuthError;
        }

        // Update profiles table
        const profileUpdatePayload: any = {};
        if (role) profileUpdatePayload.role = role;
        if (username) profileUpdatePayload.username = username;
        if (fullName !== undefined) profileUpdatePayload.full_name = fullName; // Using snake_case for database column

        if (Object.keys(profileUpdatePayload).length > 0) {
            const { error: updateProfileError } = await adminSupabaseClient.from('profiles').update(profileUpdatePayload).eq('id', targetUserId);
            if (updateProfileError) console.warn(`Falha ao atualizar perfil para usuário ${targetUserId}: ${updateProfileError.message}`); // Log but don't fail if auth update succeeded
        }
        const safeUpdatedUser = {id: updatedAuthUser!.id, email: updatedAuthUser!.email, ...updatedAuthUser!.user_metadata};
        return new Response(JSON.stringify({data: safeUpdatedUser}), { headers, status: 200 });
    }


    // --- DELETE user (admin only) ---
    if (req.method === 'DELETE' && targetUserId) {
      if (callingUserRole !== 'admin') {
        return new Response(JSON.stringify({ error: "Acesso negado. Somente administradores podem excluir usuários." }), { status: 403, headers });
      }
      if (targetUserId === callingUser.id) {
        return new Response(JSON.stringify({ error: "Não é possível excluir o próprio usuário." }), { status: 400, headers });
      }

      // FK constraint `profiles.id REFERENCES auth.users.id ON DELETE CASCADE` is ideal.
      // If not, delete from 'profiles' first or ensure it handles missing auth user.
      const { error: deleteProfileError } = await adminSupabaseClient
        .from('profiles')
        .delete()
        .eq('id', targetUserId);
      if (deleteProfileError && deleteProfileError.code !== 'PGRST116') { // PGRST116: no rows found, fine.
          console.warn(`Problema ao excluir perfil para usuário ${targetUserId} (pode já ter sido excluído ou não existir): ${deleteProfileError.message}`);
      }

      const { error: deleteAuthUserError } = await adminSupabaseClient.auth.admin.deleteUser(targetUserId);
      if (deleteAuthUserError) {
        if (deleteAuthUserError.message.includes("User not found")) {
            return new Response(JSON.stringify({ error: "Usuário do Auth não encontrado." }), { status: 404, headers });
        }
        throw deleteAuthUserError; // Other critical error
      }

      return new Response(JSON.stringify({ data: { message: "Usuário excluído com sucesso." } }), { headers, status: 200 });
    }

    return new Response(JSON.stringify({ error: "Rota de gerenciamento de usuário não encontrada ou método não permitido." }), { status: 404, headers });

  } catch (error) {
    console.error('Erro na função User Management:', error.message, error.stack);
    const errorMessage = error instanceof z.ZodError ? error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ') : error.message;
    return new Response(JSON.stringify({ error: errorMessage || "Erro interno do servidor." }), { status: 500, headers });
  }
});

/*
Table Dependencies:
- `auth.users` (managed by Supabase Auth)
- `profiles` (public user profile table):
  - `id` (UUID, primary key, references auth.users.id conceptually - no FK constraint)
  - `username` (TEXT, nullable, unique)
  - `full_name` (TEXT, nullable) - using snake_case for database column
  - `role` (TEXT, default 'user', e.g., 'admin', 'user', 'marketing', 'comercial', 'trainer')
  - `updated_at` (TIMESTAMP, default now()) - using snake_case for database column
  - Any other public profile information.

Note: The profiles.id field should match auth.users.id but there's no database-level 
foreign key constraint to avoid issues with Supabase Auth user management.
Database columns use snake_case convention while JavaScript objects use camelCase.

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
