import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaskContext } from "@/context/TaskContext";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: number;
}

export default function TaskDialog({ open, onOpenChange, taskId }: TaskDialogProps) {
  const { createTask, fetchTaskById, updateTask } = useTaskContext();
  const isEditing = !!taskId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState<number | null>(null);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [relatedLeadId, setRelatedLeadId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Dados mockados para usuários e leads
  const mockUsers = [
    { id: 1, name: "Admin User", role: "admin" },
    { id: 2, name: "João Silva", role: "user" },
    { id: 3, name: "Maria Oliveira", role: "user" },
  ];

  const mockLeads = [
    { id: 101, name: "Carlos Mendes" },
    { id: 102, name: "Lucia Ferreira" },
  ];

  // Carregar detalhes da tarefa se estiver editando
  useEffect(() => {
    if (isEditing && taskId) {
      setIsLoading(true);
      fetchTaskById(taskId).then((task) => {
        if (task) {
          setTitle(task.title);
          setDescription(task.description || "");
          setAssignedToId(task.assignedToId);
          setPriority(task.priority);
          setDueDate(task.dueDate);
          setRelatedLeadId(task.relatedLeadId || null);
        }
        setIsLoading(false);
      });
    }
  }, [isEditing, taskId, fetchTaskById]);

  const handleSubmit = async () => {
    if (!title || !assignedToId) return;

    setIsLoading(true);
    try {
      const taskData = {
        title,
        description,
        assignedById: 1, // Assumindo usuário admin como o criador
        assignedToId,
        dueDate,
        priority,
        status: "pending" as const,
        relatedLeadId: relatedLeadId || undefined,
        assignedByName: "Admin User", // Mockado para demo
        assignedToName: mockUsers.find(user => user.id === assignedToId)?.name,
        relatedLeadName: relatedLeadId ? mockLeads.find(lead => lead.id === relatedLeadId)?.name : undefined
      };

      if (isEditing && taskId) {
        await updateTask(taskId, taskData);
      } else {
        await createTask(taskData);
      }

      // Fechar o diálogo após salvar
      onOpenChange(false);
      
    } catch (error) {
      console.error("Erro ao salvar tarefa:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título da tarefa"
              disabled={isLoading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os detalhes da tarefa"
              disabled={isLoading}
              className="min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="assigned-to">Atribuir para</Label>
              <Select
                value={assignedToId?.toString() || ""}
                onValueChange={(value) => setAssignedToId(parseInt(value))}
                disabled={isLoading}
              >
                <SelectTrigger id="assigned-to">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {mockUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as "low" | "medium" | "high")}
                disabled={isLoading}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="due-date">Data de vencimento</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="due-date"
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      setDueDate(date);
                      setCalendarOpen(false);
                    }}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="related-lead">Lead relacionado</Label>
              <Select
                value={relatedLeadId?.toString() || ""}
                onValueChange={(value) => setRelatedLeadId(value ? parseInt(value) : null)}
                disabled={isLoading}
              >
                <SelectTrigger id="related-lead">
                  <SelectValue placeholder="Selecione um lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {mockLeads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id.toString()}>
                      {lead.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !title || !assignedToId}>
            {isLoading ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 