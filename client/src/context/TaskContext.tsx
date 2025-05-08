import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/components/ui/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Task {
  id: number;
  title: string;
  description?: string;
  assignedById: number;
  assignedToId: number;
  assignedByName?: string;
  assignedToName?: string;
  dueDate?: Date;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  relatedLeadId?: number;
  relatedLeadName?: string;
  createdAt: Date;
  updatedAt: Date;
  comments?: TaskComment[];
}

interface TaskComment {
  id: number;
  taskId: number;
  userId: number;
  userName?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  fetchTaskById: (id: number) => Promise<Task | undefined>;
  createTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "comments">) => Promise<Task>;
  updateTask: (id: number, task: Partial<Task>) => Promise<Task>;
  deleteTask: (id: number) => Promise<boolean>;
  addComment: (taskId: number, content: string) => Promise<TaskComment>;
  addTaskComment: (taskId: number, comment: Partial<TaskComment>) => Promise<TaskComment>;
  myTasks: Task[];
  assignedTasks: Task[];
  completedTasks: Task[];
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider = ({ children }: TaskProviderProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Carregar tarefas ao inicializar
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) {
        throw new Error(`Erro ao buscar tarefas: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Converter datas de string para Date
      const processedTasks = data.map((task: any) => ({
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        comments: task.comments?.map((comment: any) => ({
          ...comment,
          createdAt: new Date(comment.createdAt),
          updatedAt: new Date(comment.updatedAt),
        })),
      }));
      
      setTasks(processedTasks);
      setLoading(false);
    } catch (err) {
      console.error("Erro ao carregar tarefas:", err);
      setError("Erro ao carregar tarefas");
      setLoading(false);
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as tarefas.",
      });
    }
  };

  const fetchTaskById = async (id: number) => {
    try {
      const response = await fetch(`/api/tasks/${id}`);
      if (!response.ok) {
        throw new Error(`Erro ao buscar tarefa: ${response.status}`);
      }
      
      const task = await response.json();
      
      // Converter datas de string para Date
      const processedTask = {
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        comments: task.comments?.map((comment: any) => ({
          ...comment,
          createdAt: new Date(comment.createdAt),
          updatedAt: new Date(comment.updatedAt),
        })),
      };
      
      return processedTask;
    } catch (err) {
      console.error("Erro ao carregar detalhes da tarefa:", err);
      setError("Erro ao carregar detalhes da tarefa");
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os detalhes da tarefa.",
      });
      
      return undefined;
    }
  };

  const createTask = async (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "comments">) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao criar tarefa: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Converter datas de string para Date
      const newTask = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        comments: data.comments?.map((comment: any) => ({
          ...comment,
          createdAt: new Date(comment.createdAt),
          updatedAt: new Date(comment.updatedAt),
        })) || [],
      };
      
      // Atualizar estado local
      setTasks(prev => [...prev, newTask]);
      
      toast({
        title: "Sucesso",
        description: "Tarefa criada com sucesso.",
      });
      
      return newTask;
    } catch (err) {
      console.error("Erro ao criar tarefa:", err);
      setError("Erro ao criar tarefa");
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível criar a tarefa.",
      });
      
      throw err;
    }
  };

  const updateTask = async (id: number, taskUpdate: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskUpdate)
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao atualizar tarefa: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Converter datas de string para Date
      const updatedTask = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        comments: data.comments?.map((comment: any) => ({
          ...comment,
          createdAt: new Date(comment.createdAt),
          updatedAt: new Date(comment.updatedAt),
        })) || [],
      };
      
      // Atualizar estado local
      setTasks(prev => prev.map(task => 
        task.id === id ? updatedTask : task
      ));
      
      toast({
        title: "Sucesso",
        description: "Tarefa atualizada com sucesso.",
      });
      
      return updatedTask;
    } catch (err) {
      console.error("Erro ao atualizar tarefa:", err);
      setError("Erro ao atualizar tarefa");
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar a tarefa.",
      });
      
      throw err;
    }
  };

  const deleteTask = async (id: number) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao excluir tarefa: ${response.status}`);
      }
      
      // Atualizar estado local
      setTasks(prev => prev.filter(task => task.id !== id));
      
      toast({
        title: "Sucesso",
        description: "Tarefa excluída com sucesso.",
      });
      
      return true;
    } catch (err) {
      console.error("Erro ao excluir tarefa:", err);
      setError("Erro ao excluir tarefa");
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir a tarefa.",
      });
      
      return false;
    }
  };

  const addComment = async (taskId: number, content: string) => {
    try {
      // Obter informações do usuário atual (simulado)
      const currentUser = { id: 1, name: "Admin User" }; // Em produção, usar usuário autenticado
      
      const commentData = {
        taskId,
        userId: currentUser.id,
        content
      };
      
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentData)
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao adicionar comentário: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Converter datas de string para Date
      const newComment = {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        userName: currentUser.name, // Adicionar nome do usuário para exibição
      };
      
      // Atualizar estado local
      setTasks(prev => 
        prev.map(task => {
          if (task.id === taskId) {
            return {
              ...task,
              comments: [...(task.comments || []), newComment]
            };
          }
          return task;
        })
      );
      
      toast({
        title: "Comentário adicionado",
        description: "O comentário foi adicionado com sucesso.",
      });
      
      return newComment;
    } catch (err) {
      console.error("Erro ao adicionar comentário:", err);
      setError("Erro ao adicionar comentário");
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar o comentário.",
      });
      
      throw err;
    }
  };
  
  const addTaskComment = async (taskId: number, comment: Partial<TaskComment>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comment)
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao adicionar comentário: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Converter datas de string para Date
      const newComment = {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };
      
      // Atualizar estado local
      setTasks(prev => 
        prev.map(task => {
          if (task.id === taskId) {
            return {
              ...task,
              comments: [...(task.comments || []), newComment]
            };
          }
          return task;
        })
      );
      
      toast({
        title: "Comentário adicionado",
        description: "O comentário foi adicionado com sucesso.",
      });
      
      return newComment;
    } catch (err) {
      console.error("Erro ao adicionar comentário:", err);
      setError("Erro ao adicionar comentário");
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar o comentário.",
      });
      
      throw err;
    }
  };

  // Filtrar tarefas por usuário e status
  const currentUserId = 2; // Em produção, usar o ID do usuário autenticado
  const myTasks = tasks.filter(task => task.assignedToId === currentUserId && task.status !== "completed");
  const assignedTasks = tasks.filter(task => task.assignedById === 1 && task.status !== "completed");
  const completedTasks = tasks.filter(task => task.status === "completed");

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        error,
        fetchTasks,
        fetchTaskById,
        createTask,
        updateTask,
        deleteTask,
        addComment,
        addTaskComment,
        myTasks,
        assignedTasks,
        completedTasks,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  
  if (context === undefined) {
    throw new Error("useTaskContext deve ser usado dentro de um TaskProvider");
  }
  
  return context;
};