import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SessionTable } from './SessionTable';
import { SessionForm } from './SessionForm';
import { SessionDetails } from './SessionDetails';
import { useToast } from '@/hooks/use-toast';

export function SessionManagement() {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const { toast } = useToast();

  // Define o tipo da sessão
  type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  
  // Mock data - a ser substituído por chamadas de API reais
  const sessions = [
    {
      id: 1,
      startTime: new Date(2025, 4, 2, 9, 0),
      endTime: new Date(2025, 4, 2, 10, 0),
      location: 'Academia Central',
      source: 'Favale' as const,
      notes: 'Foco em treinamento de força',
      status: 'scheduled' as SessionStatus,
      studentId: '101',
      studentName: 'Carlos Oliveira',
      trainerId: '201',
      trainerName: 'Ana Silva',
      calendarEventId: 'event123',
    },
    {
      id: 2,
      startTime: new Date(2025, 4, 3, 15, 0),
      endTime: new Date(2025, 4, 3, 16, 0),
      location: 'Estúdio Zona Norte',
      source: 'Pink' as const,
      notes: 'Treino de cardio e flexibilidade',
      status: 'scheduled' as SessionStatus,
      studentId: '102',
      studentName: 'Maria Santos',
      trainerId: '202', 
      trainerName: 'Pedro Costa',
    },
    {
      id: 3,
      startTime: new Date(2025, 4, 1, 10, 0),
      endTime: new Date(2025, 4, 1, 11, 0),
      location: 'Academia Sul',
      source: 'Favale' as const,
      status: 'completed' as SessionStatus,
      studentId: '103',
      studentName: 'João Pereira',
      trainerId: '201',
      trainerName: 'Ana Silva',
      calendarEventId: 'event456',
    },
    {
      id: 4,
      startTime: new Date(2025, 4, 1, 14, 0),
      endTime: new Date(2025, 4, 1, 15, 0),
      location: 'Espaço Fitness Leste',
      source: 'Pink' as const,
      status: 'cancelled' as SessionStatus,
      studentId: '104',
      studentName: 'Paula Ferreira',
      trainerId: '203',
      trainerName: 'Roberto Alves',
      calendarEventId: 'event789',
    }
  ];

  const getSelectedSession = () => {
    return sessions.find(session => session.id === selectedSessionId);
  };

  const handleViewSession = (id: number) => {
    setSelectedSessionId(id);
    setDetailDialogOpen(true);
  };

  const handleEditSession = (id: number) => {
    setSelectedSessionId(id);
    setEditDialogOpen(true);
  };

  const handleCancelSession = (id: number) => {
    // Implementar chamada à API para cancelar sessão
    toast({
      title: 'Sessão cancelada',
      description: 'A sessão foi cancelada com sucesso!',
    });
  };

  const handleCompleteSession = (id: number) => {
    // Implementar chamada à API para marcar sessão como concluída
    toast({
      title: 'Sessão concluída',
      description: 'A sessão foi marcada como concluída com sucesso!',
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Função para filtrar sessões com base na pesquisa
  const filteredSessions = sessions.filter((session) => {
    const searchTerm = searchQuery.toLowerCase();
    return (
      session.studentName.toLowerCase().includes(searchTerm) ||
      session.trainerName.toLowerCase().includes(searchTerm) ||
      session.location.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-medium">Gerenciamento de Sessões</h3>
          <p className="text-sm text-muted-foreground">Agende e gerencie sessões de treinamento</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>Nova Sessão</Button>
      </div>
      <div className="mb-4">
        <Input
          placeholder="Buscar por aluno, professor ou local..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="scheduled">Agendadas</TabsTrigger>
          <TabsTrigger value="completed">Concluídas</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <SessionTable 
            sessions={filteredSessions}
            onViewSession={handleViewSession}
            onEditSession={handleEditSession}
          />
        </TabsContent>
        
        <TabsContent value="scheduled">
          <SessionTable 
            sessions={filteredSessions.filter(s => s.status === 'scheduled')}
            onViewSession={handleViewSession}
            onEditSession={handleEditSession}
          />
        </TabsContent>
        
        <TabsContent value="completed">
          <SessionTable 
            sessions={filteredSessions.filter(s => s.status === 'completed')}
            onViewSession={handleViewSession}
            onEditSession={handleEditSession}
          />
        </TabsContent>
        
        <TabsContent value="cancelled">
          <SessionTable 
            sessions={filteredSessions.filter(s => s.status === 'cancelled')}
            onViewSession={handleViewSession}
            onEditSession={handleEditSession}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog para criar nova sessão */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Agendar Nova Sessão</DialogTitle>
          </DialogHeader>
          <SessionForm 
            onSuccess={() => {
              setCreateDialogOpen(false);
              toast({
                title: 'Sessão agendada',
                description: 'A sessão foi agendada com sucesso!',
              });
            }} 
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para editar sessão */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Editar Sessão</DialogTitle>
          </DialogHeader>
          <SessionForm 
            initialData={getSelectedSession()}
            onSuccess={() => {
              setEditDialogOpen(false);
              toast({
                title: 'Sessão atualizada',
                description: 'A sessão foi atualizada com sucesso!',
              });
            }} 
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para visualizar detalhes da sessão */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Sessão</DialogTitle>
          </DialogHeader>
          {getSelectedSession() && (
            <SessionDetails 
              session={getSelectedSession()!}
              onCancelSession={handleCancelSession}
              onCompleteSession={handleCompleteSession}
              onEditSession={(id) => {
                setDetailDialogOpen(false);
                handleEditSession(id);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
