// client/src/types/index.ts

// Re-export types from Supabase generation (once populated)
// export * from "./supabase";
// For now, let's define a placeholder for Database until supabase.ts is populated
// export type { Database } from "./supabase";

// Re-export types from @shared/schema
export type {
  User,
  InsertUser,
  Profile as UserProfile, // Changed UserProfile to Profile
  Lead,
  InsertLead,
  leadValidationSchema,
  Session, // Assuming Session is a DB table type, not Supabase Auth Session
  InsertSession,
  Task,
  InsertTask,
  TaskComment,
  InsertTaskComment,
  WhatsappMessage,
  InsertWhatsappMessage,
  // Add other shared types as needed
} from "@shared/schema";

// You can also define additional client-specific global types here
// For example:
// export interface ClientAppSettings {
//   theme: 'light' | 'dark';
//   notificationsEnabled: boolean;
// }

// Placeholder for Supabase-generated types until the file is populated
// This allows other files to import from here, and it will work once supabase.ts is filled.
export type { Json as SupabaseJson } from "./supabase"; // Renaming to avoid conflict if Json is used elsewhere

// Example of how you might use the generated 'Database' type (once available)
// import { Database } from "./supabase";
// export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
// export type LeadRow = Database['public']['Tables']['leads']['Row'];
// ... etc.
