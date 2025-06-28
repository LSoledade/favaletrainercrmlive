import React from 'react';
import Layout from "@/components/layout/Layout"; // Updated
import AuditLogViewer from "@/features/admin/components/AuditLogViewer"; // Updated
import { useAuth } from "@/features/auth/hooks/use-auth"; // Updated
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/navigation/tabs"; // Updated
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/data-display/Card"; // Updated
import { Shield, FileLock, AlertTriangle, Lock } from "lucide-react";

export default function SecurityPage() {
  const { profile } = useAuth(); // Changed from user to profile to check role

  if (!profile || profile.role !== "admin") {
    return <Redirect to="/" />;
  }

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Shield className="h-8 w-8 mr-2 text-primary" />
          <h1 className="text-3xl font-bold">Segurança e Privacidade</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3"><div className="flex items-center"><FileLock className="h-5 w-5 mr-2 text-primary" /><CardTitle>Logs de Auditoria</CardTitle></div><CardDescription>Rastreamento das ações realizadas no sistema</CardDescription></CardHeader>
            <CardContent><p className="text-sm">Os logs registram eventos importantes...</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><div className="flex items-center"><Lock className="h-5 w-5 mr-2 text-primary" /><CardTitle>Criptografia</CardTitle></div><CardDescription>Proteção de informações sensíveis</CardDescription></CardHeader>
            <CardContent><p className="text-sm">Todas as senhas são armazenadas com criptografia...</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><div className="flex items-center"><AlertTriangle className="h-5 w-5 mr-2 text-primary" /><CardTitle>Controle de Acesso</CardTitle></div><CardDescription>Gerenciamento de permissões</CardDescription></CardHeader>
            <CardContent><p className="text-sm">O sistema implementa controle de acesso...</p></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="audit-logs" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="audit-logs">Logs de Auditoria</TabsTrigger>
            <TabsTrigger value="privacy-policy">Política de Privacidade</TabsTrigger>
            <TabsTrigger value="security-settings">Configurações de Segurança</TabsTrigger>
          </TabsList>
          <TabsContent value="audit-logs"><AuditLogViewer /></TabsContent>
          <TabsContent value="privacy-policy">
            <Card>
              <CardHeader><CardTitle>Política de Privacidade</CardTitle><CardDescription>Como o sistema protege os dados...</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {/* Policy content */}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="security-settings">
            <Card>
              <CardHeader><CardTitle>Configurações de Segurança</CardTitle><CardDescription>Configurações avançadas...</CardDescription></CardHeader>
              <CardContent>{/* Security settings content */}</CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
