import { useState, useEffect } from "react";
import { useTaskContext } from "@/context/TaskContext";
import TaskCard from "./TaskCard";
import TaskDialog from "./TaskDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, CheckCircle, PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

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
  
  const filteredMyTasks = filterTasks(myTasks);
  const filteredAssignedTasks = filterTasks(assignedTasks);
  const filteredCompletedTasks = filterTasks(completedTasks);
  
  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Gestão de Tarefas</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gerencie suas tarefas e delegue atividades para sua equipe
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <Input
            placeholder="Buscar tarefas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="md:w-64"
          />
          <Button 
            onClick={() => setShowCreateTaskDialog(true)}
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Nova Tarefa
          </Button>
        </div>
      </div>
      
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMyTasks.map((task) => (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssignedTasks.map((task) => (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCompletedTasks.map((task) => (
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
                />
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center h-32 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-md">
              <p className="text-gray-500 dark:text-gray-400">Nenhuma tarefa concluída</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {showCreateTaskDialog && (
        <TaskDialog 
          open={showCreateTaskDialog} 
          onOpenChange={setShowCreateTaskDialog} 
        />
      )}
    </div>
  );
} 