import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, Clock, User, BarChart3, Users as UsersIcon, AlertCircle, Link } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaskContext } from "@/context/TaskContext";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: number;
  initialStatus?: "pending" | "in_progress" | "completed" | "cancelled";
}

export default function TaskDialog({ open, onOpenChange, taskId, initialStatus = "pending" }: TaskDialogProps) {
  const { createTask, fetchTaskById, updateTask } = useTaskContext();
  const { user } = useAuth();
  const isEditing = !!taskId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState<number | null>(null);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [status, setStatus] = useState<"pending" | "in_progress" | "completed" | "cancelled">(initialStatus);
  const [dueDate, setDueDate] = useState<Date | undefined>(addDays(new Date(), 3));
  const [assignedToUserId, setAssignedToUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timeTracking, setTimeTracking] = useState(false);
  const [showBackButton, setShowBackButton] = useState(false);
  const [currentStep, setCurrentStep] = useState<"details" | "assignment">("details");
  const [users, setUsers] = useState<Array<{id: number, username: string, role: string}>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Carregar usuários do sistema
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        } else {
          console.error('Erro ao buscar usuários:', response.statusText);
        }
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

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
          setStatus(task.status);
          setDueDate(task.dueDate);
          setRelatedLeadId(task.relatedLeadId || null);
        }
        setIsLoading(false);
      });
    }
  }, [isEditing, taskId, fetchTaskById]);

  const handleNextStep = () => {
    if (currentStep === "details") {
      setCurrentStep("assignment");
      setShowBackButton(true);
    }
  };

  const handlePrevStep = () => {
    if (currentStep === "assignment") {
      setCurrentStep("details");
      setShowBackButton(false);
    }
  };

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
        status,
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

  const getPriorityColor = (priorityValue: string) => {
    switch (priorityValue) {
      case "high":
        return "text-red-500 border-red-200 bg-red-50 dark:bg-red-900/20";
      case "medium":
        return "text-amber-500 border-amber-200 bg-amber-50 dark:bg-amber-900/20";
      case "low":
        return "text-green-500 border-green-200 bg-green-50 dark:bg-green-900/20";
      default:
        return "text-gray-500 border-gray-200 bg-gray-50 dark:bg-gray-800/30";
    }
  };

  // Renderização de ícones para os campos
  const renderIcon = (type: string) => {
    switch (type) {
      case "user":
        return <User className="h-4 w-4 text-gray-400" />;
      case "calendar":
        return <CalendarIcon className="h-4 w-4 text-gray-400" />;
      case "priority":
        return <BarChart3 className="h-4 w-4 text-gray-400" />;
      case "link":
        return <LinkIcon className="h-4 w-4 text-gray-400" />;
      case "time":
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
        <div className="flex items-center px-6 py-4 border-b">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={handlePrevStep} className="mr-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <DialogTitle className="text-xl">
            {isEditing ? "Editar Tarefa" : "Criar Tarefa"}
          </DialogTitle>
          <div className="ml-auto">
            {currentStep === "assignment" && assignedToId && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Atribuído para:</span>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                    {mockUsers.find(u => u.id === assignedToId)?.name.substring(0, 2).toUpperCase() || "UN"}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        </div>

        {currentStep === "details" && (
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Título da tarefa
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Digite o título da tarefa"
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descrição
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva os detalhes da tarefa"
                  disabled={isLoading}
                  className="mt-1 min-h-[120px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority" className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300">
                    {renderIcon("priority")}
                    <span className="ml-2">Prioridade</span>
                  </Label>
                  <RadioGroup 
                    value={priority} 
                    onValueChange={(value) => setPriority(value as "low" | "medium" | "high")}
                    className="flex mt-2 space-x-2"
                  >
                    <div className="flex items-center">
                      <RadioGroupItem value="low" id="low" className="sr-only" />
                      <Label
                        htmlFor="low"
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border cursor-pointer ${
                          priority === "low" 
                            ? getPriorityColor("low") 
                            : "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        Baixa
                      </Label>
                    </div>
                    <div className="flex items-center">
                      <RadioGroupItem value="medium" id="medium" className="sr-only" />
                      <Label
                        htmlFor="medium"
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border cursor-pointer ${
                          priority === "medium" 
                            ? getPriorityColor("medium") 
                            : "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        Média
                      </Label>
                    </div>
                    <div className="flex items-center">
                      <RadioGroupItem value="high" id="high" className="sr-only" />
                      <Label
                        htmlFor="high"
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border cursor-pointer ${
                          priority === "high" 
                            ? getPriorityColor("high") 
                            : "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        Alta
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="due-date" className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300">
                    {renderIcon("calendar")}
                    <span className="ml-2">Data de vencimento</span>
                  </Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="due-date"
                        variant="outline"
                        className={cn(
                          "w-full mt-2 justify-start text-left font-normal",
                          !dueDate && "text-muted-foreground"
                        )}
                        disabled={isLoading}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "dd 'de' MMMM", { locale: ptBR }) : "Selecione uma data"}
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
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label htmlFor="related-lead" className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300">
                  {renderIcon("link")}
                  <span className="ml-2">Vincular a um Lead</span>
                </Label>
                <Select
                  value={relatedLeadId?.toString() || "none"}
                  onValueChange={(value) => setRelatedLeadId(value !== "none" ? parseInt(value) : null)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="related-lead" className="mt-2">
                    <SelectValue placeholder="Selecione um lead para vincular" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
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
        )}

        {currentStep === "assignment" && (
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300">
                  {renderIcon("user")}
                  <span className="ml-2">Atribuir para</span>
                </Label>
                <div className="grid grid-cols-1 gap-3 mt-3">
                  {mockUsers.map((user) => (
                    <div 
                      key={user.id}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer ${
                        assignedToId === user.id 
                          ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" 
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      }`}
                      onClick={() => setAssignedToId(user.id)}
                    >
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarFallback className={`${
                          assignedToId === user.id 
                            ? "bg-blue-100 text-blue-600" 
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200"
                        }`}>
                          {user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.role === "admin" ? "Administrador" : "Usuário"}</p>
                      </div>
                      {assignedToId === user.id && (
                        <div className="flex-shrink-0 ml-2">
                          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300">
                  {renderIcon("time")}
                  <span className="ml-2">Acompanhamento de tempo</span>
                </Label>
                <div className="mt-2 flex items-center">
                  <input
                    type="checkbox"
                    id="time-tracking"
                    checked={timeTracking}
                    onChange={(e) => setTimeTracking(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <label htmlFor="time-tracking" className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                    Habilitar contagem de tempo para esta tarefa
                  </label>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium flex items-center text-gray-700 dark:text-gray-300">
                  <AlertCircle className="h-4 w-4 text-gray-400" />
                  <span className="ml-2">Status inicial</span>
                </Label>
                <RadioGroup 
                  value={status} 
                  onValueChange={(value) => setStatus(value as "pending" | "in_progress" | "completed" | "cancelled")}
                  className="flex flex-wrap mt-2 gap-2"
                >
                  <div className="flex items-center">
                    <RadioGroupItem value="pending" id="pending" className="sr-only" />
                    <Label
                      htmlFor="pending"
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border cursor-pointer ${
                        status === "pending" 
                          ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400" 
                          : "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      A fazer
                    </Label>
                  </div>
                  <div className="flex items-center">
                    <RadioGroupItem value="in_progress" id="in_progress" className="sr-only" />
                    <Label
                      htmlFor="in_progress"
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border cursor-pointer ${
                        status === "in_progress" 
                          ? "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400" 
                          : "bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      Em andamento
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-4 border-t bg-gray-50 dark:bg-gray-800/50">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} size="sm">
            Cancelar
          </Button>
          
          {currentStep === "details" ? (
            <Button 
              onClick={handleNextStep} 
              disabled={isLoading || !title} 
              size="sm"
            >
              Continuar
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || !title || !assignedToId} 
              size="sm"
            >
              {isLoading ? "Salvando..." : isEditing ? "Atualizar" : "Criar Tarefa"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 