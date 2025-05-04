import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';

type SessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show';

interface Session {
  id: number;
  startTime: Date;
  endTime: Date;
  location: string;
  source: 'Favale' | 'Pink';
  notes?: string;
  status: SessionStatus;
  studentId: string;
  studentName: string;
  trainerId: string;
  trainerName: string;
  calendarEventId?: string;
}

interface SessionFormProps {
  initialData?: Session;
  onSuccess: () => void;
}

export function SessionForm({ initialData, onSuccess }: SessionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Mock data de alunos e professores
  const students = [
    { id: '101', name: 'Carlos Oliveira' },
    { id: '102', name: 'Maria Santos' },
    { id: '103', name: 'João Pereira' },
    { id: '104', name: 'Paula Ferreira' },
  ];

  const trainers = [
    { id: '201', name: 'Ana Silva', specialties: ['Musculação', 'Funcional'] },
    { id: '202', name: 'Pedro Costa', specialties: ['Cardio', 'Yoga'] },
    { id: '203', name: 'Roberto Alves', specialties: ['CrossFit', 'Pilates'] },
  ];

  const locations = [
    'Academia Central',
    'Estúdio Zona Norte',
    'Academia Sul',
    'Espaço Fitness Leste',
  ];

  // Estado do formulário
  const [formData, setFormData] = useState({
    studentId: initialData?.studentId || '',
    trainerId: initialData?.trainerId || '',
    date: initialData ? new Date(initialData.startTime).toISOString().slice(0, 10) : '',
    startTime: initialData ? new Date(initialData.startTime).toISOString().slice(11, 16) : '',
    endTime: initialData ? new Date(initialData.endTime).toISOString().slice(11, 16) : '',
    location: initialData?.location || '',
    notes: initialData?.notes || '',
    source: initialData?.source || 'Favale',
    status: initialData?.status || 'scheduled',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar formulário
    if (!formData.studentId || !formData.trainerId || !formData.date || !formData.startTime || !formData.endTime || !formData.location) {
      toast({
        title: 'Erro no formulário',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simular envio para API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Em uma implementação real, aqui enviaria os dados para a API
      console.log('Dados do formulário:', formData);
      
      onSuccess();
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar a sessão.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="studentId">Aluno</Label>
          <Select 
            name="studentId" 
            value={formData.studentId}
            onValueChange={(value) => handleSelectChange('studentId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o aluno" />
            </SelectTrigger>
            <SelectContent>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="trainerId">Professor</Label>
          <Select 
            name="trainerId" 
            value={formData.trainerId}
            onValueChange={(value) => handleSelectChange('trainerId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o professor" />
            </SelectTrigger>
            <SelectContent>
              {trainers.map((trainer) => (
                <SelectItem key={trainer.id} value={trainer.id}>
                  {trainer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Data</Label>
          <Input
            id="date"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="startTime">Hora Início</Label>
            <Input
              id="startTime"
              name="startTime"
              type="time"
              value={formData.startTime}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime">Hora Fim</Label>
            <Input
              id="endTime"
              name="endTime"
              type="time"
              value={formData.endTime}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Local</Label>
          <Select 
            name="location" 
            value={formData.location}
            onValueChange={(value) => handleSelectChange('location', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o local" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Categoria</Label>
          <RadioGroup 
            value={formData.source} 
            onValueChange={(value) => handleSelectChange('source', value)}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Favale" id="favale" />
              <Label htmlFor="favale" className="text-blue-600 dark:text-blue-400">Favale</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Pink" id="pink" />
              <Label htmlFor="pink" className="text-pink-600 dark:text-pink-400">Pink</Label>
            </div>
          </RadioGroup>
        </div>

        {initialData && (
          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              name="status" 
              value={formData.status}
              onValueChange={(value) => handleSelectChange('status', value as SessionStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Agendada</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
                <SelectItem value="no-show">Não Compareceu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Observações sobre a sessão..."
            value={formData.notes}
            onChange={handleChange}
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : initialData ? 'Atualizar' : 'Agendar'}
        </Button>
      </div>
    </form>
  );
}