import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, leadValidationSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

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

  // Batch operations for leads
  app.post('/api/leads/batch/update', async (req, res) => {
    try {
      const { ids, updates } = req.body;
      console.log('Atualizando leads em lote:', { ids, updates });
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "IDs de leads são obrigatórios" });
      }
      
      const validationResult = insertLeadSchema.partial().safeParse(updates);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        console.error('Erro de validação na atualização em lote:', validationError.message);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Preparar os dados para atualização
      let dataToUpdate = validationResult.data;
      
      // Se entryDate for uma string, converter para Date
      if (dataToUpdate.entryDate && typeof dataToUpdate.entryDate === 'string') {
        dataToUpdate = {
          ...dataToUpdate,
          entryDate: new Date(dataToUpdate.entryDate)
        };
      }
      
      console.log('Dados para atualização em lote:', dataToUpdate);
      const count = await storage.updateLeadsInBatch(ids, dataToUpdate);
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
      
      const count = await storage.deleteLeadsInBatch(ids);
      res.json({ deletedCount: count });
    } catch (error) {
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
      const validationResult = insertLeadSchema.partial().safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        console.error('Erro de validação na atualização:', validationError.message);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Preparar os dados para atualização
      let dataToUpdate = validationResult.data;
      
      // Se entryDate for uma string, converter para Date
      if (dataToUpdate.entryDate && typeof dataToUpdate.entryDate === 'string') {
        dataToUpdate = {
          ...dataToUpdate,
          entryDate: new Date(dataToUpdate.entryDate)
        };
      }
      
      console.log('Dados para atualização:', dataToUpdate);
      const updatedLead = await storage.updateLead(leadId, dataToUpdate);
      
      if (!updatedLead) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }
      
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
      const success = await storage.deleteLead(leadId);
      
      if (!success) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar lead" });
    }
  });
  
  // Get lead statistics
  app.get('/api/stats', async (req, res) => {
    try {
      const allLeads = await storage.getLeads();
      const alunos = allLeads.filter(lead => lead.status === "Aluno");
      
      // Count leads by source
      const leadsBySource = {
        "Favale": allLeads.filter(lead => lead.source === "Favale").length,
        "Pink": allLeads.filter(lead => lead.source === "Pink").length
      };
      
      // Count leads by state
      const leadsByState: Record<string, number> = {};
      allLeads.forEach(lead => {
        leadsByState[lead.state] = (leadsByState[lead.state] || 0) + 1;
      });
      
      // Count leads by campaign
      const leadsByCampaign: Record<string, number> = {};
      allLeads.forEach(lead => {
        leadsByCampaign[lead.campaign] = (leadsByCampaign[lead.campaign] || 0) + 1;
      });
      
      // Calculate conversion rate
      const conversionRate = allLeads.length > 0 
        ? (alunos.length / allLeads.length) * 100 
        : 0;
      
      const stats = {
        totalLeads: allLeads.length,
        totalStudents: alunos.length,
        conversionRate: conversionRate.toFixed(1),
        leadsBySource,
        leadsByState,
        leadsByCampaign,
        totalLeadsByCampaign: leadsByCampaign ? Object.values(leadsByCampaign).reduce((a, b) => a + b, 0) : 0
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
