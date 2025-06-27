// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "https://deno.land/x/zod@v3.23.4/mod.ts";

// --- Supabase Client Initialization & Env Vars ---
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error("Supabase URL, Service Role Key, or Anon Key is missing.");
}

// --- Zod Schemas (ensure column names match DB: e.g., assigned_by_id) ---
const taskStatusEnum = z.enum(["backlog", "pending", "in_progress", "completed", "cancelled"]);
const taskPriorityEnum = z.enum(["low", "medium", "high"]);

const taskValidationSchema = z.object({
  title: z.string().min(1, "O título é obrigatório."),
  description: z.string().optional().nullable(),
  assigned_by_id: z.string().uuid("ID de quem atribuiu deve ser um UUID válido."), // Assuming UUID from auth.users
  assigned_to_id: z.string().uuid("ID do atribuído deve ser um UUID válido.").optional().nullable(), // Can be unassigned
  due_date: z.preprocess((arg) => { // Changed to due_date
    if (typeof arg === "string" || arg instanceof Date) return new Date(arg); // Allow ISO string or Date object
    return arg; // Pass through null/undefined
  }, z.date().optional().nullable().transform(d => d?.toISOString())), // Store as ISO string
  priority: taskPriorityEnum.default("medium"),
  status: taskStatusEnum.default("pending"),
  related_lead_id: z.number().int().positive("ID do lead relacionado inválido.").optional().nullable(), // Assuming integer ID for leads
  // Supabase auto-generates id, created_at, updated_at
});
type InsertTask = z.infer<typeof taskValidationSchema>;
type Task = InsertTask & { id: number; created_at: string; updated_at: string; assigned_to_name?: string; assigned_by_name?: string; comments?: any[] };


const taskCommentValidationSchema = z.object({
  task_id: z.number().int().positive("ID da tarefa inválido."),
  user_id: z.string().uuid("ID do usuário deve ser um UUID válido."), // From auth.users.id
  content: z.string().min(1, "O conteúdo do comentário é obrigatório."),
});
type InsertTaskComment = z.infer<typeof taskCommentValidationSchema>;
type TaskComment = InsertTaskComment & { id: number; created_at: string; user_name?: string; };


// --- Helper to add user names (fetches from 'profiles' table, assumes 'username' column) ---
// This is more robust if user IDs are UUIDs from auth.users and profiles table links to it.
async function addUserDetailsToTasks(supabase: SupabaseClient, tasks: Partial<Task>[]) {
  if (!tasks || tasks.length === 0) return [];

  const userIds = new Set<string>(); // Assuming UUIDs for user IDs
  tasks.forEach(task => {
    if (task.assigned_to_id) userIds.add(task.assigned_to_id);
    if (task.assigned_by_id) userIds.add(task.assigned_by_id);
  });

  if (userIds.size === 0) return tasks.map(t => ({...t, assigned_to_name: 'N/A', assigned_by_name: 'N/A'}));

  // Fetch from 'profiles' table which should link to auth.users.id (UUID)
  const { data: profiles, error } = await supabase
    .from('profiles') // Ensure this table exists and 'id' is UUID linked to auth.users
    .select('id, username') // 'username' or 'full_name'
    .in('id', Array.from(userIds));

  if (error) {
    console.error("Error fetching user profiles for tasks:", error.message);
    return tasks.map(t => ({...t, assigned_to_name: 'Erro', assigned_by_name: 'Erro'}));
  }

  const profileMap = new Map(profiles?.map(p => [p.id, p.username]));

  return tasks.map(task => ({
    ...task,
    assigned_to_name: profileMap.get(task.assigned_to_id!) || 'Desconhecido',
    assigned_by_name: profileMap.get(task.assigned_by_id!) || 'Desconhecido',
  }));
}

// --- Request Handler ---
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  const { data: { user }, error: authError } = await userSupabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401, headers });
  }

  const { data: userProfile, error: profileError } = await adminSupabaseClient
      .from('profiles') // Ensure 'profiles' table and 'role' column
      .select('role')
      .eq('id', user.id)
      .single();

  if (profileError && profileError.code !== 'PGRST116') {
      console.error("Error fetching user profile for task function:", profileError.message);
      return new Response(JSON.stringify({ error: "Erro ao buscar perfil do usuário." }), { status: 500, headers });
  }
  const userRole = userProfile?.role || 'user';


  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(part => part);
  const actionOrId = pathParts[3]; // Task ID, or 'assigned-to', 'status', 'comments'
  const subActionOrId = pathParts[4]; // User ID, status value, comment ID, or 'comments' for task comments
  const commentIdForDelete = pathParts[5]; // Actual comment ID if actionOrId is 'comments' and subActionOrId is an ID

  console.log("Task Function Request:", req.method, url.pathname, "Action/ID:", actionOrId, "SubAction/ID:", subActionOrId);

  try {
    // --- GET all tasks (paginated, with filters) ---
    if (req.method === 'GET' && !actionOrId) {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '25');
      const statusFilter = url.searchParams.get('status');
      const assignedToFilter = url.searchParams.get('assigned_to_id'); // Expects UUID
      const offset = (page - 1) * limit;

      let query = adminSupabaseClient.from('tasks').select('*', { count: 'exact' }).range(offset, offset + limit -1);
      if (statusFilter) query = query.eq('status', statusFilter);
      if (assignedToFilter) query = query.eq('assigned_to_id', assignedToFilter);
      // Add more sort options as needed: .order('due_date', { ascending: true, nullsFirst: false })

      const { data, error, count } = await query;
      if (error) throw error;
      const tasksWithDetails = await addUserDetailsToTasks(adminSupabaseClient, data as Partial<Task>[] || []);
      return new Response(JSON.stringify({ data: tasksWithDetails, meta: { total: count, page, limit } }), { headers, status: 200 });
    }

    // --- GET tasks by assigned_to_id/:userId --- (Simplified, covered by above)
    // --- GET tasks by status/:status --- (Simplified, covered by above)

    // --- POST create task ---
    if (req.method === 'POST' && !actionOrId) {
      const body = await req.json();
      // Ensure assigned_by_id is the current authenticated user
      const payload = { ...body, assigned_by_id: user.id };
      const validationResult = taskValidationSchema.safeParse(payload);
      if (!validationResult.success) {
        return new Response(JSON.stringify({ error: "Dados da tarefa inválidos.", details: validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ') }), { status: 400, headers });
      }
      const { data: newTask, error } = await adminSupabaseClient.from('tasks').insert(validationResult.data).select().single();
      if (error) throw error;
      const taskWithDetailsArray = await addUserDetailsToTasks(adminSupabaseClient, [newTask as Partial<Task>]);
      return new Response(JSON.stringify({ data: taskWithDetailsArray[0] }), { headers, status: 201 });
    }

    // Operations requiring a task ID (integer)
    if (actionOrId && !isNaN(parseInt(actionOrId)) && subActionOrId !== 'comments') {
      const taskId = parseInt(actionOrId);

      // --- GET task by ID (with comments and user details) ---
      if (req.method === 'GET') {
        const { data: task, error } = await adminSupabaseClient.from('tasks').select('*').eq('id', taskId).single();
        if (error) {
            if(error.code === 'PGRST116') return new Response(JSON.stringify({ error: "Tarefa não encontrada." }), { status: 404, headers });
            throw error;
        }

        const { data: commentsData, error: commentsError } = await adminSupabaseClient
            .from('task_comments')
            .select('*, profile:profiles(username)') // Join with profiles for username
            .eq('task_id', taskId)
            .order('created_at', { ascending: true });
        if(commentsError) console.error("Error fetching comments for task:", taskId, commentsError.message);

        const [taskWithUserDetails] = await addUserDetailsToTasks(adminSupabaseClient, [task as Partial<Task>]);
        taskWithUserDetails.comments = commentsData?.map((c: any) => ({
            ...c,
            user_name: c.profile?.username || 'Desconhecido' // Use profile.username
        })) || [];
        return new Response(JSON.stringify({ data: taskWithUserDetails }), { headers, status: 200 });
      }

      // --- PATCH update task ---
      if (req.method === 'PATCH') {
        const body = await req.json();
        const validationResult = taskValidationSchema.partial().safeParse(body); // Use partial for updates
        if (!validationResult.success) {
          return new Response(JSON.stringify({ error: "Dados de atualização da tarefa inválidos.", details: validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ') }), { status: 400, headers });
        }
        const { data: updatedTask, error } = await adminSupabaseClient.from('tasks').update(validationResult.data).eq('id', taskId).select().single();
        if (error) {
            if(error.code === 'PGRST116') return new Response(JSON.stringify({ error: "Tarefa não encontrada para atualizar." }), { status: 404, headers });
            throw error;
        }
        const [updatedTaskWithDetails] = await addUserDetailsToTasks(adminSupabaseClient, [updatedTask as Partial<Task>]);
        return new Response(JSON.stringify({ data: updatedTaskWithDetails }), { headers, status: 200 });
      }

      // --- DELETE task ---
      if (req.method === 'DELETE') {
        if (userRole !== 'admin') { // Only admins can delete tasks directly
            return new Response(JSON.stringify({ error: "Acesso negado. Somente administradores podem excluir tarefas." }), { status: 403, headers });
        }
        // DB constraint 'ON DELETE CASCADE' for task_comments.task_id is preferred.
        // If not, delete comments explicitly:
        // await adminSupabaseClient.from('task_comments').delete().eq('task_id', taskId);

        const { error, count } = await adminSupabaseClient.from('tasks').delete({count: 'exact'}).eq('id', taskId);
        if (error) throw error;
        if (count === 0) return new Response(JSON.stringify({ error: "Tarefa não encontrada para excluir." }), { status: 404, headers });
        return new Response(null, { status: 204, headers }); // No content
      }
    }

    // --- POST add task comment --- path: /task-functions/<taskId>/comments
    if (actionOrId && !isNaN(parseInt(actionOrId)) && subActionOrId === 'comments' && req.method === 'POST') {
        const taskId = parseInt(actionOrId);
        const body = await req.json();
        const payload = { ...body, task_id: taskId, user_id: user.id }; // Authenticated user is the author
        const validationResult = taskCommentValidationSchema.safeParse(payload);

        if (!validationResult.success) {
            return new Response(JSON.stringify({ error: "Dados de comentário inválidos.", details: validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ') }), { status: 400, headers });
        }
        const { data: newCommentData, error } = await adminSupabaseClient.from('task_comments').insert(validationResult.data).select('*, profile:profiles(username)').single();
        if (error) throw error;

        const newComment: TaskComment = {
            ...(newCommentData as any), // Cast to any to access profile
            user_name: newCommentData.profile?.username || 'Desconhecido'
        };
        delete (newComment as any).profile; // Clean up joined profile object

        return new Response(JSON.stringify({ data: newComment }), { headers, status: 201 });
    }

    // --- DELETE task comment --- path: /task-functions/comments/<commentId> (Note: different base path)
    if (actionOrId === 'comments' && subActionOrId && !isNaN(parseInt(subActionOrId)) && req.method === 'DELETE') {
        const commentId = parseInt(subActionOrId);
        // Add permission check: only comment owner or admin can delete
        const { data: commentToDelete, error: fetchError } = await adminSupabaseClient.from('task_comments').select('user_id').eq('id', commentId).single();
        if (fetchError || !commentToDelete) return new Response(JSON.stringify({ error: "Comentário não encontrado." }), { status: 404, headers });

        if (commentToDelete.user_id !== user.id && userRole !== 'admin') {
            return new Response(JSON.stringify({ error: "Acesso negado para excluir este comentário." }), { status: 403, headers });
        }

        const { error, count } = await adminSupabaseClient.from('task_comments').delete({count: 'exact'}).eq('id', commentId);
        if (error) throw error;
        if (count === 0) return new Response(JSON.stringify({ error: "Comentário não encontrado para excluir." }), { status: 404, headers });
        return new Response(null, { status: 204, headers }); // No content
    }

    return new Response(JSON.stringify({ error: "Rota de tarefa não encontrada ou método não permitido." }), { status: 404, headers });

  } catch (error) {
    console.error('Erro na função Task:', error.message, error.stack);
    const errorMessage = error instanceof z.ZodError ? error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ') : error.message;
    return new Response(JSON.stringify({ error: errorMessage || "Erro interno do servidor de tarefas." }), { status: 500, headers });
  }
});

/*
Table Dependencies:
- `tasks`: (id, title, description, assignedById, assignedToId, dueDate, priority, status, relatedLeadId, createdAt, updatedAt)
- `task_comments`: (id, taskId, userId, content, createdAt, updatedAt)
- `users` (or `profiles`): (id, username) - for fetching user names. Ensure RLS allows service role to read this.

Invocation Examples:

GET all tasks:
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/task-functions' \
  --header 'Authorization: Bearer YOUR_USER_JWT'

POST create task:
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/task-functions' \
  --header 'Authorization: Bearer YOUR_USER_JWT' \
  --header 'Content-Type: application/json' \
  --data '{"title":"New Task", "assignedById": 1, "assignedToId": 2, "description":"Details"}'

GET task by ID 1:
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/task-functions/1' \
  --header 'Authorization: Bearer YOUR_USER_JWT'

PATCH update task ID 1:
curl -i --location --request PATCH 'http://127.0.0.1:54321/functions/v1/task-functions/1' \
  --header 'Authorization: Bearer YOUR_USER_JWT' \
  --header 'Content-Type: application/json' \
  --data '{"status":"completed"}'

DELETE task ID 1 (requires admin role):
curl -i --location --request DELETE 'http://127.0.0.1:54321/functions/v1/task-functions/1' \
  --header 'Authorization: Bearer ADMIN_USER_JWT'

GET tasks assigned to user ID 2:
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/task-functions/assigned-to/2' \
  --header 'Authorization: Bearer YOUR_USER_JWT'

GET tasks with status "pending":
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/task-functions/status/pending' \
  --header 'Authorization: Bearer YOUR_USER_JWT'

POST add comment to task ID 1:
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/task-functions/1/comments' \
  --header 'Authorization: Bearer YOUR_USER_JWT' \
  --header 'Content-Type: application/json' \
  --data '{"content":"This is a comment"}' # userId will be taken from authenticated user

DELETE comment ID 5:
curl -i --location --request DELETE 'http://127.0.0.1:54321/functions/v1/task-functions/comments/5' \
  --header 'Authorization: Bearer YOUR_USER_JWT' # Or admin for any comment
*/
