import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Send, PieChart, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SessionReportProps {
  onClose?: () => void;
}

export function SessionReport({ onClose }: SessionReportProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Mock data - deve ser substituído por chamadas à API real
  const students = [
    { id: '101', name: 'Carlos Oliveira' },
    { id: '102', name: 'Maria Santos' },
    { id: '103', name: 'João Pereira' },
    { id: '104', name: 'Paula Ferreira' },
  ];

  const sessions = [
    {
      id: 1,
      startTime: new Date(2025, 4, 2, 9, 0),
      endTime: new Date(2025, 4, 2, 10, 0),
      location: 'Academia Central',
      source: 'Favale',
      notes: 'Foco em treinamento de força',
      status: 'completed',
      studentId: '101',
      studentName: 'Carlos Oliveira',
      trainerId: '201',
      trainerName: 'Ana Silva',
      value: 80.00,
    },
    {
      id: 2,
      startTime: new Date(2025, 4, 3, 15, 0),
      endTime: new Date(2025, 4, 3, 16, 0),
      location: 'Estúdio Zona Norte',
      source: 'Pink',
      notes: 'Treino de cardio e flexibilidade',
      status: 'completed',
      studentId: '102',
      studentName: 'Maria Santos',
      trainerId: '202',
      trainerName: 'Pedro Costa',
      value: 80.00,
    },
    {
      id: 3,
      startTime: new Date(2025, 4, 1, 10, 0),
      endTime: new Date(2025, 4, 1, 11, 0),
      location: 'Academia Sul',
      source: 'Favale',
      status: 'completed',
      studentId: '101',
      studentName: 'Carlos Oliveira',
      trainerId: '201',
      trainerName: 'Ana Silva',
      value: 80.00,
    },
    {
      id: 4,
      startTime: new Date(2025, 4, 5, 14, 0),
      endTime: new Date(2025, 4, 5, 15, 0),
      location: 'Espaço Fitness Leste',
      source: 'Pink',
      status: 'completed',
      studentId: '101',
      studentName: 'Carlos Oliveira',
      trainerId: '203',
      trainerName: 'Roberto Alves',
      value: 80.00,
    },
    {
      id: 5,
      startTime: new Date(2025, 4, 8, 9, 0),
      endTime: new Date(2025, 4, 8, 10, 0),
      location: 'Academia Central',
      source: 'Favale',
      status: 'cancelled',
      studentId: '101',
      studentName: 'Carlos Oliveira',
      trainerId: '201',
      trainerName: 'Ana Silva',
      value: 0, // Sessão cancelada não tem valor
    },
  ];

  // Gerar relatório com base no aluno selecionado e intervalo de datas
  const generateReport = () => {
    if (!selectedStudentId) {
      toast({
        title: 'Selecione um aluno',
        description: 'Por favor, selecione um aluno para gerar o relatório.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    // Em produção, isso seria uma chamada à API
    setTimeout(() => {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      // Filtrar sessões pelo aluno e datas selecionadas
      const filteredSessions = sessions.filter(session => 
        session.studentId === selectedStudentId && 
        session.status === 'completed' &&
        new Date(session.startTime) >= startDateObj &&
        new Date(session.startTime) <= endDateObj
      );

      // Calcular totais
      const totalSessions = filteredSessions.length;
      const totalValue = filteredSessions.reduce((acc, session) => acc + session.value, 0);

      // Agrupar por professor
      const sessionsByTrainer = filteredSessions.reduce((acc, session) => {
        if (!acc[session.trainerId]) {
          acc[session.trainerId] = {
            trainerName: session.trainerName,
            sessions: 0,
            totalValue: 0,
          };
        }
        acc[session.trainerId].sessions += 1;
        acc[session.trainerId].totalValue += session.value;
        return acc;
      }, {});

      const student = students.find(s => s.id === selectedStudentId);

      setReportData({
        student,
        period: { startDate: startDateObj, endDate: endDateObj },
        sessions: filteredSessions,
        totalSessions,
        totalValue,
        sessionsByTrainer: Object.values(sessionsByTrainer),
      });

      setIsLoading(false);
    }, 1000);
  };

  const handleExportPDF = () => {
    toast({
      title: 'Exportando PDF',
      description: 'O relatório está sendo gerado em PDF.',
    });
    // Implementar exportação real para PDF
  };

  const handleSendByEmail = () => {
    toast({
      title: 'Enviando por e-mail',
      description: 'O relatório está sendo enviado por e-mail.',
    });
    // Implementar envio real por e-mail
  };

  const handlePrint = () => {
    toast({
      title: 'Imprimindo',
      description: 'Enviando relatório para impressão.',
    });
    window.print();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Relatório de Aulas por Aluno</CardTitle>
        <CardDescription>
          Gere relatórios detalhados de aulas por aluno para emissão de notas de serviço
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2">
            <Label htmlFor="student">Aluno</Label>
            <Select 
              value={selectedStudentId} 
              onValueChange={setSelectedStudentId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um aluno" />
              </SelectTrigger>
              <SelectContent>
                {students.map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="startDate">Data Inicial</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endDate">Data Final</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end mb-6">
          <Button 
            onClick={generateReport} 
            disabled={isLoading || !selectedStudentId}
          >
            {isLoading ? 'Gerando...' : 'Gerar Relatório'}
          </Button>
        </div>

        {reportData && (
          <div className="mt-6 space-y-6 print:mt-0">
            <div className="text-center mb-6 hidden print:block">
              <h1 className="text-2xl font-bold">Favale&Pink Personal Training</h1>
              <p className="text-gray-500">Relatório de Aulas</p>
            </div>

            <div className="bg-muted p-4 rounded-lg print:bg-white print:p-0">
              <h3 className="text-lg font-medium mb-2">Informações do Relatório</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Aluno</p>
                  <p className="font-medium">{reportData.student.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Período</p>
                  <p className="font-medium">
                    {format(reportData.period.startDate, 'dd/MM/yyyy', { locale: ptBR })} a {format(reportData.period.endDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total de Aulas</p>
                  <p className="font-medium">{reportData.totalSessions}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Resumo por Professor</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Professor</TableHead>
                    <TableHead>Total de Aulas</TableHead>
                    <TableHead className="text-right">Valor Total (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.sessionsByTrainer.map((trainerData: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{trainerData.trainerName}</TableCell>
                      <TableCell>{trainerData.sessions}</TableCell>
                      <TableCell className="text-right">{trainerData.totalValue.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableRow className="bg-primary-light bg-opacity-10 font-medium">
                  <TableCell>Total</TableCell>
                  <TableCell>{reportData.totalSessions}</TableCell>
                  <TableCell className="text-right">R$ {reportData.totalValue.toFixed(2)}</TableCell>
                </TableRow>
              </Table>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Detalhamento das Aulas</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Professor</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.sessions.map((session: any) => (
                    <TableRow key={session.id}>
                      <TableCell>{format(new Date(session.startTime), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell>
                        {format(new Date(session.startTime), 'HH:mm', { locale: ptBR })} - 
                        {format(new Date(session.endTime), 'HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>{session.trainerName}</TableCell>
                      <TableCell>{session.location}</TableCell>
                      <TableCell>
                        <span className={session.source === 'Favale' ? 'text-blue-600' : 'text-pink-600'}>
                          {session.source}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{session.value.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-8 print:hidden">
              <h3 className="text-lg font-medium mb-4">Ações do Relatório</h3>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleExportPDF} variant="outline" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Exportar PDF
                </Button>
                <Button onClick={handleSendByEmail} variant="outline" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Enviar por E-mail
                </Button>
                <Button onClick={handlePrint} variant="outline" className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
