
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
  conversionRate: string;
  leadsBySource: {
    Favale: number;
    Pink: number;
  };
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="m-6 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg text-red-600 dark:text-red-400">
        <p>Erro ao carregar estatísticas do dashboard.</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
        <KpiCard
          title="Total de Leads"
          value={stats.totalLeads}
          icon="people"
          change={12}
          iconBgColor="bg-primary-light bg-opacity-20"
          iconColor="text-primary"
        />
        
        <KpiCard
          title="Total de Alunos"
          value={stats.totalStudents}
          icon="school"
          change={8}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
        />
        
        <KpiCard
          title="Taxa de Conversão"
          value={`${stats.conversionRate}%`}
          icon="trending_up"
          change={-2}
          iconBgColor="bg-amber-100"
          iconColor="text-amber-600"
        />
        
        <KpiCard
          title="Leads por Campanha"
          value={stats.totalLeadsByCampaign}
          icon="campaign"
          change={15}
          iconBgColor="bg-secondary-light bg-opacity-20"
          iconColor="text-secondary-light"
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
