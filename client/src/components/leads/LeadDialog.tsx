import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLeadContext } from "@/context/LeadContext";
import LeadForm from "./LeadForm";
import { InsertLead } from "@shared/schema";

export default function LeadDialog() {
  const { 
    isDialogOpen, 
    setIsDialogOpen, 
    selectedLead, 
    createLead, 
    updateLead 
  } = useLeadContext();

  const handleSubmit = async (data: InsertLead) => {
    if (selectedLead) {
      await updateLead(selectedLead.id, data);
    } else {
      await createLead(data);
    }
  };

  const handleClose = () => {
    setIsDialogOpen(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedLead ? "Editar Lead" : "Adicionar Novo Lead"}
          </DialogTitle>
        </DialogHeader>
        <LeadForm 
          lead={selectedLead} 
          onSubmit={handleSubmit}
          onCancel={handleClose}
        />
      </DialogContent>
    </Dialog>
  );
}
