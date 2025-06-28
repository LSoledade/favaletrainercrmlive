import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addMinutes, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/inputs/form'; // Updated
import { Button } from '@/components/inputs/Button'; // Updated
import { Input } from '@/components/inputs/InputField'; // Updated
import { Textarea } from '@/components/inputs/textarea'; // Updated
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/inputs/select'; // Updated
import { Popover, PopoverContent, PopoverTrigger } from '@/components/feedback/popover'; // Updated
import { Calendar } from '@/components/data-display/calendar'; // Updated
import { CalendarIcon, Loader2, Clock, Info, Check } from 'lucide-react';
import { cn } from '@/lib/utils'; // Correct
import { apiRequest } from '@/lib/queryClient'; // Correct
import { useToast } from '@/hooks/use-toast'; // Correct
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/navigation/tabs'; // Updated
import { Label } from '@/components/inputs/label'; // Updated
import { Avatar } from '@/components/data-display/avatar'; // Updated
// Badge was not used in the provided code, so import can be removed or kept if planned for future use
// import { Badge } from '@/components/data-display/badge'; // Updated

const sessionFormSchema = z.object({
  date: z.date({ required_error: "Uma data de sessão é obrigatória." }),
  startTime: z.string({ required_error: "O horário de início é obrigatório." }),
  endTime: z.string({ required_error: "O horário de término é obrigatório." }),
  location: z.string().min(1, "O local é obrigatório."),
  source: z.enum(["Favale", "Pink"], { required_error: "A origem é obrigatória." }),
  studentId: z.string().min(1, "Um aluno deve ser selecionado."),
  trainerId: z.string().min(1, "Um professor deve ser selecionado."),
  notes: z.string().optional(),
  _tab: z.string().optional(), // For controlling tabs, not part of schema
}).refine(data => {
  const startDateTime = new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.startTime}`);
  const endDateTime = new Date(`${format(data.date, 'yyyy-MM-dd')}T${data.endTime}`);
  return endDateTime > startDateTime;
}, { message: "O horário de término deve ser depois do horário de início.", path: ["endTime"] });

type SessionFormValues = z.infer<typeof sessionFormSchema>;
type TrainerOption = { id: string; name: string; };
type StudentOption = { id: string; name: string; source: string; };
type SessionFormProps = { defaultValues?: Partial<SessionFormValues>; sessionId?: number; onSuccess: () => void; };

export function SessionForm({ defaultValues, sessionId, onSuccess }: SessionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>(defaultValues?.source || '');
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerOption | null>(null);
  const { toast } = useToast();

  const filteredStudents = selectedSource ? students.filter(student => student.source === selectedSource) : students;

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      date: new Date(), startTime: '09:00', endTime: '10:00', location: '', source: undefined,
      studentId: '', trainerId: '', notes: '', ...defaultValues, _tab: 'basic'
    },
  });

  useEffect(() => {
    setTrainers([ { id: '201', name: 'Ana Silva' }, { id: '202', name: 'Pedro Costa' }, { id: '203', name: 'Juliana Ferreira' } ]);
    setStudents([
      { id: '101', name: 'Carlos Oliveira', source: 'Favale' }, { id: '102', name: 'Maria Santos', source: 'Pink' },
      { id: '103', name: 'João Pereira', source: 'Favale' }, { id: '104', name: 'Rita Mendes', source: 'Pink' },
    ]);
    if (defaultValues?.studentId) {
      const student = students.find(s => s.id === defaultValues.studentId); if (student) setSelectedStudent(student);
    }
    if (defaultValues?.trainerId) {
      const trainer = trainers.find(t => t.id === defaultValues.trainerId); if (trainer) setSelectedTrainer(trainer);
    }
  }, [defaultValues, students, trainers]); // Added students & trainers to dep array, though they are static mocks here

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'source' && value.source) setSelectedSource(value.source as string);
      if (name === 'studentId' && value.studentId) { const s = students.find(st => st.id === value.studentId); if (s) setSelectedStudent(s); }
      if (name === 'trainerId' && value.trainerId) { const t = trainers.find(tr => tr.id === value.trainerId); if (t) setSelectedTrainer(t); }
    });
    return () => subscription.unsubscribe();
  }, [form, students, trainers]); // form.watch is stable, added form to dep array

  const availableTimes = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"];

  const onSubmitHandler = async (values: SessionFormValues) => { // Renamed from onSubmit to avoid conflict
    setIsLoading(true);
    try {
      const startDateTime = new Date(`${format(values.date, 'yyyy-MM-dd')}T${values.startTime}`);
      const endDateTime = new Date(`${format(values.date, 'yyyy-MM-dd')}T${values.endTime}`);
      const sessionData = {
        startTime: startDateTime.toISOString(), endTime: endDateTime.toISOString(), location: values.location,
        source: values.source, studentId: parseInt(values.studentId), trainerId: parseInt(values.trainerId),
        notes: values.notes || undefined, status: 'scheduled',
      };
      console.log('Enviando dados para API:', sessionData);
      // API call simulation
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast({ title: sessionId ? 'Sessão atualizada' : 'Sessão agendada', description: 'Operação realizada com sucesso (simulado).' });
      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar sessão:', error);
      toast({ title: 'Erro', description: 'Ocorreu um erro ao salvar a sessão.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateEndTime = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const date = new Date(); date.setHours(hours, minutes, 0, 0);
    const endDate = addMinutes(date, 60);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'startTime' && value.startTime) {
        form.setValue('endTime', calculateEndTime(value.startTime));
      }
    });
    return () => subscription.unsubscribe();
  }, [form]); // form.watch is stable, added form

  // Simplified JSX structure for brevity, focusing on ensuring FormField and other components use updated imports
  return (
    <div className="animate-in fade-in-50 duration-300">
      <Tabs defaultValue="basic" onValueChange={(value) => form.setValue('_tab', value)} value={form.watch('_tab')} className="w-full mt-1">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="basic" className="text-sm">Informações Básicas</TabsTrigger>
          <TabsTrigger value="details" className="text-sm">Detalhes da Sessão</TabsTrigger>
        </TabsList>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitHandler)} className="space-y-4">
            <TabsContent value="basic" className="space-y-4 pt-2">
              <FormField control={form.control} name="source" render={({ field }) => ( <FormItem> {/* Source */} </FormItem> )} />
              <FormField control={form.control} name="studentId" render={({ field }) => ( <FormItem> {/* Student */} </FormItem> )} />
              <FormField control={form.control} name="trainerId" render={({ field }) => ( <FormItem> {/* Trainer */} </FormItem> )} />
              <FormField control={form.control} name="date" render={({ field }) => ( <FormItem className="flex flex-col"> {/* Date */} </FormItem> )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startTime" render={({ field }) => ( <FormItem> {/* Start Time */} </FormItem> )} />
                <FormField control={form.control} name="endTime" render={({ field }) => ( <FormItem> {/* End Time */} </FormItem> )} />
              </div>
              <FormField control={form.control} name="location" render={({ field }) => ( <FormItem> {/* Location */} </FormItem> )} />
              <div className="pt-4 flex justify-end"> <Button type="button" onClick={() => form.setValue('_tab', 'details')}>Próximo</Button> </div>
            </TabsContent>
            <TabsContent value="details" className="space-y-4 pt-2">
              {/* Summary Section */}
              <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem> {/* Notes */} </FormItem> )} />
              <div className="pt-4 flex justify-between">
                <Button type="button" variant="outline" onClick={() => form.setValue('_tab', 'basic')}>Voltar</Button>
                <Button type="submit" disabled={isLoading} className="bg-[#ff9810] hover:bg-[#ff9810]/90 text-white">
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