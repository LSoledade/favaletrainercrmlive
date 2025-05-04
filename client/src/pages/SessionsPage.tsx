import { SessionManagement } from '@/components/scheduling/SessionManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SessionsPage() {
  return (
    <div className="container mx-auto p-4">
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Agendamentos e Relatórios</CardTitle>
          <CardDescription>
            Gerencie sessões de treinamento e emita relatórios para faturamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionManagement />
        </CardContent>
      </Card>
    </div>
  );
}
