import { createContext, useContext } from "react";
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import {
  UseMutationResult,
} from "@tanstack/react-query";
import { User, InsertUser } from "@/types"; // Updated

// Define Supabase Auth specific types
export type SupabaseAuthContextType = {
  session: Session | null;
  user: SupabaseUser | null;
  profile: User | null;
  isLoading: boolean;
  error: AuthError | Error | null;
  loginMutation: UseMutationResult<Session | null, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  changePasswordMutation: UseMutationResult<void, Error, ChangePasswordData>; // Added
};

export type LoginData = Pick<InsertUser, "username" | "password"> & { email?: string };
export type RegisterData = InsertUser & { email: string };
export type ChangePasswordData = { newPassword: string }; // Added

// AuthContext remains here, to be imported by AuthProvider
export const AuthContext = createContext<SupabaseAuthContextType | null>(null);

export function useAuth(): SupabaseAuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
