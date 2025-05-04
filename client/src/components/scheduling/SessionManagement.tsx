import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SessionTable } from './SessionTable';
import { SessionForm } from './SessionForm';
import { SessionCalendar } from './SessionCalendar';
import { SessionReport } from './SessionReport';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show';

interface Session {
  id: number;
  startTime: Date;
  endTime: Date;
  location: string;
  source: 'Favale' | 'Pink';
  notes?: string;
  status: SessionStatus;
  studentId: string;
  studentName: string;
  trainerId: string;
  trainerName: string;
  calendarEventId?: string;
}

export function SessionManagement() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Mock data de sessões - a ser substituído por chamadas à API
  useEffect(() => {
    // Simular carregamento de dados da API
    setIsLoading(true);
    setTimeout(() => {
      setSessions([
        {
          id: 1,
          startTime: new Date(new Date().setHours(9, 0, 0, 0)),
          endTime: new Date(new Date().setHours(10, 0, 0, 0)),
          location: 'Academia Central',
          source: 'Favale',
          notes: 'Foco em treinamento de força',
          status: 'scheduled',
          studentId: '101',
          studentName: 'Carlos Oliveira',
          trainerId: '201',
          trainerName: 'Ana Silva',
          calendarEventId: 'event123',
        },
        {
          id: 2,
          startTime: new Date(new Date().setHours(15, 0, 0, 0)),
          endTime: new Date(new Date().setHours(16, 0, 0, 0)),
          location: 'Estúdio Zona Norte',
          source: 'Pink',
          notes: 'Treino de cardio e flexibilidade',
          status: 'scheduled',
          studentId: '102',
          studentName: 'Maria Santos',
          trainerId: '202',
          trainerName: 'Pedro Costa',
        },
        {
          id: 3,
          startTime: new Date(new Date().setDate(new Date().getDate() + 1)),
          endTime: new Date(new Date().setDate(new Date().getDate() + 1)),
          location: 'Academia Sul',
          source: 'Favale',
          status: 'scheduled',
          studentId: '103',
          studentName: 'João Pereira',
          trainerId: '201',
          trainerName: 'Ana Silva',
          calendarEventId: 'event456',
        },
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  // Atualizar sessões (para ser chamado após ações como criar, atualizar, etc.)
  const refreshSessions = () => {
    // Simular recarregamento de dados da API
    // Aqui você faria uma nova chamada à API
    toast({
      title: 'Dados atualizados',
      description: 'As sessões foram atualizadas com sucesso.',
    });
  };

  const handleAddSessionSuccess = () => {
    setFormDialogOpen(false);
    refreshSessions();
  };

  return (
    <Tabs defaultValue="sessions" className="space-y-4">
      <div className="flex justify-between items-center">
        <TabsList>
          <TabsTrigger value="sessions">Agendamentos</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>
        <Button onClick={() => setFormDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Sessão
        </Button>
      </div>
      
      <TabsContent value="sessions" className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
          {/* Calendário - ocupa 3 colunas em telas grandes */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Calendário de Sessões</CardTitle>
                <CardDescription>
                  Visualize as sessões agendadas no calendário. Clique em uma data para ver detalhes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SessionCalendar />
              </CardContent>
            </Card>
          </div>

          {/* Lista de sessões - ocupa 4 colunas em telas grandes */}
          <div className="lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Sessões Agendadas</CardTitle>
                <CardDescription>
                  Todas as sessões agendadas, concluídas e canceladas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <p>Carregando sessões...</p>
                  </div>
                ) : (
                  <SessionTable 
                    sessions={sessions} 
                    onRefresh={refreshSessions} 
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="reports" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Relatório de Sessões</CardTitle>
            <CardDescription>
              Gere relatórios detalhados por aluno, período ou categoria.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionReport />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Dialog para adicionar nova sessão */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Agendar Nova Sessão</DialogTitle>
          </DialogHeader>
          <SessionForm onSuccess={handleAddSessionSuccess} />
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}