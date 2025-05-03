import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Lead, InsertLead } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface LeadContextProps {
  selectedLead: Lead | null;
  setSelectedLead: (lead: Lead | null) => void;
  isDialogOpen: boolean;
  setIsDialogOpen: (isOpen: boolean) => void;
  createLead: (lead: InsertLead) => Promise<void>;
  updateLead: (id: number, lead: Partial<InsertLead>) => Promise<void>;
  deleteLead: (id: number) => Promise<void>;
}

const LeadContext = createContext<LeadContextProps | undefined>(undefined);

export function LeadProvider({ children }: { children: ReactNode }) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Create a new lead
  const createLead = async (lead: InsertLead) => {
    try {
      await apiRequest("POST", "/api/leads", lead);
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      toast({
        title: "Sucesso",
        description: "Lead criado com sucesso",
      });
      
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar lead",
        variant: "destructive",
      });
      console.error("Error creating lead:", error);
    }
  };

  // Update an existing lead
  const updateLead = async (id: number, lead: Partial<InsertLead>) => {
    try {
      await apiRequest("PUT", `/api/leads/${id}`, lead);
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      toast({
        title: "Sucesso",
        description: "Lead atualizado com sucesso",
      });
      
      setIsDialogOpen(false);
      setSelectedLead(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar lead",
        variant: "destructive",
      });
      console.error("Error updating lead:", error);
    }
  };

  // Delete a lead
  const deleteLead = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/leads/${id}`);
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      toast({
        title: "Sucesso",
        description: "Lead excluído com sucesso",
      });
      
      setSelectedLead(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao excluir lead",
        variant: "destructive",
      });
      console.error("Error deleting lead:", error);
    }
  };

  const value = {
    selectedLead,
    setSelectedLead,
    isDialogOpen,
    setIsDialogOpen,
    createLead,
    updateLead,
    deleteLead,
  };

  return <LeadContext.Provider value={value}>{children}</LeadContext.Provider>;
}

export function useLeadContext() {
  const context = useContext(LeadContext);
  if (context === undefined) {
    throw new Error("useLeadContext must be used within a LeadProvider");
  }
  return context;
}
