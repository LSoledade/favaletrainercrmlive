import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/navigation/tabs'; // Updated
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/data-display/Card'; // Updated
import { Button } from '@/components/inputs/Button'; // Updated
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/feedback/dialog'; // Updated
import { SessionTable } from './SessionTable';
import { SessionForm } from './SessionForm';
import { SessionReport } from './SessionReport';
import { Plus, Calendar, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { Skeleton } from '@/components/data-display/skeleton'; // Updated

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
  const [isRefreshing, setIsRefreshing] = useState(false);
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
          location: 'Casa',
          source: 'Favale',
          notes: 'Foco em treinamento de força',
          status: 'scheduled',
          studentId: '101',
          studentName: 'Carlos Oliveira',
          trainerId: '201',
          trainerName: 'André Silva',
          calendarEventId: 'event123',
        },
        {
          id: 2,
          startTime: new Date(new Date().setHours(15, 0, 0, 0)),
          endTime: new Date(new Date().setHours(16, 0, 0, 0)),
          location: 'Bodytech Iguatemi',
          source: 'Pink',
          notes: 'Treino de cardio e flexibilidade',
          status: 'scheduled',
          studentId: '102',
          studentName: 'Maria Santos',
          trainerId: '202',
          trainerName: 'Michelle Amorim',
        },
        {
          id: 3,
          startTime: new Date(new Date().setDate(new Date().getDate() + 1)),
          endTime: new Date(new Date().setDate(new Date().getDate() + 1)),
          location: 'Bodytech Eldourado',
          source: 'Favale',
          status: 'scheduled',
          studentId: '103',
          studentName: 'João Pereira',
          trainerId: '201',
          trainerName: 'Gabriel Tonini',
          calendarEventId: 'event456',
        },
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  // Atualizar sessões (para ser chamado após ações como criar, atualizar, etc.)
  const refreshSessions = () => {
    // Simular recarregamento de dados da API
    setIsRefreshing(true);
    
    setTimeout(() => {
      // Aqui você faria uma nova chamada à API
      setIsRefreshing(false);
      
      toast({
        title: 'Dados atualizados',
        description: 'As sessões foram atualizadas com sucesso.',
      });
    }, 800);
  };

  const handleAddSessionSuccess = () => {
    setFormDialogOpen(false);
    refreshSessions();
  };

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-300">
      <Tabs defaultValue="sessions" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <TabsList className="bg-background border dark:bg-gray-800/60 shadow-sm">
            <TabsTrigger value="sessions" className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 rounded-md">
              Agendamentos
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 rounded-md">
              Relatórios
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshSessions}
              disabled={isRefreshing}
              className="text-gray-600 dark:text-gray-300"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            
            <Button 
              onClick={() => setFormDialogOpen(true)} 
              className="bg-[#ff9810] hover:bg-[#ff9810]/90 text-white shadow-sm"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nova Sessão
            </Button>
          </div>
        </div>
        
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex justify-end">
            <Link href="/calendario">
              <Button variant="ghost" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                <Calendar className="h-4 w-4" />
                Ver Calendário Completo
              </Button>
            </Link>
          </div>
          
          <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-gray-50/80 dark:bg-gray-800/20 pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-medium text-gray-800 dark:text-white">
                    Sessões Agendadas
                  </CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400 mt-1">
                    Visualize e gerencie todos os agendamentos.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <SessionTable 
                  sessions={sessions} 
                  onRefresh={refreshSessions} 
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <Card className="border-gray-100 dark:border-gray-800 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-gray-50/80 dark:bg-gray-800/20 pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-medium text-gray-800 dark:text-white">
                    Relatório de Sessões
                  </CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400 mt-1">
                    Gere relatórios detalhados por aluno, período ou categoria.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <SessionReport />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para adicionar nova sessão */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-[650px] bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800 dark:text-white">
              Agendar Nova Sessão
            </DialogTitle>
          </DialogHeader>
          <SessionForm onSuccess={handleAddSessionSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
}