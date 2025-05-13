import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, type IStorage } from "./storage";
import { db } from "./db";
import { 
  leads,
  insertLeadSchema, leadValidationSchema, whatsappMessageValidationSchema,
  taskValidationSchema, taskCommentValidationSchema,
  type Session, type Student, type WhatsappMessage
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { logAuditEvent, AuditEventType, getRecentAuditLogs } from "./audit-log";
import { 
  sendWhatsAppMessage, 
  sendWhatsAppTemplate, 
  checkWhatsAppConnection, 
  formatPhoneNumber, 
  sendWhatsAppImage,
  getWhatsAppQRCode,
  checkMessageStatus
} from "./whatsapp-service";
import { getWeatherByCity, checkWeatherService } from "./weather-service";
import { log } from "./vite";
import { sql } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Helper para adicionar nomes de usuários às tarefas
async function addUserNamesToTasks(tasks: any[], storage: IStorage) {
  // Buscar todos os usuários para preencher os nomes
  const users = await storage.getAllUsers();
  
  // Criar mapa de IDs -> nomes de usuários para busca rápida
  const userMap = users.reduce((acc: Record<number, string>, user: { id: number, username: string }) => {
    acc[user.id] = user.username;
    return acc;
  }, {});
  
  // Adicionar nomes de usuários às tarefas
  return tasks.map(task => ({
    ...task,
    assignedToName: userMap[task.assignedToId] || 'Usuário não encontrado',
    assignedByName: userMap[task.assignedById] || 'Usuário não encontrado'
  }));
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);
  
  // Middleware para checar autenticação sem exigir admin
  function isAuthenticated(req: Request, res: Response, next: NextFunction) {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    next();
  }
  
  // Middleware para checar se é administrador
  function isAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Acesso negado" });
    }
    next();
  }

  // Endpoints de usuários
  // Lista de usuários - permitido para qualquer usuário autenticado (para atribuição de tarefas)
  app.get("/api/users", isAuthenticated, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  app.delete("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Não permitir excluir o próprio usuário
      if (userId === req.user?.id) {
        return res.status(400).json({ message: "Não é possível excluir o próprio usuário" });
      }
      
      const success = await storage.deleteUser(userId);
      if (success) {
        res.status(200).json({ message: "Usuário excluído com sucesso" });
      } else {
        res.status(404).json({ message: "Usuário não encontrado" });
      }
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      res.status(500).json({ message: "Erro ao excluir usuário" });
    }
  });
  
  // Criar novo usuário (somente administradores)
  app.post("/api/users", isAdmin, async (req, res, next) => {
    try {
      const { username, password, role } = req.body;
      
      if (!username || !password || !role) {
        return res.status(400).json({ message: "Nome de usuário, senha e perfil são obrigatórios" });
      }
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }
      
      // Verificar se o perfil é válido (para evitar perfis não autorizados)
      const validRoles = ["admin", "marketing", "comercial", "trainer"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Perfil inválido" });
      }
      
      // Criar o usuário com senha criptografada
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        role
      });
      
      // Retornar o usuário criado (sem a senha)
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      res.status(500).json({ message: "Erro ao criar usuário" });
    }
  });

  // Importação em lote (batch) de leads
  app.post('/api/leads/batch/import', async (req, res) => {
    try {
      console.log(`Recebendo solicitação de importação em lote de ${req.body.leads?.length || 0} leads`);
      const { leads } = req.body;
      
      if (!Array.isArray(leads) || leads.length === 0) {
        return res.status(400).json({ message: "Nenhum lead válido fornecido para importação" });
      }
      
      // Controle de tamanho do lote para prevenir erros de memória ou timeout
      const BATCH_SIZE = 250; // Reduzido para evitar problemas com request entity too large

      // Obter todos os leads existentes para verificar duplicatas de telefone
      const existingLeads = await storage.getLeads();
      
      // Criar um mapa de telefones para IDs para facilitar a atualização
      const phoneToLeadMap = new Map();
      
      // Função para normalizar números de telefone (remover espaços, parênteses, traços, etc.)
      const normalizePhone = (phone: string) => {
        if (!phone) return '';
        return phone.replace(/[\s\(\)\-\+]/g, '');
      };
      
      // Popula o mapa com os números normalizados
      existingLeads.forEach(lead => {
        if (lead.phone) {
          const normalizedPhone = normalizePhone(lead.phone);
          phoneToLeadMap.set(normalizedPhone, lead.id);
        }
      });
      
      // Processar leads em lotes menores para evitar timeouts e problemas de memória
      const results = { 
        success: [] as any[],
        updated: [] as any[],
        errors: [] as any[]
      };
      
      const totalBatches = Math.ceil(leads.length / BATCH_SIZE);
      console.log(`Processando ${leads.length} leads em ${totalBatches} lotes de ${BATCH_SIZE}`);
      
      // Processar lote por lote
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        console.log(`Enviando lote ${batchIndex + 1}/${totalBatches} (${Math.min(BATCH_SIZE, leads.length - batchIndex * BATCH_SIZE)} leads)`);
        
        // Obter o lote atual
        const startIdx = batchIndex * BATCH_SIZE;
        const endIdx = Math.min((batchIndex + 1) * BATCH_SIZE, leads.length);
        const currentBatch = leads.slice(startIdx, endIdx);
        
        // Processar cada lead no lote
        for (let i = 0; i < currentBatch.length; i++) {
          const globalIndex = startIdx + i; // Índice global para reportar corretamente
          try {
            const leadData = currentBatch[i];
            
            // Normalizar o telefone do lead atual
            const normalizedPhone = normalizePhone(leadData.phone);
            console.log(`Verificando telefone normalizado: ${normalizedPhone}`);
            
            // Verificar se o número de telefone já existe
            if (normalizedPhone && phoneToLeadMap.has(normalizedPhone)) {
              const existingLeadId = phoneToLeadMap.get(normalizedPhone);
              console.log(`Telefone ${normalizedPhone} encontrado, ID existente: ${existingLeadId}`);
              
              // Se o email for diferente ou nome for diferente, permitir atualização
              const existingLead = existingLeads.find(l => l.id === existingLeadId);
              
              if (existingLead) {
                console.log(`Lead existente encontrado: ${existingLead.name}, email: ${existingLead.email}, status: ${existingLead.status}`);
                console.log(`Novo lead: ${leadData.name}, email: ${leadData.email}, status: ${leadData.status}`);
              
                // Verificar se campos importantes mudaram para justificar uma atualização
                const shouldUpdate = (
                  (leadData.email && existingLead.email !== leadData.email) ||
                  (leadData.tags && leadData.tags.length > 0) ||
                  (leadData.status && existingLead.status !== leadData.status) ||
                  (leadData.notes && (!existingLead.notes || existingLead.notes !== leadData.notes))
                );
                
                console.log(`Deve atualizar? ${shouldUpdate}`);
                console.log(`Razões para atualização: 
                  Email diferente? ${leadData.email && existingLead.email !== leadData.email}
                  Tags não vazias? ${leadData.tags && leadData.tags.length > 0}
                  Status diferente? ${leadData.status && existingLead.status !== leadData.status}
                  Notas diferentes? ${leadData.notes && (!existingLead.notes || existingLead.notes !== leadData.notes)}
                `);
                
                // Processamento específico para tags
                if (typeof leadData.tags === 'string') {
                  // Se as tags vieram como string, converter para array
                  leadData.tags = leadData.tags.split(/[,;]/).map((tag: string) => tag.trim()).filter(Boolean);
                } else if (!Array.isArray(leadData.tags)) {
                  // Se não for array nem string, inicializar como array vazio
                  leadData.tags = [];
                }
                
                // Combinar tags do lead existente com as novas tags (se existirem)
                if (existingLead.tags && Array.isArray(existingLead.tags) && existingLead.tags.length > 0) {
                  console.log(`Tags existentes: ${JSON.stringify(existingLead.tags)}`);
                  console.log(`Novas tags: ${JSON.stringify(leadData.tags)}`);
                  
                  // Unir as tags e remover duplicatas
                  const combinedTags = Array.from(new Set([...existingLead.tags, ...leadData.tags]));
                  leadData.tags = combinedTags.filter(tag => tag && tag.trim() !== '');
                  console.log(`Tags combinadas: ${JSON.stringify(leadData.tags)}`);
                }
                
                // Atualizar o lead existente em vez de criar um novo
                console.log(`Atualizando lead ID ${existingLeadId} com novos dados`);
                const updatedLead = await storage.updateLead(existingLeadId, leadData);
                results.updated.push({
                  index: globalIndex,
                  id: existingLeadId,
                  action: "atualizado",
                  phone: leadData.phone
                });
                continue;
              } else {
                console.log(`Lead com ID ${existingLeadId} não encontrado no array de leads.`);
                throw new Error(`Telefone ${leadData.phone} já existe no sistema, mas o lead não foi encontrado.`);
              }
            }
            
            // Processamento específico para tags
            if (typeof leadData.tags === 'string') {
              // Se as tags vieram como string, converter para array
              leadData.tags = leadData.tags.split(/[,;]/).map((tag: string) => tag.trim()).filter(Boolean);
            } else if (!Array.isArray(leadData.tags)) {
              // Se não for array nem string, inicializar como array vazio
              leadData.tags = [];
            }
            
            // Validar cada lead individualmente para melhor tratamento de erros
            const validationResult = leadValidationSchema.safeParse(leadData);
            
            if (!validationResult.success) {
              const validationError = fromZodError(validationResult.error);
              throw new Error(`Erro de validação: ${validationError.message}`);
            }
            
            const validatedLead = validationResult.data;
            
            // Converter qualquer string de data para objeto Date
            if (validatedLead.entryDate) {
              try {
                if (typeof validatedLead.entryDate === 'string') {
                  // Formatar a data se estiver no padrão DD/MM/YYYY
                  if (/^\d{2}\/\d{2}\/\d{4}$/.test(validatedLead.entryDate)) {
                    const [day, month, year] = validatedLead.entryDate.split('/');
                    validatedLead.entryDate = new Date(`${year}-${month}-${day}`);
                  } else {
                    validatedLead.entryDate = new Date(validatedLead.entryDate);
                  }
                  
                  // Verificar se a data é válida
                  if (isNaN(validatedLead.entryDate.getTime())) {
                    // Se inválida, usar a data atual
                    console.warn(`Data inválida: ${validatedLead.entryDate}, usando data atual`);
                    validatedLead.entryDate = new Date();
                  }
                } else if (!(validatedLead.entryDate instanceof Date)) {
                  // Se não for string nem Date, usar data atual
                  validatedLead.entryDate = new Date();
                }
              } catch (e) {
                console.error(`Erro ao converter data: ${validatedLead.entryDate}`, e);
                validatedLead.entryDate = new Date();
              }
            } else {
              validatedLead.entryDate = new Date();
            }
            
            const lead = await storage.createLead(validatedLead);
            
            // Adicionar o telefone normalizado ao mapa para verificações futuras
            if (lead.phone) {
              const normalizedNewPhone = normalizePhone(lead.phone);
              phoneToLeadMap.set(normalizedNewPhone, lead.id);
            }
            
            results.success.push({
              index: globalIndex,
              id: lead.id,
              email: lead.email
            });
          } catch (error) {
            console.error(`Erro ao processar lead #${globalIndex}:`, error);
            results.errors.push({
              index: globalIndex,
              error: error instanceof Error ? error.message : 'Erro desconhecido',
              data: currentBatch[i]
            });
          }
        }
      }
      
      // Registrar evento de auditoria da operação em lote
      logAuditEvent(AuditEventType.LEAD_BATCH_IMPORT, req, { 
        totalCount: leads.length,
        successCount: results.success.length,
        errorCount: results.errors.length
      });
      
      console.log(`Importação em lote concluída: ${results.success.length} novos, ${results.updated.length} atualizados, ${results.errors.length} erros`);
      res.status(200).json({
        message: `Importação concluída. ${results.success.length} leads importados e ${results.updated.length} atualizados com sucesso.`,
        totalProcessed: leads.length,
        successCount: results.success.length,
        updatedCount: results.updated.length,
        errorCount: results.errors.length,
        results
      });
    } catch (error) {
      console.error('Erro na importação em lote:', error);
      res.status(500).json({ message: "Falha na importação em lote", details: String(error) });
    }
  });
  
  // Batch operations for leads
  app.post('/api/leads/batch/update', async (req, res) => {
    try {
      const { ids, updates } = req.body;
      console.log('Atualizando leads em lote:', { ids, updates });
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "IDs de leads são obrigatórios" });
      }
      
      const validationResult = leadValidationSchema.partial().safeParse(updates);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        console.error('Erro de validação na atualização em lote:', validationError.message);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Preparar os dados para atualização
      let dataToUpdate = validationResult.data;
      
      // Se entryDate for uma string, converter para Date
      if (dataToUpdate.entryDate && typeof dataToUpdate.entryDate === 'string') {
        try {
          dataToUpdate = {
            ...dataToUpdate,
            entryDate: new Date(dataToUpdate.entryDate)
          };
        } catch (e) {
          console.error('Erro ao converter data:', e);
          return res.status(400).json({ message: "Formato de data inválido" });
        }
      }
      
      console.log('Dados para atualização em lote:', dataToUpdate);
      const count = await storage.updateLeadsInBatch(ids, dataToUpdate);
      
      // Registrar evento de atualização em lote
      logAuditEvent(AuditEventType.LEAD_BATCH_UPDATE, req, {
        leadIds: ids,
        updatedFields: Object.keys(dataToUpdate),
        updateCount: count,
        statusChange: dataToUpdate.status ? `Para ${dataToUpdate.status}` : undefined
      });
      
      res.json({ updatedCount: count });
    } catch (error) {
      console.error('Erro ao atualizar leads em lote:', error);
      res.status(500).json({ message: "Erro ao atualizar leads em lote", details: String(error) });
    }
  });
  
  app.post('/api/leads/batch/delete', async (req, res) => {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "IDs de leads são obrigatórios" });
      }
      
      // Tenta obter informações sobre os leads a serem excluídos para o log de auditoria
      const leadsInfo = await Promise.all(
        ids.map(async (id) => {
          try {
            return await storage.getLead(id);
          } catch (e) {
            return null;
          }
        })
      );
      
      const count = await storage.deleteLeadsInBatch(ids);
      
      // Registrar evento de exclusão em lote
      logAuditEvent(AuditEventType.LEAD_BATCH_DELETE, req, {
        leadIds: ids,
        deleteCount: count,
        leadNames: leadsInfo.filter(Boolean).map(lead => lead?.name).join(', ')
      });
      
      res.json({ deletedCount: count });
    } catch (error) {
      console.error('Erro ao excluir leads em lote:', error);
      res.status(500).json({ message: "Erro ao excluir leads em lote" });
    }
  });
  
  // Get all leads
  app.get('/api/leads', async (req, res) => {
    try {
      const leads = await storage.getLeads();
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar leads" });
    }
  });

  // Get lead by ID
  app.get('/api/leads/:id', async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const lead = await storage.getLead(leadId);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }
      
      res.json(lead);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar lead" });
    }
  });

  // Create new lead
  app.post('/api/leads', async (req, res) => {
    try {
      console.log('Recebendo dados para criar lead:', req.body);
      
      // Primeiro validamos com o schema que aceita data como string (para validar formato)
      const validationResult = leadValidationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        console.error('Erro de validação:', validationError.message);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.log('Dados validados:', validationResult.data);
      
      // Garantir que entryDate seja um objeto Date antes de enviar para o banco
      const leadToInsert = {
        ...validationResult.data,
        entryDate: validationResult.data.entryDate instanceof Date 
          ? validationResult.data.entryDate 
          : new Date(validationResult.data.entryDate)
      };
      
      console.log('Dados convertidos para inserção:', leadToInsert);
      const newLead = await storage.createLead(leadToInsert);
      
      // Registrar evento de criação de lead
      logAuditEvent(AuditEventType.LEAD_CREATED, req, {
        leadId: newLead.id,
        name: newLead.name,
        source: newLead.source,
        status: newLead.status
      });
      
      res.status(201).json(newLead);
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      res.status(500).json({ message: "Erro ao criar lead", details: String(error) });
    }
  });

  // Update lead
  app.patch('/api/leads/:id', async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      console.log('Atualizando lead:', req.body);
      
      // Validar os dados recebidos
      const validationResult = leadValidationSchema.partial().safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        console.error('Erro de validação na atualização:', validationError.message);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Preparar os dados para atualização
      let dataToUpdate = validationResult.data;
      
      // Se entryDate for uma string, converter para Date
      if (dataToUpdate.entryDate && typeof dataToUpdate.entryDate === 'string') {
        try {
          dataToUpdate = {
            ...dataToUpdate,
            entryDate: new Date(dataToUpdate.entryDate)
          };
        } catch (e) {
          console.error('Erro ao converter data:', e);
          return res.status(400).json({ message: "Formato de data inválido" });
        }
      }
      
      console.log('Dados para atualização:', dataToUpdate);
      const updatedLead = await storage.updateLead(leadId, dataToUpdate);
      
      if (!updatedLead) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }
      
      // Registrar evento de atualização de lead
      logAuditEvent(AuditEventType.LEAD_UPDATED, req, {
        leadId: updatedLead.id,
        name: updatedLead.name,
        updatedFields: Object.keys(dataToUpdate),
        statusChange: dataToUpdate.status ? `${updatedLead.status !== dataToUpdate.status ? 'De ' + updatedLead.status + ' para ' + dataToUpdate.status : 'Sem alteração'}` : undefined
      });
      
      res.json(updatedLead);
    } catch (error) {
      console.error('Erro ao atualizar lead:', error);
      res.status(500).json({ message: "Erro ao atualizar lead", details: String(error) });
    }
  });

  // Delete lead
  app.delete('/api/leads/:id', async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      
      // Obter informações do lead antes de excluir (para o log de auditoria)
      const leadToDelete = await storage.getLead(leadId);
      
      if (!leadToDelete) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }
      
      const success = await storage.deleteLead(leadId);
      
      if (!success) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }
      
      // Registrar evento de exclusão de lead
      logAuditEvent(AuditEventType.LEAD_DELETED, req, {
        leadId: leadId,
        name: leadToDelete.name,
        email: leadToDelete.email,
        source: leadToDelete.source,
        status: leadToDelete.status
      });
      
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar lead:', error);
      res.status(500).json({ message: "Erro ao deletar lead" });
    }
  });
  
  // Endpoint para obter logs de auditoria (somente administradores)
  app.get('/api/audit-logs', isAdmin, async (req, res) => {
    try {
      const count = parseInt(req.query.count?.toString() || '100');
      const logs = await getRecentAuditLogs(count);
      res.json(logs);
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      res.status(500).json({ message: "Erro ao buscar logs de auditoria" });
    }
  });
  
  // Get lead statistics
  // Endpoints para sessões de treinamento
  app.get('/api/sessions', async (req, res) => {
    try {
      try {
        // Primeiro tentar obter as sessões do banco de dados
        const dbSessions = await storage.getSessions();
        return res.json(dbSessions);
      } catch (dbError) {
        console.log('Tabela de sessões não encontrada, utilizando dados simulados');
        
        // Se falhar (tabela não existe), criar dados simulados
        const allLeads = await storage.getLeads();
        const alunoLeads = allLeads.filter(lead => lead.status === "Aluno");
        
        // Criar sessões simuladas com base nos alunos
        const sessions = [];
        const now = new Date();
        
        for (const lead of alunoLeads) {
          // Cada aluno terá entre 1 a 5 sessões com datas variadas
          const sessionCount = Math.floor(Math.random() * 5) + 1;
          
          for (let i = 0; i < sessionCount; i++) {
            // Distribuir sessões nos últimos 60 dias
            const startDate = new Date(now);
            startDate.setDate(now.getDate() - Math.floor(Math.random() * 60));
            
            // Duração da sessão (entre 45 e 90 minutos)
            const durationMinutes = 45 + Math.floor(Math.random() * 46);
            const endDate = new Date(startDate);
            endDate.setMinutes(startDate.getMinutes() + durationMinutes);
            
            // Status variados para as sessões
            const statuses = ["Agendado", "Concluído", "Cancelado", "Remarcado"];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            
            sessions.push({
              id: sessions.length + 1,
              studentId: lead.id,
              studentName: lead.name,
              source: lead.source,
              startTime: startDate.toISOString(),
              endTime: endDate.toISOString(),
              status: status,
              type: Math.random() > 0.7 ? "Online" : "Presencial",
              notes: null,
              createdAt: new Date(lead.entryDate).toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }
        
        return res.json(sessions);
      }
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
      res.status(500).json({ message: "Erro ao buscar sessões" });
    }
  });

  app.get('/api/sessions/details', async (req, res) => {
    try {
      // Como não temos a tabela de sessões ainda, vamos obter sessões simuladas
      const response = await fetch('http://localhost:5000/api/sessions');
      const sessions: Session[] = await response.json();
      
      // Adicionar detalhes extras para as sessões
      const sessionsWithDetails = sessions.map((session: Session) => ({
        ...session,
        trainerName: ['Amanda Silva', 'Ricardo Costa', 'Juliana Oliveira', 'Marcos Santos'][Math.floor(Math.random() * 4)],
        location: (session as any).type === 'Presencial' ? ['Studio Favale', 'Academia Pink', 'Centro Esportivo'][Math.floor(Math.random() * 3)] : 'Online',
        feedback: session.status === 'Concluído' ? ['Excelente progresso', 'Bom desempenho', 'Precisa melhorar', 'Superou expectativas'][Math.floor(Math.random() * 4)] : null
      }));
      
      res.json(sessionsWithDetails);
    } catch (error) {
      console.error('Erro ao buscar detalhes das sessões:', error);
      res.status(500).json({ message: "Erro ao buscar detalhes das sessões" });
    }
  });

  app.get('/api/sessions/daterange', async (req, res) => {
    try {
      const startDate = req.query.start ? new Date(req.query.start as string) : new Date(new Date().setDate(new Date().getDate() - 30));
      const endDate = req.query.end ? new Date(req.query.end as string) : new Date(new Date().setDate(new Date().getDate() + 30));
      
      // Como não temos a tabela de sessões, obter as sessões simuladas
      const response = await fetch('http://localhost:5000/api/sessions');
      const allSessions: Session[] = await response.json();
      
      // Filtrar por período
      const filteredSessions = allSessions.filter((session: Session) => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= startDate && sessionDate <= endDate;
      });
      
      res.json(filteredSessions);
    } catch (error) {
      console.error('Erro ao buscar sessões por data:', error);
      res.status(500).json({ message: "Erro ao buscar sessões por data" });
    }
  });

  // Endpoints para treinadores
  app.get('/api/trainers', async (req, res) => {
    try {
      // Como não temos a tabela de treinadores, criar dados simulados
      const trainers = [
        {
          id: 1,
          name: "Amanda Silva",
          specialty: "Musculação",
          email: "amanda.silva@favalepink.com",
          phone: "+5511987654321",
          active: true,
          bio: "Especialista em musculação e condicionamento físico",
          imageUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 2,
          name: "Ricardo Costa",
          specialty: "Funcional",
          email: "ricardo.costa@favalepink.com",
          phone: "+5511976543210",
          active: true,
          bio: "Especialista em treinamento funcional e crossfit",
          imageUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 3,
          name: "Juliana Oliveira",
          specialty: "Pilates",
          email: "juliana.oliveira@favalepink.com",
          phone: "+5511965432109",
          active: true,
          bio: "Especialista em pilates e alongamento",
          imageUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 4,
          name: "Marcos Santos",
          specialty: "Nutrição Esportiva",
          email: "marcos.santos@favalepink.com",
          phone: "+5511954321098",
          active: true,
          bio: "Nutricionista esportivo com foco em emagrecimento e hipertrofia",
          imageUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 5,
          name: "Carolina Mendes",
          specialty: "Yoga",
          email: "carolina.mendes@favalepink.com",
          phone: "+5511943210987",
          active: false,
          bio: "Instrutora de yoga e meditação",
          imageUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      
      res.json(trainers);
    } catch (error) {
      console.error('Erro ao buscar treinadores:', error);
      res.status(500).json({ message: "Erro ao buscar treinadores" });
    }
  });

  app.get('/api/trainers/active', async (req, res) => {
    try {
      // Obter todos os treinadores e filtrar apenas os ativos
      const response = await fetch('http://localhost:5000/api/trainers');
      const trainers = await response.json();
      const activeTrainers = trainers.filter((trainer: any) => trainer.active);
      
      res.json(activeTrainers);
    } catch (error) {
      console.error('Erro ao buscar treinadores ativos:', error);
      res.status(500).json({ message: "Erro ao buscar treinadores ativos" });
    }
  });

  // Endpoint para estudantes
  app.get('/api/students', async (req, res) => {
    try {
      // Como não temos a tabela de estudantes, simular dados baseados nos leads que são alunos
      const allLeads = await storage.getLeads();
      const alunoLeads = allLeads.filter(lead => lead.status === "Aluno");
      
      // Criar alunos baseados nos leads
      const students = alunoLeads.map(lead => ({
        id: lead.id,
        leadId: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source || 'Não definido',
        address: `${lead.state || 'SP'}, Brasil`,
        preferences: `Interesse em ${['Perda de peso', 'Musculação', 'Saúde geral', 'Condicionamento físico'][Math.floor(Math.random() * 4)]}`,
        active: true,
        createdAt: new Date(lead.entryDate).toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      res.json(students);
    } catch (error) {
      console.error('Erro ao buscar estudantes:', error);
      res.status(500).json({ message: "Erro ao buscar estudantes" });
    }
  });

  app.get('/api/students/withleads', async (req, res) => {
    try {
      // Obter estudantes e leads
      const response = await fetch('http://localhost:5000/api/students');
      const students: Student[] = await response.json();
      const allLeads = await storage.getLeads();
      
      // Combinar estudantes com seus leads correspondentes
      const studentsWithLeads = students.map((student: Student) => {
        const lead = allLeads.find(l => l.id === student.leadId);
        return {
          ...student,
          lead: lead || null
        };
      });
      
      res.json(studentsWithLeads);
    } catch (error) {
      console.error('Erro ao buscar estudantes com info de leads:', error);
      res.status(500).json({ message: "Erro ao buscar estudantes com info de leads" });
    }
  });

  app.get('/api/stats', async (req, res) => {
    try {
      const allLeads = await storage.getLeads();
      const alunos = allLeads.filter(lead => lead.status === "Aluno");
      
      // Count leads by source
      const leadsBySource = {
        "Favale": allLeads.filter(lead => lead.source === "Favale").length,
        "Pink": allLeads.filter(lead => lead.source === "Pink").length,
        "Indicação": allLeads.filter(lead => lead.source === "Indicação").length,
        "Instagram": allLeads.filter(lead => lead.source === "Instagram").length,
        "Site": allLeads.filter(lead => lead.source === "Site").length,
        "Outros": allLeads.filter(lead => !["Favale", "Pink", "Indicação", "Instagram", "Site"].includes(lead.source || "")).length
      };
      
      // Count leads by state
      const leadsByState: Record<string, number> = {};
      allLeads.forEach(lead => {
        if (lead.state) {
          leadsByState[lead.state] = (leadsByState[lead.state] || 0) + 1;
        }
      });
      
      // Count leads by campaign
      const leadsByCampaign: Record<string, number> = {};
      allLeads.forEach(lead => {
        if (lead.campaign) {
          leadsByCampaign[lead.campaign] = (leadsByCampaign[lead.campaign] || 0) + 1;
        }
      });
      
      // Calculate conversion rate
      const conversionRate = allLeads.length > 0 
        ? (alunos.length / allLeads.length) * 100 
        : 0;
      
      // Dados para atividades recentes
      const monthlyActivity = allLeads.reduce((acc, lead) => {
        const date = new Date(lead.entryDate);
        const month = date.getMonth();
        const year = date.getFullYear();
        const key = `${year}-${month}`;
        
        if (!acc[key]) {
          acc[key] = { month, year, count: 0 };
        }
        
        acc[key].count++;
        return acc;
      }, {} as Record<string, { month: number, year: number, count: number }>);
      
      // Ordenar atividade mensal
      const sortedActivity = Object.values(monthlyActivity)
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.month - b.month;
        });
      
      // Calcular crescimento mensal (se houver pelo menos 2 meses de dados)
      const monthlyGrowth = sortedActivity.length >= 2 ? 
        ((sortedActivity[sortedActivity.length - 1].count - sortedActivity[sortedActivity.length - 2].count) / 
        sortedActivity[sortedActivity.length - 2].count) * 100 : 0;
      
      const stats = {
        totalLeads: allLeads.length,
        totalStudents: alunos.length,
        totalActiveSessions: Math.round(alunos.length * 1.6),  // Estimativa baseada nos clientes
        totalCompletedSessions: Math.round(alunos.length * 3.8), // Estimativa baseada nos clientes
        sessionsPerStudent: "3.8",  // Baseado nas estimativas acima
        conversionRate: conversionRate.toFixed(1),
        monthlyGrowth: monthlyGrowth.toFixed(1),
        leadsBySource,
        leadsByState,
        leadsByCampaign,
        totalLeadsByCampaign: leadsByCampaign ? Object.values(leadsByCampaign).reduce((a, b) => a + b, 0) : 0
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  // WhatsApp API Routes
  // Obter todas as mensagens de um lead
  app.get('/api/whatsapp/lead/:leadId', async (req, res) => {
    try {
      const leadId = parseInt(req.params.leadId);
      if (isNaN(leadId)) {
        return res.status(400).json({ message: "ID do lead inválido" });
      }
      
      // Verificar se o lead existe
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }
      
      const messages = await storage.getWhatsappMessages(leadId);
      res.json(messages);
    } catch (error) {
      console.error('Erro ao buscar mensagens de WhatsApp:', error);
      res.status(500).json({ message: "Erro ao buscar mensagens de WhatsApp" });
    }
  });

  // Rota migrada para uma implementação mais completa em outro local

  // Atualizar status de uma mensagem
  app.patch('/api/whatsapp/messages/:id/status', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['sent', 'delivered', 'read', 'failed'].includes(status)) {
        return res.status(400).json({ message: "Status inválido" });
      }
      
      const updatedMessage = await storage.updateWhatsappMessageStatus(id, status);
      
      if (!updatedMessage) {
        return res.status(404).json({ message: "Mensagem não encontrada" });
      }
      
      res.json(updatedMessage);
    } catch (error) {
      console.error('Erro ao atualizar status da mensagem:', error);
      res.status(500).json({ message: "Erro ao atualizar status da mensagem" });
    }
  });

  // Excluir uma mensagem
  app.delete('/api/whatsapp/messages/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteWhatsappMessage(id);
      
      if (!success) {
        return res.status(404).json({ message: "Mensagem não encontrada" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao excluir mensagem:', error);
      res.status(500).json({ message: "Erro ao excluir mensagem" });
    }
  });
  
  // Obter mensagens de um lead específico
  app.get('/api/whatsapp/lead/:id', async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      
      if (isNaN(leadId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      // Verificar se o lead existe
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }
      
      // Obter mensagens do lead
      const messages = await storage.getWhatsappMessages(leadId);
      
      // Ordenar do mais antigo para o mais recente (para exibição cronológica)
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      res.json(messages);
    } catch (error) {
      console.error('Erro ao buscar mensagens do lead:', error);
      res.status(500).json({ message: "Erro ao buscar mensagens" });
    }
  });
  
  // Obter as mensagens mais recentes para cada lead (para exibição na lista de conversas)
  app.get('/api/whatsapp/recent-messages', async (req, res) => {
    try {
      // Obter todas as mensagens WhatsApp agrupadas por lead
      const query = `
        SELECT DISTINCT ON (lead_id) *
        FROM whatsapp_messages
        ORDER BY lead_id, timestamp DESC
      `;
      
      // Let TypeScript infer the type from db.execute, or use a more generic type if known
      const executionResult = await db.execute(query);
      
      // Transformar o resultado em um objeto com lead_id como chave
      const messagesByLead: Record<number, WhatsappMessage[]> = {};
      
      // Ensure executionResult is an array before iterating
      // Drizzle's raw query result might be an array of objects (rows)
      if (Array.isArray(executionResult)) {
        executionResult.forEach(message => {
          // Assuming 'message' is an object with the expected properties
          const leadId = (message as any).lead_id as number;
          if (!messagesByLead[leadId]) {
            messagesByLead[leadId] = [];
          }
          messagesByLead[leadId].push({
            id: (message as any).id,
            leadId: (message as any).lead_id,
            direction: (message as any).direction,
            content: (message as any).content,
            status: (message as any).status,
            timestamp: (message as any).timestamp,
            mediaUrl: (message as any).media_url,
            mediaType: (message as any).media_type,
            messageId: (message as any).message_id
          } as WhatsappMessage);
        });
      } else if (executionResult && typeof executionResult === 'object' && 'rows' in executionResult && Array.isArray((executionResult as any).rows)) {
        // Some drivers might return an object with a 'rows' property like { rows: [...] }
        const rows = (executionResult as any).rows;
        rows.forEach((message: any) => {
          const leadId = message.lead_id as number;
          if (!messagesByLead[leadId]) {
            messagesByLead[leadId] = [];
          }
          messagesByLead[leadId].push({
            id: message.id,
            leadId: message.lead_id,
            direction: message.direction,
            content: message.content,
            status: message.status,
            timestamp: message.timestamp,
            mediaUrl: message.media_url,
            mediaType: message.media_type,
            messageId: message.message_id
          } as WhatsappMessage);
        });
      }
      
      res.json(messagesByLead);
    } catch (error) {
      console.error('Erro ao buscar mensagens recentes:', error);
      res.status(500).json({ message: "Erro ao buscar mensagens recentes" });
    }
  });
  
  // Verificar conexão com a API do WhatsApp
  app.get('/api/whatsapp/status', async (req, res) => {
    try {
      const connectionStatus = await checkWhatsAppConnection();
      
      if (connectionStatus.success) {
        res.json({ 
          status: 'connected', 
          message: 'Conexão com a API do WhatsApp está funcionando corretamente',
          details: connectionStatus.details || {}
        });
      } else {
        console.warn(`Falha na verificação da conexão WhatsApp: ${connectionStatus.error}`);
        res.status(503).json({ 
          status: 'disconnected', 
          message: connectionStatus.error || 'Falha na conexão com a API do WhatsApp',
          details: connectionStatus.details || {}
        });
      }
    } catch (error) {
      console.error(`Erro ao verificar status da API: ${JSON.stringify(error)}`);
      res.status(500).json({ status: 'error', message: 'Erro ao verificar conexão com a API do WhatsApp' });
    }
  });
  
  // Obter QR Code para conexão com WhatsApp
  app.get('/api/whatsapp/qrcode', async (req, res) => {
    try {
      const qrCodeResult = await getWhatsAppQRCode();
      
      if (qrCodeResult.success && qrCodeResult.details?.qrcode) {
        res.json({ 
          success: true, 
          qrcode: qrCodeResult.details.qrcode,
          status: qrCodeResult.details.status || 'DISCONNECTED'
        });
      } else {
        console.warn(`Falha ao obter QR Code: ${qrCodeResult.error}`);
        res.status(400).json({ 
          success: false, 
          message: qrCodeResult.error || 'Não foi possível obter o QR Code',
          details: qrCodeResult.details || {}
        });
      }
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno ao obter QR Code' 
      });
    }
  });
  
  // Verificar status de uma mensagem enviada
  app.get('/api/whatsapp/message-status/:messageId', async (req, res) => {
    try {
      const { messageId } = req.params;
      
      if (!messageId) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID da mensagem é obrigatório' 
        });
      }
      
      // Buscar a mensagem no banco para atualizar seu status
      const message = await storage.getWhatsappMessageByApiId(messageId);
      
      const statusResult = await checkMessageStatus(messageId);
      
      if (statusResult.success) {
        // Se a mensagem foi encontrada no banco, atualizar seu status se necessário
        if (message && statusResult.details?.status) {
          const newStatus = statusResult.details.status;
          if (message.status !== newStatus) {
            await storage.updateWhatsappMessageStatus(message.id, newStatus);
          }
        }
        
        res.json({ 
          success: true, 
          status: statusResult.details?.status || 'sent',
          originalStatus: statusResult.details?.originalStatus,
          timestamp: statusResult.details?.timestamp,
          message: message ? {
            id: message.id,
            leadId: message.leadId,
            content: message.content,
            mediaUrl: message.mediaUrl,
            mediaType: message.mediaType,
            previousStatus: message.status,
            updated: message && message.status !== statusResult.details?.status
          } : null
        });
      } else {
        console.warn(`Falha ao verificar status da mensagem: ${statusResult.error}`);
        res.status(400).json({ 
          success: false, 
          message: statusResult.error || 'Falha ao verificar status da mensagem',
          details: statusResult.details || {},
          messageId: messageId
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status da mensagem:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro interno ao verificar status da mensagem',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  // API de clima - Verificar status do serviço
  app.get('/api/weather/status', async (req, res) => {
    try {
      const statusResult = await checkWeatherService();
      if (statusResult.status === 'connected') {
        res.json(statusResult);
      } else {
        res.status(503).json(statusResult);
      }
    } catch (error: any) {
      console.error("Erro ao verificar serviço de clima:", error);
      res.status(500).json({ 
        status: 'error', 
        message: `Erro ao verificar serviço de clima: ${error.message}` 
      });
    }
  });
  
  // API de clima - Buscar clima por cidade
  app.get('/api/weather/:city', async (req, res) => {
    try {
      const city = req.params.city;
      
      if (!city) {
        return res.status(400).json({ message: "Nome da cidade é obrigatório" });
      }
      
      const weatherData = await getWeatherByCity(city);
      
      if (weatherData.error) {
        return res.status(400).json({ 
          message: weatherData.error.message,
          code: weatherData.error.code
        });
      }
      
      res.json(weatherData);
    } catch (error: any) {
      console.error("Erro ao obter dados de clima:", error);
      res.status(500).json({ 
        message: `Erro ao obter dados de clima: ${error.message}` 
      });
    }
  });
  
  // API de tarefas
  
  // Listar todas as tarefas
  app.get('/api/tasks', async (req, res) => {
    try {
      // Buscar todas as tarefas
      const tasks = await storage.getTasks();
      
      // Adicionar nomes de usuários às tarefas
      const tasksWithUserNames = await addUserNamesToTasks(tasks, storage);
      
      res.json(tasksWithUserNames);
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      res.status(500).json({ message: 'Erro ao buscar tarefas' });
    }
  });
  
  // Buscar tarefa pelo ID
  app.get('/api/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }
    
    try {
      // Buscar tarefa
      const task = await storage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ message: 'Tarefa não encontrada' });
      }
      
      // Buscar usuários relacionados à tarefa
      const assignedTo = await storage.getUser(task.assignedToId);
      const assignedBy = await storage.getUser(task.assignedById);
      
      // Buscar comentários da tarefa
      const comments = await storage.getTaskCommentsByTaskId(id);
      
      // Adicionar informações de nome de usuário a cada comentário
      const commentsWithUserInfo = await Promise.all(comments.map(async comment => {
        if (comment.userId) {
          const commentUser = await storage.getUser(comment.userId);
          return {
            ...comment,
            userName: commentUser?.username || 'Usuário não encontrado'
          };
        }
        return comment;
      }));
      
      // Retornar tarefa com nomes de usuários e comentários
      res.json({
        ...task,
        assignedToName: assignedTo?.username || 'Usuário não encontrado',
        assignedByName: assignedBy?.username || 'Usuário não encontrado',
        comments: commentsWithUserInfo
      });
    } catch (error) {
      console.error(`Erro ao buscar tarefa ${id}:`, error);
      res.status(500).json({ message: 'Erro ao buscar detalhes da tarefa' });
    }
  });
  
  // Criar nova tarefa
  app.post('/api/tasks', async (req, res) => {
    try {
      // Validar os dados com o schema do Zod
      const validatedData = taskValidationSchema.parse(req.body);

      // Corrigir campos de data para garantir que são objetos Date ou string ISO
      if (validatedData.dueDate && !(validatedData.dueDate instanceof Date)) {
        validatedData.dueDate = new Date(validatedData.dueDate);
      }

      // Criar tarefa no banco de dados
      const newTask = await storage.createTask(validatedData);

      res.status(201).json(newTask);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: 'Dados inválidos', 
          details: error.errors 
        });
      }
      
      console.error('Erro ao criar tarefa:', error);
      res.status(500).json({ message: 'Erro ao criar tarefa' });
    }
  });
  
  // Atualizar tarefa existente
  app.patch('/api/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }
    
    try {
      // Verificar se a tarefa existe
      const existingTask = await storage.getTask(id);
      
      if (!existingTask) {
        return res.status(404).json({ message: 'Tarefa não encontrada' });
      }
      
      // Validar dados de atualização
      const validatedData = taskValidationSchema.partial().parse(req.body);
      
      // Atualizar tarefa
      const updatedTask = await storage.updateTask(id, validatedData);
      
      res.json(updatedTask);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: 'Dados inválidos', 
          details: error.errors 
        });
      }
      
      console.error(`Erro ao atualizar tarefa ${id}:`, error);
      res.status(500).json({ message: 'Erro ao atualizar tarefa' });
    }
  });
  
  // Excluir tarefa
  app.delete('/api/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }
    
    try {
      // Verificar se a tarefa existe
      const existingTask = await storage.getTask(id);
      
      if (!existingTask) {
        return res.status(404).json({ message: 'Tarefa não encontrada' });
      }
      
      // Excluir tarefa (comentários são excluídos em cascata na implementação do storage)
      const deleted = await storage.deleteTask(id);
      
      if (deleted) {
        res.status(204).end();
      } else {
        res.status(500).json({ message: 'Erro ao excluir tarefa' });
      }
    } catch (error) {
      console.error(`Erro ao excluir tarefa ${id}:`, error);
      res.status(500).json({ message: 'Erro ao excluir tarefa' });
    }
  });
  
  // Buscar tarefas por usuário designado
  app.get('/api/tasks/assigned-to/:userId', async (req, res) => {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'ID de usuário inválido' });
    }
    
    try {
      const tasks = await storage.getTasksByAssignedToId(userId);
      
      // Adicionar nomes de usuários às tarefas
      const tasksWithUserNames = await addUserNamesToTasks(tasks, storage);
      
      res.json(tasksWithUserNames);
    } catch (error) {
      console.error(`Erro ao buscar tarefas atribuídas ao usuário ${userId}:`, error);
      res.status(500).json({ message: 'Erro ao buscar tarefas' });
    }
  });
  
  // Buscar tarefas por status
  app.get('/api/tasks/status/:status', async (req, res) => {
    const { status } = req.params;
    
    // Validar status
    if (!['backlog', 'pending', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Status inválido' });
    }
    
    try {
      const tasks = await storage.getTasksByStatus(status);
      
      // Adicionar nomes de usuários às tarefas
      const tasksWithUserNames = await addUserNamesToTasks(tasks, storage);
      
      res.json(tasksWithUserNames);
    } catch (error) {
      console.error(`Erro ao buscar tarefas com status ${status}:`, error);
      res.status(500).json({ message: 'Erro ao buscar tarefas' });
    }
  });
  
  // Adicionar comentário a uma tarefa
  app.post('/api/tasks/:id/comments', async (req, res) => {
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'ID de tarefa inválido' });
    }
    
    try {
      // Verificar se a tarefa existe
      const existingTask = await storage.getTask(taskId);
      
      if (!existingTask) {
        return res.status(404).json({ message: 'Tarefa não encontrada' });
      }
      
      // Validar dados do comentário
      const validatedData = taskCommentValidationSchema.parse({
        ...req.body,
        taskId
      });
      
      // Criar comentário
      const newComment = await storage.createTaskComment(validatedData);
      
      res.status(201).json(newComment);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: 'Dados inválidos', 
          details: error.errors 
        });
      }
      
      console.error(`Erro ao adicionar comentário à tarefa ${taskId}:`, error);
      res.status(500).json({ message: 'Erro ao adicionar comentário' });
    }
  });
  
  // Excluir comentário
  app.delete('/api/tasks/comments/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }
    
    try {
      const deleted = await storage.deleteTaskComment(id);
      
      if (deleted) {
        res.status(204).end();
      } else {
        res.status(500).json({ message: 'Erro ao excluir comentário' });
      }
    } catch (error) {
      console.error(`Erro ao excluir comentário ${id}:`, error);
      res.status(500).json({ message: 'Erro ao excluir comentário' });
    }
  });
  
  // Enviar mensagem de texto pelo WhatsApp
  app.post('/api/whatsapp/send', async (req, res) => {
    try {
      const { leadId, content, direction, status } = req.body;
      
      if (!leadId || !content) {
        return res.status(400).json({ message: "ID do lead e conteúdo são obrigatórios" });
      }
      
      // Verificar se o lead existe
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }
      
      // Validar número de telefone
      const formattedPhone = formatPhoneNumber(lead.phone);
      if (!formattedPhone) {
        return res.status(400).json({ message: "Número de telefone inválido ou não encontrado para o lead" });
      }
      
      // Criar entrada da mensagem no banco de dados
      const messageData = {
        leadId,
        direction: direction || 'outgoing',
        content,
        status: status || 'pending',
        mediaUrl: null,
        mediaType: null
      };
      
      // Salvar a mensagem no banco de dados
      const message = await storage.createWhatsappMessage(messageData);
      
      // Enviar a mensagem via API do WhatsApp apenas se for uma mensagem de saída
      if (direction !== 'incoming') {
        const result = await sendWhatsAppMessage(lead, content);
        
        // Atualizar status da mensagem com o resultado da API
        if (result.success) {
          await storage.updateWhatsappMessageStatus(message.id, 'sent');
          
          if (result.messageId) {
            await storage.updateWhatsappMessageId(message.id, result.messageId);
          }
          
          res.status(201).json({
            id: message.id,
            leadId: message.leadId,
            content: message.content,
            status: 'sent',
            timestamp: message.timestamp,
            messageId: result.messageId,
            success: true
          });
        } else {
          // Verificar se o erro é por causa de número não autorizado (conta em modo de desenvolvimento)
          const errorMessage = result.error || 'Erro desconhecido';
          const isNotAuthorizedNumber = errorMessage.includes('not in allowed list');
          
          await storage.updateWhatsappMessageStatus(message.id, 'failed');
          res.status(400).json({
            id: message.id,
            leadId: message.leadId,
            content: message.content,
            status: 'failed',
            timestamp: message.timestamp,
            error: errorMessage,
            unauthorizedNumber: isNotAuthorizedNumber,
            success: false
          });
        }
      } else {
        // Mensagem recebida, apenas retorna sucesso
        res.status(201).json({
          id: message.id,
          leadId: message.leadId,
          content: message.content,
          status: message.status,
          timestamp: message.timestamp,
          success: true
        });
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      res.status(500).json({ message: "Erro ao enviar mensagem", error: String(error) });
    }
  });
  
  // Enviar imagem pelo WhatsApp
  app.post('/api/whatsapp/send-image', async (req, res) => {
    try {
      const { leadId, imageUrl, caption } = req.body;
      
      if (!leadId || !imageUrl) {
        return res.status(400).json({ 
          message: "ID do lead e URL da imagem são obrigatórios" 
        });
      }
      
      // Verificar se o lead existe
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }
      
      // Validar número de telefone
      const formattedPhone = formatPhoneNumber(lead.phone);
      if (!formattedPhone) {
        return res.status(400).json({ 
          message: "Número de telefone inválido ou não encontrado para o lead" 
        });
      }
      
      // Criar a mensagem no banco de dados com status 'pending'
      const message = await storage.createWhatsappMessage({
        leadId,
        direction: 'outgoing',
        content: caption || '[Imagem enviada]',
        status: 'pending',
        mediaUrl: imageUrl,
        mediaType: 'image'
      });
      
      // Enviar a imagem via API do WhatsApp
      const result = await sendWhatsAppImage(lead, imageUrl, caption || '');
      
      // Atualizar o status com base na resposta da API
      if (result.success) {
        await storage.updateWhatsappMessageStatus(message.id, 'sent');
        
        // Se temos um ID da mensagem da API do WhatsApp, salvamos no banco
        if (result.messageId) {
          await storage.updateWhatsappMessageId(message.id, result.messageId);
        }
        
        res.status(201).json({
          id: message.id,
          leadId: message.leadId,
          content: message.content,
          status: 'sent',
          timestamp: message.timestamp,
          mediaUrl: imageUrl,
          mediaType: 'image',
          messageId: result.messageId,
          success: true
        });
      } else {
        await storage.updateWhatsappMessageStatus(message.id, 'failed');
        
        // Verificar se o erro é por causa de número não autorizado
        const errorMessage = result.error || 'Erro desconhecido';
        const isNotAuthorizedNumber = errorMessage.includes('not in allowed list');
        
        console.error(`Falha ao enviar imagem WhatsApp: ${errorMessage}`);
        
        res.status(400).json({
          id: message.id,
          leadId: message.leadId,
          content: message.content,
          status: 'failed',
          timestamp: message.timestamp,
          mediaUrl: imageUrl,
          mediaType: 'image',
          error: errorMessage,
          unauthorizedNumber: isNotAuthorizedNumber,
          success: false
        });
      }
    } catch (error) {
      console.error('Erro ao enviar imagem WhatsApp:', error);
      res.status(500).json({ 
        message: "Erro ao enviar imagem", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // Webhook para receber eventos da Evolution API
  app.post('/api/whatsapp/webhook', async (req, res) => {
    try {
      const data = req.body;
      console.log('Webhook recebido da Evolution API:', JSON.stringify(data));
      
      // Verificar se é uma mensagem recebida
      if (data.event === 'messages.upsert' || data.type === 'message') {
        // Extrair dados da mensagem recebida
        const message = data.message || data.data;
        const from = message?.from || message?.sender || data.from;
        const content = message?.text?.body || message?.body || message?.content || message?.caption || '[Mensagem sem texto]';
        const messageId = message?.id || data.messageId || `incoming_${Date.now()}`;
        const mediaUrl = message?.mediaUrl || message?.url;
        const mediaType = message?.mediaType || (mediaUrl ? 'image' : null);
        
        if (!from) {
          return res.status(400).json({ 
            success: false, 
            message: 'Número de origem não encontrado na mensagem' 
          });
        }
        
        // Encontrar o lead pelo número de telefone
        const cleanPhone = from.replace(/[^\d]/g, '');
        const leads = await storage.getLeadsByPhone(cleanPhone);
        
        if (!leads || leads.length === 0) {
          console.warn(`Mensagem recebida de número não cadastrado: ${from}`);
          return res.status(404).json({ 
            success: false, 
            message: 'Lead não encontrado para este número' 
          });
        }
        
        // Usar o primeiro lead encontrado com este número
        const lead = leads[0];
        
        // Criar a mensagem no banco de dados
        const messageData = {
          leadId: lead.id,
          direction: 'incoming',
          content,
          status: 'received',
          messageId,
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null
        };
        
        await storage.createWhatsappMessage(messageData);
        
        res.status(201).json({ 
          success: true, 
          message: 'Mensagem recebida e salva com sucesso',
          leadId: lead.id
        });
      } 
      // Verificar se é uma atualização de status
      else if (data.event === 'messages.update' || data.type === 'status') {
        const messageId = data.messageId || data.id;
        const status = data.status || data.newStatus || 'unknown';
        
        if (!messageId) {
          return res.status(400).json({ 
            success: false, 
            message: 'ID da mensagem não encontrado na atualização de status' 
          });
        }
        
        // Encontrar a mensagem pelo ID da API
        const message = await storage.getWhatsappMessageByApiId(messageId);
        
        if (!message) {
          console.warn(`Atualização de status para mensagem desconhecida: ${messageId}`);
          return res.status(404).json({ 
            success: false, 
            message: 'Mensagem não encontrada' 
          });
        }
        
        // Atualizar o status da mensagem
        await storage.updateWhatsappMessageStatus(message.id, status);
        
        res.json({ 
          success: true, 
          message: 'Status da mensagem atualizado',
          previousStatus: message.status,
          newStatus: status
        });
      } else {
        // Outros tipos de eventos, apenas confirmar recebimento
        res.json({ 
          success: true, 
          message: 'Evento recebido',
          eventType: data.event || data.type || 'unknown'
        });
      }
    } catch (error) {
      console.error('Erro ao processar webhook WhatsApp:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao processar webhook',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

// Enviar template pelo WhatsApp
  app.post('/api/whatsapp/template', async (req, res) => {
    try {
      const { leadId, templateName, language } = req.body;
      
      if (!leadId || !templateName) {
        return res.status(400).json({ message: "ID do lead e nome do template são obrigatórios" });
      }
      
      // Verificar se o lead existe
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }
      
      // Criar entrada da mensagem no banco de dados
      const messageData = {
        leadId,
        direction: 'outgoing',
        content: `Template: ${templateName}`,
        status: 'pending',
        mediaUrl: null,
        mediaType: null
      };
      
      // Salvar a mensagem no banco de dados
      const message = await storage.createWhatsappMessage(messageData);
      
      // Enviar o template
      const result = await sendWhatsAppTemplate(lead, templateName, language || 'pt_BR');
      
      // Atualizar mensagem com resultado da API
      if (result.success) {
        await storage.updateWhatsappMessageStatus(message.id, 'sent');
        
        if (result.messageId) {
          await storage.updateWhatsappMessageId(message.id, result.messageId);
        }
        
        res.json({ 
          success: true, 
          messageId: result.messageId,
          message: 'Template enviado com sucesso'
        });
      } else {
        await storage.updateWhatsappMessageStatus(message.id, 'failed');
        res.status(400).json({ 
          success: false, 
          message: result.error || 'Erro ao enviar template' 
        });
      }
    } catch (error) {
      console.error('Erro ao enviar template WhatsApp:', error);
      res.status(500).json({ message: "Erro ao enviar template WhatsApp" });
    }
  });

  // Webhook para receber notificações do WhatsApp
  app.post('/api/whatsapp/webhook', async (req, res) => {
    try {
      console.log('Webhook WhatsApp recebido:', JSON.stringify(req.body, null, 2));
      
      // Verificação do webhook conforme documentação da Meta
      // https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/
      
      // 1. Verificação de hub (para configuração inicial do webhook)
      if (req.query && req.query['hub.mode'] === 'subscribe') {
        const token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'favale_pink_webhook';
        
        if (req.query['hub.verify_token'] === token) {
          console.log('Webhook verificado!');
          return res.send(req.query['hub.challenge']);
        } else {
          console.warn('Verificação do webhook falhou - token inválido');
          return res.status(403).send('Forbidden');
        }
      }
      
      // 2. Processamento de eventos
      const data = req.body;
      
      // Verificar se é uma notificação válida
      if (!data || !data.object || !data.entry || !Array.isArray(data.entry)) {
        return res.status(400).json({ message: 'Formato de webhook inválido' });
      }
      
      // Processar mensagens recebidas
      for (const entry of data.entry) {
        // Verificar se há mudanças na mensagem
        if (!entry.changes || !Array.isArray(entry.changes)) continue;
        
        for (const change of entry.changes) {
          // Verificar se é uma mensagem do WhatsApp
          if (change.field !== 'messages') continue;
          
          const value = change.value;
          if (!value || !value.messages || !Array.isArray(value.messages)) continue;
          
          // Processar cada mensagem recebida
          for (const message of value.messages) {
            // Só processar mensagens recebidas (não as enviadas pelo sistema)
            if (message.type !== 'text' || !message.from) continue;
            
            const phoneNumber = message.from;
            const messageContent = message.text?.body || '';
            const messageId = message.id;
            
            // Buscar lead pelo número de telefone
            const leadsByPhone = await db.select().from(leads).where(sql`phone = ${phoneNumber}`);
            
            if (leadsByPhone.length === 0) {
              console.warn(`Recebida mensagem de número não cadastrado: ${phoneNumber}`);
              continue;
            }
            
            const lead = leadsByPhone[0];
            
            // Registrar a mensagem recebida
            await storage.createWhatsappMessage({
              leadId: lead.id,
              direction: 'incoming',
              content: messageContent,
              status: 'received',
              messageId
            });
            
            console.log(`Mensagem recebida de ${lead.name} (${phoneNumber}): ${messageContent}`);
          }
        }
      }
      
      // Responder com 200 OK para confirmar o recebimento
      res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error('Erro ao processar webhook do WhatsApp:', error);
      res.status(500).json({ message: 'Erro interno ao processar webhook' });
    }
  });
  
  // Endpoint para verificar webhook (GET)
  app.get('/api/whatsapp/webhook', (req, res) => {
    // Verificar token conforme documentação da Meta
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'favale_pink_webhook';
    
    // Verificar se token enviado corresponde ao configurado
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verificado com sucesso!');
      res.status(200).send(challenge);
    } else {
      console.warn('Falha na verificação do webhook');
      res.sendStatus(403);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
