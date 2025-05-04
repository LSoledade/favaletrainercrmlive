import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addMinutes, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
  defaultValues?: SessionFormValues;
  sessionId?: number;
  onSuccess: () => void;
};

export function SessionForm({ defaultValues, sessionId, onSuccess }: SessionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>(defaultValues?.source || '');
  const { toast } = useToast();
  
  // Filtrar alunos baseado na origem selecionada (Favale ou Pink)
  const filteredStudents = selectedSource
    ? students.filter(student => student.source === selectedSource)
    : students;

  // Inicializar formulário
  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: defaultValues || {
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
      location: '',
      source: undefined,
      studentId: '',
      trainerId: '',
      notes: '',
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
    ]);
  }, []);

  // Atualizar origem quando mudar no formulário
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'source' && value.source) {
        setSelectedSource(value.source as string);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

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
        status: 'agendado', // Status padrão para novas sessões
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Data */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
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
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Origem (Favale ou Pink) */}
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origem</FormLabel>
                <Select 
                  value={field.value} 
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma origem" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Favale">Favale</SelectItem>
                    <SelectItem value="Pink">Pink</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Horário de Início */}
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário de Início</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
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
                <FormLabel>Horário de Término</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
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
                <FormLabel>Aluno</FormLabel>
                <Select 
                  value={field.value} 
                  onValueChange={field.onChange}
                  disabled={!selectedSource || filteredStudents.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um aluno" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <FormLabel>Professor</FormLabel>
                <Select 
                  value={field.value} 
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um professor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {trainers.map((trainer) => (
                      <SelectItem key={trainer.id} value={trainer.id}>
                        {trainer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Local */}
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel>Local</FormLabel>
                <FormControl>
                  <Input placeholder="Endereço ou local da sessão" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Observações */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="col-span-full">
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Anotações sobre a sessão (opcional)" 
                    {...field} 
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onSuccess()}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {sessionId ? 'Atualizar' : 'Agendar'} Sessão
          </Button>
        </div>
      </form>
    </Form>
  );
}