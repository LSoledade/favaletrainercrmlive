import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SessionForm } from './SessionForm';

export function SessionCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Dados mock para eventos - serão substituídos por dados reais da API
  const events = [
    {
      id: 1,
      date: new Date(new Date().setDate(new Date().getDate() - 2)),
      source: 'Favale',
      studentName: 'Carlos Silva',
    },
    {
      id: 2,
      date: new Date(new Date().setDate(new Date().getDate() + 1)),
      source: 'Pink',
      studentName: 'Maria Pereira',
    },
    {
      id: 3,
      date: new Date(),
      source: 'Favale',
      studentName: 'João Santos',
    },
  ];

  // Função para verificar se uma data tem sessões agendadas
  const hasSessionOnDate = (day: Date) => {
    return events.some(event => 
      event.date.getDate() === day.getDate() && 
      event.date.getMonth() === day.getMonth() && 
      event.date.getFullYear() === day.getFullYear());
  };
  
  // Renderiza o conteúdo do dia no calendário
  const renderDay = (day: Date) => {
    const isToday = day.toDateString() === new Date().toDateString();
    const hasSessions = hasSessionOnDate(day);
    
    return (
      <div className={cn(
        'w-full h-full flex items-center justify-center',
        isToday && 'font-bold',
        hasSessions && 'relative'
      )}>
        {day.getDate()}
        {hasSessions && (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-1">
            {events
              .filter(event => 
                event.date.getDate() === day.getDate() && 
                event.date.getMonth() === day.getMonth() && 
                event.date.getFullYear() === day.getFullYear()
              )
              .map(event => (
                <div 
                  key={event.id}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    event.source === 'Favale' ? 'bg-blue-500' : 'bg-pink-500'
                  )}
                  title={`${event.studentName} - ${event.source}`}
                />
              )).slice(0, 3)
            }
            {events
              .filter(event => 
                event.date.getDate() === day.getDate() && 
                event.date.getMonth() === day.getMonth() && 
                event.date.getFullYear() === day.getFullYear()
              ).length > 3 && (
                <div className="w-1.5 h-1.5 rounded-full bg-gray-500" title="Mais sessões..." />
              )}
          </div>
        )}
      </div>
    );
  };

  const todayEvents = events.filter(event => 
    event.date.getDate() === (date?.getDate() || 0) && 
    event.date.getMonth() === (date?.getMonth() || 0) && 
    event.date.getFullYear() === (date?.getFullYear() || 0)
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>Calendário de Sessões</CardTitle>
              <CardDescription>Visualize e gerencie sessões de treinamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>Agendar Nova Sessão</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Agendar Sessão</DialogTitle>
                    </DialogHeader>
                    <SessionForm 
                      selectedDate={date || new Date()} 
                      onSuccess={() => setCreateDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </div>
      
        <div className="w-full md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>
                {date ? (
                  <span>Sessões do dia {date.toLocaleDateString('pt-BR')}</span>
                ) : (
                  <span>Selecione uma data no calendário</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayEvents.length > 0 ? (
                <div className="space-y-4">
                  {todayEvents.map((event) => (
                    <div 
                      key={event.id}
                      className={cn(
                        'p-4 rounded-lg border flex items-center justify-between',
                        event.source === 'Favale' ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-pink-500'
                      )}
                    >
                      <div>
                        <h3 className="font-medium">{event.studentName}</h3>
                        <p className="text-sm text-gray-500">
                          {event.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Ver
                        </Button>
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-500">Nenhuma sessão agendada para esta data.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
