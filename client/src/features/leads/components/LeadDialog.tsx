import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/feedback/dialog"; // Updated path
import { useLeadContext } from "@/context/LeadContext"; // Correct
import LeadForm from "./LeadForm"; // Correct
import { InsertLead } from "@/types"; // Updated

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
    // setIsDialogOpen(false); // This is often handled by onOpenChange or a success callback
  };

  const handleClose = () => {
    setIsDialogOpen(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:shadow-gray-900/20 dark:shadow-glow-md">
        <DialogHeader>
          <DialogTitle>
            {selectedLead ? "Editar Lead" : "Adicionar Novo Lead"}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 pt-1">
            {selectedLead ? "Modifique as informações do lead selecionado abaixo." : "Preencha os dados abaixo para adicionar um novo lead ao sistema."}
          </DialogDescription>
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
