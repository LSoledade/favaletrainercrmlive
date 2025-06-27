import { createContext, ReactNode, useContext } from "react";
import {
// Import Supabase client and types
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js'; // For direct Supabase calls
import {
  useQuery,
  useMutation,
  UseMutationResult,
  QueryKey,
} from "@tanstack/react-query";
// Keep InsertUser if it's used for form validation, but Supabase might have its own types for registration
import { User, InsertUser } from "@shared/schema";
import { invokeSupabaseFunction, getSupabaseQueryFn, queryClient } from "../lib/queryClient"; // Updated imports
import { useToast } from "@/hooks/use-toast";


// Define Supabase Auth specific types
type SupabaseAuthContextType = {
  session: Session | null; // Supabase session
  user: SupabaseUser | null; // Supabase user object from session
  profile: User | null; // Your custom profile data (role, etc.)
  isLoading: boolean;
  error: AuthError | Error | null; // Can be Supabase AuthError or general Error
  loginMutation: UseMutationResult<Session | null, Error, LoginData>; // Login returns a session
  logoutMutation: UseMutationResult<void, Error, void>;
  // Register might return SupabaseUser or your custom User profile based on your Edge Function
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

type LoginData = Pick<InsertUser, "username" | "password"> & { email?: string }; // Supabase typically uses email for login
type RegisterData = InsertUser & { email: string }; // Ensure email is part of registration data for Supabase

export const AuthContext = createContext<SupabaseAuthContextType | null>(null);

// Helper to get Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or Anon Key is not defined.");
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  // Fetch initial session and user profile
  const {
    data: authData,
    error,
    isLoading,
    refetch: refetchAuthData,
  } = useQuery<{ session: Session | null; user: SupabaseUser | null; profile: User | null}, Error>({
    queryKey: ['supabaseSession'],
    queryFn: async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) return { session: null, user: null, profile: null };

      // Fetch user profile from your 'profiles' table (or similar)
      // This assumes your 'profiles' table has an 'id' matching 'auth.users.id' and a 'role'
      const { data: profileData, error: profileError } = await supabase
        .from('profiles') // Adjust table name if different
        .select('*') // Select role or other necessary profile fields
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116: no rows found, treat as no profile
        console.error("Error fetching profile:", profileError);
        // Decide if this should throw or just mean no custom profile data
      }
      return { session, user: session.user, profile: profileData as User | null };
    },
    staleTime: 5 * 60 * 1000, // Stale time of 5 minutes
    refetchOnWindowFocus: true,
  });

  // Listen to auth state changes
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("Auth state changed:", _event, session);
        refetchAuthData(); // Refetch session and profile on auth state change
      }
    );
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, refetchAuthData]);


  const loginMutation = useMutation<Session | null, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      // Supabase uses email and password for login by default.
      // If you're using username, your 'user-management' or a new 'auth' Edge Function
      // would need to handle username to email lookup before calling Supabase Auth.
      // For direct Supabase client login:
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email!, // Ensure email is provided
        password: credentials.password,
      });
      if (error) throw error;
      return data.session;
    },
    onSuccess: (session) => {
      // queryClient.setQueryData(['supabaseSession'], { session, user: session?.user, profile: fetchedProfile }); // Profile needs to be fetched
      refetchAuthData(); // Refetch to get user and profile
      toast({
        title: "Login realizado",
        description: "Bem-vindo de volta!",
      });
      // Redirecionar para a página principal
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

  const registerMutation = useMutation<User, Error, RegisterData>({
    mutationFn: async (credentials: RegisterData) => {
      // Registration will now typically be handled by an admin via the 'user-management' function
      // or if you allow public sign-ups, Supabase client's supabase.auth.signUp().
      // For this example, let's assume an admin is creating a user via the 'user-management' function.
      // If it's public sign-up, the approach would be different.
      // This example assumes `invokeSupabaseFunction` can call 'user-management' for creation.
      // However, the 'user-management' function was defined as admin-only.
      // For true self-registration, you'd use supabase.auth.signUp()
      // and potentially a trigger to create the profile.
      // For now, this will represent an admin creating a user.
      // This part needs clarification on whether it's self-registration or admin-creation.
      // Assuming self-registration for now, which means we should use supabase.auth.signUp
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: { // This data is passed to the user_metadata in auth.users and can be used by triggers
            username: credentials.username,
            role: credentials.role || 'user', // Default role to 'user' for self-registration
          }
        }
      });
      if (error) throw error;
      if (!data.user) throw new Error("Registration successful but no user data returned.");

      // After Supabase signUp, a profile might be created by a DB trigger.
      // We need to return the User profile, not just SupabaseUser.
      // For simplicity, returning a partial user object. A full profile fetch might be needed.
      return {
        id: data.user.id,
        email: data.user.email!,
        username: data.user.user_metadata.username || credentials.username,
        role: data.user.user_metadata.role || 'user'
      } as User; // Casting as User, ensure fields match
    },
    onSuccess: (createdUserProfile) => {
      // queryClient.setQueryData(['supabaseSession'], updatedAuthData); // This needs careful handling
      refetchAuthData(); // Refetch to update session and profile list if admin view
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
      // Redirecionar o usuário para a página de login
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): SupabaseAuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
