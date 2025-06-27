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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2, Shield, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, 
         DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useQueryClient as useTanstackQueryClient } from "@tanstack/react-query"; // Renamed to avoid conflict
// Replace apiRequest, queryClient with Supabase specific ones
import { invokeSupabaseFunction, getSupabaseQueryFn } from "@/lib/queryClient";
import AuditLogViewer from "@/components/admin/AuditLogViewer";

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
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
  role: z.enum(["admin", "marketing", "comercial", "trainer"], {
    errorMap: () => ({ message: "Perfil inválido" })
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Schema for updating an existing user's profile
const editUserSchema = z.object({
  id: z.string().uuid("ID de usuário inválido"), // User ID is required for updates
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres").optional().or(z.literal("")),
  role: z.enum(["admin", "marketing", "comercial", "trainer"], {
    errorMap: () => ({ message: "Perfil inválido" })
  }),
});

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
type NewUserFormValues = z.infer<typeof newUserSchema>;
type EditUserFormValues = z.infer<typeof editUserSchema>;

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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const currentUserId = currentAuthUser?.id || ""; // Supabase user ID is string (UUID)
  
  // Fetch list of users using the 'user-management' Edge Function
  const { data: users = [], isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery<User[]>({ 
    queryKey: ["userList"], // Descriptive query key
    queryFn: getSupabaseQueryFn({
      functionName: 'user-management',
      on401: 'throw', // Or handle as needed
    }),
    enabled: currentProfile?.role === 'admin', // Only fetch if current user is admin
    select: (data: any) => {
      // Handle the response format from the API
      return Array.isArray(data) ? data : (data?.data || []);
    }
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
  
  // Form for changing password
  const changePasswordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Form for editing user
  const editUserForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      id: "",
      username: "",
      role: "trainer",
    },
  });

  const onChangePasswordSubmit = async (values: ChangePasswordValues) => {
    try {
      // Use the singleton supabase client instead of creating a new one
      const { supabase } = await import('@/lib/supabaseClient');
      const { error } = await supabase.auth.updateUser({ password: values.newPassword });
      
      if (error) {
        toast({ 
          title: "Erro ao alterar senha", 
          description: error.message, 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Senha alterada", 
          description: "Sua senha foi atualizada com sucesso." 
        });
        changePasswordForm.reset();
      }
    } catch (error) {
      toast({
        title: "Erro ao alterar senha",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
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

  const onEditUserSubmit = async (values: EditUserFormValues) => {
    try {
      setIsUpdating(true);
      // Call the 'user-management' Edge Function to update a user
      // The user ID is passed as a slug, and the data in the body
      await invokeSupabaseFunction("user-management", "PATCH", { username: values.username, role: values.role }, { slug: values.id });
      
      toast({
        title: "Usuário atualizado",
        description: `O perfil do usuário ${values.username || values.id} foi atualizado com sucesso.`, 
      });
      
      setIsEditDialogOpen(false);
      setEditingUser(null);
      await tanstackQueryClient.invalidateQueries({ queryKey: ["userList"] });
    } catch (error) {
      toast({
        title: "Erro ao atualizar usuário",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const deleteUser = async (userId: string) => {
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
    <div className="p-6 space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className={`grid w-full ${currentProfile?.role === 'admin' ? 'grid-cols-3' : 'grid-cols-1'} bg-gray-100 dark:bg-gray-800 p-1 rounded-xl`}>
              <TabsTrigger 
                value="profile" 
                className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm font-medium transition-all"
              >
                Perfil
              </TabsTrigger>
              {currentProfile?.role === 'admin' && (
                <>
                  <TabsTrigger 
                    value="users" 
                    className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm font-medium transition-all"
                  >
                    Usuários
                  </TabsTrigger>
                  <TabsTrigger 
                    value="audit" 
                    className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm font-medium transition-all"
                  >
                    Auditoria
                  </TabsTrigger>
                </>
              )}
            </TabsList>
            
            <TabsContent value="profile" className="space-y-6">
              <Card className="border-0 shadow-lg bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 pb-6">
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    Perfil do Usuário
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300 text-base">
                    Informações do seu perfil e opção para alterar senha
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  {/* Display user profile info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Email</h4>
                      <p className="text-gray-600 dark:text-gray-300">{currentAuthUser?.email}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Nome de Usuário</h4>
                      <p className="text-gray-600 dark:text-gray-300">{currentProfile?.username || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Perfil</h4>
                      <p className="text-gray-600 dark:text-gray-300">{currentProfile?.role || 'N/A'}</p>
                    </div>
                  </div>

                  <Separator className="my-8" />
                  
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Alterar Senha</h3>
                    {/* Change Password Form */}
                    <Form {...changePasswordForm}>
                      <form onSubmit={changePasswordForm.handleSubmit(onChangePasswordSubmit)} className="space-y-6">
                         <FormField
                          control={changePasswordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium">Senha Atual</FormLabel>
                              <FormControl>
                                <Input type="password" className="h-12" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={changePasswordForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Nova Senha</FormLabel>
                                <FormControl>
                                  <Input type="password" className="h-12" {...field} />
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
                                <FormLabel className="text-base font-medium">Confirmar Nova Senha</FormLabel>
                                <FormControl>
                                  <Input type="password" className="h-12" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                         <Button type="submit" className="h-12 px-8 bg-blue-600 hover:bg-blue-700">
                          Alterar Senha
                        </Button>
                      </form>
                    </Form>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {currentProfile?.role === 'admin' && (
              <TabsContent value="users" className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <p className="text-gray-600 dark:text-gray-300">Crie e gerencie usuários do sistema</p>
                  <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg h-12 px-6 rounded-xl">
                      <PlusCircle className="h-5 w-5 mr-2" />
                      Novo Usuário
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-800 border-0 shadow-2xl rounded-2xl">
                    <DialogHeader className="space-y-3">
                      <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">Criar Novo Usuário</DialogTitle>
                      <DialogDescription className="text-gray-600 dark:text-gray-300 text-base">
                        Crie um novo usuário para acessar o sistema
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...newUserForm}>
                      <form onSubmit={newUserForm.handleSubmit(onCreateUserSubmit)} className="space-y-6">
                        <FormField
                          control={newUserForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium">Email do Novo Usuário</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="email@example.com" className="h-12" {...field} />
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
                              <FormLabel className="text-base font-medium">Nome de Usuário</FormLabel>
                              <FormControl>
                                <Input placeholder="Digite o nome de usuário" className="h-12" {...field} />
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
                              <FormLabel className="text-base font-medium">Perfil</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12">
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
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={newUserForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Senha</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Digite a senha" className="h-12" {...field} />
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
                                <FormLabel className="text-base font-medium">Confirmar Senha</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Confirme a senha" className="h-12" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <DialogFooter className="gap-3 pt-6">
                          <Button 
                            variant="outline" 
                            type="button" 
                            onClick={() => setIsNewUserDialogOpen(false)}
                            className="h-12 px-6"
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={isUpdating} className="h-12 px-6 bg-blue-600 hover:bg-blue-700">
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
              
              <Card className="border-0 shadow-lg bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  {isLoadingUsers ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <div className="overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-gray-50 dark:bg-gray-700">
                            <th className="py-4 px-6 text-left font-semibold text-gray-900 dark:text-white">Nome de Usuário</th>
                            <th className="py-4 px-6 text-left font-semibold text-gray-900 dark:text-white">Email</th>
                            <th className="py-4 px-6 text-left font-semibold text-gray-900 dark:text-white">Perfil</th>
                            <th className="py-4 px-6 text-right font-semibold text-gray-900 dark:text-white">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.length > 0 ? (
                            users.map((user) => (
                              <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">{user.username || 'N/A'}</td>
                                <td className="py-4 px-6 text-gray-600 dark:text-gray-300">{user.email || 'N/A'}</td>
                                <td className="py-4 px-6">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    {{
                                      admin: "Administrador",
                                      marketing: "Marketing",
                                      comercial: "Comercial",
                                      trainer: "Personal Trainer"
                                    }[user.role || ""] || "Não definido"}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingUser(user);
                                      editUserForm.reset({
                                        id: user.id,
                                        username: user.username || '',
                                        role: (user.role as "admin" | "marketing" | "comercial" | "trainer") || 'trainer',
                                      });
                                      setIsEditDialogOpen(true);
                                    }}
                                    className="h-9 w-9 p-0 mr-1"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteUser(user.id)}
                                    disabled={user.id === currentUserId}
                                    className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="py-12 text-center text-gray-500 dark:text-gray-400">
                                <div className="flex flex-col items-center gap-2">
                                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                    <PlusCircle className="h-6 w-6 text-gray-400" />
                                  </div>
                                  <p className="font-medium">Nenhum usuário encontrado</p>
                                  <p className="text-sm">Crie o primeiro usuário para começar</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>                </Card>
              </TabsContent>
            )}
            
            {/* Edit User Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-800 border-0 shadow-2xl rounded-2xl">
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">Editar Usuário</DialogTitle>
                  <DialogDescription className="text-gray-600 dark:text-gray-300 text-base">
                    Edite as informações do perfil do usuário.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...editUserForm}>
                  <form onSubmit={editUserForm.handleSubmit(onEditUserSubmit)} className="space-y-6">
                    <FormField
                      control={editUserForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">Nome de Usuário</FormLabel>
                          <FormControl>
                            <Input placeholder="Digite o nome de usuário" className="h-12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editUserForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">Perfil</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12">
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
                    
                    <DialogFooter className="gap-3 pt-6">
                      <Button 
                        variant="outline" 
                        type="button" 
                        onClick={() => setIsEditDialogOpen(false)}
                        className="h-12 px-6"
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isUpdating} className="h-12 px-6 bg-blue-600 hover:bg-blue-700">
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
            
            {currentProfile?.role === 'admin' && (
              <TabsContent value="audit" className="space-y-6">
                <Card className="border-0 shadow-lg bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-800 pb-6">
                    <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                        <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      Log de Auditoria
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-300 text-base">
                      Monitoramento de atividades do sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    <AuditLogViewer />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
    </div>
  );
}