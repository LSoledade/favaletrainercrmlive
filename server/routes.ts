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
import { logAuditEvent, AuditEventType, getRecentAuditLogs } from "./audit-log";
import { 
  sendWhatsAppMessage, 
  sendWhatsAppTemplate, 
  checkWhatsAppConnection, 
  formatPhoneNumber, 
  sendWhatsAppImage,
  getWhatsAppQRCode,
  checkMessageStatus,
  saveConfigSettings,
  getConfigSettings
} from "./whatsapp-service";
import { getWeatherByCity, checkWeatherService } from "./weather-service";
import { log } from "./vite";
import { sql } from 'drizzle-orm';

// Import new user router and middlewares
import userRouter from "./routes/user.routes";
import leadRouter from "./routes/lead.routes"; // Import lead router
import taskRouter from "./routes/task.routes"; // Import task router
import whatsappRouter from "./routes/whatsapp.routes"; // Import whatsapp router
import auditLogRouter from "./routes/auditLog.routes"; // Import auditLog router
import weatherRouter from "./routes/weather.routes"; // Import weather router
import schedulingRouter from "./routes/scheduling.routes"; // Import scheduling router
import statsRouter from "./routes/stats.routes"; // Import stats router
import { isAuthenticated, isAdmin } from "./middlewares/auth.middleware"; // Import middlewares
import { addUserNamesToTasks } from "./utils/task.utils"; // Import addUserNamesToTasks
import oauthRoutes from './routes/oauth.routes';

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);

  // Use the new routers
  app.use("/api/users", userRouter);
  app.use("/api/leads", leadRouter); // Use lead router
  app.use("/api/tasks", taskRouter); // Use task router
  app.use("/api/whatsapp", whatsappRouter); // Use whatsapp router
  app.use("/api/audit-logs", auditLogRouter); // Use auditLog router
  app.use("/api/weather", weatherRouter); // Use weather router
  app.use("/api/scheduling", schedulingRouter); // Use scheduling router
  app.use("/api/stats", statsRouter); // Use stats router
  app.use('/api/oauth', oauthRoutes);

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

  const httpServer = createServer(app);

  return httpServer;
}