
import { useQuery } from "@tanstack/react-query";
import { Lead } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Activity {
  id: string;
  type: "new" | "converted" | "campaign" | "updated" | "deleted";
  title: string;
  description: string;
  time: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
}

interface RecentActivityProps {
  className?: string;
}

export default function RecentActivity({ className = "" }: RecentActivityProps) {
  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const generateActivities = (leads: Lead[]): Activity[] => {
    const sortedLeads = [...leads].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const activities: Activity[] = sortedLeads.slice(0, 5).map((lead, index) => {
      const types: ("new" | "converted" | "updated" | "deleted")[] = ["new", "converted", "updated", "deleted"];
      const type = lead.status === "Aluno" ? "converted" : types[index % types.length];

      let title = "";
      let icon = "";
      let iconBgColor = "";
      let iconColor = "";

      switch (type) {
        case "new":
          title = `${lead.name} adicionado como novo lead`;
          icon = "person_add";
          iconBgColor = "bg-primary-light bg-opacity-20 dark:bg-pink-400/20";
          iconColor = "text-primary dark:text-white";
          break;
        case "converted":
          title = `${lead.name} convertido para aluno`;
          icon = "check_circle";
          iconBgColor = "bg-green-100 dark:bg-green-600/20";
          iconColor = "text-green-600 dark:text-white";
          break;
        case "updated":
          title = `${lead.name} atualizou informações de contato`;
          icon = "update";
          iconBgColor = "bg-amber-100 dark:bg-amber-600/20";
          iconColor = "text-amber-600 dark:text-white";
          break;
        case "deleted":
          title = `Lead ${lead.name} removido`;
          icon = "delete";
          iconBgColor = "bg-red-100 dark:bg-red-600/20";
          iconColor = "text-red-600 dark:text-white";
          break;
      }

      return {
        id: `activity-${lead.id}-${type}`,
        type,
        title,
        description: "",
        time: formatDistanceToNow(new Date(lead.updatedAt), { 
          addSuffix: true, 
          locale: ptBR 
        }),
        icon,
        iconBgColor,
        iconColor
      };
    });

    activities.splice(2, 0, {
      id: "activity-campaign",
      type: "campaign",
      title: "Nova campanha Verão 2023 iniciada",
      description: "",
      time: "Há 2 horas",
      icon: "campaign",
      iconBgColor: "bg-secondary-light bg-opacity-20 dark:bg-pink-400/20",
      iconColor: "text-secondary-light dark:text-white"
    });

    return activities.slice(0, 5);
  };

  const activities = leads ? generateActivities(leads) : [];

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-slate-800 rounded-lg shadow-md dark:shadow-primary/5 p-3 sm:p-5 transition-all duration-200 ${className}`}>
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <h3 className="font-heading text-base sm:text-lg font-medium dark:text-white">Atividades Recentes</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-gray-400 hover:text-secondary transition-colors dark:text-gray-300 dark:hover:text-pink-400">
                <span className="material-icons text-base sm:text-lg">more_vert</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Mais ações</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary dark:border-pink-400"></div>
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start group hover:bg-gray-50 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors">
                <div className={`${activity.iconBgColor} rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0 dark:glow-xs transition-transform group-hover:scale-110`}>
                  <span className={`material-icons text-xs sm:text-sm ${activity.iconColor}`}>{activity.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xs sm:text-sm dark:text-white truncate cursor-help">{activity.title}</p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{activity.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-300 py-4">Nenhuma atividade recente</p>
        )}
      </div>
    </div>
  );
}
