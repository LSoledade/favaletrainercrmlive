// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "https://deno.land/x/zod@v3.23.4/mod.ts";
import { fromZodError } from "https://deno.land/x/zod_validation_error@v3.0.3/mod.ts";

// --- Supabase Client Initialization ---
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// --- Zod Schemas (replicated from shared/schema.ts for simplicity) ---
const taskValidationSchema = z.object({
  title: z.string().min(1, "O título é obrigatório"),
  description: z.string().optional().nullable(),
  assignedById: z.number().int().positive("ID do usuário que atribuiu a tarefa inválido"),
  assignedToId: z.number().int().positive("ID do usuário atribuído inválido"),
  dueDate: z.preprocess((arg) => {
    if (typeof arg === "string" || arg instanceof Date) return arg;
    if (arg === null || arg === undefined) return arg;
    return undefined;
  }, z.union([
    z.string().transform(val => new Date(val).toISOString()), // Ensure ISO string for DB
    z.date().transform(d => d.toISOString())
  ])).optional().nullable().refine(dateStr => dateStr ? !isNaN(Date.parse(dateStr)) : true, {
    message: "Data de vencimento precisa ser uma data válida ou estar vazia"
  }),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["backlog", "pending", "in_progress", "completed", "cancelled"]).default("pending"),
  relatedLeadId: z.number().int().positive("ID do lead inválido").optional().nullable(),
});
type InsertTask = z.infer<typeof taskValidationSchema>;

const taskCommentValidationSchema = z.object({
  taskId: z.number().int().positive("ID da tarefa inválido"),
  userId: z.number().int().positive("ID do usuário inválido"), // This will be the authenticated user
  content: z.string().min(1, "O conteúdo é obrigatório"),
});
type InsertTaskComment = z.infer<typeof taskCommentValidationSchema>;

// --- Helper to add user names (fetches from 'users' table, assumes 'username' column) ---
async function addUserNamesToTasks(supabase: SupabaseClient, tasks: any[]) {
  if (!tasks || tasks.length === 0) return [];

  const userIds = new Set<number>();
  tasks.forEach(task => {
    if (task.assignedToId) userIds.add(task.assignedToId);
    if (task.assignedById) userIds.add(task.assignedById);
  });

  if (userIds.size === 0) return tasks.map(t => ({...t, assignedToName: 'N/A', assignedByName: 'N/A'}));

  const { data: users, error } = await supabase
    .from('users') // Make sure your public schema has a 'users' table or adjust as needed
    .select('id, username') // Assuming 'username' exists. If using profiles, join with that.
    .in('id', Array.from(userIds));

  if (error) {
    console.error("Error fetching user names:", error);
    return tasks.map(t => ({...t, assignedToName: 'Erro', assignedByName: 'Erro'}));
  }

  const userMap = new Map(users.map(u => [u.id, u.username]));

  return tasks.map(task => ({
    ...task,
    assignedToName: userMap.get(task.assignedToId) || 'Desconhecido',
    assignedByName: userMap.get(task.assignedById) || 'Desconhecido',
  }));
}

// --- Request Handler ---
Deno.serve(async (req) => {
  const adminSupabaseClient = createClient(supabaseUrl, serviceRoleKey);
  const userSupabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } }
  });

  const { data: { user }, error: authError } = await userSupabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ message: "Não autenticado" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  // Fetch user role from your 'users' or 'profiles' table
  const { data: userProfile, error: profileError } = await adminSupabaseClient
      .from('users') // Or 'profiles'
      .select('role')
      .eq('id', user.id) // Assuming your 'users' or 'profiles' table has an 'id' that matches auth.users.id
      .single();

  if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error("Error fetching user profile:", profileError);
      return new Response(JSON.stringify({ message: "Erro ao buscar perfil do usuário." }), { status: 500 });
  }
  const userRole = userProfile?.role || 'user';


  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(part => part);
  // /functions/v1/task-functions/...
  // ... (no id) -> list or create
  // ... /<id> -> get, update, delete task
  // ... /assigned-to/<userId> -> list by assigned to
  // ... /status/<status> -> list by status
  // ... /<id>/comments -> create comment
  // ... /comments/<commentId> -> delete comment

  const actionOrId = pathParts[3];
  const subAction = pathParts[4]; // 'comments' or undefined
  const subActionId = pathParts[5]; // commentId or undefined


  try {
    // --- GET all tasks ---
    if (req.method === 'GET' && !actionOrId) {
      const { data, error } = await adminSupabaseClient.from('tasks').select('*');
      if (error) throw error;
      const tasksWithNames = await addUserNamesToTasks(adminSupabaseClient, data || []);
      return new Response(JSON.stringify(tasksWithNames), { status: 200 });
    }

    // --- GET tasks by assigned-to/:userId ---
    if (req.method === 'GET' && actionOrId === 'assigned-to' && subAction) {
      const userIdParam = parseInt(subAction);
      if (isNaN(userIdParam)) return new Response(JSON.stringify({ message: "ID de usuário inválido" }), { status: 400 });
      const { data, error } = await adminSupabaseClient.from('tasks').select('*').eq('assignedToId', userIdParam);
      if (error) throw error;
      const tasksWithNames = await addUserNamesToTasks(adminSupabaseClient, data || []);
      return new Response(JSON.stringify(tasksWithNames), { status: 200 });
    }

    // --- GET tasks by status/:status ---
    if (req.method === 'GET' && actionOrId === 'status' && subAction) {
      const statusParam = subAction;
      // Add more validation for status if needed
      const { data, error } = await adminSupabaseClient.from('tasks').select('*').eq('status', statusParam);
      if (error) throw error;
      const tasksWithNames = await addUserNamesToTasks(adminSupabaseClient, data || []);
      return new Response(JSON.stringify(tasksWithNames), { status: 200 });
    }

    // --- POST create task ---
    if (req.method === 'POST' && !actionOrId) {
      const body = await req.json();
      const validationResult = taskValidationSchema.safeParse(body);
      if (!validationResult.success) {
        return new Response(JSON.stringify({ message: "Dados inválidos", details: fromZodError(validationResult.error).toString() }), { status: 400 });
      }
      const { data: newTask, error } = await adminSupabaseClient.from('tasks').insert(validationResult.data).select().single();
      if (error) throw error;
      return new Response(JSON.stringify(newTask), { status: 201 });
    }

    // Operations requiring a task ID
    if (actionOrId && !isNaN(parseInt(actionOrId)) && subAction !== 'comments') {
      const taskId = parseInt(actionOrId);

      // --- GET task by ID ---
      if (req.method === 'GET') {
        const { data: task, error } = await adminSupabaseClient.from('tasks').select('*').eq('id', taskId).single();
        if (error) throw error;
        if (!task) return new Response(JSON.stringify({ message: "Tarefa não encontrada" }), { status: 404 });

        const { data: commentsData, error: commentsError } = await adminSupabaseClient
            .from('task_comments')
            .select('*, user:users(username)') // Adjust if your user table/column is different
            .eq('taskId', taskId);
        if(commentsError) console.error("Error fetching comments:", commentsError);

        const taskWithDetailsArray = await addUserNamesToTasks(adminSupabaseClient, [task]);
        const taskWithDetails = taskWithDetailsArray[0];
        taskWithDetails.comments = commentsData?.map((c: any) => ({
            ...c,
            userName: c.user?.username || 'Desconhecido'
        })) || [];
        return new Response(JSON.stringify(taskWithDetails), { status: 200 });
      }

      // --- PATCH update task ---
      if (req.method === 'PATCH') {
        const body = await req.json();
        const validationResult = taskValidationSchema.partial().safeParse(body);
        if (!validationResult.success) {
          return new Response(JSON.stringify({ message: "Dados inválidos", details: fromZodError(validationResult.error).toString() }), { status: 400 });
        }
        const { data: updatedTask, error } = await adminSupabaseClient.from('tasks').update(validationResult.data).eq('id', taskId).select().single();
        if (error) throw error;
        if (!updatedTask) return new Response(JSON.stringify({ message: "Tarefa não encontrada" }), { status: 404 });
        return new Response(JSON.stringify(updatedTask), { status: 200 });
      }

      // --- DELETE task ---
      if (req.method === 'DELETE') {
        if (userRole !== 'admin') {
            return new Response(JSON.stringify({ message: "Acesso negado. Somente administradores podem excluir tarefas." }), { status: 403 });
        }
        // First delete comments associated with the task
        const { error: commentDeleteError } = await adminSupabaseClient.from('task_comments').delete().eq('taskId', taskId);
        if (commentDeleteError) console.warn(`Could not delete comments for task ${taskId}: ${commentDeleteError.message}`);

        const { error, count } = await adminSupabaseClient.from('tasks').delete({count: 'exact'}).eq('id', taskId);
        if (error) throw error;
        if (count === 0) return new Response(JSON.stringify({ message: "Tarefa não encontrada" }), { status: 404 });
        return new Response(null, { status: 204 });
      }
    }

    // --- POST add task comment ---
    // path: /task-functions/<taskId>/comments
    if (actionOrId && !isNaN(parseInt(actionOrId)) && subAction === 'comments' && req.method === 'POST') {
        const taskId = parseInt(actionOrId);
        const body = await req.json();
        const validationResult = taskCommentValidationSchema.safeParse({
            ...body,
            taskId: taskId, // Ensure taskId from URL is used
            userId: user.id  // Use authenticated user's ID
        });

        if (!validationResult.success) {
            return new Response(JSON.stringify({ message: "Dados inválidos para comentário", details: fromZodError(validationResult.error).toString() }), { status: 400 });
        }
        const { data: newComment, error } = await adminSupabaseClient.from('task_comments').insert(validationResult.data).select('*, user:users(username)').single();
        if (error) throw error;

        const commentWithUser = {
            ...newComment,
            userName: newComment.user?.username || 'Desconhecido'
        };
        delete commentWithUser.user; // Clean up joined user object

        return new Response(JSON.stringify(commentWithUser), { status: 201 });
    }

    // --- DELETE task comment ---
    // path: /task-functions/comments/<commentId>
    if (actionOrId === 'comments' && subAction && !isNaN(parseInt(subAction)) && req.method === 'DELETE') {
        const commentId = parseInt(subAction);
        // Optional: Add check if user is admin or owner of the comment
        const { error, count } = await adminSupabaseClient.from('task_comments').delete({count: 'exact'}).eq('id', commentId);
        if (error) throw error;
        if (count === 0) return new Response(JSON.stringify({ message: "Comentário não encontrado" }), { status: 404 });
        return new Response(null, { status: 204 });
    }


    return new Response(JSON.stringify({ message: "Rota de tarefa não encontrada ou método não permitido" }), { status: 404 });

  } catch (error) {
    console.error('Erro na função Task:', error);
    return new Response(JSON.stringify({ message: error.message || "Erro interno do servidor de tarefas" }), { status: 500 });
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
