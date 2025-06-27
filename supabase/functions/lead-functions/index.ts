// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "https://deno.land/x/zod@v3.23.4/mod.ts";
import { fromZodError } from "https://deno.land/x/zod_validation_error@v3.0.3/mod.ts";

// --- Replicated Schemas and Utilities ---
// It's better to share these from a common module if possible in a real project
// For simplicity, they are replicated here.

const baseInsertLeadSchema = z.object({
  entryDate: z.union([z.string(), z.date()]).optional(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  state: z.string(),
  campaign: z.string().default("Importação em Lote"),
  tags: z.array(z.string()).default([]),
  source: z.string(), // "Favale" or "Pink"
  status: z.string(), // "Lead" or "Aluno"
  notes: z.string().optional().nullable(),
});

const leadValidationSchema = baseInsertLeadSchema.extend({
  entryDate: z.union([
    z.string().transform(val => {
      try {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
          const [day, month, year] = val.split('/');
          return `${year}-${month}-${day}T00:00:00.000Z`; // Ensure ISO format for DB
        }
        return new Date(val).toISOString();
      } catch (e) {
        return new Date().toISOString(); // Default to now if parsing fails
      }
    }).refine(value => !isNaN(Date.parse(value)), {
      message: "Data de entrada precisa ser uma data válida"
    }),
    z.date().transform(d => d.toISOString())
  ]),
  name: z.string().min(1, "O nome é obrigatório"),
  email: z.string().min(1, "O e-mail é obrigatório").email("E-mail inválido"),
  phone: z.string().min(1, "O telefone é obrigatório"),
  state: z.string().min(1, "O estado é obrigatório"),
  source: z.string().min(1, "A origem é obrigatória"),
  status: z.string().min(1, "O status é obrigatório"),
});

type InsertLead = z.infer<typeof baseInsertLeadSchema>; // Use base for what goes into DB after validation
type Lead = InsertLead & { id: number; createdAt: string; updatedAt: string; };


const normalizePhone = (phone: string | undefined | null): string => {
  if (!phone) return '';
  return phone.replace(/[\s\(\)\-\+]/g, '');
};

enum AuditEventType {
  LEAD_CREATED = 'lead_created',
  LEAD_UPDATED = 'lead_updated',
  LEAD_DELETED = 'lead_deleted',
  LEAD_BATCH_IMPORT = 'lead_batch_import',
  LEAD_BATCH_UPDATE = 'lead_batch_update',
  LEAD_BATCH_DELETE = 'lead_batch_delete',
}

// Helper to log audit events (simplified)
async function logAuditEvent(supabase: SupabaseClient, type: AuditEventType, userId: string, details: any = {}) {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      type,
      user_id: userId, // Ensure your audit_logs table has user_id
      details,
      // username and ip might be harder to get reliably in Edge Functions depending on setup
    });
    if (error) console.error("Error logging audit event:", error);
  } catch (e) {
    console.error("Exception logging audit event:", e);
  }
}


// --- Supabase Client Initialization ---
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;


// --- Request Handler ---
Deno.serve(async (req) => {
  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey);
  const userSupabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } }
  });

  const { data: { user } } = await userSupabaseClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ message: "Não autenticado" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const { pathname, searchParams } = new URL(req.url);
  const pathParts = pathname.split('/').filter(part => part); // e.g., ['functions', 'v1', 'lead-functions', 'batch', 'import']
  const mainRoute = pathParts[3]; // 'lead-functions'
  const action = pathParts[4]; // e.g., 'batch', 'id' or undefined for base
  const subAction = pathParts[5]; // e.g., 'import', 'update', 'delete'

  console.log("Request:", req.method, pathname, "Action:", action, "SubAction:", subAction);


  try {
    // --- BATCH OPERATIONS ---
    if (req.method === 'POST' && action === 'batch') {
      const body = await req.json();

      if (subAction === 'import') {
        const { leads: leadsToImport } = body;
        if (!Array.isArray(leadsToImport) || leadsToImport.length === 0) {
          return new Response(JSON.stringify({ message: "Nenhum lead válido fornecido para importação" }), { status: 400 });
        }

        const BATCH_SIZE = 100; // Supabase might have limits on batch insert size / complexity
        const results = { success: [] as any[], updated: [] as any[], errors: [] as any[] };

        // Fetch existing leads for deduplication (consider performance for very large datasets)
        const { data: existingLeadsData, error: fetchError } = await supabaseAdminClient.from<Lead>('leads').select('id, phone');
        if (fetchError) throw fetchError;
        const phoneToLeadMap = new Map(existingLeadsData?.map(l => [normalizePhone(l.phone), l.id]));

        for (let i = 0; i < leadsToImport.length; i += BATCH_SIZE) {
          const batch = leadsToImport.slice(i, i + BATCH_SIZE);
          const leadsToInsert: InsertLead[] = [];
          const leadsToUpdatePromises: Promise<any>[] = [];

          for (const leadData of batch) {
            try {
              const normalizedCurrentPhone = normalizePhone(leadData.phone);
              let processedTags = leadData.tags;
              if (typeof processedTags === 'string') {
                processedTags = processedTags.split(/[,;]/).map((tag: string) => tag.trim()).filter(Boolean);
              } else if (!Array.isArray(processedTags)) {
                processedTags = [];
              }

              if (normalizedCurrentPhone && phoneToLeadMap.has(normalizedCurrentPhone)) {
                const existingLeadId = phoneToLeadMap.get(normalizedCurrentPhone)!;
                // Add to update logic
                const { data: existingLeadForUpdate } = await supabaseAdminClient.from<Lead>('leads').select('tags').eq('id', existingLeadId).single();
                let combinedTags = processedTags;
                if (existingLeadForUpdate?.tags) {
                    combinedTags = Array.from(new Set([...existingLeadForUpdate.tags, ...processedTags])).filter(tag => tag && tag.trim() !== '');
                }

                const updatePayload = leadValidationSchema.partial().parse({...leadData, tags: combinedTags});
                leadsToUpdatePromises.push(
                  supabaseAdminClient.from('leads').update(updatePayload).eq('id', existingLeadId)
                    .then(() => results.updated.push({ id: existingLeadId, action: "atualizado", phone: leadData.phone }))
                    .catch(err => results.errors.push({ error: err.message, data: leadData }))
                );
              } else {
                 const validationResult = leadValidationSchema.safeParse({...leadData, tags: processedTags});
                 if (!validationResult.success) {
                    results.errors.push({ error: fromZodError(validationResult.error).message, data: leadData });
                    continue;
                 }
                 leadsToInsert.push(validationResult.data as InsertLead); // Zod transform ensures correct type
              }
            } catch (e) {
               results.errors.push({ error: e.message, data: leadData });
            }
          }

          if (leadsToInsert.length > 0) {
            const { data: inserted, error: insertError } = await supabaseAdminClient.from('leads').insert(leadsToInsert).select('id, email');
            if (insertError) results.errors.push({ error: `Batch insert error: ${insertError.message}` });
            else inserted?.forEach(newLead => results.success.push({ id: newLead.id, email: newLead.email }));
          }
          await Promise.all(leadsToUpdatePromises);
        }
        await logAuditEvent(supabaseAdminClient, AuditEventType.LEAD_BATCH_IMPORT, user.id, {
            totalCount: leadsToImport.length,
            successCount: results.success.length,
            updatedCount: results.updated.length,
            errorCount: results.errors.length
        });
        return new Response(JSON.stringify(results), { status: 200 });
      }

      if (subAction === 'update') {
        const { ids, updates } = body;
        if (!Array.isArray(ids) || ids.length === 0) return new Response(JSON.stringify({ message: "IDs são obrigatórios" }), { status: 400 });
        const validationResult = leadValidationSchema.partial().safeParse(updates);
        if(!validationResult.success) return new Response(JSON.stringify({ message: fromZodError(validationResult.error).message }), { status: 400 });

        const { error } = await supabaseAdminClient.from('leads').update(validationResult.data).in('id', ids);
        if (error) throw error;
        await logAuditEvent(supabaseAdminClient, AuditEventType.LEAD_BATCH_UPDATE, user.id, { leadIds: ids, updatedFields: Object.keys(validationResult.data), count: ids.length });
        return new Response(JSON.stringify({ updatedCount: ids.length }), { status: 200 });
      }

      if (subAction === 'delete') {
        const { ids } = body;
         if (!Array.isArray(ids) || ids.length === 0) return new Response(JSON.stringify({ message: "IDs são obrigatórios" }), { status: 400 });
        // Note: Cascading deletes for whatsapp_messages should be handled by DB constraints if possible,
        // or done explicitly here if not.
        const { error: deleteWhatsappError } = await supabaseAdminClient.from('whatsapp_messages').delete().in('leadId', ids);
        if (deleteWhatsappError) console.error("Error deleting related whatsapp messages:", deleteWhatsappError.message);

        const { error } = await supabaseAdminClient.from('leads').delete().in('id', ids);
        if (error) throw error;
        await logAuditEvent(supabaseAdminClient, AuditEventType.LEAD_BATCH_DELETE, user.id, { leadIds: ids, count: ids.length });
        return new Response(JSON.stringify({ deletedCount: ids.length }), { status: 200 });
      }
    }

    // --- STANDARD CRUD OPERATIONS ---
    // GET all leads
    if (req.method === 'GET' && !action) {
      const { data, error } = await supabaseAdminClient.from<Lead>('leads').select('*');
      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 200 });
    }

    // POST create lead
    if (req.method === 'POST' && !action) {
      const body = await req.json();
      const validationResult = leadValidationSchema.safeParse(body);
      if (!validationResult.success) {
        return new Response(JSON.stringify({ message: fromZodError(validationResult.error).message }), { status: 400 });
      }
      const { data: newLead, error } = await supabaseAdminClient.from('leads').insert(validationResult.data as InsertLead).select().single();
      if (error) throw error;
      await logAuditEvent(supabaseAdminClient, AuditEventType.LEAD_CREATED, user.id, { leadId: newLead.id, name: newLead.name });
      return new Response(JSON.stringify(newLead), { status: 201 });
    }

    const leadIdParam = action; // If action is a number, it's an ID
    if (leadIdParam && !isNaN(parseInt(leadIdParam))) {
      const leadId = parseInt(leadIdParam);

      // GET lead by ID
      if (req.method === 'GET') {
        const { data, error } = await supabaseAdminClient.from<Lead>('leads').select('*').eq('id', leadId).single();
        if (error) throw error;
        if (!data) return new Response(JSON.stringify({ message: "Lead não encontrado" }), { status: 404 });
        return new Response(JSON.stringify(data), { status: 200 });
      }

      // PATCH update lead
      if (req.method === 'PATCH') {
        const body = await req.json();
        const validationResult = leadValidationSchema.partial().safeParse(body); // Partial for updates
        if (!validationResult.success) {
          return new Response(JSON.stringify({ message: fromZodError(validationResult.error).message }), { status: 400 });
        }
        const { data: updatedLead, error } = await supabaseAdminClient.from('leads').update(validationResult.data).eq('id', leadId).select().single();
        if (error) throw error;
        if (!updatedLead) return new Response(JSON.stringify({ message: "Lead não encontrado para atualizar" }), { status: 404 });
        await logAuditEvent(supabaseAdminClient, AuditEventType.LEAD_UPDATED, user.id, { leadId: updatedLead.id, updatedFields: Object.keys(validationResult.data) });
        return new Response(JSON.stringify(updatedLead), { status: 200 });
      }

      // DELETE lead
      if (req.method === 'DELETE') {
         // Note: Cascading deletes for whatsapp_messages handled by DB constraints or explicitly
        const { error: deleteWhatsappError } = await supabaseAdminClient.from('whatsapp_messages').delete().eq('leadId', leadId);
        if (deleteWhatsappError) console.error("Error deleting related whatsapp messages for lead:", leadId, deleteWhatsappError.message);

        const { error, count } = await supabaseAdminClient.from('leads').delete({ count: 'exact' }).eq('id', leadId);
        if (error) throw error;
        if (count === 0) return new Response(JSON.stringify({ message: "Lead não encontrado para deletar" }), { status: 404 });
        await logAuditEvent(supabaseAdminClient, AuditEventType.LEAD_DELETED, user.id, { leadId });
        return new Response(null, { status: 204 });
      }
    }

    return new Response(JSON.stringify({ message: "Rota não encontrada ou método não permitido" }), { status: 404 });

  } catch (error) {
    console.error('Erro na função Lead:', error);
    return new Response(JSON.stringify({ message: error.message || "Erro interno do servidor" }), { status: 500 });
  }
}, {
  // Deno.serve options can go here, e.g. port, hostname
  // For Supabase Edge Functions, these are typically managed by Supabase.
});

/*
To invoke locally:
Supabase CLI handles routing based on function name.

1. Start Supabase: `supabase start`
2. Invoke (examples):

   GET all leads:
   curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/lead-functions' \
     --header 'Authorization: Bearer YOUR_USER_JWT_OR_ANON_KEY'

   POST create lead:
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/lead-functions' \
     --header 'Authorization: Bearer YOUR_USER_JWT_OR_ANON_KEY' \
     --header 'Content-Type: application/json' \
     --data '{"name":"Test Lead", "email":"test@example.com", "phone":"123456789", "state":"CA", "campaign":"Test Campaign", "tags":["hot"], "source":"Website", "status":"New", "entryDate": "2023-01-01"}'

   GET lead by ID (e.g., ID 1):
   curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/lead-functions/1' \
     --header 'Authorization: Bearer YOUR_USER_JWT_OR_ANON_KEY'

   PATCH update lead (e.g., ID 1):
   curl -i --location --request PATCH 'http://127.0.0.1:54321/functions/v1/lead-functions/1' \
     --header 'Authorization: Bearer YOUR_USER_JWT_OR_ANON_KEY' \
     --header 'Content-Type: application/json' \
     --data '{"status":"Contacted"}'

   DELETE lead (e.g., ID 1):
   curl -i --location --request DELETE 'http://127.0.0.1:54321/functions/v1/lead-functions/1' \
     --header 'Authorization: Bearer YOUR_USER_JWT_OR_ANON_KEY'

   POST batch import:
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/lead-functions/batch/import' \
     --header 'Authorization: Bearer YOUR_USER_JWT_OR_ANON_KEY' \
     --header 'Content-Type: application/json' \
     --data '{"leads": [{"name":"Batch Lead 1", ...}, {"name":"Batch Lead 2", ...}]}'

   POST batch update:
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/lead-functions/batch/update' \
     --header 'Authorization: Bearer YOUR_USER_JWT_OR_ANON_KEY' \
     --header 'Content-Type: application/json' \
     --data '{"ids": [1, 2], "updates": {"status": "Archived"}}'

   POST batch delete:
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/lead-functions/batch/delete' \
     --header 'Authorization: Bearer YOUR_USER_JWT_OR_ANON_KEY' \
     --header 'Content-Type: application/json' \
     --data '{"ids": [1, 2]}'
*/
