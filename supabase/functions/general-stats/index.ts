// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Supabase Client Initialization ---
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// --- Types (simplified for stats) ---
interface Lead {
  id: number;
  status: string;
  source: string;
  state: string;
  campaign: string;
  entryDate: string | Date; // Keep as string or Date from DB
}

interface Student {
  id: number;
  // other student fields if needed for specific stats
}

interface Session {
  id: number;
  status: string; // e.g., 'Agendado', 'Concluído'
  studentId: number;
}


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

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ message: "Método não permitido" }), { status: 405 });
  }

  try {
    // Fetch all necessary data in parallel
    const [leadsResponse, studentsResponse, sessionsResponse] = await Promise.all([
      adminSupabaseClient.from<Lead>('leads').select('id, status, source, state, campaign, entryDate'),
      adminSupabaseClient.from<Student>('students').select('id', { count: 'exact' }), // Only need count for totalStudents
      adminSupabaseClient.from<Session>('sessions').select('id, status, studentId')
    ]);

    if (leadsResponse.error) throw leadsResponse.error;
    if (studentsResponse.error) throw studentsResponse.error;
    if (sessionsResponse.error) throw sessionsResponse.error;

    const allLeads: Lead[] = leadsResponse.data || [];
    const totalStudents: number = studentsResponse.count || 0;
    const allSessions: Session[] = sessionsResponse.data || [];

    // Calculate conversion rate
    const conversionRate = allLeads.length > 0 ? (totalStudents / allLeads.length) * 100 : 0;

    // Calculate monthly growth (based on lead entryDate)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    let leadsLastMonth = 0;
    allLeads.forEach(lead => {
      const entryD = new Date(lead.entryDate);
      if (entryD >= oneMonthAgo) {
        leadsLastMonth++;
      }
    });
    const leadsBeforeLastMonth = allLeads.length - leadsLastMonth;
    const monthlyGrowth = leadsBeforeLastMonth > 0
      ? ((leadsLastMonth - leadsBeforeLastMonth) / leadsBeforeLastMonth) * 100
      : (leadsLastMonth > 0 ? 100 : 0);
      // Simplified: if no leads before, any new lead is 100% growth. If also no new leads, 0%.

    // Aggregate leads by source, state, campaign
    const leadsBySource = allLeads.reduce((acc, lead) => {
      const source = lead.source || 'Desconhecido';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const leadsByState = allLeads.reduce((acc, lead) => {
      const state = lead.state || 'Desconhecido';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const leadsByCampaign = allLeads.reduce((acc, lead) => {
      const campaign = lead.campaign || 'Nenhuma';
      acc[campaign] = (acc[campaign] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate session stats
    const totalActiveSessions = allSessions.filter(s => s.status === 'Agendado' || s.status === 'agendado').length; // case-insensitive if needed
    const totalCompletedSessions = allSessions.filter(s => s.status === 'Concluído' || s.status === 'concluido').length;
    const sessionsPerStudent = totalStudents > 0
      ? ((totalActiveSessions + totalCompletedSessions) / totalStudents)
      : 0;

    const stats = {
      totalLeads: allLeads.length,
      totalStudents,
      totalActiveSessions,
      totalCompletedSessions,
      sessionsPerStudent: sessionsPerStudent.toFixed(1),
      conversionRate: conversionRate.toFixed(1),
      monthlyGrowth: monthlyGrowth.toFixed(1),
      leadsBySource,
      leadsByState,
      leadsByCampaign,
      totalLeadsByCampaign: Object.values(leadsByCampaign).reduce((a, b) => a + b, 0)
    };

    return new Response(JSON.stringify(stats), { headers: { "Content-Type": "application/json" }, status: 200 });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return new Response(JSON.stringify({ message: error.message || "Erro ao buscar estatísticas" }), { status: 500 });
  }
});

/*
Table Dependencies:
- `leads`: (id, status, source, state, campaign, entryDate)
- `students`: (id) - primarily for counting total students.
- `sessions`: (id, status, studentId) - for session-related stats.

Invocation Example:
GET general statistics:
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/general-stats' \
  --header 'Authorization: Bearer YOUR_USER_JWT'
*/
