// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Supabase Client Initialization ---
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error("Supabase URL, Service Role Key, or Anon Key is missing from environment variables.");
}

// --- Types (simplified for stats) ---
// Ensure these types align with your actual database schema
interface Lead {
  id: number;
  status: string; // e.g., 'Novo', 'Convertido', 'Perdido'
  source: string; // e.g., 'Website', 'Referência', 'Campanha X'
  state: string;  // e.g., 'SP', 'RJ', 'MG'
  campaign: string; // e.g., 'Natal23', 'Verao24'
  entry_date: string | Date; // Keep as string or Date from DB
}

interface Student {
  id: number;
  // other student fields if needed for specific stats
}

interface Session {
  id: number;
  status: string; // e.g., 'agendado', 'concluído', 'cancelado'
  student_id: number;
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
    return new Response(JSON.stringify({ error: "Configuração do servidor incompleta." }), { status: 503, headers }); // 503 Service Unavailable
  }

  const adminSupabaseClient = createClient(supabaseUrl, serviceRoleKey);
  const userSupabaseClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } }
  });

  const { data: { user } } = await userSupabaseClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: "Método não permitido. Use GET." }), { status: 405, headers });
  }

  try {
    // Fetch all necessary data in parallel
    // Ensure table names 'leads', 'students', 'sessions' are correct.
    const [leadsResponse, studentsResponse, sessionsResponse] = await Promise.all([
      adminSupabaseClient.from('leads').select('id, status, source, state, campaign, entry_date', { count: 'exact' }),
      adminSupabaseClient.from('students').select('id', { count: 'exact' }),
      adminSupabaseClient.from('sessions').select('id, status, student_id', { count: 'exact' })
    ]);

    if (leadsResponse.error) throw new Error(`Erro ao buscar leads: ${leadsResponse.error.message}`);
    if (studentsResponse.error) throw new Error(`Erro ao buscar estudantes: ${studentsResponse.error.message}`);
    if (sessionsResponse.error) throw new Error(`Erro ao buscar sessões: ${sessionsResponse.error.message}`);

    const allLeads: Lead[] = (leadsResponse.data as Lead[]) || [];
    const totalLeads: number = leadsResponse.count || 0;
    const totalStudents: number = studentsResponse.count || 0;
    const allSessions: Session[] = (sessionsResponse.data as Session[]) || [];
    const totalSessions: number = sessionsResponse.count || 0;

    // Calculate conversion rate (students / leads)
    const conversionRate = totalLeads > 0 ? (totalStudents / totalLeads) * 100 : 0;

    // Calculate monthly growth (based on lead entryDate)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    oneMonthAgo.setHours(0, 0, 0, 0); // Normalize to start of the day

    let leadsLastMonthCount = 0;
    allLeads.forEach(lead => {
      const entryD = new Date(lead.entry_date);
      if (entryD >= oneMonthAgo) {
        leadsLastMonthCount++;
      }
    });
    const leadsBeforeLastMonthCount = totalLeads - leadsLastMonthCount;
    // Avoid division by zero; if no leads before, any new lead is 100% growth.
    const monthlyGrowth = leadsBeforeLastMonthCount > 0
      ? ((leadsLastMonthCount - leadsBeforeLastMonthCount) / leadsBeforeLastMonthCount) * 100
      : (leadsLastMonthCount > 0 ? 100 : 0);


    // Aggregate leads by source, state, campaign
    const leadsBySource = allLeads.reduce((acc, lead) => {
      const sourceKey = lead.source || 'Desconhecido';
      acc[sourceKey] = (acc[sourceKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const leadsByState = allLeads.reduce((acc, lead) => {
      const stateKey = lead.state || 'Desconhecido';
      acc[stateKey] = (acc[stateKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const leadsByCampaign = allLeads.reduce((acc, lead) => {
      const campaignKey = lead.campaign || 'Nenhuma';
      acc[campaignKey] = (acc[campaignKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate session stats
    const totalActiveSessions = allSessions.filter(s => s.status && s.status.toLowerCase() === 'agendado').length;
    const totalCompletedSessions = allSessions.filter(s => s.status && s.status.toLowerCase() === 'concluído').length;
    const sessionsPerStudent = totalStudents > 0
      ? (totalSessions / totalStudents) // Using totalSessions for average
      : 0;

    const stats = {
      totalLeads,
      totalStudents,
      totalSessions, // Added total raw sessions count
      totalActiveSessions,
      totalCompletedSessions,
      sessionsPerStudent: parseFloat(sessionsPerStudent.toFixed(1)),
      conversionRate: parseFloat(conversionRate.toFixed(1)),
      monthlyGrowth: parseFloat(monthlyGrowth.toFixed(1)),
      leadsBySource,
      leadsByState,
      leadsByCampaign,
      totalLeadsByCampaign: Object.values(leadsByCampaign).reduce((a, b) => a + b, 0) // Sum of leads grouped by campaign
    };

    return new Response(JSON.stringify({ data: stats }), { headers, status: 200 });

  } catch (error) {
    console.error('Erro ao buscar estatísticas gerais:', error);
    
    // Provide more specific error information
    let errorMessage = "Erro ao buscar estatísticas gerais";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : "Unknown error"
    }), { 
      status: 500, 
      headers 
    });
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
