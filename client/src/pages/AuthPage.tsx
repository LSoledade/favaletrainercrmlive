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
      <div className="w-full lg:w-1/2 p-8 lg:p-16 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">Favale & Pink</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Sistema de Gerenciamento de Leads
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
            
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome de Usuário</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite seu usuário" {...field} />
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
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Digite sua senha"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full mt-6"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </Form>

            <p className="mt-6 text-sm text-center text-gray-500">
              Entre em contato com o administrador do sistema para solicitar acesso.
            </p>
          </div>
        </div>
      </div>

      {/* Hero Image Section */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-r from-primary/20 to-secondary/20 p-16 flex items-center justify-center">
        <div className="max-w-md text-center">
          <h2 className="text-4xl font-bold mb-4">Sistema de Gerenciamento de Leads</h2>
          <p className="text-lg mb-6">
            Controle completo de leads para Personal Training. Acompanhe suas conversões, campanhas e resultados em um único lugar.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="font-bold text-xl">Gestão</h3>
              <p className="mt-2">Gerencie leads de forma eficiente</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="font-bold text-xl">Análise</h3>
              <p className="mt-2">Dados e estatísticas em tempo real</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
              <h3 className="font-bold text-xl">Conversão</h3>
              <p className="mt-2">Aumente sua taxa de conversão</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}