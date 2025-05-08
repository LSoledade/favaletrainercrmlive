import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';

export default function GreetingWidget() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('');
  
  // Atualiza a saudação com base na hora do dia
  useEffect(() => {
    const updateGreeting = () => {
      const currentHour = new Date().getHours();
      
      if (currentHour >= 5 && currentHour < 12) {
        setGreeting('Bom dia');
      } else if (currentHour >= 12 && currentHour < 18) {
        setGreeting('Boa tarde');
      } else {
        setGreeting('Boa noite');
      }
    };
    
    updateGreeting();
    
    // Atualiza a cada minuto para caso a página fique aberta por várias horas
    const intervalId = setInterval(updateGreeting, 60000);
    return () => clearInterval(intervalId);
  }, []);
  
  // Se não tiver usuário, não mostra nada
  if (!user) {
    return null;
  }
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          {greeting}, {user.username}!
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Bem-vindo ao dashboard da Favale&Pink Training.
        </p>
      </CardContent>
    </Card>
  );
}