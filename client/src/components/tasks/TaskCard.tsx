import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, Calendar, User, MessageSquare, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { useState } from "react";
import TaskDetailDialog from "./TaskDetailDialog";

interface TaskCardProps {
  id: number;
  title: string;
  description?: string;
  assignedToName: string;
  assignedByName: string;
  dueDate?: Date;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  relatedLeadName?: string;
  commentCount: number;
  onStatusChange?: (taskId: number, newStatus: string) => void;
}

export default function TaskCard({
  id,
  title,
  description,
  assignedToName,
  assignedByName,
  dueDate,
  priority,
  status,
  relatedLeadName,
  commentCount,
  onStatusChange
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Alta</Badge>;
      case "medium":
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Média</Badge>;
      case "low":
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Baixa</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Pendente</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">Em andamento</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Concluída</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusActions = () => {
    if (!onStatusChange) return null;

    switch (status) {
      case "pending":
        return (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
              onClick={() => onStatusChange(id, "in_progress")}
            >
              Iniciar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => onStatusChange(id, "cancelled")}
            >
              Cancelar
            </Button>
          </>
        );
      case "in_progress":
        return (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => onStatusChange(id, "completed")}
            >
              Concluir
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => onStatusChange(id, "pending")}
            >
              Pausar
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "pending":
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-purple-500" />;
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  return (
    <Card 
      className={`p-4 transition-all duration-200 ${status === "completed" ? "opacity-75" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
        </div>
        <div className="flex gap-2">
          {getPriorityBadge(priority)}
          {getStatusBadge(status)}
        </div>
      </div>
      
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{description}</p>
      )}
      
      <div className="flex flex-col gap-1.5 text-sm">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <span className="text-gray-700 dark:text-gray-200">Responsável: {assignedToName}</span>
        </div>
        
        {dueDate && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700 dark:text-gray-200">
              Prazo: {format(new Date(dueDate), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
        )}
        
        {relatedLeadName && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700 dark:text-gray-200">Lead: {relatedLeadName}</span>
          </div>
        )}
        
        {commentCount > 0 && (
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700 dark:text-gray-200">{commentCount} comentário{commentCount > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
      
      <div className={`flex justify-between items-center mt-4 ${isHovered ? "opacity-100" : "opacity-0"} transition-opacity duration-200`}>
        <div className="flex gap-2">
          {getStatusActions()}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setTaskDetailOpen(true)}
        >
          Ver detalhes
        </Button>
      </div>

      {/* Dialog de detalhes da tarefa */}
      <TaskDetailDialog 
        open={taskDetailOpen} 
        onOpenChange={setTaskDetailOpen} 
        taskId={id} 
      />
    </Card>
  );
} 