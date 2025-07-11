import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react"; // Added useEffect back
import { useToast } from "@/hooks/use-toast"; // Updated
// Replace apiRequest with invokeSupabaseFunction and queryClient utils
import { invokeSupabaseFunction, getSupabaseQueryFn, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/features/auth/hooks/use-auth"; // Updated
import { useQuery, useMutation, useQueryClient, QueryObserverResult, RefetchOptions } from "@tanstack/react-query"; // Import useQuery and useMutation
import { Task, TaskComment, InsertTask, InsertTaskComment } from "@/types"; // Import richer types

// Remove local definitions of Task and TaskComment
// interface Task {
//   id: number;
//   title: string;
//   description?: string;
//   assignedById: string;
//   assignedToId: string;
//   assignedByName?: string;
//   assignedToName?: string;
//   dueDate?: Date;
//   priority: "low" | "medium" | "high";
//   status: "backlog" | "pending" | "in_progress" | "completed" | "cancelled";
//   // No longer using relatedLeadId and relatedLeadName
//   // Tasks are now assigned to system users only
//   createdAt: Date;
//   updatedAt: Date;
//   comments?: TaskComment[];
// }

// interface TaskComment {
//   id: number;
//   taskId: number;
//   userId: string;
//   userName?: string;
//   content: string;
//   createdAt: Date;
//   updatedAt: Date;
// }

interface TaskContextType {
  tasks: Task[]; // Use Task from @/types
  loading: boolean;
  error: string | null;
  fetchTasks: (options?: RefetchOptions | undefined) => Promise<QueryObserverResult<Task[], Error>>;
  fetchTaskById: (id: number) => Promise<Task | undefined>;
  createTask: (task: InsertTask) => Promise<Task>;
  updateTask: (id: number, task: Partial<Task>) => Promise<Task>;
  deleteTask: (id: number) => Promise<boolean>;
  addComment: (taskId: number, content: string) => Promise<TaskComment>; // Content only for simple adds
  addTaskComment: (comment: InsertTaskComment) => Promise<TaskComment>; // Full comment object for richer adds
  deleteTaskComment: (commentId: number) => Promise<boolean>;
  myTasks: Task[];
  assignedTasks: Task[];
  completedTasks: Task[];
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider = ({ children }: TaskProviderProps) => {
  // Remove local state for tasks, loading, error as this will be handled by React Query
  // const [tasks, setTasks] = useState<Task[]>([]);
  // const [loading, setLoading] = useState(false);
  // const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user: authUser } = useAuth(); // Get Supabase authenticated user
  const tanstackQueryClient = useQueryClient(); // For invalidations

  // Fetch all tasks using React Query
  const { data: tasks = [], isLoading: loading, error, refetch: fetchTasks } = useQuery<Task[], Error>({
    queryKey: ['tasksList'],
    queryFn: getSupabaseQueryFn({
      functionName: 'task-functions',
      on401: 'throw',
    }),
    // Process data to convert date strings to Date objects
    select: (data) => data.map(task => ({
      ...task,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      createdAt: new Date(task.createdAt),
      updatedAt: new Date(task.updatedAt),
      comments: task.comments?.map((comment: TaskComment) => ({ // Updated
        ...comment,
        createdAt: new Date(comment.createdAt),
        updatedAt: new Date(comment.updatedAt),
      })),
    })),
    enabled: !!authUser, // Only fetch if user is authenticated
  });

  // Callback to fetch a single task by ID (can also be a useQuery if needed frequently standalone)
  const fetchTaskById = useCallback(async (id: number): Promise<Task | undefined> => {
    try {
      const task = await invokeSupabaseFunction<Task | undefined>(
        'task-functions',
        'GET',
        undefined,
        { slug: id.toString() }
      );
      if (!task) return undefined;
      // Process dates
      const processedTask = {
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        comments: task.comments?.map((comment: TaskComment) => ({ // Updated
          ...comment,
          createdAt: new Date(comment.createdAt),
          updatedAt: new Date(comment.updatedAt),
        })),
      };
      
      return processedTask;
    } catch (err) {
      console.error("Erro ao carregar detalhes da tarefa:", err);
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os detalhes da tarefa.",
      });

      return undefined;
    }
  }, [toast]);

  // Mutations using React Query
  const createTaskMutation = useMutation<Task, Error, InsertTask>({
    mutationFn: (newTaskData) => invokeSupabaseFunction<Task>('task-functions', 'POST', newTaskData),
    onSuccess: () => {
      tanstackQueryClient.invalidateQueries({ queryKey: ['tasksList'] });
      toast({ title: "Sucesso", description: "Tarefa criada com sucesso." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Erro", description: `Não foi possível criar a tarefa: ${error.message}` });
    },
  });

  const updateTaskMutation = useMutation<Task, Error, { id: number; data: Partial<Task> }>({
    mutationFn: ({ id, data }) => invokeSupabaseFunction<Task>('task-functions', 'PATCH', data, { slug: id.toString() }),
    onSuccess: (data) => {
      tanstackQueryClient.invalidateQueries({ queryKey: ['tasksList'] });
      tanstackQueryClient.invalidateQueries({ queryKey: ['taskDetails', data.id] }); // If you cache individual tasks
      toast({ title: "Sucesso", description: "Tarefa atualizada com sucesso." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Erro", description: `Não foi possível atualizar a tarefa: ${error.message}` });
    },
  });

  const deleteTaskMutation = useMutation<boolean, Error, number>({
    mutationFn: (id) => invokeSupabaseFunction<void>('task-functions', 'DELETE', undefined, { slug: id.toString() }).then(() => true),
    onSuccess: (_, id) => {
      tanstackQueryClient.invalidateQueries({ queryKey: ['tasksList'] });
      tanstackQueryClient.removeQueries({ queryKey: ['taskDetails', id]}); // Remove from cache
      toast({ title: "Sucesso", description: "Tarefa excluída com sucesso." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Erro", description: `Não foi possível excluir a tarefa: ${error.message}` });
    },
  });

  const addCommentMutation = useMutation<TaskComment, Error, { taskId: number; content: string }>({
    mutationFn: ({ taskId, content }) => {
      if (!authUser) throw new Error("Usuário não logado");
      return invokeSupabaseFunction<TaskComment>(
        'task-functions',
        'POST',
        { content, userId: authUser.id }, // userId is now from authUser
        { slug: `${taskId}/comments` }
      );
    },
    onSuccess: (data, variables) => {
      tanstackQueryClient.invalidateQueries({ queryKey: ['tasksList'] }); // Could be more specific if tasks hold comments
      tanstackQueryClient.invalidateQueries({ queryKey: ['taskDetails', variables.taskId] });
      toast({ title: "Sucesso", description: "Comentário adicionado com sucesso." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Erro", description: `Não foi possível adicionar o comentário: ${error.message}` });
    },
  });
  
  // addTaskComment can be merged with addCommentMutation if the payload is consistent
  // For now, keeping it separate if it implies a different payload structure for Partial<TaskComment>
  const addTaskCommentMutation = useMutation<TaskComment, Error, InsertTaskComment>({
      mutationFn: (comment) => { // comment is InsertTaskComment
          if (!authUser) throw new Error("Usuário não logado");

          const commentPayload: InsertTaskComment = {
            ...comment,
            userId: comment.userId || authUser.id, // Prioritize comment.userId if present, else use authUser.id
            // taskId is already part of comment (InsertTaskComment)
          };
          return invokeSupabaseFunction<TaskComment>(
              'task-functions',
              'POST',
              commentPayload,
              { slug: `${commentPayload.taskId}/comments` } // Use taskId from the payload
          );
      },
      onSuccess: (data, variables) => { // variables is InsertTaskComment
          tanstackQueryClient.invalidateQueries({ queryKey: ['tasksList'] });
          tanstackQueryClient.invalidateQueries({ queryKey: ['taskDetails', variables.taskId] });
          toast({ title: "Sucesso", description: "Comentário adicionado." });
      },
      onError: (error) => {
           toast({ variant: "destructive", title: "Erro", description: `Falha ao adicionar comentário: ${error.message}` });
      }
  });


  const deleteTaskCommentMutation = useMutation<boolean, Error, number>({
    mutationFn: (commentId) => invokeSupabaseFunction<void>('task-functions', 'DELETE', undefined, { slug: `comments/${commentId}` }).then(() => true),
    onSuccess: (data, commentId) => {
      // This invalidation is broad. For better UX, you might need to update the specific task's comments in cache.
      tanstackQueryClient.invalidateQueries({ queryKey: ['tasksList'] });
      // Find which task this comment belonged to for more specific invalidation, if possible
      // tanstackQueryClient.invalidateQueries({ queryKey: ['taskDetails', taskIdOfComment] });
      toast({ title: "Sucesso", description: "Comentário excluído com sucesso." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Erro", description: `Não foi possível excluir o comentário: ${error.message}` });
    },
  });


  // Adapt these getters to use the `tasks` data from `useQuery`
  const currentUserId = authUser?.id;
  const myTasks = tasks.filter(task => task.assignedToId === currentUserId && task.status !== "completed");
  const assignedTasks = tasks.filter(task => task.assignedById === currentUserId && task.status !== "completed");
  const completedTasks = tasks.filter(task => 
    (task.assignedToId === currentUserId || task.assignedById === currentUserId) && 
    task.status === "completed"
  );

  return (
    <TaskContext.Provider
      value={{
        tasks, // From useQuery
        loading, // From useQuery
        error: error ? error.message : null, // From useQuery
        fetchTasks, // refetch function from useQuery
        fetchTaskById, // useCallback version
        // Use mutations for create, update, delete operations
        createTask: createTaskMutation.mutateAsync,
        updateTask: (id, data) => updateTaskMutation.mutateAsync({ id, data }),
        deleteTask: deleteTaskMutation.mutateAsync,
        addComment: (taskId, content) => addCommentMutation.mutateAsync({ taskId, content }),
        addTaskComment: addTaskCommentMutation.mutateAsync, // Pass the mutation directly
        deleteTaskComment: deleteTaskMutation.mutateAsync,
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