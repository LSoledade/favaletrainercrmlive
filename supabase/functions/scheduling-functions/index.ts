// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Supabase Client Initialization ---
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // Use service role for admin-level data access

// --- Types (consider sharing from a common module in a real project) ---
interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  entryDate: string | Date; // Keep as string or Date from DB, convert to ISO string for response
  state?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface Student {
  id: number;
  leadId: number;
  source: string;
  address?: string;
  preferences?: string;
  active: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  lead?: Lead; // For detailed student view
}

interface Trainer {
  id: number;
  name: string;
  specialty?: string; // Assuming it's a single string, adjust if it's an array
  email: string;
  phone?: string;
  active: boolean;
  bio?: string;
  imageUrl?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface Session {
  id: number;
  studentId: number;
  trainerId: number;
  source: string;
  startTime: string | Date;
  endTime: string | Date;
  status: string;
  location?: string;
  notes?: string | null;
  googleEventId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  // For detailed view
  studentName?: string;
  trainerName?: string;
  feedback?: string | null;
}

// Helper to convert dates to ISO strings for JSON response
const toISODateString = (date: string | Date | undefined | null): string | null => {
  if (!date) return null;
  if (date instanceof Date) return date.toISOString();
  try {
    return new Date(date).toISOString();
  } catch (e) {
    return date.toString(); // Fallback if not a valid date string already
  }
};


// --- Request Handler ---
Deno.serve(async (req) => {
  const adminSupabaseClient = createClient(supabaseUrl, serviceRoleKey);
  const userSupabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } }
  });

  const { data: { user } } = await userSupabaseClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ message: "Não autenticado" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const { pathname, searchParams } = new URL(req.url);
  // Path format: /functions/v1/scheduling-functions/sessions | /trainers | /students
  // Or with sub-actions: /scheduling-functions/sessions/details | /sessions/range etc.
  const pathParts = pathname.split('/').filter(part => part);
  const mainEntity = pathParts[3]; // 'sessions', 'trainers', 'students'
  const subAction = pathParts[4]; // 'details', 'range', 'active' or undefined

  console.log("Scheduling Request:", req.method, pathname, "Entity:", mainEntity, "SubAction:", subAction);

  try {
    // --- SESSIONS ---
    if (mainEntity === 'sessions') {
      if (req.method === 'GET') {
        if (subAction === 'details') {
          const { data: sessions, error } = await adminSupabaseClient
            .from('sessions')
            .select(`
              *,
              student:students (
                id,
                lead:leads (name, email, phone)
              ),
              trainer:trainers (name)
            `);
          if (error) throw error;

          const detailedSessions = sessions?.map((s: any) => ({
            ...s,
            startTime: toISODateString(s.startTime),
            endTime: toISODateString(s.endTime),
            createdAt: toISODateString(s.createdAt),
            updatedAt: toISODateString(s.updatedAt),
            studentName: s.student?.lead?.name || 'Desconhecido',
            trainerName: s.trainer?.name || 'Desconhecido',
            // feedback: s.status === 'Concluído' ? 'Mock Feedback' : null, // Add actual feedback if stored
          })) || [];
          return new Response(JSON.stringify(detailedSessions), { status: 200 });
        }
        if (subAction === 'range') {
          const startDate = searchParams.get('start') ? new Date(searchParams.get('start')!) : new Date(new Date().setDate(new Date().getDate() - 30));
          const endDate = searchParams.get('end') ? new Date(searchParams.get('end')!) : new Date(new Date().setDate(new Date().getDate() + 30));

          const { data, error } = await adminSupabaseClient
            .from<Session>('sessions')
            .select('*')
            .gte('startTime', startDate.toISOString())
            .lte('startTime', endDate.toISOString());
          if (error) throw error;
           const responseSessions = data?.map(s => ({
            ...s,
            startTime: toISODateString(s.startTime)!,
            endTime: toISODateString(s.endTime)!,
            createdAt: toISODateString(s.createdAt)!,
            updatedAt: toISODateString(s.updatedAt)!,
          })) || [];
          return new Response(JSON.stringify(responseSessions), { status: 200 });
        }
        // Default: Get all sessions (basic)
        const { data, error } = await adminSupabaseClient.from<Session>('sessions').select('*');
        if (error) throw error;
        const responseSessions = data?.map(s => ({
            ...s,
            startTime: toISODateString(s.startTime)!,
            endTime: toISODateString(s.endTime)!,
            createdAt: toISODateString(s.createdAt)!,
            updatedAt: toISODateString(s.updatedAt)!,
        })) || [];
        return new Response(JSON.stringify(responseSessions), { status: 200 });
      }
    }

    // --- TRAINERS ---
    if (mainEntity === 'trainers') {
      if (req.method === 'GET') {
        if (subAction === 'active') {
          const { data, error } = await adminSupabaseClient.from<Trainer>('trainers').select('*').eq('active', true);
          if (error) throw error;
          const responseTrainers = data?.map(t => ({
            ...t,
            createdAt: toISODateString(t.createdAt)!,
            updatedAt: toISODateString(t.updatedAt)!,
          })) || [];
          return new Response(JSON.stringify(responseTrainers), { status: 200 });
        }
        // Default: Get all trainers
        const { data, error } = await adminSupabaseClient.from<Trainer>('trainers').select('*');
        if (error) throw error;
        const responseTrainers = data?.map(t => ({
            ...t,
            createdAt: toISODateString(t.createdAt)!,
            updatedAt: toISODateString(t.updatedAt)!,
        })) || [];
        return new Response(JSON.stringify(responseTrainers), { status: 200 });
      }
    }

    // --- STUDENTS ---
    if (mainEntity === 'students') {
      if (req.method === 'GET') {
        if (subAction === 'details') {
          // Fetch students and join with their lead information
          const { data, error } = await adminSupabaseClient
            .from('students')
            .select(`
              *,
              lead:leads (*)
            `);
          if (error) throw error;
          const responseStudents = data?.map((s: any) => ({
            ...s,
            createdAt: toISODateString(s.createdAt)!,
            updatedAt: toISODateString(s.updatedAt)!,
            lead: s.lead ? {
                ...s.lead,
                entryDate: toISODateString(s.lead.entryDate)!,
                createdAt: toISODateString(s.lead.createdAt)!,
                updatedAt: toISODateString(s.lead.updatedAt)!,
            } : null,
          })) || [];
          return new Response(JSON.stringify(responseStudents), { status: 200 });
        }
        // Default: Get all students (basic)
        const { data, error } = await adminSupabaseClient.from<Student>('students').select('*');
        if (error) throw error;
        const responseStudents = data?.map(s => ({
            ...s,
            createdAt: toISODateString(s.createdAt)!,
            updatedAt: toISODateString(s.updatedAt)!,
        })) || [];
        return new Response(JSON.stringify(responseStudents), { status: 200 });
      }
    }

    return new Response(JSON.stringify({ message: "Rota de agendamento não encontrada ou método não permitido" }), { status: 404 });

  } catch (error) {
    console.error('Erro na função Scheduling:', error);
    return new Response(JSON.stringify({ message: error.message || "Erro interno do servidor de agendamento" }), { status: 500 });
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
