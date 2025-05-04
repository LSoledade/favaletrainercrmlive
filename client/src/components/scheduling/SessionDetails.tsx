import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Clock, MapPin, User, Check, X, Edit, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

interface SessionDetailsProps {
  session: Session;
  onCancelSession: (id: number) => void;
  onCompleteSession: (id: number) => void;
  onEditSession: (id: number) => void;
}

export function SessionDetails({ session, onCancelSession, onCompleteSession, onEditSession }: SessionDetailsProps) {
  // Função auxiliar para obter a cor do status
  const getStatusColor = (status: SessionStatus): string => {
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
  };

  // Função auxiliar para traduzir o status
  const getStatusText = (status: SessionStatus): string => {
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
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium">
            Sessão {session.id}
            <Badge variant="outline" className={`ml-2 ${getStatusColor(session.status)}`}>
              {getStatusText(session.status)}
            </Badge>
          </h3>
          <p className="text-muted-foreground">
            {format(new Date(session.startTime), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <Badge 
          variant="outline" 
          className={session.source === 'Favale' ? 
            'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' : 
            'bg-pink-50 text-pink-700 border-pink-300 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-800'}
        >
          {session.source}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start space-x-3">
          <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">Data e Horário</p>
            <p className="text-muted-foreground">
              {format(new Date(session.startTime), 'dd/MM/yyyy', { locale: ptBR })}, 
              {format(new Date(session.startTime), 'HH:mm', { locale: ptBR })} - 
              {format(new Date(session.endTime), 'HH:mm', { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">Local</p>
            <p className="text-muted-foreground">{session.location}</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <User className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">Aluno</p>
            <p className="text-muted-foreground">{session.studentName}</p>
            <p className="text-xs text-muted-foreground">ID: {session.studentId}</p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <User className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">Professor</p>
            <p className="text-muted-foreground">{session.trainerName}</p>
            <p className="text-xs text-muted-foreground">ID: {session.trainerId}</p>
          </div>
        </div>

        {session.calendarEventId && (
          <div className="flex items-start space-x-3 md:col-span-2">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Evento no Google Calendar</p>
              <p className="text-muted-foreground">ID: {session.calendarEventId}</p>
            </div>
          </div>
        )}
      </div>

      {session.notes && (
        <div>
          <h4 className="font-medium mb-2">Observações</h4>
          <p className="text-muted-foreground bg-muted p-3 rounded-md">{session.notes}</p>
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        {session.status === 'scheduled' && (
          <>
            <Button 
              variant="outline" 
              className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={() => onCancelSession(session.id)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar Sessão
            </Button>
            <Button 
              variant="outline" 
              className="border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
              onClick={() => onCompleteSession(session.id)}
            >
              <Check className="h-4 w-4 mr-2" />
              Marcar como Concluída
            </Button>
          </>
        )}
        <Button 
          variant="outline"
          onClick={() => onEditSession(session.id)}
        >
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>
    </div>
  );
}