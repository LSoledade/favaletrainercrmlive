import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, leadValidationSchema, whatsappMessageValidationSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { logAuditEvent, AuditEventType, getRecentAuditLogs } from "./audit-log";
import { sendWhatsAppMessage, sendWhatsAppTemplate, checkWhatsAppConnection } from "./whatsapp-service";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);
  
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

  // Endpoints de usuários (apenas para administradores)
  app.get("/api/users", isAdmin, async (_req, res) => {
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

      // Processar todos os leads de uma vez      
      const results = { 
        success: [], 
        errors: [] 
      };
      
      for (let i = 0; i < leads.length; i++) {
        try {
          const leadData = leads[i];
          
          // Validar cada lead individualmente para melhor tratamento de erros
          const validationResult = leadValidationSchema.safeParse(leadData);
          
          if (!validationResult.success) {
            const validationError = fromZodError(validationResult.error);
            throw new Error(`Erro de validação: ${validationError.message}`);
          }
          
          const validatedLead = validationResult.data;
          
          // Converter qualquer string de data para objeto Date
          if (typeof validatedLead.entryDate === 'string') {
            validatedLead.entryDate = new Date(validatedLead.entryDate);
          }
          
          const lead = await storage.createLead(validatedLead);
          results.success.push({
            index: i,
            id: lead.id,
            email: lead.email
          });
        } catch (error) {
          console.error(`Erro ao processar lead #${i}:`, error);
          results.errors.push({
            index: i,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            data: leads[i]
          });
        }
      }
      
      // Registrar evento de auditoria da operação em lote
      logAuditEvent(AuditEventType.LEAD_BATCH_IMPORT, req, { 
        totalCount: leads.length,
        successCount: results.success.length,
        errorCount: results.errors.length
      });
      
      console.log(`Importação em lote concluída: ${results.success.length} sucesso, ${results.errors.length} erros`);
      res.status(200).json({
        message: `Importação concluída. ${results.success.length} leads importados com sucesso.`,
        totalProcessed: leads.length,
        successCount: results.success.length,
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
      const sessions = await response.json();
      
      // Adicionar detalhes extras para as sessões
      const sessionsWithDetails = sessions.map(session => ({
        ...session,
        trainerName: ['Amanda Silva', 'Ricardo Costa', 'Juliana Oliveira', 'Marcos Santos'][Math.floor(Math.random() * 4)],
        location: session.type === 'Presencial' ? ['Studio Favale', 'Academia Pink', 'Centro Esportivo'][Math.floor(Math.random() * 3)] : 'Online',
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
      const allSessions = await response.json();
      
      // Filtrar por período
      const filteredSessions = allSessions.filter(session => {
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
      const students = await response.json();
      const allLeads = await storage.getLeads();
      
      // Combinar estudantes com seus leads correspondentes
      const studentsWithLeads = students.map(student => {
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

  // Enviar mensagem de WhatsApp
  app.post('/api/whatsapp/send', async (req, res) => {
    try {
      const validationResult = whatsappMessageValidationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const messageData = validationResult.data;
      
      // Verificar se o lead existe
      const lead = await storage.getLead(messageData.leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }
      
      // Criar a mensagem no banco de dados com status 'pending'
      const messageWithPendingStatus = {
        ...messageData,
        status: 'pending'
      };
      
      const message = await storage.createWhatsappMessage(messageWithPendingStatus);
      
      // Enviar a mensagem via API do WhatsApp
      const result = await sendWhatsAppMessage(lead, messageData.content);
      
      // Atualizar o status com base na resposta da API
      if (result.success) {
        await storage.updateWhatsappMessageStatus(message.id, 'sent');
        message.status = 'sent';
        
        // Se temos um ID da mensagem da API do WhatsApp, salvamos no banco
        if (result.messageId) {
          await storage.updateWhatsappMessageId(message.id, result.messageId);
          message.messageId = result.messageId;
        }
      } else {
        await storage.updateWhatsappMessageStatus(message.id, 'failed');
        message.status = 'failed';
        // Registrar o erro para debug
        console.error(`Falha ao enviar mensagem WhatsApp: ${result.error}`);
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Erro ao enviar mensagem de WhatsApp:', error);
      res.status(500).json({ message: "Erro ao enviar mensagem de WhatsApp" });
    }
  });

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
  
  // Verificar conexão com a API do WhatsApp
  app.get('/api/whatsapp/status', async (req, res) => {
    try {
      const connectionStatus = await checkWhatsAppConnection();
      
      if (connectionStatus.success) {
        res.json({ status: 'connected', message: 'Conexão com a API do WhatsApp está funcionando corretamente' });
      } else {
        res.status(503).json({ status: 'disconnected', message: connectionStatus.error || 'Falha na conexão com a API do WhatsApp' });
      }
    } catch (error) {
      console.error('Erro ao verificar status da API:', error);
      res.status(500).json({ status: 'error', message: 'Erro ao verificar conexão com a API do WhatsApp' });
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

  const httpServer = createServer(app);

  return httpServer;
}
