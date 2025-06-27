import { useEffect } from 'react'; // Import useEffect
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter"; // Import useLocation
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import gymPixelImage from "@/assets/gym-pixel.png";

// Updated schema to use email for Supabase auth
const loginSchema = z.object({
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AuthPage() {
  // useAuth now returns { session, user (SupabaseUser), profile (custom User), loginMutation, etc. }
  const { session, loginMutation, isLoading } = useAuth();
  const [location, navigate] = useLocation(); // For redirect after login

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "", // Changed from username to email
      password: "",
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    // The loginMutation in useAuth now expects { email, password }
    // It internally calls supabase.auth.signInWithPassword
    loginMutation.mutate(values);
  };

  // Effect to redirect if session becomes available (e.g., after successful login)
  useEffect(() => {
    if (session) {
      navigate("/"); // Use navigate from wouter
    }
  }, [session, navigate]);

  // If still loading session state, show a loader or nothing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If already has a session, redirect (this might be covered by useEffect too, but good as a quick check)
  if (session) {
    return <Redirect to="/" />;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${gymPixelImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative'
      }}
    >
      {/* Overlay para melhorar legibilidade do formulário */}
      <div 
        className="absolute inset-0" 
        style={{ 
          backgroundColor: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(1px)'
        }}
      ></div>
      
      <div className="w-full max-w-md z-10 relative">
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Favale & Pink</h1>
          <p className="text-sm sm:text-base text-gray-300 mt-2">
            Bem-vindo ao CRM Favale & Pink
          </p>
        </div>

        <div className="bg-white/90 dark:bg-gray-900/90 p-6 sm:p-8 rounded-xl shadow-lg backdrop-blur-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-center">Login</h2>
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">
              Acesse sua conta
            </p>
          </div>
          
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
            >
              <FormField
                control={form.control}
                name="email" // Changed from username to email
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" // Set input type to email
                        placeholder="Digite seu email"
                        className="py-6" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Digite sua senha"
                        className="py-6"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full py-6 text-lg mt-8"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-center text-gray-500 dark:text-gray-400">
              Entre em contato com o administrador do sistema para solicitar acesso.
            </p>
            <p className="text-xs text-center mt-4">
              <a
                href="/politica-de-privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Política de Privacidade
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}