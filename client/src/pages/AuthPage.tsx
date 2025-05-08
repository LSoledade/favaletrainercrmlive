import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
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
import gymBackgroundImage from "@/assets/gym-background.svg";
import personalTrainingImage from "@/assets/personal-training.svg";

const loginSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const { user, loginMutation } = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  // Redirect to home if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Auth Form Section */}
      <div className="w-full lg:w-1/2 p-4 sm:p-8 lg:p-16 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-primary">Favale & Pink</h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2">
              Sistema de Gerenciamento de Leads
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-primary">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-center">Login</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Acesse o FavaleTrainer
              </p>
            </div>
            
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">Nome de Usuário</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Digite seu usuário" 
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
            </div>
          </div>
        </div>
      </div>

      {/* Hero Image Section */}
      <div 
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-r from-primary/20 to-secondary/20 p-16 items-center justify-center"
        style={{
          backgroundImage: `url(${gymBackgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative'
        }}
      >
        <div 
          className="absolute inset-0" 
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(2px)'
          }}
        ></div>
        
        <div className="max-w-md text-center relative z-10">
          <img 
            src={personalTrainingImage} 
            alt="Personal Training" 
            className="w-48 h-48 mx-auto mb-6 opacity-90" 
          />
          <h2 className="text-4xl font-bold mb-4 text-white">FavaleTrainer</h2>
          <p className="text-lg mb-6 text-white/90">
            Controle completo de leads para Personal Training. Acompanhe suas conversões, campanhas e resultados em um único lugar.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="font-bold text-xl text-white">Gestão</h3>
              <p className="mt-2 text-white/90">Gerencie leads de forma eficiente</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="font-bold text-xl text-white">Análise</h3>
              <p className="mt-2 text-white/90">Dados e estatísticas em tempo real</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="font-bold text-xl text-white">Conversão</h3>
              <p className="mt-2 text-white/90">Aumente sua taxa de conversão</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}