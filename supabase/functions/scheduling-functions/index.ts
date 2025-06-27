// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Supabase Client Initialization & Env Vars ---
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use service role for admin-level data access
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error("Supabase URL, Service Role Key, or Anon Key is missing from environment variables.");
}

// --- Types (consider sharing from a common module in a real project) ---
// Ensure these types accurately reflect your database schema.
interface Lead {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  // Add other relevant lead fields
}

interface Student {
  id: number;
  lead_id: number; // Assuming snake_case for foreign keys
  // active: boolean; // Example field
  lead?: Lead; // For detailed student view
  // Add other relevant student fields
}

interface Trainer {
  id: number;
  name: string;
  email: string;
  active: boolean;
  // Add other relevant trainer fields
}

interface Session {
  id: number;
  student_id: number; // Assuming snake_case
  trainer_id: number; // Assuming snake_case
  start_time: string | Date; // Use string for ISO dates from DB
  end_time: string | Date;
  status: string; // e.g., 'Agendado', 'Concluído', 'Cancelado'
  google_event_id?: string | null;
  // For detailed view, these will be populated by joins
  student_name?: string;
  trainer_name?: string;
  // Add other relevant session fields like location, notes, feedback
}

// Helper to convert dates to ISO strings for JSON response, ensuring validity
const toValidISOString = (dateInput: string | Date | undefined | null): string | null => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput.toISOString();
  }
  try {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch (e) {
    console.warn(`Could not parse date: ${dateInput}`, e);
    return null; // Or return original string if that's preferred for certain non-standard formats
  }
};


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

  const { data: { user } } = await userSupabaseClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers });
  }

  const { pathname, searchParams } = new URL(req.url);
  const pathParts = pathname.split('/').filter(part => part);
  const mainEntity = pathParts[3]; // 'sessions', 'trainers', 'students'
  const entityIdOrSubAction = pathParts[4]; // ID of entity, or sub-action like 'details', 'range', 'active'
  const furtherAction = pathParts[5]; // Further sub-action if any

  console.log("Scheduling Request:", req.method, pathname, "Entity:", mainEntity, "ID/SubAction:", entityIdOrSubAction);

  try {
    // --- SESSIONS ---
    if (mainEntity === 'sessions') {
      if (req.method === 'GET') {
        if (entityIdOrSubAction === 'details') { // Get all sessions with details
          const { data: sessions, error } = await adminSupabaseClient
            .from('sessions') // Ensure table name is 'sessions'
            .select(`
              id, start_time, end_time, status, google_event_id, notes, location,
              student:students!inner ( id, lead:leads!inner (id, name, email, phone) ),
              trainer:trainers!inner (id, name, email)
            `); // Use !inner to ensure related records exist or filter out
          if (error) throw error;

          const detailedSessions = sessions?.map((s: any) => ({
            id: s.id,
            startTime: toValidISOString(s.start_time),
            endTime: toValidISOString(s.end_time),
            status: s.status,
            googleEventId: s.google_event_id,
            notes: s.notes,
            location: s.location,
            studentId: s.student?.id,
            studentName: s.student?.lead?.name || 'N/A',
            studentEmail: s.student?.lead?.email,
            studentPhone: s.student?.lead?.phone,
            trainerId: s.trainer?.id,
            trainerName: s.trainer?.name || 'N/A',
            trainerEmail: s.trainer?.email,
          })) || [];
          return new Response(JSON.stringify({ data: detailedSessions }), { headers, status: 200 });
        }
        if (entityIdOrSubAction === 'range') { // Get sessions by date range
          const startDateParam = searchParams.get('start');
          const endDateParam = searchParams.get('end');
          if (!startDateParam || !endDateParam) {
            return new Response(JSON.stringify({ error: "Parâmetros 'start' e 'end' são obrigatórios para o range."}), {status: 400, headers});
          }
          const startDate = toValidISOString(startDateParam);
          const endDate = toValidISOString(endDateParam);
          if(!startDate || !endDate){
            return new Response(JSON.stringify({ error: "Formato de data inválido para 'start' ou 'end'."}), {status: 400, headers});
          }

          const { data, error } = await adminSupabaseClient
            .from('sessions') // Cast to Session if type is specific
            .select('*') // Select specific fields if not all are needed
            .gte('start_time', startDate)
            .lte('end_time', endDate); // Consider if 'end_time' or 'start_time' for upper bound
          if (error) throw error;
           const responseSessions = data?.map((s: any) => ({ // Cast s to Session
            ...s,
            start_time: toValidISOString(s.start_time),
            end_time: toValidISOString(s.end_time),
          })) || [];
          return new Response(JSON.stringify({ data: responseSessions }), { headers, status: 200 });
        }
        // Default: Get all sessions (basic, paginated)
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '25');
        const offset = (page - 1) * limit;
        const { data, error, count } = await adminSupabaseClient.from('sessions').select('*', {count: 'exact'}).range(offset, offset + limit -1);
        if (error) throw error;
        const responseSessions = data?.map((s: any) => ({ // Cast s to Session
            ...s,
            start_time: toValidISOString(s.start_time),
            end_time: toValidISOString(s.end_time),
        })) || [];
        return new Response(JSON.stringify({ data: responseSessions, meta: {total: count, page, limit} }), { headers, status: 200 });
      }
      // Add POST, PATCH, DELETE for sessions if needed, with Zod validation
    }

    // --- TRAINERS ---
    if (mainEntity === 'trainers') {
      if (req.method === 'GET') {
        if (entityIdOrSubAction === 'active') {
          const { data, error } = await adminSupabaseClient.from('trainers').select('*').eq('active', true);
          if (error) throw error;
          return new Response(JSON.stringify({ data: data as Trainer[] }), { headers, status: 200 });
        }
        // Default: Get all trainers (paginated)
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '25');
        const offset = (page - 1) * limit;
        const { data, error, count } = await adminSupabaseClient.from('trainers').select('*', {count: 'exact'}).range(offset, offset + limit -1);
        if (error) throw error;
        return new Response(JSON.stringify({ data: data as Trainer[], meta: {total: count, page, limit} }), { headers, status: 200 });
      }
      // Add POST, PATCH, DELETE for trainers if needed
    }

    // --- STUDENTS ---
    if (mainEntity === 'students') {
      if (req.method === 'GET') {
        if (entityIdOrSubAction === 'details') {
          const page = parseInt(searchParams.get('page') || '1');
          const limit = parseInt(searchParams.get('limit') || '25');
          const offset = (page - 1) * limit;
          const { data, error, count } = await adminSupabaseClient
            .from('students')
            .select('*, lead:leads!inner(*)', {count: 'exact'}) // Ensure 'leads' is correct table name
            .range(offset, offset + limit -1);
          if (error) throw error;
          return new Response(JSON.stringify({ data: data as Student[], meta: {total: count, page, limit} }), { headers, status: 200 });
        }
        // Default: Get all students (basic, paginated)
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '25');
        const offset = (page - 1) * limit;
        const { data, error, count } = await adminSupabaseClient.from('students').select('*', {count: 'exact'}).range(offset, offset + limit -1);
        if (error) throw error;
        return new Response(JSON.stringify({ data: data as Student[], meta: {total: count, page, limit} }), { headers, status: 200 });
      }
      // Add POST, PATCH, DELETE for students if needed
    }

    return new Response(JSON.stringify({ error: "Rota de agendamento não encontrada ou método não permitido." }), { status: 404, headers });

  } catch (error) {
    console.error('Erro na função Scheduling:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || "Erro interno do servidor de agendamento." }), { status: 500, headers });
  }
});

/*
Table Dependencies:
- `sessions`: Stores session data.
- `trainers`: Stores trainer data.
- `students`: Stores student data.
- `leads`: Stores lead data (referenced by students).

Make sure these tables exist with appropriate columns and relationships (foreign keys).
`students` table should have a `leadId` column referencing `leads.id`.
`sessions` table should have `studentId` and `trainerId` referencing `students.id` and `trainers.id`.

Invocation Examples:

GET all sessions:
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/scheduling-functions/sessions' \
  --header 'Authorization: Bearer YOUR_USER_JWT'

GET detailed sessions:
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/scheduling-functions/sessions/details' \
  --header 'Authorization: Bearer YOUR_USER_JWT'

GET sessions by date range:
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/scheduling-functions/sessions/range?start=2023-01-01&end=2023-01-31' \
  --header 'Authorization: Bearer YOUR_USER_JWT'

GET all trainers:
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/scheduling-functions/trainers' \
  --header 'Authorization: Bearer YOUR_USER_JWT'

GET active trainers:
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/scheduling-functions/trainers/active' \
  --header 'Authorization: Bearer YOUR_USER_JWT'

GET all students:
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/scheduling-functions/students' \
  --header 'Authorization: Bearer YOUR_USER_JWT'

GET detailed students (with lead info):
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/scheduling-functions/students/details' \
  --header 'Authorization: Bearer YOUR_USER_JWT'
*/
