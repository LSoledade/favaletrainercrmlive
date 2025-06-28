import { Sheet, SheetContent } from '@/components/overlays/sheet'; // Updated
import WhatsappChat from './WhatsappChat';
import { Lead } from '@/types'; // Updated

interface WhatsappModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

const WhatsappModal = ({ isOpen, onClose, lead }: WhatsappModalProps) => {
  if (!lead) return null;
  
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="p-0 sm:max-w-md w-full">
        <div className="h-full">
          <WhatsappChat lead={lead} onClose={onClose} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default WhatsappModal;