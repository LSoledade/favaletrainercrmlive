import { useState, useEffect } from 'react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SessionForm } from './SessionForm';
import { format, addDays, setHours, setMinutes, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus } from 'lucide-react';
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

export function SessionCalendar() {
  const [date, setDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Mock data de sessões - a ser substituído por chamadas à API
  const sessions: Session[] = [
    {
      id: 1,
      startTime: setMinutes(setHours(new Date(), 9), 0),
      endTime: setMinutes(setHours(new Date(), 10), 0),
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
      startTime: setMinutes(setHours(new Date(), 15), 0),
      endTime: setMinutes(setHours(new Date(), 16), 0),
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
      startTime: setMinutes(setHours(addDays(new Date(), 1), 10), 0),
      endTime: setMinutes(setHours(addDays(new Date(), 1), 11), 0),
      location: 'Academia Sul',
      source: 'Favale',
      status: 'scheduled',
      studentId: '103',
      studentName: 'João Pereira',
      trainerId: '201',
      trainerName: 'Ana Silva',
      calendarEventId: 'event456',
    },
  ];

  // Filtrar sessões para o dia selecionado
  const sessionsForSelectedDay = sessions.filter(session => 
    isSameDay(new Date(session.startTime), date)
  );

  const handleAddSession = () => {
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Coluna do calendário */}
      <div className="lg:w-[350px]">
        <CalendarComponent
          mode="single"
          selected={date}
          onSelect={(date) => setDate(date || new Date())}
          className="rounded-md border w-full"
          locale={ptBR}
          showOutsideDays={true}
          modifiers={{
            highlighted: (date) => date && sessions.some(session => 
              isSameDay(new Date(session.startTime), date)
            ),
            favale: (date) => date && sessions.some(session => 
              isSameDay(new Date(session.startTime), date) && session.source === 'Favale'
            ),
            pink: (date) => date && sessions.some(session => 
              isSameDay(new Date(session.startTime), date) && session.source === 'Pink'
            ),
            both: (date) => date && 
              sessions.some(session => isSameDay(new Date(session.startTime), date) && session.source === 'Favale') &&
              sessions.some(session => isSameDay(new Date(session.startTime), date) && session.source === 'Pink')
          }}
          modifiersClassNames={{
            today: 'bg-primary text-primary-foreground',
            favale: 'border-l-blue-500 border-l-4',
            pink: 'border-l-pink-500 border-l-4',
            both: 'border-l-blue-500 border-l-4 border-r-pink-500 border-r-4'
          }}
        />

        <div className="flex flex-col space-y-2 mt-4">
          <p className="text-sm text-muted-foreground">Legenda:</p>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-l-4 border-l-blue-500"></div>
            <span className="text-sm">Favale</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-l-4 border-l-pink-500"></div>
            <span className="text-sm">Pink</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-l-4 border-r-4 border-l-blue-500 border-r-pink-500"></div>
            <span className="text-sm">Ambos</span>
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={handleAddSession} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Nova Sessão
          </Button>
        </div>
      </div>
      
      {/* Coluna de detalhes da data selecionada */}
      <div className="flex-1">
        <div className="bg-background dark:bg-background border-border border rounded-md h-full shadow-sm flex flex-col overflow-hidden">
          {/* Cabeçalho do painel */}
          <div className="border-b p-4 bg-muted/30 dark:bg-muted/10">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-muted-foreground" />
                <h3 className="text-lg font-medium">
                  {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </h3>
              </div>
              <Badge variant="secondary" className="rounded-full font-medium">
                {sessionsForSelectedDay.length} sessões
              </Badge>
            </div>
          </div>
          
          {/* Conteúdo do painel */}
          <div className="flex-1 p-4 overflow-y-auto">
            {sessionsForSelectedDay.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center py-10 text-muted-foreground">
                <p>Não há sessões para esta data.</p>
                <Button variant="outline" onClick={handleAddSession} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Agendar Sessão
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {sessionsForSelectedDay.map((session) => (
                  <div key={session.id} 
                    className={`border ${session.source === 'Favale' ? 'border-l-blue-500 border-l-4' : 'border-l-pink-500 border-l-4'} bg-card dark:bg-card rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-base">
                          {format(new Date(session.startTime), 'HH:mm', { locale: ptBR })} - 
                          {format(new Date(session.endTime), 'HH:mm', { locale: ptBR })}
                        </p>
                        <p className="text-card-foreground my-1">
                          {session.studentName} com {session.trainerName}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                            <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                          </svg>
                          {session.location}
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Agendar Nova Sessão</DialogTitle>
          </DialogHeader>
          <SessionForm 
            onSuccess={() => {
              setDialogOpen(false);
              toast({
                title: 'Sessão agendada',
                description: 'A sessão foi agendada com sucesso!',
              });
            }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}