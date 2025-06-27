// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define the AuditEventType enum (copied from server/audit-log.ts)
// Ensure this enum is consistent with your database schema or application logic
enum AuditEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  USER_CREATED = 'user_created',
  USER_DELETED = 'user_deleted',
  PASSWORD_CHANGED = 'password_changed',
  LEAD_CREATED = 'lead_created',
  LEAD_UPDATED = 'lead_updated',
  LEAD_DELETED = 'lead_deleted',
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_DELETED = 'task_deleted',
  SESSION_CREATED = 'session_created',
  SESSION_UPDATED = 'session_updated',
  SESSION_DELETED = 'session_deleted',
  DATA_EXPORT = 'data_export',
  SETTINGS_CHANGED = 'settings_changed',
  WHATSAPP_CONFIG_CHANGED = 'whatsapp_config_changed',
  WHATSAPP_MESSAGE_SENT = 'whatsapp_message_sent',
  OAUTH_INIT = 'oauth_init',
  OAUTH_SUCCESS = 'oauth_success',
  OAUTH_ERROR = 'oauth_error',
  OAUTH_REVOKE = 'oauth_revoke',
  LEAD_BATCH_IMPORT = 'lead_batch_import',
  LEAD_BATCH_UPDATE = 'lead_batch_update',
  LEAD_BATCH_DELETE = 'lead_batch_delete',
}

interface AuditLogEntry {
  id: number; // Assuming 'id' is the primary key and is a number
  timestamp: string; // Or Date, then convert toISOString() before sending
  type: AuditEventType;
  user_id: string | null; // Changed from userId to match common DB conventions (snake_case)
  username: string | 'anonymous'; // Consider making this nullable or fetching if not directly stored
  ip_address: string | 'unknown'; // Changed from ip to match common DB conventions
  details: any; // JSONB in Postgres
  // Add other relevant fields from your 'audit_logs' table
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY'); // This key is for user-context requests.
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // This key is for admin-level access.

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY environment variables');
  // Consider not serving the function if essential config is missing, or handle gracefully.
}

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

  // Use service_role client for admin-level operations like fetching all audit logs
  const supabaseAdminClient = createClient(supabaseUrl!, serviceRoleKey!);

  // Client for getting calling user's context
  const supabaseUserClient = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } }
  });

  // Check if user is authenticated
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers });
  }

  // Check if user is admin using the admin client to query profiles table
  const { data: userProfile, error: profileError } = await supabaseAdminClient
    .from('profiles') // Ensure this table and 'role' column exist
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Erro ao buscar perfil do usuário:', profileError.message);
    return new Response(JSON.stringify({ error: "Erro ao verificar permissões do usuário." }), { status: 500, headers });
  }
  if (!userProfile || userProfile.role !== 'admin') {
    return new Response(JSON.stringify({ error: "Acesso negado. Requer privilégios de administrador." }), { status: 403, headers });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: "Método não permitido. Use GET." }), { status: 405, headers });
  }

  try {
    const url = new URL(req.url);
    const countParam = url.searchParams.get('count');
    const pageParam = url.searchParams.get('page');
    const typeFilter = url.searchParams.get('type'); // Filter by AuditEventType
    const userIdFilter = url.searchParams.get('userId'); // Filter by user_id

    const limit = countParam ? parseInt(countParam) : 25; // Default to 25 entries
    const page = pageParam ? parseInt(pageParam) : 1;    // Default to page 1
    const offset = (page - 1) * limit;

    let query = supabaseAdminClient
      .from('audit_logs') // Ensure this table name is correct
      .select('*', { count: 'exact' }) // Request total count for pagination
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (typeFilter && Object.values(AuditEventType).includes(typeFilter as AuditEventType)) {
        query = query.eq('type', typeFilter);
    }
    if (userIdFilter) {
        query = query.eq('user_id', userIdFilter);
    }


    const { data: logs, error: dbError, count: totalCount } = await query;

    if (dbError) {
      console.error('Erro ao buscar logs de auditoria do banco:', dbError.message);
      return new Response(JSON.stringify({ error: "Erro ao buscar logs de auditoria." }), { status: 500, headers });
    }

    const responsePayload = {
      data: logs as AuditLogEntry[], // Cast to ensure type, assuming DB schema matches
      meta: {
        currentPage: page,
        perPage: limit,
        totalEntries: totalCount,
        totalPages: totalCount ? Math.ceil(totalCount / limit) : 0,
      }
    };

    return new Response(JSON.stringify(responsePayload), { headers, status: 200 });

  } catch (error) {
    console.error('Erro inesperado na função de logs de auditoria:', error.message);
    return new Response(JSON.stringify({ error: "Erro inesperado no servidor." }), { status: 500, headers });
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/audit-log?count=10' \
    --header 'Authorization: Bearer YOUR_SUPABASE_ANON_KEY' \ // Ideally, use a service role key for admin actions or a user JWT with admin privileges
    --header 'Content-Type: application/json'

  Note: For admin-level access, you'd typically use a service_role key or ensure the calling user has 'admin' privileges.
        The Authorization header should contain the JWT of an authenticated admin user.
        The anon key might not be sufficient if RLS is properly configured for admin access.
*/
