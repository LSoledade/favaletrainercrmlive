import { useState } from 'react';
import { SessionManagement } from '@/components/scheduling/SessionManagement';
import { SessionReport } from '@/components/scheduling/SessionReport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SessionsPage() {
  return (
    <div className="container mx-auto p-4">
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Agendamentos e Relatórios</CardTitle>
          <CardDescription>
            Gerencie sessões de treinamento e emita relatórios para faturamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sessions">
            <TabsList className="mb-4">
              <TabsTrigger value="sessions">Agendamentos</TabsTrigger>
              <TabsTrigger value="report">Relatórios</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sessions">
              <SessionManagement />
            </TabsContent>
            
            <TabsContent value="report">
              <SessionReport />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
