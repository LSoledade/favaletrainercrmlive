// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "https://deno.land/x/zod@v3.23.4/mod.ts";
import { fromZodError } from "https://deno.land/x/zod_validation_error@v3.0.3/mod.ts";


// --- Supabase Clients & Env Vars ---
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

// --- Evolution API Configuration (from env, these are defaults if not set) ---
const EVOLUTION_API_URL_ENV = Deno.env.get('EVOLUTION_API_URL');
const EVOLUTION_API_TOKEN_ENV = Deno.env.get('EVOLUTION_API_TOKEN');
const EVOLUTION_API_INSTANCE_ENV = Deno.env.get('EVOLUTION_API_INSTANCE') || 'default';
const WHATSAPP_WEBHOOK_VERIFY_TOKEN_ENV = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || 'DEFINE_YOUR_SECURE_TOKEN_IN_ENV';

// --- Types (Simplified) ---
interface Lead { id: number; name: string; phone: string; }
interface WhatsappMessage {
  id?: number;
  leadId: number;
  direction: 'incoming' | 'outgoing';
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  mediaUrl?: string | null;
  mediaType?: string | null;
  messageId?: string | null; // API provider's message ID
  timestamp?: string | Date;
}

interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

// --- Database Interaction Helpers ---
// (These would ideally call other Supabase functions or use PostgREST directly for complex logic)
async function getSupabaseClient(isAdmin = false, authHeader?: string | null) {
  const key = isAdmin ? serviceRoleKey : anonKey;
  const options: any = {};
  if (!isAdmin && authHeader) {
    options.global = { headers: { Authorization: authHeader } };
  }
  return createClient(supabaseUrl, key, options);
}

async function findLeadById(adminClient: SupabaseClient, leadId: number): Promise<Lead | null> {
  const { data, error } = await adminClient.from('leads').select('id, name, phone').eq('id', leadId).single();
  if (error && error.code !== 'PGRST116') console.error("Error finding lead:", error);
  return data;
}
async function findLeadByPhone(adminClient: SupabaseClient, phoneNumber: string): Promise<Lead | null> {
    const normalized = normalizePhone(phoneNumber);
    const { data, error } = await adminClient.from('leads').select('id, name, phone').eq('phone', normalized) // Or use a LIKE query if phone numbers are not consistently formatted
        .or(`phone.like.%${normalized.slice(-9)}`) // Attempt to match last 9 digits
        .limit(1).single();
    if (error && error.code !== 'PGRST116') console.error("Error finding lead by phone:", error);
    return data;
}


async function getWhatsappMessagesForLead(adminClient: SupabaseClient, leadId: number): Promise<WhatsappMessage[]> {
  const { data, error } = await adminClient.from('whatsapp_messages').select('*').eq('leadId', leadId).order('timestamp', { ascending: true });
  if (error) console.error("Error getting messages:", error);
  return data || [];
}
async function getWhatsappMessageByApiId(adminClient: SupabaseClient, apiMessageId: string): Promise<WhatsappMessage | null> {
    const { data, error } = await adminClient.from('whatsapp_messages').select('*').eq('messageId', apiMessageId).single();
    if (error && error.code !== 'PGRST116') console.error("Error getting message by API ID:", error);
    return data;
}
async function createWhatsappMessageInDb(adminClient: SupabaseClient, message: Omit<WhatsappMessage, 'id' | 'timestamp'>): Promise<WhatsappMessage> {
  const { data, error } = await adminClient.from('whatsapp_messages').insert(message).select().single();
  if (error) throw error;
  return data!;
}
async function updateWhatsappMessageStatusInDb(adminClient: SupabaseClient, id: number, status: WhatsappMessage['status']): Promise<WhatsappMessage | null> {
  const { data, error } = await adminClient.from('whatsapp_messages').update({ status }).eq('id', id).select().single();
  if (error) console.error("Error updating status:", error);
  return data;
}
async function updateWhatsappMessageApiIdInDb(adminClient: SupabaseClient, id: number, apiMessageId: string): Promise<WhatsappMessage | null> {
    const { data, error } = await adminClient.from('whatsapp_messages').update({ messageId: apiMessageId }).eq('id', id).select().single();
    if (error) console.error("Error updating API ID:", error);
    return data;
}
async function deleteWhatsappMessageFromDb(adminClient: SupabaseClient, id: number): Promise<{ count: number | null }> {
  const { error, count } = await adminClient.from('whatsapp_messages').delete({count: 'exact'}).eq('id', id);
  if (error) throw error;
  return {count};
}
async function getRecentMessagesPerLeadFromDb(adminClient: SupabaseClient): Promise<Record<number, WhatsappMessage>> {
    // This is a complex query for Edge Functions.
    // A simpler approach might be to fetch all messages and process in code,
    // or use a database function/view.
    // For now, returning empty as direct complex SQL is tricky here.
    console.warn("getRecentMessagesPerLeadFromDb needs a proper DB function or view for efficiency in Edge Functions.");
    const { data, error } = await adminClient.rpc('get_recent_whatsapp_messages_per_lead'); // Assuming a DB function
    if (error) {
        console.error("Error fetching recent messages via RPC:", error);
        return {};
    }
    const messagesByLead: Record<number, WhatsappMessage> = {};
    if (Array.isArray(data)) {
        data.forEach((message: any) => { // Type any because RPC return type is unknown here
            if (message && typeof message.leadId === 'number') {
                messagesByLead[message.leadId] = message as WhatsappMessage;
            }
        });
    }
    return messagesByLead;
}

async function getWhatsappConfigFromDb(adminClient: SupabaseClient): Promise<any> {
    const { data, error } = await adminClient.from('whatsapp_settings').select('*').order('updatedAt', { ascending: false }).limit(1).single();
    if (error && error.code !== 'PGRST116') {
        console.error("Error fetching whatsapp config:", error);
        return { apiUrl: EVOLUTION_API_URL_ENV, apiToken: EVOLUTION_API_TOKEN_ENV, apiInstance: EVOLUTION_API_INSTANCE_ENV };
    }
    return data || { apiUrl: EVOLUTION_API_URL_ENV, apiToken: EVOLUTION_API_TOKEN_ENV, apiInstance: EVOLUTION_API_INSTANCE_ENV };
}
async function saveWhatsappConfigToDb(adminClient: SupabaseClient, config: { apiUrl: string, apiToken?: string, apiInstance: string }): Promise<any> {
    const { data, error } = await adminClient.from('whatsapp_settings').insert(config).select().single(); // Consider upsert
    if (error) throw error;
    return data;
}

// --- Evolution API Interaction ---
function normalizePhone(phone: string | undefined | null): string {
  if (!phone) return '';
  return phone.replace(/[\s\(\)\-\+]/g, '');
}
function formatPhoneNumberForApi(phone: string | undefined | null): string | null {
    if (!phone) return null;
    let cleaned = normalizePhone(phone);
    if (!cleaned.startsWith('55') && cleaned.length <= 11) cleaned = '55' + cleaned;
    return cleaned.length < 10 ? null : cleaned;
}

async function makeEvolutionRequest(config: any, endpoint: string, method = 'GET', body: any = null): Promise<WhatsAppResult> {
  const { apiUrl, apiToken, apiInstance } = config;
  if (!apiUrl || !apiToken) return { success: false, error: "Configuração da Evolution API incompleta." };

  const finalEndpoint = endpoint.replace('{instance}', apiInstance);
  const fullUrl = `${apiUrl}${finalEndpoint}`;

  try {
    const response = await fetch(fullUrl, {
      method,
      headers: { 'Content-Type': 'application/json', 'apikey': apiToken },
      body: body ? JSON.stringify(body) : undefined,
    });
    const responseData = await response.json();
    if (!response.ok) {
      return { success: false, error: responseData.error || responseData.message || `Erro ${response.status}`, details: responseData };
    }
    return { success: true, details: responseData, messageId: responseData.key?.id || responseData.id };
  } catch (e) {
    return { success: false, error: e.message, details: e };
  }
}

// --- Main Handler ---
Deno.serve(async (req: Request) => {
  const adminClient = await getSupabaseClient(true);
  const userClient = await getSupabaseClient(false, req.headers.get('Authorization'));
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(p => p); // ['functions', 'v1', 'whatsapp-manager', ...]
  const mainAction = pathParts[3];
  const param1 = pathParts[4];
  const param2 = pathParts[5];

  // Webhook - No Auth check for these specific paths
  if (mainAction === 'webhook' && req.method === 'POST') {
    const data = await req.json();
    console.log('Webhook POST recebido:', JSON.stringify(data, null, 2));
    // Simplified Meta Webhook Processing (Example for incoming text message)
    if (data?.object === 'whatsapp_business_account' && data?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
        const message = data.entry[0].changes[0].value.messages[0];
        if (message.from && message.id && message.type === 'text') {
            const lead = await findLeadByPhone(adminClient, message.from);
            if (lead) {
                await createWhatsappMessageInDb(adminClient, {
                    leadId: lead.id, direction: 'incoming', content: message.text.body,
                    status: 'received', messageId: message.id, mediaType: 'text'
                });
            }
        }
        return new Response('EVENT_RECEIVED', { status: 200 });
    }
    // Add Evolution API webhook processing if needed
    return new Response(JSON.stringify({ message: "Webhook não processado" }), { status: 200 });
  }
  if (mainAction === 'webhook' && req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === WHATSAPP_WEBHOOK_VERIFY_TOKEN_ENV) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // Authenticated routes below
  const { data: { user: callingUser }, error: authError } = await userClient.auth.getUser();
  if (authError || !callingUser) return new Response(JSON.stringify({ message: "Não autenticado" }), { status: 401 });

  let callingUserRole = 'user';
  const { data: profile } = await adminClient.from('profiles').select('role').eq('id', callingUser.id).single();
  if (profile) callingUserRole = profile.role;


  try {
    const evolutionConfig = await getWhatsappConfigFromDb(adminClient);

    // Config routes (admin only)
    if (mainAction === 'config') {
      if (callingUserRole !== 'admin') return new Response(JSON.stringify({ message: "Acesso negado" }), { status: 403 });
      if (req.method === 'GET') return new Response(JSON.stringify(evolutionConfig), { status: 200 });
      if (req.method === 'POST') {
        const body = await req.json();
        const newConfig = await saveWhatsappConfigToDb(adminClient, {
            apiUrl: body.apiUrl, apiToken: body.apiToken, apiInstance: body.apiInstance || 'default'
        });
        return new Response(JSON.stringify(newConfig), { status: 200 });
      }
    }

    // Status & QR Code
    if (mainAction === 'status' && req.method === 'GET') {
        const result = await makeEvolutionRequest(evolutionConfig, `/instances/instance/${evolutionConfig.apiInstance}`);
        return new Response(JSON.stringify(result), { status: result.success ? 200 : 503 });
    }
    if (mainAction === 'qrcode' && req.method === 'GET') {
        const result = await makeEvolutionRequest(evolutionConfig, `/instances/qrcode/${evolutionConfig.apiInstance}`);
        return new Response(JSON.stringify(result.details), { status: result.success ? 200 : 400 });
    }

    // Send messages
    if (mainAction === 'send' && req.method === 'POST') { // Text
        const { leadId, content } = await req.json();
        const lead = await findLeadById(adminClient, leadId);
        if (!lead) return new Response(JSON.stringify({ message: "Lead não encontrado" }), { status: 404 });
        const phone = formatPhoneNumberForApi(lead.phone);
        if (!phone) return new Response(JSON.stringify({ message: "Número de telefone inválido" }), { status: 400 });

        const dbMsg = await createWhatsappMessageInDb(adminClient, { leadId, direction: 'outgoing', content, status: 'pending' });
        const result = await makeEvolutionRequest(evolutionConfig, `/message/text/${evolutionConfig.apiInstance}`, 'POST', { number: phone, options: { delay: 1200, presence: "composing" }, textMessage: { text: content } });

        if (result.success && result.messageId) await updateWhatsappMessageApiIdInDb(adminClient, dbMsg.id!, result.messageId);
        await updateWhatsappMessageStatusInDb(adminClient, dbMsg.id!, result.success ? 'sent' : 'failed');
        return new Response(JSON.stringify(result), { status: result.success ? 201 : 400 });
    }
    // Add other send types (image, template, document, audio, video) similarly, calling respective Evolution API endpoints

    // Message management
    if (mainAction === 'recent-messages' && req.method === 'GET') {
        const data = await getRecentMessagesPerLeadFromDb(adminClient);
        return new Response(JSON.stringify(data), { status: 200 });
    }
    if (mainAction === 'lead' && param1 && req.method === 'GET') { // Get messages for a lead
        const leadId = parseInt(param1);
        const messages = await getWhatsappMessagesForLead(adminClient, leadId);
        return new Response(JSON.stringify(messages), { status: 200 });
    }
    if (mainAction === 'messages' && param1 && param2 === 'status' && req.method === 'PATCH') { // Update message status
        const messageId = parseInt(param1);
        const { status } = await req.json();
        const updated = await updateWhatsappMessageStatusInDb(adminClient, messageId, status);
        return new Response(JSON.stringify(updated), { status: updated ? 200 : 404 });
    }
    if (mainAction === 'messages' && param1 && req.method === 'DELETE') { // Delete message
        const messageId = parseInt(param1);
        const { count } = await deleteWhatsappMessageFromDb(adminClient, messageId);
        return new Response(null, { status: count ? 204 : 404 });
    }
    if (mainAction === 'message-status' && param1 && req.method === 'GET') { // Check API message status
        const apiMessageId = param1;
        const result = await makeEvolutionRequest(evolutionConfig, `/message/statusMessage/${evolutionConfig.apiInstance}/${apiMessageId}`);
        // Optionally update DB status based on result
        if (result.success && result.details?.status) {
            const dbMessage = await getWhatsappMessageByApiId(adminClient, apiMessageId);
            if (dbMessage) await updateWhatsappMessageStatusInDb(adminClient, dbMessage.id!, result.details.status.toLowerCase());
        }
        return new Response(JSON.stringify(result.details), { status: result.success ? 200 : 400 });
    }

    // Group and Contact Management
    if (mainAction === 'groups' && req.method === 'GET') {
        const result = await makeEvolutionRequest(evolutionConfig, `/group/fetchAllGroups/${evolutionConfig.apiInstance}`);
        return new Response(JSON.stringify(result.details?.groups || []), { status: result.success ? 200 : 400 });
    }
    if (mainAction === 'groups' && req.method === 'POST') {
        const { name, participants } = await req.json();
        const formattedParticipants = participants.map((p: string) => formatPhoneNumberForApi(p)).filter(Boolean);
        const result = await makeEvolutionRequest(evolutionConfig, `/group/create/${evolutionConfig.apiInstance}`, 'POST', {subject: name, participants: formattedParticipants});
        return new Response(JSON.stringify(result.details), { status: result.success ? 201 : 400 });
    }
    if (mainAction === 'contacts' && req.method === 'GET') {
        const result = await makeEvolutionRequest(evolutionConfig, `/contact/get-all/${evolutionConfig.apiInstance}`);
        return new Response(JSON.stringify(result.details?.contacts || []), { status: result.success ? 200 : 400 });
    }


    return new Response(JSON.stringify({ message: "Rota do WhatsApp não encontrada ou método não permitido" }), { status: 404 });
  } catch (error) {
    console.error("Error in WhatsApp Manager function:", error);
    return new Response(JSON.stringify({ message: error.message || "Erro interno do servidor" }), { status: 500 });
  }
});

/*
Environment Variables Needed:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- EVOLUTION_API_URL (optional, defaults in code)
- EVOLUTION_API_TOKEN (optional, defaults in code)
- EVOLUTION_API_INSTANCE (optional, defaults to 'default')
- WHATSAPP_WEBHOOK_VERIFY_TOKEN (for Meta webhook verification)

Database Tables:
- `leads` (id, name, phone)
- `whatsapp_messages` (id, leadId, direction, content, status, mediaUrl, mediaType, messageId, timestamp)
- `whatsapp_settings` (apiUrl, apiToken, apiInstance, updatedAt) - Stores Evolution API config
- `profiles` (id, role) - For checking admin role

Assumes an RPC function `get_recent_whatsapp_messages_per_lead` for `/recent-messages` endpoint.
If not available, that endpoint will return an empty object or error.
*/
