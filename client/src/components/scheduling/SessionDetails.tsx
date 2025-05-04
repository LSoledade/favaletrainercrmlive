import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, MapPin, User, Award, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SessionDetailsProps {
  session: {
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
  };
  onCancelSession?: (id: number) => void;
  onCompleteSession?: (id: number) => void;
  onEditSession?: (id: number) => void;
}

export function SessionDetails({ session, onCancelSession, onCompleteSession, onEditSession }: SessionDetailsProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  
  const handleCancelSession = () => {
    if (onCancelSession) {
      onCancelSession(session.id);
    }
    setCancelDialogOpen(false);
  };
  
  const handleCompleteSession = () => {
    if (onCompleteSession) {
      onCompleteSession(session.id);
    }
    setCompleteDialogOpen(false);
  };

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

  const isPast = new Date(session.endTime) < new Date();
  const canCancel = session.status === 'scheduled' && !isPast;
  const canComplete = session.status === 'scheduled' && isPast;
  
  return (
    <Card className={cn(
      "w-full",
      session.source === 'Favale' ? "border-t-4 border-t-blue-500" : "border-t-4 border-t-pink-500"
    )}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">
            {session.source === 'Favale' ? (
              <span className="text-blue-600">Sessão Favale</span>
            ) : (
              <span className="text-pink-600">Sessão Pink</span>
            )}
          </CardTitle>
          {getStatusBadge(session.status)}
        </div>
        <CardDescription>
          Detalhes da sessão de treinamento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium">Data</p>
                <p className="text-sm text-gray-600">
                  {format(new Date(session.startTime), "PPPP", { locale: ptBR })}
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium">Horário</p>
                <p className="text-sm text-gray-600">
                  {format(new Date(session.startTime), "HH:mm", { locale: ptBR })} - 
                  {format(new Date(session.endTime), "HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium">Local</p>
                <p className="text-sm text-gray-600">{session.location}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <User className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium">Aluno</p>
                <p className="text-sm text-gray-600">{session.studentName}</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-2">
              <Award className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium">Professor</p>
                <p className="text-sm text-gray-600">{session.trainerName}</p>
              </div>
            </div>
            
            {session.calendarEventId && (
              <div className="flex items-start space-x-2">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Evento no Google Calendar</p>
                  <p className="text-sm text-green-600">Sincronizado</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {session.notes && (
          <div className="pt-2">
            <div className="flex items-start space-x-2">
              <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium">Observações</p>
                <p className="text-sm text-gray-600 whitespace-pre-line">{session.notes}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          {onEditSession && session.status === 'scheduled' && (
            <Button variant="outline" onClick={() => onEditSession(session.id)}>
              Editar Sessão
            </Button>
          )}
        </div>
        
        <div className="flex space-x-2">
          {canComplete && (
            <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default">
                  Marcar como Concluída
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar Conclusão</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja marcar esta sessão como concluída?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCompleteDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleCompleteSession}>
                    Confirmar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          
          {canCancel && (
            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  Cancelar Sessão
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar Cancelamento</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja cancelar esta sessão? Esta ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-start space-x-2 my-4 p-4 bg-amber-50 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    O cancelamento removerá o evento do Google Calendar e enviará notificações por e-mail para o aluno e professor.
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCancelDialogOpen(false)}
                  >
                    Voltar
                  </Button>
                  <Button variant="destructive" onClick={handleCancelSession}>
                    Confirmar Cancelamento
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
