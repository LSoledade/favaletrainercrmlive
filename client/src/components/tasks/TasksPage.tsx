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
  Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    return (
      <Card 
        className={`p-3 border-l-4 mb-2 hover:shadow-md transition-all ${getTaskCardBorderColor(task.status)}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
              <h4 className="font-medium text-sm">{task.title}</h4>
            </div>
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
        {task.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
            {task.description}
          </p>
        )}
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center">
            <Avatar className="h-5 w-5 mr-1.5">
              <AvatarFallback className="text-[10px]">
                {task.assignedToName?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {task.dueDate ? format(new Date(task.dueDate), "dd/MM", { locale: ptBR }) : ''}
            </span>
          </div>
          {task.comments?.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
              <svg 
                width="15" 
                height="15" 
                viewBox="0 0 15 15" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-3 w-3 mr-1"
              >
                <path d="M12.5 3L2.5 3.00002C1.67157 3.00002 1 3.6716 1 4.50002V9.50003C1 10.3285 1.67157 11 2.5 11H7.50003C7.63264 11 7.75982 11.0527 7.85358 11.1465L10 13.2929V11.5C10 11.2239 10.2239 11 10.5 11H12.5C13.3284 11 14 10.3285 14 9.50003V4.5C14 3.67157 13.3284 3 12.5 3ZM2.49999 2.00002L12.5 2C13.8807 2 15 3.11929 15 4.5V9.50003C15 10.8807 13.8807 12 12.5 12H11V14.5C11 14.7022 10.8782 14.8845 10.6913 14.9619C10.5045 15.0393 10.2894 14.9965 10.1464 14.8536L7.29292 12H2.5C1.11929 12 0 10.8807 0 9.50003V4.50002C0 3.11931 1.11928 2.00002 2.49999 2.00002Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
              </svg>
              {task.comments.length}
            </span>
          )}
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
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-md">
              <div className="flex items-center">
                {status === "pending" && <Clock className="h-4 w-4 mr-2 text-amber-500" />}
                {status === "in_progress" && <AlertCircle className="h-4 w-4 mr-2 text-blue-500" />}
                {status === "completed" && <CheckCircle className="h-4 w-4 mr-2 text-green-500" />}
                <span className="font-medium">{getStatusLabel(status)}</span>
                <Badge variant="outline" className="ml-2">
                  {taskColumns[status as keyof typeof taskColumns].length}
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setShowCreateTaskDialog(true);
                }}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
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