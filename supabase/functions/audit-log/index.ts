// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define the AuditEventType enum (copied from server/audit-log.ts)
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
  OAUTH_REVOKE = 'oauth_revoke'
}

interface AuditLogEntry {
  timestamp: string;
  type: AuditEventType;
  userId: string | 'anonymous';
  username: string | 'anonymous';
  ip: string | 'unknown';
  details: any;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
}


Deno.serve(async (req) => {
  const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } }
  })

  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ message: "Não autenticado" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('profiles') // Assuming you have a 'profiles' table with a 'role' column
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile || userProfile.role !== 'admin') {
    return new Response(JSON.stringify({ message: "Acesso negado" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  try {
    const url = new URL(req.url);
    const countParam = url.searchParams.get('count');
    const count = countParam ? parseInt(countParam) : 100;

    // In Supabase, audit logs are typically stored in a dedicated table or using Postgres' built-in logging.
    // For this example, we'll query a hypothetical 'audit_logs' table.
    // You'll need to create this table and insert log entries into it from your application logic.
    const { data: logs, error } = await supabase
      .from<AuditLogEntry>('audit_logs') // Specify the type here
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(Math.max(1, count));

    if (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      return new Response(JSON.stringify({ message: "Erro ao buscar logs de auditoria" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(logs), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error('Erro inesperado:', error);
    return new Response(JSON.stringify({ message: "Erro inesperado no servidor" }), { status: 500, headers: { "Content-Type": "application/json" } });
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
