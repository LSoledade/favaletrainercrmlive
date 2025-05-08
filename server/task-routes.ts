import type { Express, Request, Response } from "express";
import { logAuditEvent, AuditEventType } from "./audit-log";
import { storage } from "./storage";
import * as taskStorage from "./task-storage";
import { 
  taskValidationSchema, 
  taskCommentValidationSchema, 
  insertTaskChecklistItemSchema
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";

// Middleware para verificar se o usuário é admin
function isAdmin(req: Request, res: Response, next: Function) {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({
    error: "Acesso negado. Apenas administradores podem realizar esta operação."
  });
}

// Middleware para verificar se o usuário é admin ou o responsável pela tarefa
async function isAdminOrAssignee(req: Request, res: Response, next: Function) {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: "ID de tarefa inválido" });
    }

    const task = await storage.getTask(taskId);
    if (!task) {
      return res.status(404).json({ error: "Tarefa não encontrada" });
    }

    if (
      req.user && 
      (req.user.role === "admin" || req.user.id === task.assigneeId || req.user.id === task.createdById)
    ) {
      // Adiciona a tarefa ao objeto de requisição para uso posterior
      (req as any).task = task;
      return next();
    }

    return res.status(403).json({
      error: "Acesso negado. Você não tem permissão para acessar esta tarefa."
    });
  } catch (error) {
    console.error("Erro ao verificar permissões:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// Função para verificar se o usuário tem acesso à tarefa (é assignee, criador ou observador)
async function userHasAccessToTask(userId: number, taskId: number): Promise<boolean> {
  try {
    const task = await storage.getTask(taskId);
    if (!task) return false;

    // Verifica se é o responsável ou criador
    if (task.assigneeId === userId || task.createdById === userId) return true;

    // Verifica se é um observador
    const watchers = await storage.getTaskWatchers(taskId);
    return watchers.some(watcher => watcher.userId === userId);
  } catch (error) {
    console.error("Erro ao verificar acesso do usuário à tarefa:", error);
    return false;
  }
}

export function registerTaskRoutes(app: Express) {
  // Obter todas as tarefas (admin vê todas, usuários comuns veem apenas as próprias)
  app.get("/api/tasks", async (req: Request, res: Response) => {
    try {
      const isUserAdmin = req.user?.role === "admin";
      
      if (isUserAdmin) {
        // Admin vê todas as tarefas
        const tasks = await storage.getTasks();
        return res.status(200).json(tasks);
      } else {
        // Usuário comum vê apenas tarefas onde é responsável ou observador
        if (!req.user?.id) {
          return res.status(401).json({ error: "Usuário não autenticado" });
        }
        
        // Obtém tarefas onde o usuário é responsável
        const assignedTasks = await storage.getTasksByUserId(req.user.id);
        
        // TODO: Implementar lógica para obter tarefas onde o usuário é observador
        // Isso exigiria uma consulta mais complexa ou múltiplas consultas
        
        return res.status(200).json(assignedTasks);
      }
    } catch (error) {
      console.error("Erro ao buscar tarefas:", error);
      return res.status(500).json({ error: "Erro ao buscar tarefas" });
    }
  });

  // Criar nova tarefa (apenas admin)
  app.post("/api/tasks", isAdmin, async (req: Request, res: Response) => {
    try {
      const taskData = req.body;
      
      // Validar os dados da tarefa
      const validation = taskValidationSchema.safeParse(taskData);
      if (!validation.success) {
        const errorMessage = fromZodError(validation.error).message;
        return res.status(400).json({ error: errorMessage });
      }

      // Definir o criador como o usuário atual
      taskData.createdById = req.user!.id;
      
      // Criar a tarefa
      const task = await storage.createTask(taskData);

      // Registrar evento de auditoria
      logAuditEvent(AuditEventType.TASK_CREATED, req, {
        taskId: task.id,
        title: task.title,
        assigneeId: task.assigneeId
      });

      // Adicionar o criador como observador se ele não for o responsável
      if (task.createdById !== task.assigneeId) {
        await storage.addTaskWatcher({
          taskId: task.id,
          userId: task.createdById
        });
      }

      // Se houver itens de checklist, adicioná-los
      if (taskData.checklistItems && Array.isArray(taskData.checklistItems)) {
        for (let i = 0; i < taskData.checklistItems.length; i++) {
          const item = taskData.checklistItems[i];
          await storage.createTaskChecklistItem({
            taskId: task.id,
            content: item.content,
            position: i
          });
        }
      }

      // Criar histórico de criação da tarefa
      await storage.createTaskHistory({
        taskId: task.id,
        userId: req.user!.id,
        action: "created",
        details: { 
          title: task.title, 
          description: task.description, 
          assigneeId: task.assigneeId 
        }
      });

      return res.status(201).json(task);
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      return res.status(500).json({ error: "Erro ao criar tarefa" });
    }
  });

  // Obter uma tarefa específica com todos os detalhes
  app.get("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "ID de tarefa inválido" });
      }

      // Verificar se o usuário tem acesso à tarefa
      if (!req.user) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }
      
      const isUserAdmin = req.user.role === "admin";
      const hasAccess = isUserAdmin || await userHasAccessToTask(req.user.id, taskId);
      
      if (!hasAccess) {
        return res.status(403).json({ error: "Você não tem permissão para acessar esta tarefa" });
      }

      // Obter tarefa com detalhes
      const taskWithDetails = await storage.getTaskByIdWithDetails(taskId);
      
      if (!taskWithDetails) {
        return res.status(404).json({ error: "Tarefa não encontrada" });
      }

      return res.status(200).json(taskWithDetails);
    } catch (error) {
      console.error("Erro ao buscar detalhes da tarefa:", error);
      return res.status(500).json({ error: "Erro ao buscar detalhes da tarefa" });
    }
  });

  // Atualizar uma tarefa (admin pode atualizar qualquer tarefa, usuário comum apenas as próprias)
  app.patch("/api/tasks/:id", isAdminOrAssignee, async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      const updates = req.body;
      const task = (req as any).task; // Obtido do middleware isAdminOrAssignee
      
      // Usuários comuns só podem atualizar alguns campos
      if (req.user!.role !== "admin") {
        const allowedFields = ["status", "description"];
        const requestedFields = Object.keys(updates);
        
        const forbiddenFields = requestedFields.filter(field => !allowedFields.includes(field));
        if (forbiddenFields.length > 0) {
          return res.status(403).json({ 
            error: `Você não tem permissão para atualizar os seguintes campos: ${forbiddenFields.join(", ")}` 
          });
        }
      }
      
      // Guarda estado anterior para histórico
      const previousState = {
        status: task.status,
        title: task.title,
        description: task.description,
        priority: task.priority,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate
      };
      
      // Atualizar a tarefa
      const updatedTask = await storage.updateTask(taskId, updates);
      
      if (!updatedTask) {
        return res.status(404).json({ error: "Tarefa não encontrada" });
      }
      
      // Criar histórico de atualização
      await storage.createTaskHistory({
        taskId: taskId,
        userId: req.user!.id,
        action: "updated",
        details: {
          previous: previousState,
          current: {
            status: updatedTask.status,
            title: updatedTask.title,
            description: updatedTask.description,
            priority: updatedTask.priority,
            assigneeId: updatedTask.assigneeId,
            dueDate: updatedTask.dueDate
          },
          changedFields: Object.keys(updates)
        }
      });
      
      // Registrar evento de auditoria
      logAuditEvent(AuditEventType.TASK_UPDATED, req, {
        taskId: taskId,
        updatedFields: Object.keys(updates)
      });
      
      return res.status(200).json(updatedTask);
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      return res.status(500).json({ error: "Erro ao atualizar tarefa" });
    }
  });

  // Excluir uma tarefa (apenas admin)
  app.delete("/api/tasks/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "ID de tarefa inválido" });
      }
      
      // Verificar se a tarefa existe
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Tarefa não encontrada" });
      }
      
      // Excluir a tarefa e todos os registros relacionados
      const deleted = await storage.deleteTask(taskId);
      
      if (!deleted) {
        return res.status(500).json({ error: "Erro ao excluir a tarefa" });
      }
      
      // Registrar evento de auditoria
      logAuditEvent(AuditEventType.TASK_DELETED, req, {
        taskId: taskId,
        title: task.title
      });
      
      return res.status(200).json({ message: "Tarefa excluída com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir tarefa:", error);
      return res.status(500).json({ error: "Erro ao excluir tarefa" });
    }
  });

  // Adicionar comentário a uma tarefa
  app.post("/api/tasks/:id/comments", async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "ID de tarefa inválido" });
      }
      
      if (!req.user) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }
      
      // Verificar se o usuário tem acesso à tarefa
      const hasAccess = req.user.role === "admin" || await userHasAccessToTask(req.user.id, taskId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Você não tem permissão para comentar nesta tarefa" });
      }
      
      // Validar dados do comentário
      const validation = taskCommentValidationSchema.safeParse({
        ...req.body,
        taskId,
        userId: req.user.id
      });
      
      if (!validation.success) {
        const errorMessage = fromZodError(validation.error).message;
        return res.status(400).json({ error: errorMessage });
      }
      
      // Criar o comentário
      const comment = await storage.createTaskComment({
        taskId,
        userId: req.user.id,
        content: req.body.content
      });
      
      // Criar histórico de comentário
      await storage.createTaskHistory({
        taskId,
        userId: req.user.id,
        action: "commented",
        details: {
          commentId: comment.id
        }
      });
      
      return res.status(201).json(comment);
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error);
      return res.status(500).json({ error: "Erro ao adicionar comentário" });
    }
  });

  // Obter comentários de uma tarefa (com paginação)
  app.get("/api/tasks/:id/comments", async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "ID de tarefa inválido" });
      }
      
      if (!req.user) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }
      
      // Verificar se o usuário tem acesso à tarefa
      const hasAccess = req.user.role === "admin" || await userHasAccessToTask(req.user.id, taskId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Você não tem permissão para ver os comentários desta tarefa" });
      }
      
      // Extrair parâmetros de paginação
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Obter comentários
      const comments = await storage.getTaskComments(taskId, page, limit);
      
      return res.status(200).json(comments);
    } catch (error) {
      console.error("Erro ao buscar comentários:", error);
      return res.status(500).json({ error: "Erro ao buscar comentários" });
    }
  });

  // Adicionar item ao checklist
  app.post("/api/tasks/:id/checklist", isAdminOrAssignee, async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "ID de tarefa inválido" });
      }
      
      // Validar dados do item de checklist
      const validation = insertTaskChecklistItemSchema.safeParse({
        ...req.body,
        taskId
      });
      
      if (!validation.success) {
        const errorMessage = fromZodError(validation.error).message;
        return res.status(400).json({ error: errorMessage });
      }
      
      // Obter a posição atual mais alta para determinar a próxima
      const existingItems = await storage.getTaskChecklistItems(taskId);
      const nextPosition = existingItems.length > 0 
        ? Math.max(...existingItems.map(item => item.position)) + 1 
        : 0;
      
      // Criar o item de checklist
      const checklistItem = await storage.createTaskChecklistItem({
        taskId,
        content: req.body.content,
        position: req.body.position ?? nextPosition
      });
      
      // Criar histórico
      await storage.createTaskHistory({
        taskId,
        userId: req.user!.id,
        action: "checklist_item_added",
        details: {
          checklistItemId: checklistItem.id,
          content: checklistItem.content
        }
      });
      
      return res.status(201).json(checklistItem);
    } catch (error) {
      console.error("Erro ao adicionar item ao checklist:", error);
      return res.status(500).json({ error: "Erro ao adicionar item ao checklist" });
    }
  });

  // Atualizar item de checklist (marcar como concluído/não concluído ou editar conteúdo)
  app.patch("/api/tasks/:taskId/checklist/:itemId", isAdminOrAssignee, async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const itemId = parseInt(req.params.itemId);
      
      if (isNaN(taskId) || isNaN(itemId)) {
        return res.status(400).json({ error: "IDs inválidos" });
      }
      
      // Verificar se o item pertence à tarefa correta
      const existingItems = await storage.getTaskChecklistItems(taskId);
      const itemExists = existingItems.some(item => item.id === itemId);
      
      if (!itemExists) {
        return res.status(404).json({ error: "Item de checklist não encontrado para esta tarefa" });
      }
      
      // Se estamos marcando como concluído, incluir o ID do usuário
      const updates: Partial<any> = { ...req.body };
      if (updates.isCompleted === true) {
        updates.completedById = req.user!.id;
        updates.completedAt = new Date();
      }
      
      // Atualizar o item
      const updatedItem = await storage.updateTaskChecklistItem(itemId, updates);
      
      if (!updatedItem) {
        return res.status(500).json({ error: "Erro ao atualizar item do checklist" });
      }
      
      // Criar histórico
      await storage.createTaskHistory({
        taskId,
        userId: req.user!.id,
        action: updates.isCompleted !== undefined 
          ? (updates.isCompleted ? "checklist_item_completed" : "checklist_item_uncompleted")
          : "checklist_item_updated",
        details: {
          checklistItemId: itemId,
          content: updatedItem.content,
          isCompleted: updatedItem.isCompleted
        }
      });
      
      return res.status(200).json(updatedItem);
    } catch (error) {
      console.error("Erro ao atualizar item do checklist:", error);
      return res.status(500).json({ error: "Erro ao atualizar item do checklist" });
    }
  });

  // Excluir item de checklist
  app.delete("/api/tasks/:taskId/checklist/:itemId", isAdminOrAssignee, async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const itemId = parseInt(req.params.itemId);
      
      if (isNaN(taskId) || isNaN(itemId)) {
        return res.status(400).json({ error: "IDs inválidos" });
      }
      
      // Verificar se o item pertence à tarefa correta
      const existingItems = await storage.getTaskChecklistItems(taskId);
      const itemToDelete = existingItems.find(item => item.id === itemId);
      
      if (!itemToDelete) {
        return res.status(404).json({ error: "Item de checklist não encontrado para esta tarefa" });
      }
      
      // Excluir o item
      const deleted = await storage.deleteTaskChecklistItem(itemId);
      
      if (!deleted) {
        return res.status(500).json({ error: "Erro ao excluir item do checklist" });
      }
      
      // Criar histórico
      await storage.createTaskHistory({
        taskId,
        userId: req.user!.id,
        action: "checklist_item_deleted",
        details: {
          content: itemToDelete.content
        }
      });
      
      return res.status(200).json({ message: "Item do checklist excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir item do checklist:", error);
      return res.status(500).json({ error: "Erro ao excluir item do checklist" });
    }
  });

  // Adicionar observador a uma tarefa
  app.post("/api/tasks/:id/watchers", isAdminOrAssignee, async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      const userId = parseInt(req.body.userId);
      
      if (isNaN(taskId) || isNaN(userId)) {
        return res.status(400).json({ error: "IDs inválidos" });
      }
      
      // Verificar se o usuário existe
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      
      // Verificar se o usuário já é um observador
      const watchers = await storage.getTaskWatchers(taskId);
      if (watchers.some(watcher => watcher.userId === userId)) {
        return res.status(400).json({ error: "O usuário já é um observador desta tarefa" });
      }
      
      // Adicionar observador
      const watcher = await storage.addTaskWatcher({
        taskId,
        userId
      });
      
      // Criar histórico
      await storage.createTaskHistory({
        taskId,
        userId: req.user!.id,
        action: "watcher_added",
        details: {
          watcherId: userId,
          watcherUsername: user.username
        }
      });
      
      return res.status(201).json(watcher);
    } catch (error) {
      console.error("Erro ao adicionar observador:", error);
      return res.status(500).json({ error: "Erro ao adicionar observador" });
    }
  });

  // Remover observador de uma tarefa
  app.delete("/api/tasks/:taskId/watchers/:userId", isAdminOrAssignee, async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(taskId) || isNaN(userId)) {
        return res.status(400).json({ error: "IDs inválidos" });
      }
      
      // Verificar se o usuário é um observador
      const watchers = await storage.getTaskWatchers(taskId);
      const isWatcher = watchers.some(watcher => watcher.userId === userId);
      
      if (!isWatcher) {
        return res.status(404).json({ error: "Observador não encontrado para esta tarefa" });
      }
      
      // Obter informações do usuário para o histórico
      const user = await storage.getUser(userId);
      
      // Remover observador
      const removed = await storage.removeTaskWatcher(taskId, userId);
      
      if (!removed) {
        return res.status(500).json({ error: "Erro ao remover observador" });
      }
      
      // Criar histórico
      await storage.createTaskHistory({
        taskId,
        userId: req.user!.id,
        action: "watcher_removed",
        details: {
          watcherId: userId,
          watcherUsername: user ? user.username : "Usuário desconhecido"
        }
      });
      
      return res.status(200).json({ message: "Observador removido com sucesso" });
    } catch (error) {
      console.error("Erro ao remover observador:", error);
      return res.status(500).json({ error: "Erro ao remover observador" });
    }
  });

  // Obter histórico de uma tarefa
  app.get("/api/tasks/:id/history", async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      
      if (isNaN(taskId)) {
        return res.status(400).json({ error: "ID de tarefa inválido" });
      }
      
      if (!req.user) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }
      
      // Verificar se o usuário tem acesso à tarefa
      const hasAccess = req.user.role === "admin" || await userHasAccessToTask(req.user.id, taskId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Você não tem permissão para ver o histórico desta tarefa" });
      }
      
      // Obter histórico
      const history = await storage.getTaskHistoryByTaskId(taskId);
      
      return res.status(200).json(history);
    } catch (error) {
      console.error("Erro ao buscar histórico da tarefa:", error);
      return res.status(500).json({ error: "Erro ao buscar histórico da tarefa" });
    }
  });
}