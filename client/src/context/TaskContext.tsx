import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/components/ui/use-toast";

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
  createTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => Promise<Task>;
  updateTask: (id: number, task: Partial<Task>) => Promise<Task>;
  deleteTask: (id: number) => Promise<boolean>;
  addComment: (taskId: number, content: string) => Promise<TaskComment>;
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

  // Dados mockados para desenvolvimento
  useEffect(() => {
    const mockUsers = [
      { id: 1, name: "Admin User", role: "admin" },
      { id: 2, name: "João Silva", role: "user" },
      { id: 3, name: "Maria Oliveira", role: "user" },
    ];
    
    const mockLeads = [
      { id: 101, name: "Carlos Mendes" },
      { id: 102, name: "Lucia Ferreira" },
    ];

    const mockTasks = [
      {
        id: 1,
        title: "Acompanhar lead de alto potencial",
        description: "Entrar em contato para oferecer nosso pacote premium",
        assignedById: 1,
        assignedToId: 2,
        assignedByName: "Admin User",
        assignedToName: "João Silva",
        dueDate: new Date("2023-08-15"),
        priority: "high",
        status: "pending",
        relatedLeadId: 101,
        relatedLeadName: "Carlos Mendes",
        createdAt: new Date("2023-08-10"),
        updatedAt: new Date("2023-08-10"),
        comments: [
          {
            id: 1,
            taskId: 1,
            userId: 1,
            userName: "Admin User",
            content: "Priorize este lead, ele tem grande potencial de conversão",
            createdAt: new Date("2023-08-10T10:30:00"),
            updatedAt: new Date("2023-08-10T10:30:00"),
          },
        ],
      },
      {
        id: 2,
        title: "Preparar proposta personalizada",
        description: "Elaborar proposta com desconto para cliente fidelizado",
        assignedById: 1,
        assignedToId: 3,
        assignedByName: "Admin User",
        assignedToName: "Maria Oliveira",
        dueDate: new Date("2023-08-18"),
        priority: "medium",
        status: "in_progress",
        relatedLeadId: 102,
        relatedLeadName: "Lucia Ferreira",
        createdAt: new Date("2023-08-11"),
        updatedAt: new Date("2023-08-12"),
      },
      {
        id: 3,
        title: "Atualizar cadastro de clientes",
        description: "Revisar e atualizar informações de contato",
        assignedById: 1,
        assignedToId: 2,
        assignedByName: "Admin User",
        assignedToName: "João Silva",
        dueDate: new Date("2023-08-12"),
        priority: "low",
        status: "completed",
        createdAt: new Date("2023-08-05"),
        updatedAt: new Date("2023-08-12"),
      },
    ] as Task[];

    setTasks(mockTasks);
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Em produção, substituir por uma chamada à API
      // const response = await fetch('/api/tasks');
      // const data = await response.json();
      // setTasks(data);
      
      // Usando dados mockados por enquanto
      setLoading(false);
    } catch (err) {
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
      // Em produção, substituir por uma chamada à API
      // const response = await fetch(`/api/tasks/${id}`);
      // const data = await response.json();
      // return data;
      
      // Usando dados mockados por enquanto
      return tasks.find(task => task.id === id);
    } catch (err) {
      setError("Erro ao carregar detalhes da tarefa");
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os detalhes da tarefa.",
      });
      
      return undefined;
    }
  };

  const createTask = async (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
    try {
      // Em produção, substituir por uma chamada à API
      // const response = await fetch('/api/tasks', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(task)
      // });
      // const data = await response.json();
      
      // Simulando criação com dados mockados
      const newTask: Task = {
        ...task,
        id: tasks.length + 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
      };
      
      setTasks(prev => [...prev, newTask]);
      
      toast({
        title: "Sucesso",
        description: "Tarefa criada com sucesso.",
      });
      
      return newTask;
    } catch (err) {
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
      // Em produção, substituir por uma chamada à API
      // const response = await fetch(`/api/tasks/${id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(taskUpdate)
      // });
      // const data = await response.json();
      
      // Simulando atualização com dados mockados
      const updatedTasks = tasks.map(task => {
        if (task.id === id) {
          return { ...task, ...taskUpdate, updatedAt: new Date() };
        }
        return task;
      });
      
      setTasks(updatedTasks);
      
      const updatedTask = updatedTasks.find(task => task.id === id);
      
      if (updatedTask) {
        toast({
          title: "Sucesso",
          description: "Tarefa atualizada com sucesso.",
        });
        
        return updatedTask;
      }
      
      throw new Error("Tarefa não encontrada");
    } catch (err) {
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
      // Em produção, substituir por uma chamada à API
      // await fetch(`/api/tasks/${id}`, {
      //   method: 'DELETE'
      // });
      
      // Simulando exclusão com dados mockados
      setTasks(prev => prev.filter(task => task.id !== id));
      
      toast({
        title: "Sucesso",
        description: "Tarefa excluída com sucesso.",
      });
      
      return true;
    } catch (err) {
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
      // Em produção, substituir por uma chamada à API
      // const response = await fetch(`/api/tasks/${taskId}/comments`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ content })
      // });
      // const data = await response.json();
      
      // Simulando adição de comentário com dados mockados
      const newComment: TaskComment = {
        id: Math.floor(Math.random() * 1000),
        taskId,
        userId: 1, // Assumindo o usuário logado
        userName: "Admin User", // Assumindo o usuário logado
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
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
      
      return newComment;
    } catch (err) {
      setError("Erro ao adicionar comentário");
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível adicionar o comentário.",
      });
      
      throw err;
    }
  };

  // Filtrar tarefas atribuídas ao usuário atual (simulado como userId = 2)
  const currentUserId = 2; // Em produção, usar o ID do usuário autenticado
  const myTasks = tasks.filter(task => task.assignedToId === currentUserId && task.status !== "completed");
  
  // Filtrar tarefas atribuídas pelo usuário atual (admin)
  const assignedTasks = tasks.filter(task => task.assignedById === 1 && task.status !== "completed");
  
  // Filtrar tarefas concluídas
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