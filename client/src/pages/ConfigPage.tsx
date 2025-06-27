import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, 
         DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useQueryClient as useTanstackQueryClient } from "@tanstack/react-query"; // Renamed to avoid conflict
// Replace apiRequest, queryClient with Supabase specific ones
import { invokeSupabaseFunction, getSupabaseQueryFn } from "@/lib/queryClient";
import AuditLogViewer from "@/components/admin/AuditLogViewer";
import GoogleCalendarConfig from "@/components/oauth/GoogleCalendarConfig";

// Schema for changing password (if you implement this via an Edge Function)
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Schema for creating a new user (email is primary identifier for Supabase Auth)
const newUserSchema = z.object({
  email: z.string().email("Email inválido"),
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres").optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
  role: z.enum(["admin", "marketing", "comercial", "trainer"], {
    errorMap: () => ({ message: "Perfil inválido" })
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});


const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  leadAssignmentNotification: z.boolean().default(true),
  statusChangeNotification: z.boolean().default(true),
  marketingUpdates: z.boolean().default(false),
});

const systemSettingsSchema = z.object({
  companyName: z.string().min(1, "Nome da empresa é obrigatório"),
  primaryPhone: z.string().min(1, "Telefone principal é obrigatório"),
  primaryEmail: z.string().email("E-mail inválido").min(1, "E-mail principal é obrigatório"),
  defaultLeadStatus: z.string().min(1, "Status padrão é obrigatório"),
  defaultLeadSource: z.string().min(1, "Fonte padrão é obrigatória"),
});

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
type NotificationSettingsValues = z.infer<typeof notificationSettingsSchema>;
type SystemSettingsValues = z.infer<typeof systemSettingsSchema>;
type NewUserFormValues = z.infer<typeof newUserSchema>; // Renamed to avoid conflict with User type

// User type from Supabase (or your custom profile type if it differs significantly)
// This should match what your 'user-management' function returns for a list of users
type User = {
  id: string; // Supabase user ID is typically UUID (string)
  username?: string; // From your profiles table
  email?: string; // From auth.users
  role?: string;  // From your profiles table
  created_at?: string;
  last_sign_in_at?: string;
};

export default function ConfigPage() {
  // useAuth now returns { profile, session, user (SupabaseUser) }
  const { profile: currentProfile, user: currentAuthUser } = useAuth();
  const tanstackQueryClient = useTanstackQueryClient(); // Get query client instance
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const currentUserId = currentAuthUser?.id || ""; // Supabase user ID is string (UUID)
  
  // Fetch list of users using the 'user-management' Edge Function
  const { data: users = [], isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery<User[]>({ 
    queryKey: ["userList"], // Descriptive query key
    queryFn: getSupabaseQueryFn({
      functionName: 'user-management',
      on401: 'throw', // Or handle as needed
    }),
    enabled: currentProfile?.role === 'admin', // Only fetch if current user is admin
  });
  
  const newUserForm = useForm<NewUserFormValues>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      role: "trainer", // Default role, or make it empty
    },
  });

  // Form for changing password (if implemented)
  const changePasswordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });


  const notificationSettingsForm = useForm<NotificationSettingsValues>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      smsNotifications: false,
      leadAssignmentNotification: true,
      statusChangeNotification: true,
      marketingUpdates: false,
    },
  });

  const systemSettingsForm = useForm<SystemSettingsValues>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: {
      companyName: "Favale & Pink Personal Training",
      primaryPhone: "+55 (11) 99999-9999",
      primaryEmail: "contato@favalepink.com.br",
      defaultLeadStatus: "Lead",
      defaultLeadSource: "Favale",
    },
  });

  const onChangePasswordSubmit = async (values: ChangePasswordValues) => {
    // This requires a Supabase Edge Function or direct client call to supabase.auth.updateUser()
    // For Edge Function:
    // await invokeSupabaseFunction('user-management', 'POST', { newPassword: values.newPassword }, { slug: 'change-password' });
    // For direct client (if user is changing their own password):
    const supabase = (await import('@supabase/supabase-js')).createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!);
    const { error } = await supabase.auth.updateUser({ password: values.newPassword });
    if (error) {
      toast({ title: "Erro ao alterar senha", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Senha alterada", description: "Sua senha foi atualizada com sucesso." });
      changePasswordForm.reset();
    }
  };


  const onNotificationSettingsSubmit = (values: NotificationSettingsValues) => {
    console.log("Notification settings:", values);
    // Aqui você implementaria a lógica para salvar as configurações de notificação
    toast({
      title: "Notificações atualizadas",
      description: "Suas preferências de notificação foram salvas.",
    });
  };

  const onSystemSettingsSubmit = (values: SystemSettingsValues) => {
    console.log("System settings:", values);
    // Aqui você implementaria a lógica para salvar as configurações do sistema
    toast({
      title: "Configurações do sistema atualizadas",
      description: "As configurações do sistema foram atualizadas com sucesso.",
    });
  };
  
  const onCreateUserSubmit = async (values: NewUserFormValues) => {
    try {
      setIsUpdating(true);
      // Destructure to separate confirmPassword, and pass the rest to the Edge Function
      const { confirmPassword, ...userDataToSubmit } = values;
      
      // Call the 'user-management' Edge Function to create a user
      await invokeSupabaseFunction("user-management", "POST", userDataToSubmit);
      
      toast({
        title: "Usuário criado",
        description: `O usuário ${values.email} foi criado com sucesso.`, // Use email or username
      });
      
      newUserForm.reset();
      setIsNewUserDialogOpen(false);
      // Invalidate the query for the user list to refetch
      await tanstackQueryClient.invalidateQueries({ queryKey: ["userList"] });
      // refetchUsers(); // refetchUsers is good if you want to ensure it's done before UI update
    } catch (error) {
      toast({
        title: "Erro ao criar usuário",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const deleteUser = async (userId: number) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    
    try {
      // Call the 'user-management' Edge Function to delete a user
      // The user ID is passed as a slug
      await invokeSupabaseFunction("user-management", "DELETE", undefined, { slug: userId.toString() });
      
      toast({
        title: "Usuário excluído",
        description: "O usuário foi excluído com sucesso.",
      });
      
      // Invalidate the query for the user list to refetch
      await tanstackQueryClient.invalidateQueries({ queryKey: ["userList"] });
      // refetchUsers();
    } catch (error) {
      toast({
        title: "Erro ao excluir usuário",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card className="border-gray-100 dark:border-gray-700 shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-semibold text-gray-800 dark:text-white">Configurações</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            Gerencie as configurações da sua conta e do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-gray-100 dark:bg-gray-800 mb-4">
              <TabsTrigger 
                value="profile" 
                className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              >
                Perfil
              </TabsTrigger>
              <TabsTrigger 
                value="notifications" 
                className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              >
                Notificações
              </TabsTrigger>
              <TabsTrigger 
                value="system" 
                className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              >
                Sistema
              </TabsTrigger>
              <TabsTrigger 
                value="users" 
                className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              >
                Usuários
              </TabsTrigger>
              <TabsTrigger 
                value="calendar" 
                className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              >
                Google Calendar
              </TabsTrigger>
              {user?.role === 'admin' && (
                <TabsTrigger 
                  value="audit" 
                  className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
                >
                  Auditoria
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="profile" className="space-y-4">
              <Card className="border-gray-100 dark:border-gray-700 shadow-sm rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium text-gray-800 dark:text-white">Perfil do Usuário</CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400">
                    Informações do seu perfil e opção para alterar senha.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Display user profile info */}
                  <div className="space-y-2 mb-6">
                    <div>
                      <span className="font-medium">Email:</span> {currentAuthUser?.email}
                    </div>
                    <div>
                      <span className="font-medium">Nome de Usuário:</span> {currentProfile?.username || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Perfil (Role):</span> {currentProfile?.role || 'N/A'}
                    </div>
                  </div>

                  <Separator className="my-4" />
                  <h3 className="text-md font-medium mb-4">Alterar Senha</h3>
                  {/* Change Password Form */}
                  <Form {...changePasswordForm}>
                    <form onSubmit={changePasswordForm.handleSubmit(onChangePasswordSubmit)} className="space-y-4">
                       <FormField
                        control={changePasswordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha Atual</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={changePasswordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nova Senha</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={changePasswordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirmar Nova Senha</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                       <Button type="submit" className="mt-4">
                        Alterar Senha
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-4">
              <Card className="border-gray-100 dark:border-gray-700 shadow-sm rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium text-gray-800 dark:text-white">Preferências de Notificação</CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400">
                    Configure como e quando deseja receber notificações
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...notificationSettingsForm}>
                    <form
                      onSubmit={notificationSettingsForm.handleSubmit(onNotificationSettingsSubmit)}
                      className="space-y-4"
                    >
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Canais de Notificação</h3>

                        <FormField
                          control={notificationSettingsForm.control}
                          name="emailNotifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                              <div className="space-y-0.5">
                                <FormLabel>Notificações por Email</FormLabel>
                                <FormDescription>
                                  Receba atualizações e alertas por email.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationSettingsForm.control}
                          name="smsNotifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                              <div className="space-y-0.5">
                                <FormLabel>Notificações por SMS</FormLabel>
                                <FormDescription>
                                  Receba alertas importantes por SMS.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <Separator className="my-4" />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Tipos de Notificação</h3>

                        <FormField
                          control={notificationSettingsForm.control}
                          name="leadAssignmentNotification"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                              <div className="space-y-0.5">
                                <FormLabel>Atribuição de Leads</FormLabel>
                                <FormDescription>
                                  Notificar quando um novo lead for atribuído a você.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationSettingsForm.control}
                          name="statusChangeNotification"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                              <div className="space-y-0.5">
                                <FormLabel>Mudanças de Status</FormLabel>
                                <FormDescription>
                                  Notificar quando o status de um lead mudar.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={notificationSettingsForm.control}
                          name="marketingUpdates"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between p-3 border rounded-md">
                              <div className="space-y-0.5">
                                <FormLabel>Atualizações de Marketing</FormLabel>
                                <FormDescription>
                                  Receba novidades sobre campanhas e promoções.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button type="submit" className="mt-4">
                        Salvar Preferências
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="system" className="space-y-4">
              <Card className="border-gray-100 dark:border-gray-700 shadow-sm rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-medium text-gray-800 dark:text-white">Configurações Gerais</CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400">
                    Configure os parâmetros gerais do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...systemSettingsForm}>
                    <form
                      onSubmit={systemSettingsForm.handleSubmit(onSystemSettingsSubmit)}
                      className="space-y-4"
                    >
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Informações da Empresa</h3>

                        <FormField
                          control={systemSettingsForm.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome da Empresa</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={systemSettingsForm.control}
                            name="primaryPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone Principal</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={systemSettingsForm.control}
                            name="primaryEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Principal</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Configurações Padrão de Leads</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={systemSettingsForm.control}
                            name="defaultLeadStatus"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status Padrão de Lead</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  Status atribuído a novos leads.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={systemSettingsForm.control}
                            name="defaultLeadSource"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fonte Padrão de Lead</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  Fonte atribuída a novos leads.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <Button type="submit" className="mt-4">
                        Salvar Configurações
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="calendar" className="space-y-4">
              <GoogleCalendarConfig />
            </TabsContent>
            
            <TabsContent value="users" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white">Gerenciamento de Usuários</h3>
                <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#ff9810] hover:bg-[#ff9810]/90 text-white">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Novo Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[480px] bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 rounded-xl">
                    <DialogHeader>
                      <DialogTitle className="text-gray-800 dark:text-white">Criar Novo Usuário</DialogTitle>
                      <DialogDescription className="text-gray-500 dark:text-gray-400">
                        Crie um novo usuário para acessar o sistema
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...newUserForm}>
                      <form onSubmit={newUserForm.handleSubmit(onCreateUserSubmit)} className="space-y-4">
                        <FormField
                          control={newUserForm.control}
                          name="email" // Changed to email
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email do Novo Usuário</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="email@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={newUserForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome de Usuário (Opcional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Digite o nome de usuário" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={newUserForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Perfil</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um perfil" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="admin">Administrador</SelectItem>
                                  <SelectItem value="marketing">Marketing</SelectItem>
                                  <SelectItem value="comercial">Comercial</SelectItem>
                                  <SelectItem value="trainer">Personal Trainer</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={newUserForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Digite a senha" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={newUserForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirmar Senha</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Confirme a senha" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            type="button" 
                            onClick={() => setIsNewUserDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={isUpdating}>
                            {isUpdating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                              </>
                            ) : (
                              "Salvar"
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
              
              <Card className="border-gray-100 dark:border-gray-700 shadow-sm rounded-xl">
                <CardContent className="p-6">
                  {isLoadingUsers ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="py-3 px-4 text-left font-medium">Nome de Usuário</th>
                            <th className="py-3 px-4 text-left font-medium">Perfil</th>
                            <th className="py-3 px-4 text-right font-medium">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.length > 0 ? (
                            users.map((user) => (
                              <tr key={user.id} className="border-b hover:bg-muted/30">
                                <td className="py-3 px-4">{user.username}</td>
                                <td className="py-3 px-4">
                                  {{
                                    admin: "Administrador",
                                    marketing: "Marketing",
                                    comercial: "Comercial",
                                    trainer: "Personal Trainer"
                                  }[user.role || ""] || "Não definido"}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteUser(user.id)}
                                    disabled={user.id === currentUserId} // Não permite excluir o próprio usuário
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="py-6 text-center text-muted-foreground">
                                Nenhum usuário encontrado
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {user?.role === 'admin' && (
              <TabsContent value="audit" className="space-y-4">
                <Card className="border-gray-100 dark:border-gray-700 shadow-sm rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-medium text-gray-800 dark:text-white">Log de Auditoria</CardTitle>
                    <CardDescription className="text-gray-500 dark:text-gray-400">
                      Monitoramento de atividades do sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AuditLogViewer />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}