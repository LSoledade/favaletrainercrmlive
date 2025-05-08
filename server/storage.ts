import { 
  leads, students, trainers, sessions, sessionHistory, whatsappMessages,
  type Lead, type InsertLead, 
  type User, type InsertUser, 
  type Student, type InsertStudent,
  type Trainer, type InsertTrainer,
  type Session, type InsertSession,
  type SessionHistory, type InsertSessionHistory,
  type WhatsappMessage, type InsertWhatsappMessage,
  users 
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, desc, asc, between, inArray, or, like, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { alias } from "drizzle-orm/pg-core";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;
  
  // Lead methods
  getLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  deleteLead(id: number): Promise<boolean>;
  getLeadsBySource(source: string): Promise<Lead[]>;
  getLeadsByStatus(status: string): Promise<Lead[]>;
  getLeadsByCampaign(campaign: string): Promise<Lead[]>;
  getLeadsByState(state: string): Promise<Lead[]>;
  
  // Batch operations
  updateLeadsInBatch(ids: number[], updates: Partial<InsertLead>): Promise<number>;
  deleteLeadsInBatch(ids: number[]): Promise<number>;
  
  // WhatsApp methods
  getWhatsappMessages(leadId: number): Promise<WhatsappMessage[]>;
  createWhatsappMessage(message: InsertWhatsappMessage): Promise<WhatsappMessage>;
  updateWhatsappMessageStatus(id: number, status: string): Promise<WhatsappMessage | undefined>;
  updateWhatsappMessageId(id: number, messageId: string): Promise<WhatsappMessage | undefined>;
  deleteWhatsappMessage(id: number): Promise<boolean>;
  
  // Trainer methods
  getTrainers(): Promise<Trainer[]>;
  getTrainer(id: number): Promise<Trainer | undefined>;
  createTrainer(trainer: InsertTrainer): Promise<Trainer>;
  updateTrainer(id: number, trainer: Partial<InsertTrainer>): Promise<Trainer | undefined>;
  deleteTrainer(id: number): Promise<boolean>;
  getActiveTrainers(): Promise<Trainer[]>;
  getTrainersBySpecialty(specialty: string): Promise<Trainer[]>;
  
  // Student methods
  getStudents(): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByLeadId(leadId: number): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student | undefined>;
  deleteStudent(id: number): Promise<boolean>;
  getActiveStudents(): Promise<Student[]>;
  getStudentsBySource(source: string): Promise<Student[]>;
  getStudentsWithLeadInfo(): Promise<(Student & { lead: Lead })[]>;
  
  // Session methods
  getSessions(): Promise<Session[]>;
  getSession(id: number): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, session: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: number): Promise<boolean>;
  getSessionsByStudentId(studentId: number): Promise<Session[]>;
  getSessionsByTrainerId(trainerId: number): Promise<Session[]>;
  getSessionsByDateRange(startDate: Date, endDate: Date): Promise<Session[]>;
  getSessionsByStatus(status: string): Promise<Session[]>;
  getSessionsBySource(source: string): Promise<Session[]>;
  getSessionsWithDetails(): Promise<any[]>; // Retorna sessões com dados de alunos e professores
  getCompletedSessionsByStudent(studentId: number, startDate?: Date, endDate?: Date): Promise<Session[]>;
  
  // Session history methods
  createSessionHistory(history: InsertSessionHistory): Promise<SessionHistory>;
  getSessionHistoryBySessionId(sessionId: number): Promise<SessionHistory[]>;
  
  // Session store for authentication
  sessionStore: session.Store;
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      return false;
    }
  }

  // Lead methods
  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads);
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    try {
      console.log('Inserindo lead no banco:', {
        ...insertLead,
        notes: insertLead.notes || null,
      });
      
      const [lead] = await db
        .insert(leads)
        .values({
          ...insertLead,
          notes: insertLead.notes || null,
        })
        .returning();
      
      console.log('Lead criado com sucesso:', lead);
      return lead;
    } catch (error) {
      console.error('Erro ao inserir lead no banco:', error);
      throw error;
    }
  }

  async updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    const [updatedLead] = await db
      .update(leads)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();
    return updatedLead || undefined;
  }

  async deleteLead(id: number): Promise<boolean> {
    try {
      // First delete any associated WhatsApp messages
      await db
        .delete(whatsappMessages)
        .where(eq(whatsappMessages.leadId, id));
      
      // Then delete the lead
      await db
        .delete(leads)
        .where(eq(leads.id, id));
        
      return true;
    } catch (error) {
      console.error("Erro ao excluir lead:", error);
      throw error; // Re-throw to be caught by the route handler
    }
  }

  async getLeadsBySource(source: string): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(eq(leads.source, source));
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(eq(leads.status, status));
  }

  async getLeadsByCampaign(campaign: string): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(eq(leads.campaign, campaign));
  }

  async getLeadsByState(state: string): Promise<Lead[]> {
    return await db
      .select()
      .from(leads)
      .where(eq(leads.state, state));
  }

  // Batch operations
  async updateLeadsInBatch(ids: number[], updates: Partial<InsertLead>): Promise<number> {
    if (ids.length === 0) return 0;
    
    const result = await db
      .update(leads)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(sql`${leads.id} IN (${sql.join(ids, sql`, `)})`);
    
    return ids.length; // Return the number of affected rows
  }

  async deleteLeadsInBatch(ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    // First delete all WhatsApp messages associated with these leads
    try {
      // Delete related WhatsApp messages first
      await db
        .delete(whatsappMessages)
        .where(sql`${whatsappMessages.leadId} IN (${sql.join(ids, sql`, `)})`);
      
      // Then delete the leads
      await db
        .delete(leads)
        .where(sql`${leads.id} IN (${sql.join(ids, sql`, `)})`);
      
      return ids.length; // Return the number of deleted rows
    } catch (error) {
      console.error("Erro ao excluir leads em lote:", error);
      throw error; // Re-throw to be caught by the route handler
    }
  }
  
  // Trainer methods
  async getTrainers(): Promise<Trainer[]> {
    return await db.select().from(trainers).orderBy(trainers.name);
  }

  async getTrainer(id: number): Promise<Trainer | undefined> {
    const [trainer] = await db.select().from(trainers).where(eq(trainers.id, id));
    return trainer || undefined;
  }

  async createTrainer(insertTrainer: InsertTrainer): Promise<Trainer> {
    const [trainer] = await db
      .insert(trainers)
      .values({
        ...insertTrainer,
      })
      .returning();
    return trainer;
  }

  async updateTrainer(id: number, updates: Partial<InsertTrainer>): Promise<Trainer | undefined> {
    const [updatedTrainer] = await db
      .update(trainers)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(trainers.id, id))
      .returning();
    return updatedTrainer || undefined;
  }

  async deleteTrainer(id: number): Promise<boolean> {
    try {
      await db.delete(trainers).where(eq(trainers.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir professor:", error);
      return false;
    }
  }

  async getActiveTrainers(): Promise<Trainer[]> {
    return await db
      .select()
      .from(trainers)
      .where(eq(trainers.active, true))
      .orderBy(trainers.name);
  }

  async getTrainersBySpecialty(specialty: string): Promise<Trainer[]> {
    // A busca por especialidade é mais complexa porque é um array
    // Usamos SQL customizado para verificar se o array contém a especialidade
    return await db
      .select()
      .from(trainers)
      .where(sql`${specialty} = ANY(${trainers.specialties})`);
  }

  // Student methods
  async getStudents(): Promise<Student[]> {
    return await db.select().from(students).orderBy(students.id);
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student || undefined;
  }

  async getStudentByLeadId(leadId: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.leadId, leadId));
    return student || undefined;
  }

  async createStudent(insertStudent: InsertStudent): Promise<Student> {
    const [student] = await db
      .insert(students)
      .values({
        ...insertStudent,
      })
      .returning();
    return student;
  }

  async updateStudent(id: number, updates: Partial<InsertStudent>): Promise<Student | undefined> {
    const [updatedStudent] = await db
      .update(students)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(students.id, id))
      .returning();
    return updatedStudent || undefined;
  }

  async deleteStudent(id: number): Promise<boolean> {
    try {
      await db.delete(students).where(eq(students.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir aluno:", error);
      return false;
    }
  }

  async getActiveStudents(): Promise<Student[]> {
    return await db
      .select()
      .from(students)
      .where(eq(students.active, true))
      .orderBy(students.id);
  }

  async getStudentsBySource(source: string): Promise<Student[]> {
    return await db
      .select()
      .from(students)
      .where(eq(students.source, source));
  }

  async getStudentsWithLeadInfo(): Promise<(Student & { lead: Lead })[]> {
    const result = await db
      .select({
        ...students,
        lead: leads,
      })
      .from(students)
      .leftJoin(leads, eq(students.leadId, leads.id));

    return result;
  }

  // Session methods
  async getSessions(): Promise<Session[]> {
    return await db.select().from(sessions).orderBy(desc(sessions.startTime));
  }

  async getSession(id: number): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db
      .insert(sessions)
      .values({
        ...insertSession,
      })
      .returning();
    return session;
  }

  async updateSession(id: number, updates: Partial<InsertSession>): Promise<Session | undefined> {
    const [updatedSession] = await db
      .update(sessions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id))
      .returning();
    return updatedSession || undefined;
  }

  async deleteSession(id: number): Promise<boolean> {
    try {
      await db.delete(sessions).where(eq(sessions.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir sessão:", error);
      return false;
    }
  }

  async getSessionsByStudentId(studentId: number): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.studentId, studentId))
      .orderBy(desc(sessions.startTime));
  }

  async getSessionsByTrainerId(trainerId: number): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.trainerId, trainerId))
      .orderBy(desc(sessions.startTime));
  }

  async getSessionsByDateRange(startDate: Date, endDate: Date): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(and(
        between(sessions.startTime, startDate, endDate),
      ))
      .orderBy(asc(sessions.startTime));
  }

  async getSessionsByStatus(status: string): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, status))
      .orderBy(desc(sessions.startTime));
  }

  async getSessionsBySource(source: string): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.source, source))
      .orderBy(desc(sessions.startTime));
  }

  async getSessionsWithDetails(): Promise<any[]> {
    // Alias para evitar colisões de nome
    const s = alias(students, 'student');
    const t = alias(trainers, 'trainer');
    const l = alias(leads, 'lead');

    return await db
      .select({
        id: sessions.id,
        startTime: sessions.startTime,
        endTime: sessions.endTime,
        location: sessions.location,
        notes: sessions.notes,
        status: sessions.status,
        source: sessions.source,
        googleEventId: sessions.googleEventId,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        student: {
          id: s.id,
          name: l.name,
          email: l.email,
          phone: l.phone,
          source: s.source,
          address: s.address,
        },
        trainer: {
          id: t.id,
          name: t.name,
          email: t.email,
          phone: t.phone,
          specialties: t.specialties,
        }
      })
      .from(sessions)
      .leftJoin(s, eq(sessions.studentId, s.id))
      .leftJoin(t, eq(sessions.trainerId, t.id))
      .leftJoin(l, eq(s.leadId, l.id))
      .orderBy(desc(sessions.startTime));
  }

  async getCompletedSessionsByStudent(
    studentId: number, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<Session[]> {
    let query = db
      .select()
      .from(sessions)
      .where(and(
        eq(sessions.studentId, studentId),
        eq(sessions.status, 'concluido') // Status para sessões completas
      ));
    
    if (startDate && endDate) {
      query = query.where(between(sessions.startTime, startDate, endDate));
    }
    
    return await query.orderBy(asc(sessions.startTime));
  }

  // Session history methods
  async createSessionHistory(history: InsertSessionHistory): Promise<SessionHistory> {
    const [sessionHistory] = await db
      .insert(sessionHistory)
      .values(history)
      .returning();
    return sessionHistory;
  }

  async getSessionHistoryBySessionId(sessionId: number): Promise<SessionHistory[]> {
    return await db
      .select()
      .from(sessionHistory)
      .where(eq(sessionHistory.sessionId, sessionId))
      .orderBy(desc(sessionHistory.changedAt));
  }

  // WhatsApp methods
  async getWhatsappMessages(leadId: number): Promise<WhatsappMessage[]> {
    return await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.leadId, leadId))
      .orderBy(asc(whatsappMessages.timestamp));
  }

  async createWhatsappMessage(message: InsertWhatsappMessage): Promise<WhatsappMessage> {
    const [newMessage] = await db
      .insert(whatsappMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async updateWhatsappMessageStatus(id: number, status: string): Promise<WhatsappMessage | undefined> {
    const [updatedMessage] = await db
      .update(whatsappMessages)
      .set({ status })
      .where(eq(whatsappMessages.id, id))
      .returning();
    return updatedMessage || undefined;
  }
  
  async updateWhatsappMessageId(id: number, messageId: string): Promise<WhatsappMessage | undefined> {
    const [updatedMessage] = await db
      .update(whatsappMessages)
      .set({ messageId })
      .where(eq(whatsappMessages.id, id))
      .returning();
    return updatedMessage || undefined;
  }

  async deleteWhatsappMessage(id: number): Promise<boolean> {
    try {
      await db.delete(whatsappMessages).where(eq(whatsappMessages.id, id));
      return true;
    } catch (error) {
      console.error("Erro ao excluir mensagem:", error);
      return false;
    }
  }
}

// Inicializa o armazenamento usando o banco de dados PostgreSQL
export const storage = new DatabaseStorage();
