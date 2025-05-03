import { useQuery } from "@tanstack/react-query";
import { Lead } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export default function RecentActivity() {
  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });
  
  // Generate activities based on leads
  // In a real application, you would have a dedicated API for activities
  const generateActivities = (leads: Lead[]): Activity[] => {
    const sortedLeads = [...leads].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    
    const activities: Activity[] = sortedLeads.slice(0, 5).map((lead, index) => {
      // Create different types of activities based on the lead data and index
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
          iconBgColor = "bg-primary-light bg-opacity-20";
          iconColor = "text-primary";
          break;
        case "converted":
          title = `${lead.name} convertido para aluno`;
          icon = "check_circle";
          iconBgColor = "bg-green-100";
          iconColor = "text-green-600";
          break;
        case "updated":
          title = `${lead.name} atualizou informações de contato`;
          icon = "update";
          iconBgColor = "bg-amber-100";
          iconColor = "text-amber-600";
          break;
        case "deleted":
          title = `Lead ${lead.name} removido`;
          icon = "delete";
          iconBgColor = "bg-red-100";
          iconColor = "text-red-600";
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
    
    // Add a campaign activity for variety
    activities.splice(2, 0, {
      id: "activity-campaign",
      type: "campaign",
      title: "Nova campanha Verão 2023 iniciada",
      description: "",
      time: "Há 2 horas",
      icon: "campaign",
      iconBgColor: "bg-secondary-light bg-opacity-20",
      iconColor: "text-secondary-light"
    });
    
    return activities.slice(0, 5);
  };
  
  const activities = leads ? generateActivities(leads) : [];
  
  return (
    <div className="bg-white rounded-lg shadow-md p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-heading text-lg font-medium">Atividades Recentes</h3>
        <button className="text-gray-400 hover:text-secondary">
          <span className="material-icons">more_vert</span>
        </button>
      </div>
      
      <div className="overflow-y-auto max-h-64">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="flex mb-4 items-start">
              <div className={`${activity.iconBgColor} rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0`}>
                <span className={`material-icons text-sm ${activity.iconColor}`}>{activity.icon}</span>
              </div>
              <div>
                <p className="text-sm">{activity.title}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 py-4">Nenhuma atividade recente</p>
        )}
      </div>
    </div>
  );
}
