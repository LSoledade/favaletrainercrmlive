import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeadSchema, leadValidationSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Batch operations for leads
  app.post('/api/leads/batch/update', async (req, res) => {
    try {
      const { ids, updates } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "IDs de leads são obrigatórios" });
      }
      
      const count = await storage.updateLeadsInBatch(ids, updates);
      res.json({ updatedCount: count });
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar leads em lote" });
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
      const validationResult = leadValidationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        console.error('Erro de validação:', validationError.message);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.log('Dados validados:', validationResult.data);
      const newLead = await storage.createLead(validationResult.data);
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
      const validationResult = insertLeadSchema.partial().safeParse(req.body);
      
      if (!validationResult.success) {
        const validationError = fromZodError(validationResult.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      const updatedLead = await storage.updateLead(leadId, validationResult.data);
      
      if (!updatedLead) {
        return res.status(404).json({ message: "Lead não encontrado" });
      }
      
      res.json(updatedLead);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar lead" });
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
