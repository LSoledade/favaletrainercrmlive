import { 
  tasks, taskWatchers, taskChecklistItems, taskComments, taskHistory,
  leads, students, trainers, sessions, users,
  type Task, type InsertTask,
  type TaskWatcher, type InsertTaskWatcher,
  type TaskChecklistItem, type InsertTaskChecklistItem,
  type TaskComment, type InsertTaskComment,
  type TaskHistory, type InsertTaskHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { storage } from "./storage";

// Funções de armazenamento relacionadas a Tarefas

export async function getTasks(): Promise<Task[]> {
  return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
}

export async function getTasksByUserId(userId: number): Promise<Task[]> {
  return await db
    .select()
    .from(tasks)
    .where(eq(tasks.assigneeId, userId))
    .orderBy(desc(tasks.createdAt));
}

export async function getTasksByStatus(status: string): Promise<Task[]> {
  return await db
    .select()
    .from(tasks)
    .where(eq(tasks.status, status))
    .orderBy(desc(tasks.createdAt));
}

export async function getTasksByPriority(priority: string): Promise<Task[]> {
  return await db
    .select()
    .from(tasks)
    .where(eq(tasks.priority, priority))
    .orderBy(desc(tasks.createdAt));
}

export async function getTasksByTag(tag: string): Promise<Task[]> {
  // Busca por tarefas que contenham a tag especificada
  return await db
    .select()
    .from(tasks)
    .where(sql`${tag} = ANY(${tasks.tags})`)
    .orderBy(desc(tasks.createdAt));
}

export async function getTaskByIdWithDetails(id: number): Promise<any> {
  // Obter a tarefa básica
  const [task] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, id));

  if (!task) return undefined;

  // Obter informações relacionadas
  const checklistItems = await getTaskChecklistItems(id);
  const watchers = await getTaskWatchers(id);
  const comments = await getTaskComments(id);
  const history = await getTaskHistoryByTaskId(id);

  // Obter informações do criador e responsável
  const createdBy = await storage.getUser(task.createdById);
  const assignee = await storage.getUser(task.assigneeId);

  // Obter entidades relacionadas se existirem
  let relatedLead = null;
  let relatedStudent = null;
  let relatedTrainer = null;
  let relatedSession = null;

  if (task.relatedLeadId) {
    relatedLead = await storage.getLead(task.relatedLeadId);
  }

  if (task.relatedStudentId) {
    relatedStudent = await storage.getStudent(task.relatedStudentId);
  }

  if (task.relatedTrainerId) {
    relatedTrainer = await storage.getTrainer(task.relatedTrainerId);
  }

  if (task.relatedSessionId) {
    relatedSession = await storage.getSession(task.relatedSessionId);
  }

  // Retornar tudo em um único objeto
  return {
    ...task,
    checklist: checklistItems,
    watchers: watchers.map(w => ({
      id: w.id,
      userId: w.userId,
      taskId: w.taskId,
      createdAt: w.createdAt,
    })),
    comments,
    history,
    createdBy: createdBy ? {
      id: createdBy.id,
      username: createdBy.username,
      role: createdBy.role,
    } : null,
    assignee: assignee ? {
      id: assignee.id,
      username: assignee.username,
      role: assignee.role,
    } : null,
    relatedEntities: {
      lead: relatedLead,
      student: relatedStudent,
      trainer: relatedTrainer,
      session: relatedSession,
    }
  };
}

export async function getTask(id: number): Promise<Task | undefined> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
  return task || undefined;
}

export async function createTask(taskData: InsertTask): Promise<Task> {
  try {
    const [task] = await db
      .insert(tasks)
      .values({
        ...taskData,
      })
      .returning();
    
    return task;
  } catch (error) {
    console.error('Erro ao criar tarefa:', error);
    throw error;
  }
}

export async function updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
  try {
    const [updatedTask] = await db
      .update(tasks)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();
    
    return updatedTask || undefined;
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    throw error;
  }
}

export async function deleteTask(id: number): Promise<boolean> {
  try {
    // Primeiro excluir registros relacionados
    await db.delete(taskChecklistItems).where(eq(taskChecklistItems.taskId, id));
    await db.delete(taskComments).where(eq(taskComments.taskId, id));
    await db.delete(taskWatchers).where(eq(taskWatchers.taskId, id));
    await db.delete(taskHistory).where(eq(taskHistory.taskId, id));
    
    // Por fim, excluir a tarefa
    await db.delete(tasks).where(eq(tasks.id, id));
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir tarefa:', error);
    return false;
  }
}

// Task watchers methods
export async function getTaskWatchers(taskId: number): Promise<TaskWatcher[]> {
  return await db
    .select()
    .from(taskWatchers)
    .where(eq(taskWatchers.taskId, taskId));
}

export async function addTaskWatcher(watcher: InsertTaskWatcher): Promise<TaskWatcher> {
  try {
    const [result] = await db
      .insert(taskWatchers)
      .values(watcher)
      .returning();
    
    return result;
  } catch (error) {
    console.error('Erro ao adicionar observador à tarefa:', error);
    throw error;
  }
}

export async function removeTaskWatcher(taskId: number, userId: number): Promise<boolean> {
  try {
    await db
      .delete(taskWatchers)
      .where(
        and(
          eq(taskWatchers.taskId, taskId),
          eq(taskWatchers.userId, userId)
        )
      );
    
    return true;
  } catch (error) {
    console.error('Erro ao remover observador da tarefa:', error);
    return false;
  }
}

// Task checklist methods
export async function getTaskChecklistItems(taskId: number): Promise<TaskChecklistItem[]> {
  return await db
    .select()
    .from(taskChecklistItems)
    .where(eq(taskChecklistItems.taskId, taskId))
    .orderBy(asc(taskChecklistItems.position));
}

export async function createTaskChecklistItem(item: InsertTaskChecklistItem): Promise<TaskChecklistItem> {
  try {
    const [result] = await db
      .insert(taskChecklistItems)
      .values(item)
      .returning();
    
    return result;
  } catch (error) {
    console.error('Erro ao criar item de checklist:', error);
    throw error;
  }
}

export async function updateTaskChecklistItem(id: number, updates: Partial<InsertTaskChecklistItem>): Promise<TaskChecklistItem | undefined> {
  try {
    // Se estamos marcando como concluído, definir completedAt
    if (updates.isCompleted === true && !updates.completedAt) {
      updates.completedAt = new Date();
    }
    
    const [updatedItem] = await db
      .update(taskChecklistItems)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(taskChecklistItems.id, id))
      .returning();
    
    return updatedItem || undefined;
  } catch (error) {
    console.error('Erro ao atualizar item de checklist:', error);
    throw error;
  }
}

export async function deleteTaskChecklistItem(id: number): Promise<boolean> {
  try {
    await db
      .delete(taskChecklistItems)
      .where(eq(taskChecklistItems.id, id));
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir item de checklist:', error);
    return false;
  }
}

// Task comments methods
export async function getTaskComments(taskId: number, page: number = 1, limit: number = 20): Promise<TaskComment[]> {
  const offset = (page - 1) * limit;
  
  return await db
    .select()
    .from(taskComments)
    .where(eq(taskComments.taskId, taskId))
    .orderBy(desc(taskComments.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function createTaskComment(comment: InsertTaskComment): Promise<TaskComment> {
  try {
    const [result] = await db
      .insert(taskComments)
      .values(comment)
      .returning();
    
    return result;
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    throw error;
  }
}

export async function deleteTaskComment(id: number): Promise<boolean> {
  try {
    await db
      .delete(taskComments)
      .where(eq(taskComments.id, id));
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir comentário:', error);
    return false;
  }
}

// Task history methods
export async function createTaskHistory(history: InsertTaskHistory): Promise<TaskHistory> {
  try {
    const [result] = await db
      .insert(taskHistory)
      .values(history)
      .returning();
    
    return result;
  } catch (error) {
    console.error('Erro ao criar histórico de tarefa:', error);
    throw error;
  }
}

export async function getTaskHistoryByTaskId(taskId: number): Promise<TaskHistory[]> {
  return await db
    .select()
    .from(taskHistory)
    .where(eq(taskHistory.taskId, taskId))
    .orderBy(desc(taskHistory.createdAt));
}