// supabase.ts
// TODO: Run 'npx supabase gen types typescript --project-id "pfomvtkvyoxeksjwhwzb" > client/src/types/supabase.ts'
// in your local environment and paste the generated types here.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Placeholder for the Database interface that will be generated by Supabase CLI
export interface Database {
  public: {
    Tables: {
      // Add your table definitions here as placeholders if you know them
      // Example:
      // profiles: {
      //   Row: {
      //     id: string
      //     updated_at: string | null
      //     username: string | null
      //     full_name: string | null
      //     avatar_url: string | null
      //     website: string | null
      //     role: string | null
      //   }
      //   Insert: {
      //     id: string
      //     updated_at?: string | null
      //     username?: string | null
      //     full_name?: string | null
      //     avatar_url?: string | null
      //     website?: string | null
      //     role?: string | null
      //   }
      //   Update: {
      //     id?: string
      //     updated_at?: string | null
      //     username?: string | null
      //     full_name?: string | null
      //     avatar_url?: string | null
      //     website?: string | null
      //     role?: string | null
      //   }
      //   Relationships: [
      //     {
      //       foreignKeyName: "profiles_id_fkey"
      //       columns: ["id"]
      //       referencedRelation: "users"
      //       referencedColumns: ["id"]
      //     }
      //   ]
      // }
    }
    Views: {
      // Add your view definitions here
    }
    Functions: {
      // Add your function definitions here
    }
    Enums: {
      // Add your enum definitions here
    }
    CompositeTypes: {
      // Add your composite type definitions here
    }
  }
}

// Helper types based on the Database interface (will be useful once populated)
// Example:
// export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
// export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
// export type Functions<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T]
