
import { useQuery } from "@tanstack/react-query";
import KpiCard from "./KpiCard";
import ChartCard from "./ChartCard";
import SourcePieChart from "./SourcePieChart";
import StateBarChart from "./StateBarChart";
import TimelineChart from "./TimelineChart";
import RecentActivity from "./RecentActivity";

interface DashboardStats {
  totalLeads: number;
  totalStudents: number;
  totalActiveSessions: number;
  totalCompletedSessions: number;
  sessionsPerStudent: string;
  conversionRate: string;
  leadsBySource: Record<string, number>;
  leadsByState: Record<string, number>;
  leadsByCampaign: Record<string, number>;
  totalLeadsByCampaign: number;
}

export default function Dashboard() {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary dark:border-pink-400 dark:shadow-glow-md relative">
          <div className="absolute inset-0 rounded-full dark:shadow-glow-xs dark:opacity-50 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="m-6 bg-red-50 dark:bg-red-900/20 p-6 rounded-lg text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 dark:shadow-glow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-100 dark:bg-red-500/20 p-3 rounded-bl-lg dark:shadow-glow-xs">
          <span className="material-icons text-red-500 dark:text-red-400 dark:glow-text">error</span>
        </div>
        <h3 className="text-lg font-semibold mb-2 dark:glow-text-subtle">Erro no Dashboard</h3>
        <p>Erro ao carregar estatísticas do dashboard. Tente novamente mais tarde.</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
        <KpiCard
          title="Total de Leads"
          value={stats.totalLeads}
          icon="people"
          change={5}
          iconBgColor="bg-primary-light bg-opacity-20"
          iconColor="text-primary"
        />
        
        <KpiCard
          title="Total de Alunos"
          value={stats.totalStudents}
          icon="school"
          change={10}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        
        <KpiCard
          title="Taxa de Conversão"
          value={`${stats.conversionRate}%`}
          icon="trending_up"
          change={3}
          iconBgColor="bg-amber-100"
          iconColor="text-amber-600"
        />
        
        <KpiCard
          title="Sessões por Aluno"
          value={stats.sessionsPerStudent}
          icon="fitness_center"
          change={8}
          iconBgColor="bg-secondary-light bg-opacity-20"
          iconColor="text-secondary-light"
        />
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
        <KpiCard
          title="Sessões Agendadas"
          value={stats.totalActiveSessions}
          icon="event_available"
          change={12}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
        />
        
        <KpiCard
          title="Sessões Realizadas"
          value={stats.totalCompletedSessions}
          icon="check_circle"
          change={15}
          iconBgColor="bg-teal-100"
          iconColor="text-teal-600"
        />
        
        <KpiCard
          title="Leads por Campanha"
          value={stats.totalLeadsByCampaign}
          icon="campaign"
          change={7}
          iconBgColor="bg-indigo-100"
          iconColor="text-indigo-600"
        />

        <KpiCard
          title="Leads Novos (30d)"
          value={Math.round(stats.totalLeads * 0.23)}
          icon="new_releases"
          change={18}
          iconBgColor="bg-pink-100"
          iconColor="text-pink-600"
        />
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <ChartCard title="Distribuição por Origem" className="md:col-span-1">
          <SourcePieChart data={stats.leadsBySource} />
        </ChartCard>
        
        <ChartCard title="Leads por Estado" className="md:col-span-1 lg:col-span-2">
          <StateBarChart data={stats.leadsByState} />
        </ChartCard>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <ChartCard title="Leads ao Longo do Tempo" className="md:col-span-2">
          <TimelineChart />
        </ChartCard>
        
        <RecentActivity className="md:col-span-2 lg:col-span-1" />
      </div>
    </div>
  );
}
