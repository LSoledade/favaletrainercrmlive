import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lead, WhatsappMessage } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Paperclip, Send, Image, Mic, AlertCircle } from 'lucide-react';

interface WhatsappChatProps {
  lead: Lead;
  onClose?: () => void;
}

const WhatsappChat = ({ lead, onClose }: WhatsappChatProps) => {
  const [message, setMessage] = useState('');
  const [attaching, setAttaching] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar mensagens do lead
  const { data: messages = [], isLoading, error } = useQuery<WhatsappMessage[]>({
    queryKey: [`/api/whatsapp/lead/${lead.id}`],
    refetchInterval: 10000, // Atualizar a cada 10 segundos
  });

  // Mutação para enviar mensagem
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('POST', '/api/whatsapp/send', {
        leadId: lead.id,
        direction: 'outgoing',
        content,
        status: 'sent',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/whatsapp/lead/${lead.id}`] });
      setMessage('');
    },
    onError: (error) => {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a mensagem',
        variant: 'destructive',
      });
    },
  });

  // Rolar para o final das mensagens quando novas mensagens chegarem
  useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-primary border-gray-200"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        <AlertCircle className="mr-2" />
        <span>Erro ao carregar mensagens</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
      {/* Cabeçalho do chat */}
      <div className="p-4 bg-primary text-white flex items-center justify-between">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center mr-3">
            <span className="text-white font-bold">{lead.name.charAt(0)}</span>
          </div>
          <div>
            <h3 className="font-medium">{lead.name}</h3>
            <p className="text-xs opacity-80">{lead.phone}</p>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 20L20 0h20L0 40z\'/%3E%3Cpath d=\'M20 40L40 20 40 40z\'/%3E%3C/g%3E%3C/svg%3E")' }}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-center">
              Nenhuma mensagem ainda.<br />
              Envie uma mensagem para iniciar a conversa.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-xs md:max-w-md rounded-lg p-3 ${msg.direction === 'outgoing' ? 'bg-primary/90 text-white rounded-br-none' : 'bg-white dark:bg-gray-700 rounded-bl-none'}`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <div className="text-xs opacity-80 text-right mt-1 flex justify-end items-center">
                  {formatTime(msg.timestamp)}
                  {msg.direction === 'outgoing' && (
                    <span className="ml-1">
                      {msg.status === 'read' ? (
                        <span className="text-blue-400">✓✓</span>
                      ) : msg.status === 'delivered' ? (
                        <span>✓✓</span>
                      ) : (
                        <span>✓</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input para nova mensagem */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-gray-900 border-t dark:border-gray-700 flex items-end">
        <button 
          type="button"
          className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 mr-1 transition-colors"
          onClick={() => setAttaching(!attaching)}
        >
          <Paperclip size={20} />
        </button>
        
        {attaching && (
          <div className="flex space-x-1">
            <button type="button" className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Image size={20} />
            </button>
            <button type="button" className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Mic size={20} />
            </button>
          </div>
        )}
        
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Digite uma mensagem"
          className="flex-1 p-2 border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-gray-800 dark:text-gray-100 mr-2 max-h-32 min-h-[40px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (message.trim()) {
                handleSendMessage(e);
              }
            }
          }}
        />
        <button 
          type="submit" 
          className="p-2 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={!message.trim() || sendMessageMutation.isPending}
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default WhatsappChat;