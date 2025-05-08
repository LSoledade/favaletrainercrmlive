import { useQuery } from "@tanstack/react-query";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, MapPin, User, Clock } from "lucide-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface Session {
  id: number;
  startTime: string;
  endTime: string;
  studentId: number;
  studentName: string;
  trainerId: number;
  trainerName?: string;
  location: string;
  status: string;
  source: string;
  type?: string;
  notes?: string;
}

interface TodayAppointmentCardProps {
  className?: string;
}

export default function TodayAppointmentCard({ className = "" }: TodayAppointmentCardProps) {
  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  // Filtrar sessões para hoje e ordená-las por horário
  const todaySessions = sessions
    ? sessions
        .filter(session => isToday(new Date(session.startTime)))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    : [];

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case "agendado":
      case "scheduled":
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Agendado</Badge>;
      case "concluído":
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Concluído</Badge>;
      case "cancelado":
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Cancelado</Badge>;
      case "remarcado":
      case "rescheduled":
        return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">Remarcado</Badge>;
      case "não compareceu":
      case "no-show":
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Não Compareceu</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card variant="glowIntenseLifted" className={`flex flex-col h-full p-3 sm:p-5 ${className}`}>
      <div className="flex justify-between items-center mb-3 sm:mb-4 border-b dark:border-primary/20 pb-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-[#ff9810]" />
          <h3 className="font-heading text-base sm:text-lg font-medium dark:text-white dark:glow-title">Agendamentos de Hoje</h3>
        </div>
        <Link href="/calendario">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-secondary transition-all duration-200 dark:text-gray-300 dark:hover:text-pink-400 hover:scale-110 dark:hover:glow-text">
                  <span className="material-icons text-base sm:text-lg">calendar_month</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver calendário completo</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : todaySessions.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {todaySessions.map((session) => (
              <div 
                key={session.id} 
                className={`bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-gray-700/50 ${
                  session.source === 'Favale' ? 'border-l-blue-500' : 'border-l-pink-500'
                } border-l-4 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 hover-lift-sm group`}
              >
                <div className="flex justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                    <span className="font-medium text-gray-800 dark:text-white">
                      {format(new Date(session.startTime), 'HH:mm', { locale: ptBR })} - 
                      {format(new Date(session.endTime), 'HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                  {getStatusBadge(session.status)}
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <User className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                  <span className="text-gray-700 dark:text-gray-200 truncate">{session.studentName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                  <span className="text-gray-600 dark:text-gray-300 text-sm truncate">
                    {session.location}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col justify-center items-center py-6 text-muted-foreground">
            <div className="p-4 rounded-full bg-gray-50 dark:bg-gray-700/30 mb-3">
              <CalendarClock className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-2">
              Não há agendamentos para hoje
            </p>
            <Link href="/agendamentos">
              <Button variant="outline" size="sm" className="mt-2">
                Gerenciar Agendamentos
              </Button>
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}