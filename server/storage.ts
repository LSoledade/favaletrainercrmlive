import { leads, type Lead, type InsertLead, type User, type InsertUser, users } from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private leadsMap: Map<number, Lead>;
  userCurrentId: number;
  leadCurrentId: number;

  constructor() {
    this.users = new Map();
    this.leadsMap = new Map();
    this.userCurrentId = 1;
    this.leadCurrentId = 1;
    
    // Add some initial data for testing
    this.initializeDemoData();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Lead methods
  async getLeads(): Promise<Lead[]> {
    return Array.from(this.leadsMap.values());
  }

  async getLead(id: number): Promise<Lead | undefined> {
    return this.leadsMap.get(id);
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = this.leadCurrentId++;
    const now = new Date();
    const lead: Lead = { 
      ...insertLead, 
      id, 
      entryDate: insertLead.entryDate || now,
      notes: insertLead.notes || null,
      createdAt: now, 
      updatedAt: now 
    };
    this.leadsMap.set(id, lead);
    return lead;
  }

  async updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead | undefined> {
    const existingLead = this.leadsMap.get(id);
    if (!existingLead) {
      return undefined;
    }

    const updatedLead: Lead = {
      ...existingLead,
      ...updates,
      updatedAt: new Date()
    };

    this.leadsMap.set(id, updatedLead);
    return updatedLead;
  }

  async deleteLead(id: number): Promise<boolean> {
    return this.leadsMap.delete(id);
  }

  async getLeadsBySource(source: string): Promise<Lead[]> {
    return Array.from(this.leadsMap.values()).filter(
      (lead) => lead.source === source
    );
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return Array.from(this.leadsMap.values()).filter(
      (lead) => lead.status === status
    );
  }

  async getLeadsByCampaign(campaign: string): Promise<Lead[]> {
    return Array.from(this.leadsMap.values()).filter(
      (lead) => lead.campaign === campaign
    );
  }

  async getLeadsByState(state: string): Promise<Lead[]> {
    return Array.from(this.leadsMap.values()).filter(
      (lead) => lead.state === state
    );
  }

  private initializeDemoData() {
    // This is only for initial setup of the application 
    // We're not going to use this data as mock data during runtime
    const campaigns = ["Instagram", "Facebook", "Email", "Site", "Indicação"];
    const sources = ["Favale", "Pink"];
    const statuses = ["Lead", "Aluno"];
    const states = ["SP", "RJ", "MG", "PR", "SC", "RS", "BA"];
    
    const demoUser: InsertUser = {
      username: "admin",
      password: "admin123"
    };
    this.createUser(demoUser);
  }
}

export const storage = new MemStorage();
