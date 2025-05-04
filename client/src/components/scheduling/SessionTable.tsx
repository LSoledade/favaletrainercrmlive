import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Eye, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Session {
  id: number;
  startTime: Date;
  endTime: Date;
  location: string;
  source: 'Favale' | 'Pink';
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  studentId: string;
  studentName: string;
  trainerId: string;
  trainerName: string;
  calendarEventId?: string;
}

interface SessionTableProps {
  sessions: Session[];
  onViewSession: (id: number) => void;
  onEditSession: (id: number) => void;
}

export function SessionTable({ sessions, onViewSession, onEditSession }: SessionTableProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-md">
        <Calendar className="h-12 w-12 text-gray-400 mb-3" />
        <h3 className="text-lg font-medium">Nenhuma sessão encontrada</h3>
        <p className="text-sm text-gray-500 mt-1">
          Não foram encontradas sessões que correspondam aos critérios de busca.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Agendada</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Concluída</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelada</Badge>;
      case 'no-show':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Não Compareceu</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Data/Hora</TableHead>
            <TableHead>Aluno</TableHead>
            <TableHead>Professor</TableHead>
            <TableHead>Local</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell className="font-medium">{session.id}</TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{format(new Date(session.startTime), "dd/MM/yyyy", { locale: ptBR })}</span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(session.startTime), "HH:mm", { locale: ptBR })} - 
                    {format(new Date(session.endTime), "HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </TableCell>
              <TableCell>{session.studentName}</TableCell>
              <TableCell>{session.trainerName}</TableCell>
              <TableCell>{session.location}</TableCell>
              <TableCell>
                <div className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium inline-flex items-center',
                  session.source === 'Favale' 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'bg-pink-50 text-pink-700'
                )}>
                  <span className={cn(
                    'w-2 h-2 rounded-full mr-1',
                    session.source === 'Favale' ? 'bg-blue-500' : 'bg-pink-500'
                  )}></span>
                  {session.source}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(session.status)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewSession(session.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {session.status === 'scheduled' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditSession(session.id)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
