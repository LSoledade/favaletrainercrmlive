 import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Check, FileEdit, MoreVertical, X } from 'lucide-react';
import { SessionDetails } from './SessionDetails';
import { SessionForm } from './SessionForm';
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

interface SessionTableProps {
  sessions: Session[];
  onRefresh: () => void;
}

function getStatusBadgeVariant(status: SessionStatus) {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'no-show':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
}

function getStatusText(status: SessionStatus): string {
  switch (status) {
    case 'scheduled':
      return 'Agendada';
    case 'completed':
      return 'Concluída';
    case 'cancelled':
      return 'Cancelada';
    case 'no-show':
      return 'Não Compareceu';
    default:
      return status;
  }
}

export function SessionTable({ sessions, onRefresh }: SessionTableProps) {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editSessionOpen, setEditSessionOpen] = useState(false);
  const { toast } = useToast();
  
  // Mock function para cancelar sessão
  const handleCancelSession = (id: number) => {
    console.log('Cancelando sessão:', id);
    toast({
      title: 'Sessão cancelada',
      description: 'A sessão foi cancelada com sucesso.',
    });
    setViewDetailsOpen(false);
    onRefresh();
  };
  
  // Mock function para marcar sessão como concluída
  const handleCompleteSession = (id: number) => {
    console.log('Marcando sessão como concluída:', id);
    toast({
      title: 'Sessão concluída',
      description: 'A sessão foi marcada como concluída com sucesso.',
    });
    setViewDetailsOpen(false);
    onRefresh();
  };
  
  // Abrir dialog de detalhes/edição da sessão
  const openSessionDetails = (session: Session) => {
    setSelectedSession(session);
    setViewDetailsOpen(true);
  };
  
  // Abrir dialog de edição da sessão
  const openEditSession = (session: Session) => {
    setSelectedSession(session);
    setViewDetailsOpen(false); // Fechar detalhes se estiver aberto
    setEditSessionOpen(true);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Horário</TableHead>
              <TableHead>Aluno</TableHead>
              <TableHead>Professor</TableHead>
              <TableHead className="hidden md:table-cell">Local</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  Nenhuma sessão encontrada.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow key={session.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openSessionDetails(session)}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {format(new Date(session.startTime), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(session.startTime), 'HH:mm', { locale: ptBR })} - 
                        {format(new Date(session.endTime), 'HH:mm', { locale: ptBR })}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={session.source === 'Favale' ? 
                          'h-2 w-2 rounded-full bg-blue-500 p-0' : 
                          'h-2 w-2 rounded-full bg-pink-500 p-0'}
                      />
                      {session.studentName}
                    </div>
                  </TableCell>
                  <TableCell>{session.trainerName}</TableCell>
                  <TableCell className="hidden md:table-cell truncate max-w-xs">{session.location}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusBadgeVariant(session.status)}>
                      {getStatusText(session.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          openSessionDetails(session);
                        }}>
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          openEditSession(session);
                        }}>
                          <FileEdit className="mr-2 h-4 w-4" />
                          Editar sessão
                        </DropdownMenuItem>
                        
                        {session.status === 'scheduled' && (
                          <>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleCompleteSession(session.id);
                            }}>
                              <Check className="mr-2 h-4 w-4" />
                              Marcar como concluída
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelSession(session.id);
                              }}
                              className="text-red-600"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Cancelar sessão
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog para visualizar detalhes da sessão */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Sessão</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <SessionDetails 
              session={selectedSession} 
              onCancelSession={handleCancelSession}
              onCompleteSession={handleCompleteSession}
              onEditSession={(id) => {
                setViewDetailsOpen(false);
                setEditSessionOpen(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para editar sessão */}
      <Dialog open={editSessionOpen} onOpenChange={setEditSessionOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Editar Sessão</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <SessionForm 
              sessionId={selectedSession.id}
              defaultValues={{
                date: new Date(selectedSession.startTime),
                startTime: format(new Date(selectedSession.startTime), 'HH:mm'),
                endTime: format(new Date(selectedSession.endTime), 'HH:mm'),
                location: selectedSession.location,
                source: selectedSession.source,
                studentId: selectedSession.studentId,
                trainerId: selectedSession.trainerId,
                notes: selectedSession.notes || '',
              }}
              onSuccess={() => {
                setEditSessionOpen(false);
                onRefresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}