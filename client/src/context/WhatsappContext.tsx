import { createContext, useContext, useState, ReactNode } from 'react';
import { Lead } from '@shared/schema';

interface WhatsappContextProps {
  isWhatsappOpen: boolean;
  selectedLeadForWhatsapp: Lead | null;
  openWhatsappChat: (lead: Lead) => void;
  closeWhatsappChat: () => void;
}

const WhatsappContext = createContext<WhatsappContextProps | undefined>(undefined);

export function WhatsappProvider({ children }: { children: ReactNode }) {
  const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);
  const [selectedLeadForWhatsapp, setSelectedLeadForWhatsapp] = useState<Lead | null>(null);

  const openWhatsappChat = (lead: Lead) => {
    setSelectedLeadForWhatsapp(lead);
    setIsWhatsappOpen(true);
  };

  const closeWhatsappChat = () => {
    setIsWhatsappOpen(false);
  };

  const value = {
    isWhatsappOpen,
    selectedLeadForWhatsapp,
    openWhatsappChat,
    closeWhatsappChat,
  };

  return <WhatsappContext.Provider value={value}>{children}</WhatsappContext.Provider>;
}

export function useWhatsappContext() {
  const context = useContext(WhatsappContext);
  if (context === undefined) {
    throw new Error('useWhatsappContext must be used within a WhatsappProvider');
  }
  return context;
}