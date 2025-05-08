import { useState, useEffect } from "react";
import { useTaskContext } from "@/context/TaskContext";
import TaskCard from "./TaskCard";
import TaskDialog from "./TaskDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Clock,
  CheckCircle,
  PlusCircle,
  ListFilter,
  LayoutGrid,
  LayoutList,
  ArrowUpDown,
  Filter,
  Calendar
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Função para gerar cor consistente com base em uma string
function stringToColor(str: string) {
  let hash = 0;
  if (!str) return '#70a0ea';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  
  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f43f5e', // rose
    '#6366f1', // indigo
    '#84cc16', // lime
    '#06b6d4', // cyan
    '#22c55e', // emerald
  ];
  
  return colors[Math.abs(hash) % colors.length];
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";

export default function TasksPage() {
  const { 
    tasks, 
    loading, 
    error, 
    fetchTasks, 
    updateTask,
    myTasks, 
    assignedTasks, 
    completedTasks 
  } = useTaskContext();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("my-tasks");
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [sortBy, setSortBy] = useState<"due" | "priority" | "recent">("recent");
  
  // Tarefas organizadas por status
  const pendingTasks = tasks.filter(task => task.status === "pending");
  const inProgressTasks = tasks.filter(task => task.status === "in_progress");
  const completedTasksList = tasks.filter(task => task.status === "completed");
  
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  
  const handleStatusChange = async (taskId: number, newStatus: string) => {
    await updateTask(taskId, { status: newStatus as "pending" | "in_progress" | "completed" | "cancelled" });
  };
  
  const filterTasks = (taskList: any[]) => {
    if (!searchQuery) return taskList;
    
    const query = searchQuery.toLowerCase();
    return taskList.filter(task => 
      task.title.toLowerCase().includes(query) || 
      (task.description && task.description.toLowerCase().includes(query)) ||
      (task.assignedToName && task.assignedToName.toLowerCase().includes(query)) ||
      (task.relatedLeadName && task.relatedLeadName.toLowerCase().includes(query))
    );
  };
  
  const sortTasks = (tasks: any[]) => {
    if (sortBy === "due") {
      return [...tasks].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } else if (sortBy === "priority") {
      const priorityValue = { high: 3, medium: 2, low: 1 };
      return [...tasks].sort((a, b) => 
        priorityValue[b.priority as keyof typeof priorityValue] - 
        priorityValue[a.priority as keyof typeof priorityValue]
      );
    } else {
      // recent (default)
      return [...tasks].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }
  };
  
  const filteredMyTasks = sortTasks(filterTasks(myTasks));
  const filteredAssignedTasks = sortTasks(filterTasks(assignedTasks));
  const filteredCompletedTasks = sortTasks(filterTasks(completedTasks));
  
  const filteredPendingTasks = sortTasks(filterTasks(pendingTasks));
  const filteredInProgressTasks = sortTasks(filterTasks(inProgressTasks));
  const filteredCompletedTasksList = sortTasks(filterTasks(completedTasksList));
  
  // Helper functions for UI components
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-amber-500 border-amber-200 bg-amber-50 dark:bg-amber-900/20";
      case "in_progress":
        return "text-blue-500 border-blue-200 bg-blue-50 dark:bg-blue-900/20";
      case "completed":
        return "text-green-500 border-green-200 bg-green-50 dark:bg-green-900/20";
      case "cancelled":
        return "text-red-500 border-red-200 bg-red-50 dark:bg-red-900/20";
      default:
        return "text-gray-500 border-gray-200 bg-gray-50 dark:bg-gray-800/30";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-amber-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "A fazer";
      case "in_progress":
        return "Em andamento";
      case "completed":
        return "Concluído";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };
  
  const getTaskCardBorderColor = (status: string) => {
    switch (status) {
      case "pending":
        return "border-l-amber-500 dark:border-l-amber-400";
      case "in_progress":
        return "border-l-blue-500 dark:border-l-blue-400";
      case "completed":
        return "border-l-green-500 dark:border-l-green-400";
      case "cancelled":
        return "border-l-red-500 dark:border-l-red-400";
      default:
        return "border-l-gray-300 dark:border-l-gray-700";
    }
  };
  
  // Compact task card component for board view
  const TaskBoardCard = ({ task }: { task: any }) => {
    // Gerar um código e cor para o cartão baseado no seu status
    const getCardCode = () => {
      switch(task.status) {
        case 'pending':
          return { code: 'TD', color: 'text-yellow-700 bg-yellow-50' };
        case 'in_progress':
          return { code: 'IP', color: 'text-blue-700 bg-blue-50' };
        case 'completed':
          return { code: 'RV', color: 'text-green-700 bg-green-50' };
        default:
          return { code: 'TK', color: 'text-gray-700 bg-gray-50' };
      }
    };
    
    const { code, color } = getCardCode();
    const cardId = `${code}-${String(task.id).padStart(3, '0')}`;
    
    // Determinar a cor da barra de prioridade
    const priorityColor = task.priority === 'high' ? 'bg-orange-500' : 
                         task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-500';
                          
    return (
      <Card 
        className="p-0 mb-3 overflow-hidden bg-white dark:bg-gray-800 hover:shadow-md transition-all cursor-pointer border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 relative"
      >
        {/* Cabeçalho do cartão com código e menu */}
        <div className="flex items-center justify-between p-3 pb-1 pl-4">
          <div className={`text-xs ${color} px-1.5 py-0.5 rounded font-medium flex items-center`}>
            {cardId}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                  <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleStatusChange(task.id, "pending")}>
                Mover para A fazer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(task.id, "in_progress")}>
                Mover para Em andamento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange(task.id, "completed")}>
                Marcar como Concluída
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/tarefas/${task.id}`}>
                  Ver detalhes
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Título da tarefa */}
        <div className="px-4 pt-1 pb-2">
          <h4 className="font-medium text-sm">{task.title}</h4>
          {task.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
              {task.description}
            </p>
          )}
        </div>
        
        {/* Indicador de prioridade como uma barra lateral */}
        <div className={`absolute top-0 left-0 w-1 h-full ${priorityColor}`}></div>
        
        {/* Rodapé com metadados */}
        <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-700 pt-2 px-4 pb-3">
          <div className="flex items-center gap-1">
            {task.relatedLeadName && (
              <Badge variant="outline" className="text-[10px] px-1.5 h-4 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                {task.relatedLeadName.split(' ')[0]}
              </Badge>
            )}
            
            {task.dueDate && (
              <Badge variant="outline" className="text-[10px] px-1.5 h-4 bg-amber-50 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="10" 
                  height="10" 
                  viewBox="0 0 24 24" 
                  fill="none"
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="h-2.5 w-2.5"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {format(new Date(task.dueDate), "dd/MM", { locale: ptBR })}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {task.comments?.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <svg 
                  width="15" 
                  height="15" 
                  viewBox="0 0 15 15" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-3 w-3"
                >
                  <path d="M12.5 3L2.5 3.00002C1.67157 3.00002 1 3.6716 1 4.50002V9.50003C1 10.3285 1.67157 11 2.5 11H7.50003C7.63264 11 7.75982 11.0527 7.85358 11.1465L10 13.2929V11.5C10 11.2239 10.2239 11 10.5 11H12.5C13.3284 11 14 10.3285 14 9.50003V4.5C14 3.67157 13.3284 3 12.5 3ZM2.49999 2.00002L12.5 2C13.8807 2 15 3.11929 15 4.5V9.50003C15 10.8807 13.8807 12 12.5 12H11V14.5C11 14.7022 10.8782 14.8845 10.6913 14.9619C10.5045 15.0393 10.2894 14.9965 10.1464 14.8536L7.29292 12H2.5C1.11929 12 0 10.8807 0 9.50003V4.50002C0 3.11931 1.11928 2.00002 2.49999 2.00002Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
                {task.comments.length}
              </span>
            )}
            
            <Avatar className="h-5 w-5 ring-2 ring-white dark:ring-gray-800">
              <AvatarFallback 
                className="text-[10px] font-medium"
                style={{
                  background: stringToColor(task.assignedToName || 'User'),
                  color: 'white'
                }}
              >
                {task.assignedToName?.substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </Card>
    );
  };
  
  // Render the board view
  const renderBoardView = () => {
    const statuses = ["pending", "in_progress", "completed"];
    const taskColumns = {
      pending: filteredPendingTasks,
      in_progress: filteredInProgressTasks,
      completed: filteredCompletedTasksList
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-[500px]">
        {statuses.map(status => (
          <div key={status} className="flex flex-col">
            <div className="flex items-center justify-between p-3 pb-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 rounded-t-md">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-gray-700 dark:text-gray-200">
                  {getStatusLabel(status)}
                </span>
                <span className="text-xs text-gray-500 font-normal">
                  {taskColumns[status as keyof typeof taskColumns].length}
                </span>
              </div>
              <div className="flex items-center">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  onClick={() => {}}
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 4C2.22386 4 2 4.22386 2 4.5C2 4.77614 2.22386 5 2.5 5H12.5C12.7761 5 13 4.77614 13 4.5C13 4.22386 12.7761 4 12.5 4H2.5ZM2 7.5C2 7.22386 2.22386 7 2.5 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H2.5C2.22386 8 2 7.77614 2 7.5ZM2 10.5C2 10.2239 2.22386 10 2.5 10H12.5C12.7761 10 13 10.2239 13 10.5C13 10.7761 12.7761 11 12.5 11H2.5C2.22386 11 2 10.7761 2 10.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                  </svg>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  onClick={() => {
                    setShowCreateTaskDialog(true);
                  }}
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-md flex-1 p-3 overflow-auto min-h-[500px]">
              {taskColumns[status as keyof typeof taskColumns].length > 0 ? (
                <>
                  {taskColumns[status as keyof typeof taskColumns].map(task => (
                    <TaskBoardCard key={task.id} task={task} />
                  ))}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-24 text-sm text-gray-500 dark:text-gray-400">
                  <p>Nenhuma tarefa</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setShowCreateTaskDialog(true)}
                  >
                    <PlusCircle className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 border border-dashed border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600 flex items-center justify-center py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                onClick={() => setShowCreateTaskDialog(true)}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Adicionar Nova Tarefa
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const renderListView = (tasksList: any[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasksList.map((task) => (
        <TaskCard
          key={task.id}
          id={task.id}
          title={task.title}
          description={task.description}
          assignedToName={task.assignedToName || ""}
          assignedByName={task.assignedByName || ""}
          dueDate={task.dueDate}
          priority={task.priority}
          status={task.status}
          relatedLeadName={task.relatedLeadName}
          commentCount={task.comments?.length || 0}
          onStatusChange={handleStatusChange}
        />
      ))}
    </div>
  );
  
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Gestão de Tarefas</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gerencie suas tarefas e delegue atividades para sua equipe
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <Input
            placeholder="Buscar tarefas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="md:w-64"
          />
          
          <div className="flex border rounded-md overflow-hidden">
            <Button 
              variant={viewMode === "board" ? "default" : "ghost"}
              size="sm"
              className={`rounded-none px-3 ${viewMode === 'board' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setViewMode("board")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className={`rounded-none px-3 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>
          
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as "due" | "priority" | "recent")}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <span>Ordenar por</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="priority">Prioridade</SelectItem>
              <SelectItem value="due">Data de vencimento</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={() => setShowCreateTaskDialog(true)}
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>
      </div>
      
      {viewMode === "list" ? (
        <Tabs defaultValue="my-tasks" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="my-tasks" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Minhas Tarefas
              {myTasks.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-600 rounded-full px-2 py-0.5 ml-1">
                  {myTasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="assigned-tasks" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Delegadas
              {assignedTasks.length > 0 && (
                <span className="text-xs bg-purple-100 text-purple-600 rounded-full px-2 py-0.5 ml-1">
                  {assignedTasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed-tasks" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Concluídas
              {completedTasks.length > 0 && (
                <span className="text-xs bg-green-100 text-green-600 rounded-full px-2 py-0.5 ml-1">
                  {completedTasks.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-tasks" className="mt-0">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <p>Carregando tarefas...</p>
              </div>
            ) : filteredMyTasks.length > 0 ? (
              renderListView(filteredMyTasks)
            ) : (
              <div className="flex flex-col justify-center items-center h-32 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-md">
                <p className="text-gray-500 dark:text-gray-400 mb-2">Você não possui tarefas atribuídas</p>
                <Button variant="outline" size="sm" onClick={() => setShowCreateTaskDialog(true)}>
                  Criar nova tarefa
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="assigned-tasks" className="mt-0">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <p>Carregando tarefas...</p>
              </div>
            ) : filteredAssignedTasks.length > 0 ? (
              renderListView(filteredAssignedTasks)
            ) : (
              <div className="flex flex-col justify-center items-center h-32 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-md">
                <p className="text-gray-500 dark:text-gray-400 mb-2">Você não delegou nenhuma tarefa</p>
                <Button variant="outline" size="sm" onClick={() => setShowCreateTaskDialog(true)}>
                  Delegar nova tarefa
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="completed-tasks" className="mt-0">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <p>Carregando tarefas...</p>
              </div>
            ) : filteredCompletedTasks.length > 0 ? (
              renderListView(filteredCompletedTasks)
            ) : (
              <div className="flex justify-center items-center h-32 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-md">
                <p className="text-gray-500 dark:text-gray-400">Nenhuma tarefa concluída</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        renderBoardView()
      )}
      
      {showCreateTaskDialog && (
        <TaskDialog 
          open={showCreateTaskDialog} 
          onOpenChange={setShowCreateTaskDialog} 
        />
      )}
    </div>
  );
} 