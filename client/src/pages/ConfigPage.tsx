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
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

const userProfileSchema = z.object({
  username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
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

type UserProfileValues = z.infer<typeof userProfileSchema>;
type NotificationSettingsValues = z.infer<typeof notificationSettingsSchema>;
type SystemSettingsValues = z.infer<typeof systemSettingsSchema>;

export default function ConfigPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("profile");

  const userProfileForm = useForm<UserProfileValues>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      username: user?.username || "",
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

  const onProfileSubmit = (values: UserProfileValues) => {
    console.log("Profile values:", values);
    // Aqui você implementaria a lógica para atualizar o perfil
    toast({
      title: "Perfil atualizado",
      description: "Suas informações de perfil foram atualizadas com sucesso.",
    });
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas configurações de conta, notificações e sistema.
        </p>
      </div>

      <Separator className="my-6" />

      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-1/5">
          <Tabs
            orientation="vertical"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="flex flex-col w-full items-start bg-transparent h-auto p-0 space-y-1">
              <TabsTrigger
                value="profile"
                className="w-full justify-start text-left px-3 py-2 data-[state=active]:bg-muted"
              >
                Perfil
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="w-full justify-start text-left px-3 py-2 data-[state=active]:bg-muted"
              >
                Notificações
              </TabsTrigger>
              <TabsTrigger
                value="system"
                className="w-full justify-start text-left px-3 py-2 data-[state=active]:bg-muted"
              >
                Sistema
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </aside>

        <div className="flex-1 lg:max-w-4xl">
          {/* Perfil de Usuário */}
          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Perfil de Usuário</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais e senha.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...userProfileForm}>
                  <form onSubmit={userProfileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <FormField
                      control={userProfileForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome de Usuário</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>Este é seu nome de usuário público.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator className="my-4" />
                    <h3 className="text-lg font-medium mb-4">Alterar Senha</h3>

                    <FormField
                      control={userProfileForm.control}
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
                        control={userProfileForm.control}
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
                        control={userProfileForm.control}
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
                      Salvar Alterações
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Configurações de Notificações */}
          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
                <CardDescription>
                  Configure como e quando você recebe notificações.
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
          )}

          {/* Configurações do Sistema */}
          {activeTab === "system" && (
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Sistema</CardTitle>
                <CardDescription>
                  Configure as opções globais do sistema.
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
          )}
        </div>
      </div>
    </div>
  );
}