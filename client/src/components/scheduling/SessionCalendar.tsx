import { useState, useEffect } from 'react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  // Função para destacar datas no calendário
  const getDayClass = (day: Date | undefined) => {
    // Se o dia for undefined, retornar string vazia
    if (!day) return '';
    
    // Verificar se há sessões no dia
    const hasSessionsOnDay = sessions.some(session => isSameDay(new Date(session.startTime), day));
    if (hasSessionsOnDay) {
      // Verificar tipo de sessão (Favale ou Pink)
      const hasFavale = sessions.some(session => 
        isSameDay(new Date(session.startTime), day) && session.source === 'Favale'
      );
      const hasPink = sessions.some(session => 
        isSameDay(new Date(session.startTime), day) && session.source === 'Pink'
      );
      
      if (hasFavale && hasPink) {
        // Dia tem ambos os tipos
        return 'border-l-4 border-r-4 border-l-blue-500 border-r-pink-500';
      } else if (hasFavale) {
        // Dia tem apenas Favale
        return 'border-l-4 border-l-blue-500';
      } else if (hasPink) {
        // Dia tem apenas Pink
        return 'border-l-4 border-l-pink-500';
      }
    }
    return '';
  };

  const handleAddSession = () => {
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="flex flex-col space-y-4">
        {/* Container principal do calendário e detalhes */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Coluna do calendário */}
          <div className="lg:w-[350px]">
            <CalendarComponent
              mode="single"
              selected={date}
              onSelect={(date) => setDate(date || new Date())}
              className="rounded-md border w-full"
              locale={ptBR}
              modifiersClassNames={{
                today: 'bg-primary text-primary-foreground',
              }}
              // Usando modifiers para marcação de datas especiais
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
              // Estilizando os dias com classes específicas
              classNames={{
                day_today: "bg-primary text-primary-foreground",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day: "relative",
                day_favale: "before:absolute before:content-[''] before:h-full before:w-1 before:bg-blue-500 before:left-0",
                day_pink: "before:absolute before:content-[''] before:h-full before:w-1 before:bg-pink-500 before:left-0",
                day_both: "before:absolute before:content-[''] before:h-full before:w-1 before:bg-blue-500 before:left-0 after:absolute after:content-[''] after:h-full after:w-1 after:bg-pink-500 after:right-0"
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
            <div className="border rounded-md h-full p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  <h3 className="text-lg font-medium">
                    {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </h3>
                </div>
                <Badge variant="outline">
                  {sessionsForSelectedDay.length} sessões
                </Badge>
              </div>
              
              {sessionsForSelectedDay.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>Não há sessões para esta data.</p>
                  <Button variant="outline" onClick={handleAddSession} className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Agendar Sessão
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessionsForSelectedDay.map((session) => (
                    <div key={session.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">
                            {format(new Date(session.startTime), 'HH:mm', { locale: ptBR })} - 
                            {format(new Date(session.endTime), 'HH:mm', { locale: ptBR })}
                          </p>
                          <p className="text-muted-foreground">
                            {session.studentName} com {session.trainerName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
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