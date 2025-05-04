import { leads, type Lead, type InsertLead, type User, type InsertUser, users } from "@shared/schema";
import { db, pool } from "./db";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
    const result = await db
      .delete(leads)
      .where(eq(leads.id, id));
    return true; // Assuming no error means success
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
    
    await db
      .delete(leads)
      .where(sql`${leads.id} IN (${sql.join(ids, sql`, `)})`);
    
    return ids.length; // Return the number of deleted rows
  }
}

// Inicializa o armazenamento usando o banco de dados PostgreSQL
export const storage = new DatabaseStorage();
