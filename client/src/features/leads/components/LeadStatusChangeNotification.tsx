import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lead } from '@/types'; // Updated
import { apiRequest } from '@/lib/queryClient'; // Correct
import { useToast } from '@/hooks/use-toast'; // Correct
import { AlertTriangle, Check } from 'lucide-react'; // MessageSquare removed as unused
import { Button } from '@/components/inputs/Button'; // Updated path
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/feedback/dialog'; // Updated path
import { Label } from '@/components/inputs/label'; // Updated path
import { Switch } from '@/components/inputs/switch'; // Updated path
import { Textarea } from '@/components/inputs/textarea'; // Updated path

interface LeadStatusChangeNotificationProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSubmitChange: (sendNotification: boolean, message?: string) => void;
}

const DEFAULT_MESSAGE = `Olá {nome},\n\nEstamos felizes em informar que sua inscrição foi confirmada com sucesso!\n\nAgora você é oficialmente um aluno da Favale&Pink Personal Training. Entraremos em contato para agendar sua primeira sessão.\n\nBem-vindo à nossa equipe!`;

export default function LeadStatusChangeNotification({
  lead,
  isOpen,
  onClose,
  onSubmitChange
}: LeadStatusChangeNotificationProps) {
  const [sendNotification, setSendNotification] = useState(true);
  const [message, setMessage] = useState(DEFAULT_MESSAGE.replace('{nome}', lead.name));
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendNotificationMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/whatsapp/send', { // This path might need adjustment based on actual API routes
        leadId: lead.id,
        content: message,
        direction: 'outgoing',
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/whatsapp/lead/${lead.id}`] }); // Path might need adjustment
      toast({
        title: 'Notificação enviada',
        description: `Mensagem enviada para ${lead.name} (${lead.phone})`,
      });
      onSubmitChange(true, message);
    },
    onError: (error: Error | { response?: { data?: { message?: string; isUnauthorizedNumber?: boolean; error?: string } } }) => { // Updated
      console.error('Erro ao enviar notificação:', error);
      let errorMessage = 'Não foi possível enviar a notificação';
      // Type guard for error structure
      if (typeof error === 'object' && error !== null && 'response' in error && error.response &&
          typeof error.response.data === 'object' && error.response.data !== null) {
        const errorData = error.response.data;
        if (errorData.isUnauthorizedNumber) {
          errorMessage = `Número ${lead.phone} não autorizado. Apenas números verificados podem receber mensagens no ambiente de teste.`;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) { // Check for message property as well
          errorMessage = errorData.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: 'Erro ao enviar notificação',
        description: errorMessage,
        variant: 'destructive',
      });
      onSubmitChange(false);
    },
  });

  const handleSubmit = () => {
    if (sendNotification) {
      sendNotificationMutation.mutate();
    } else {
      onSubmitChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar status para Aluno</DialogTitle>
          <DialogDescription>
            Este lead está sendo promovido para aluno. Deseja enviar uma notificação por WhatsApp?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="send-notification"
              checked={sendNotification}
              onCheckedChange={setSendNotification}
            />
            <Label htmlFor="send-notification" className="cursor-pointer">
              Enviar notificação via WhatsApp
            </Label>
          </div>
          
          {sendNotification && (
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem:</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                className="min-h-[100px]"
                placeholder="Digite a mensagem para o novo aluno..."
              />
              <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2">
                <AlertTriangle size={14} className="mt-0.5 min-w-[14px]" />
                <p>Esta mensagem será enviada para {lead.phone}. Certifique-se de que o número está correto.</p>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            type="submit" // Changed to submit, though it's handled by onClick
            onClick={handleSubmit}
            disabled={sendNotificationMutation.isPending}
            className="flex items-center gap-1.5"
          >
            {sendNotificationMutation.isPending ? (
              "Enviando..." // Consider adding a spinner icon here
            ) : (
              <>
                <Check size={16} />
                <span>Confirmar mudança</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}