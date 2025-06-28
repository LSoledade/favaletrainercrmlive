import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/data-display/Card'; // Updated path
import { Skeleton } from '@/components/data-display/skeleton'; // Updated path
import { Sun, Moon, Sunrise, Coffee } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/use-auth'; // Updated path

export default function GreetingWidget() {
  const [greeting, setGreeting] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [icon, setIcon] = useState<JSX.Element>(<Coffee className="h-8 w-8 text-primary" />);

  const { profile, isLoading: authLoading } = useAuth();
  
  useEffect(() => {
    const updateGreeting = () => {
      const currentHour = new Date().getHours();
      
      if (currentHour >= 5 && currentHour < 12) {
        setGreeting('Bom dia');
        setWelcomeMessage('Comece seu dia com energia e foco!');
        setIcon(<Sunrise className="h-8 w-8 text-amber-500" />);
      } else if (currentHour >= 12 && currentHour < 18) {
        setGreeting('Boa tarde');
        setWelcomeMessage('Aproveite a produtividade da tarde!');
        setIcon(<Sun className="h-8 w-8 text-yellow-500" />);
      } else {
        setGreeting('Boa noite');
        setWelcomeMessage('Descanse bem após um dia produtivo!');
        setIcon(<Moon className="h-8 w-8 text-indigo-400" />);
      }
    };
    
    updateGreeting();
    
    const intervalId = setInterval(updateGreeting, 60000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  if (authLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-64" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="overflow-hidden border-primary-100 bg-gradient-to-br from-white to-primary-50 dark:from-gray-800 dark:to-primary-900/10 dark:border-primary-900">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900/30">
            {icon}
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
              {greeting}, {profile?.username || 'usuário'}!
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {welcomeMessage}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}