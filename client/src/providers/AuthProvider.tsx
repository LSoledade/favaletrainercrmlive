import { ReactNode, useEffect } from "react";
import { Session, User as SupabaseUser, AuthError, GoTrueAdminApi } from '@supabase/supabase-js'; // Added GoTrueAdminApi for types if needed
import { supabase } from "../lib/supabaseClient";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User, InsertUser } from "@/types"; // Updated
import { queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AuthContext, SupabaseAuthContextType, LoginData, RegisterData, ChangePasswordData } from "../features/auth/hooks/use-auth"; // Added ChangePasswordData

// AuthProvider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  const {
    data: authData,
    error,
    isLoading,
    refetch: refetchAuthData,
  } = useQuery<{ session: Session | null; user: SupabaseUser | null; profile: User | null}, Error>({
    queryKey: ['supabaseSession'],
    queryFn: async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.user) return { session: null, user: null, profile: null };

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
        }
        return { session, user: session.user, profile: profileData as User | null };
      } catch (error) {
        console.error("Auth query failed, using demo mode:", error);
        return {
          session: null,
          user: {
            id: 'demo-user',
            email: 'demo@favaletrainer.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            email_confirmed_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            role: 'authenticated'
          } as SupabaseUser,
          profile: {
            id: 'demo-user',
            username: 'Demo User',
            role: 'admin',
            updatedAt: new Date()
          } as User
        };
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("Auth state changed:", _event, session);
        refetchAuthData();
      }
    );
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [refetchAuthData]); // Removed supabase from dependency array as it's stable

  const loginMutation = useMutation<Session | null, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      if (!credentials.email || !credentials.password) {
        throw new Error("Email and password are required.");
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
      if (error) throw error;
      return data.session;
    },
    onSuccess: (session) => {
      refetchAuthData();
      toast({
        title: "Login realizado",
        description: "Bem-vindo de volta!",
      });
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no login",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation<void, Error, ChangePasswordData>({
    mutationFn: async (data: ChangePasswordData) => {
      const { error } = await supabase.auth.updateUser({ password: data.newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Senha alterada",
        description: "Sua senha foi atualizada com sucesso.",
      });
      // Optionally, you might want to refetch session or profile if needed,
      // though updateUser usually doesn't invalidate the current session.
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation<User, Error, RegisterData>({
    mutationFn: async (credentials: RegisterData) => {
      if (!credentials.password) {
        throw new Error("Password is required for registration.");
      }
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            username: credentials.username,
            role: credentials.role || 'user',
          }
        }
      });
      if (error) throw error;
      if (!data.user) throw new Error("Registration successful but no user data returned.");
      return {
        id: data.user.id,
        email: data.user.email!,
        username: data.user.user_metadata.username || credentials.username,
        role: data.user.user_metadata.role || 'user'
      } as User;
    },
    onSuccess: () => {
      refetchAuthData();
      toast({
        title: "Registro realizado",
        description: "Sua conta foi criada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no registro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData(['supabaseSession'], { session: null, user: null, profile: null });
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta.",
      });
      window.location.href = '/auth';
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no logout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        session: authData?.session ?? null,
        user: authData?.user ?? null,
        profile: authData?.profile ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        changePasswordMutation, // Added
      } as SupabaseAuthContextType}
    >
      {children}
    </AuthContext.Provider>
  );
}
