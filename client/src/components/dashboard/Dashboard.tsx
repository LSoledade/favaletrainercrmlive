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
      <div className="w-full p-12 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 p-4 rounded-md text-red-600">
        <p>Erro ao carregar estatísticas do dashboard.</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ChartCard title="Distribuição por Origem">
          <SourcePieChart data={stats.leadsBySource} />
        </ChartCard>
        
        <ChartCard title="Leads por Estado">
          <StateBarChart data={stats.leadsByState} />
        </ChartCard>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Leads ao Longo do Tempo" className="lg:col-span-2">
          <TimelineChart />
        </ChartCard>
        
        <RecentActivity />
      </div>
    </div>
  );
}
