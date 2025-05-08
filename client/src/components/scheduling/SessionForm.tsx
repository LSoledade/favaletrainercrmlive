import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addMinutes, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2, Clock, Info, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

// Schema para validação do formulário de sessão
const sessionFormSchema = z.object({
  date: z.date({
    required_error: "Uma data de sessão é obrigatória.",
  }),
  startTime: z.string({
    required_error: "O horário de início é obrigatório.",
  }),
  endTime: z.string({
    required_error: "O horário de término é obrigatório.",
  }),
  location: z.string().min(1, "O local é obrigatório."),
  source: z.enum(["Favale", "Pink"], {
    required_error: "A origem é obrigatória.",
  }),
  studentId: z.string().min(1, "Um aluno deve ser selecionado."),
  trainerId: z.string().min(1, "Um professor deve ser selecionado."),
  notes: z.string().optional(),
}).refine(data => {
  // Combinar data e horário para iniciar e finalizar time
  const startDateTime = new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.startTime}`);
  const endDateTime = new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.endTime}`);
  
  // Verificar se o horário de término é depois do horário de início
  return endDateTime > startDateTime;
}, {
  message: "O horário de término deve ser depois do horário de início.",
  path: ["endTime"],
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

type TrainerOption = {
  id: string;
  name: string;
};

type StudentOption = {
  id: string;
  name: string;
  source: string; // 'Favale' ou 'Pink'
};

type SessionFormProps = {
  defaultValues?: Partial<SessionFormValues>;
  sessionId?: number;
  onSuccess: () => void;
};

export function SessionForm({ defaultValues, sessionId, onSuccess }: SessionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>(defaultValues?.source || '');
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerOption | null>(null);
  const { toast } = useToast();
  
  // Filtrar alunos baseado na origem selecionada (Favale ou Pink)
  const filteredStudents = selectedSource
    ? students.filter(student => student.source === selectedSource)
    : students;

  // Inicializar formulário
  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
      location: '',
      source: undefined,
      studentId: '',
      trainerId: '',
      notes: '',
      ...defaultValues,
    },
  });

  // Mock data para treinadores e alunos - a ser substituído por chamadas à API
  useEffect(() => {
    // Simular carregamento de treinadores e alunos da API
    setTrainers([
      { id: '201', name: 'Ana Silva' },
      { id: '202', name: 'Pedro Costa' },
      { id: '203', name: 'Juliana Ferreira' },
    ]);

    setStudents([
      { id: '101', name: 'Carlos Oliveira', source: 'Favale' },
      { id: '102', name: 'Maria Santos', source: 'Pink' },
      { id: '103', name: 'João Pereira', source: 'Favale' },
      { id: '104', name: 'Rita Mendes', source: 'Pink' },
      { id: '105', name: 'Fernando Sousa', source: 'Favale' },
      { id: '106', name: 'Camila Alves', source: 'Pink' },
    ]);

    // Definir valores selecionados se houver defaultValues
    if (defaultValues?.studentId) {
      const student = students.find(s => s.id === defaultValues.studentId);
      if (student) setSelectedStudent(student);
    }

    if (defaultValues?.trainerId) {
      const trainer = trainers.find(t => t.id === defaultValues.trainerId);
      if (trainer) setSelectedTrainer(trainer);
    }
  }, [defaultValues]);

  // Atualizar origem quando mudar no formulário
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'source' && value.source) {
        setSelectedSource(value.source as string);
      }
      
      if (name === 'studentId' && value.studentId) {
        const student = students.find(s => s.id === value.studentId);
        if (student) setSelectedStudent(student);
      }
      
      if (name === 'trainerId' && value.trainerId) {
        const trainer = trainers.find(t => t.id === value.trainerId);
        if (trainer) setSelectedTrainer(trainer);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch, students, trainers]);

  // Tempos disponíveis - normalmente seriam carregados da API
  const availableTimes = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", 
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", 
    "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"
  ];

  // Tratar envio do formulário
  const onSubmit = async (values: SessionFormValues) => {
    setIsLoading(true);
    try {
      // Combinar data e horário para iniciar e finalizar time
      const startDateTime = new Date(`${format(values.date, 'yyyy-MM-dd')}T${values.startTime}`);
      const endDateTime = new Date(`${format(values.date, 'yyyy-MM-dd')}T${values.endTime}`);
      
      const sessionData = {
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        location: values.location,
        source: values.source,
        studentId: parseInt(values.studentId),
        trainerId: parseInt(values.trainerId),
        notes: values.notes || undefined,
        status: 'scheduled', // Status padrão para novas sessões
      };
      
      // API call para criar ou atualizar sessão
      // Neste ponto, você substitui isso por uma chamada real à API
      console.log('Enviando dados para API:', sessionData);
      
      /* 
      if (sessionId) {
        // Atualizar sessão existente
        await apiRequest(`/api/sessions/${sessionId}`, {
          method: 'PATCH',
          body: JSON.stringify(sessionData),
        });
      } else {
        // Criar nova sessão
        await apiRequest('/api/sessions', {
          method: 'POST',
          body: JSON.stringify(sessionData),
        });
      }
      */
      
      // Mostrando toast de sucesso simulado
      toast({
        title: sessionId ? 'Sessão atualizada' : 'Sessão agendada',
        description: sessionId 
          ? 'A sessão foi atualizada com sucesso.' 
          : 'A sessão foi agendada com sucesso.',
      });
      
      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar sessão:', error);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar a sessão. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular o horário de término padrão (1 hora após o horário de início)
  const calculateEndTime = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    const endDate = addMinutes(date, 60);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  };

  // Atualizar horário de término quando o horário de início mudar
  useEffect(() => {
    const startTime = form.watch('startTime');
    if (startTime) {
      form.setValue('endTime', calculateEndTime(startTime));
    }
  }, [form.watch('startTime')]);

  return (
    <div className="animate-in fade-in-50 duration-300">
      <Tabs defaultValue="basic" className="w-full mt-1">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="basic" className="text-sm">Informações Básicas</TabsTrigger>
          <TabsTrigger value="details" className="text-sm">Detalhes da Sessão</TabsTrigger>
        </TabsList>
        
    <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <TabsContent value="basic" className="space-y-4 pt-2">
              {/* Origem (Favale ou Pink) */}
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Origem</FormLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          field.onChange("Favale");
                          form.setValue("studentId", "");
                        }}
                        className={cn(
                          "h-20 border-2 relative",
                          field.value === "Favale"
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        )}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold text-blue-700 dark:text-blue-400">Favale</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Sistema Favale</span>
                        </div>
                        {field.value === "Favale" && (
                          <Check className="absolute top-2 right-2 h-4 w-4 text-blue-500" />
                        )}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          field.onChange("Pink");
                          form.setValue("studentId", "");
                        }}
                        className={cn(
                          "h-20 border-2 relative",
                          field.value === "Pink"
                            ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        )}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold text-pink-700 dark:text-pink-400">Pink</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Sistema Pink</span>
                        </div>
                        {field.value === "Pink" && (
                          <Check className="absolute top-2 right-2 h-4 w-4 text-pink-500" />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            
              {/* Aluno */}
              <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Aluno</FormLabel>
                    <Select 
                      disabled={!selectedSource} 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className={cn(
                          "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
                          !selectedSource && "opacity-60"
                        )}>
                          <SelectValue placeholder={!selectedSource 
                            ? "Selecione uma origem primeiro" 
                            : "Selecione um aluno"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[240px]">
                        {filteredStudents.length === 0 ? (
                          <div className="p-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                            Nenhum aluno encontrado para esta origem
                          </div>
                        ) : (
                          filteredStudents.map((student) => (
                            <SelectItem 
                              key={student.id} 
                              value={student.id}
                              className="py-2"
                            >
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6 bg-gray-200">
                                  <div className="text-xs">{student.name.charAt(0)}</div>
                                </Avatar>
                                <span>{student.name}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {selectedSource && <FormDescription className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Selecione um aluno para agendar a sessão.
                    </FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            
              {/* Professor */}
              <FormField
                control={form.control}
                name="trainerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Professor</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                          <SelectValue placeholder="Selecione um professor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[240px]">
                        {trainers.map((trainer) => (
                          <SelectItem 
                            key={trainer.id} 
                            value={trainer.id}
                            className="py-2"
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6 bg-gray-200">
                                <div className="text-xs">{trainer.name.charAt(0)}</div>
                              </Avatar>
                              <span>{trainer.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
          {/* Data */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                    <FormLabel className="text-gray-700 dark:text-gray-300">Data</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                            variant="outline"
                        className={cn(
                              "w-full pl-3 text-left font-normal border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                              format(field.value, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                      locale={ptBR}
                          classNames={{
                            day_selected: 'bg-[#ff9810] text-white hover:bg-[#ff9810]/90 focus:bg-[#ff9810]',
                            day_today: 'bg-[#ff9810]/10 text-[#ff9810] font-semibold',
                          }}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

              <div className="grid grid-cols-2 gap-4">
          {/* Horário de Início */}
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">Horário de Início</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                          <SelectTrigger className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <SelectValue placeholder="Selecione" />
                            </div>
                          </SelectTrigger>
                </FormControl>
                        <SelectContent className="max-h-[240px]">
                          {availableTimes.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Horário de Término */}
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                      <FormLabel className="text-gray-700 dark:text-gray-300">Horário de Término</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                          <SelectTrigger className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <SelectValue placeholder="Selecione" />
                            </div>
                    </SelectTrigger>
                  </FormControl>
                        <SelectContent className="max-h-[240px]">
                          {availableTimes.filter(time => time > form.watch('startTime')).map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
              </div>
          
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Local</FormLabel>
                <FormControl>
                      <Input 
                        placeholder="Digite o local da sessão" 
                        {...field} 
                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" 
                      />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

              <div className="pt-4 flex justify-end">
                <Button type="button" onClick={() => form.setValue('_tab', 'details')}>
                  Próximo: Detalhes
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="details" className="space-y-4 pt-2">
              <div>
                <Label className="text-sm text-gray-500 dark:text-gray-400">Resumo</Label>
                
                <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div className="flex flex-col space-y-3">
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Origem:</div>
                      <div className="font-medium text-sm">
                        {form.watch('source') ? (
                          <Badge variant="outline" className={
                            form.watch('source') === 'Favale' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-pink-50 text-pink-700 border-pink-200'
                          }>
                            {form.watch('source')}
                          </Badge>
                        ) : '-'}
                      </div>
                    </div>
                  
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Data:</div>
                      <div className="font-medium text-sm">
                        {form.watch('date') 
                          ? format(form.watch('date'), "dd/MM/yyyy", { locale: ptBR }) 
                          : '-'}
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Horário:</div>
                      <div className="font-medium text-sm">
                        {form.watch('startTime') && form.watch('endTime') 
                          ? `${form.watch('startTime')} - ${form.watch('endTime')}` 
                          : '-'}
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Aluno:</div>
                      <div className="font-medium text-sm">
                        {selectedStudent ? selectedStudent.name : '-'}
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Professor:</div>
                      <div className="font-medium text-sm">
                        {selectedTrainer ? selectedTrainer.name : '-'}
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Local:</div>
                      <div className="font-medium text-sm">
                        {form.watch('location') || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 dark:text-gray-300">Observações</FormLabel>
                <FormControl>
                  <Textarea 
                        placeholder="Observações adicionais sobre a sessão"
                    {...field} 
                        className="min-h-[100px] resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </FormControl>
                    <FormDescription className="text-xs mt-1 flex items-center">
                      <Info className="h-3 w-3 mr-1 text-gray-500" />
                      Adicione informações relevantes sobre o objetivo da sessão, necessidades especiais, etc.
                    </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

              <div className="pt-4 flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
                  onClick={() => form.setValue('_tab', 'basic')}
                  className="border-gray-200 dark:border-gray-700"
                >
                  Voltar
                </Button>
                
                <Button 
                  type="submit" 
            disabled={isLoading}
                  className="bg-[#ff9810] hover:bg-[#ff9810]/90 text-white"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {sessionId ? 'Atualizar' : 'Agendar'} Sessão
          </Button>
        </div>
            </TabsContent>
      </form>
    </Form>
      </Tabs>
    </div>
  );
}