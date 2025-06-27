import { createContext, useContext, useState, ReactNode } from "react"; // Removed useEffect, useQuery
import { Lead, InsertLead } from "@shared/schema";
// Replace apiRequest with invokeSupabaseFunction
import { invokeSupabaseFunction, queryClient } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query"; // useQueryClient is still needed for invalidation
import { useToast } from "@/hooks/use-toast";

interface LeadContextProps {
  selectedLead: Lead | null;
  setSelectedLead: (lead: Lead | null) => void;
  isDialogOpen: boolean;
  setIsDialogOpen: (isOpen: boolean) => void;
  createLead: (lead: InsertLead) => Promise<void>;
  updateLead: (id: number, lead: Partial<InsertLead>) => Promise<void>;
  deleteLead: (id: number) => Promise<void>;
  updateLeadsInBatch: (ids: number[], updates: Partial<InsertLead>) => Promise<number>;
  deleteLeadsInBatch: (ids: number[]) => Promise<number>;
  selectedLeadIds: number[];
  setSelectedLeadIds: (ids: number[]) => void;
}

const LeadContext = createContext<LeadContextProps | undefined>(undefined);

export function LeadProvider({ children }: { children: ReactNode }) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Create a new lead
  const createLead = async (lead: InsertLead) => {
    try {
      // invokeSupabaseFunction<ReturnType>(functionName, method, payload)
      await invokeSupabaseFunction<Lead>("lead-functions", "POST", lead);
      // Query key for leads list, assuming it's 'leadsList' or similar
      // Check LeadManagement.tsx for the actual queryKey used for fetching all leads.
      // For now, using a placeholder 'leadsList'. This needs to match where leads are fetched.
      await queryClient.invalidateQueries({ queryKey: ["leadsList"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboardStats"] }); // From Dashboard.tsx
      
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
      await invokeSupabaseFunction<Lead>("lead-functions", "PATCH", lead, { slug: id.toString() });
      await queryClient.invalidateQueries({ queryKey: ["leadsList"] }); // Invalidate leads list
      await queryClient.invalidateQueries({ queryKey: ['leadDetails', id] }); // Invalidate specific lead details if cached
      await queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      
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
      await invokeSupabaseFunction<void>("lead-functions", "DELETE", undefined, { slug: id.toString() });
      await queryClient.invalidateQueries({ queryKey: ["leadsList"] });
      await queryClient.invalidateQueries({ queryKey: ['leadDetails', id] }); // Invalidate specific lead details
      await queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      
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

  // Batch operations
  const updateLeadsInBatch = async (ids: number[], updates: Partial<InsertLead>): Promise<number> => {
    try {
      const response = await invokeSupabaseFunction<{ updatedCount: number }>(
        "lead-functions",
        "POST",
        { ids, updates },
        { slug: "batch/update" } // Pass 'batch/update' as the slug
      );
      await queryClient.invalidateQueries({ queryKey: ["leadsList"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      
      const updatedCount = response.updatedCount || 0;
      
      toast({
        title: "Sucesso",
        description: `${updatedCount} leads atualizados com sucesso`,
      });
      
      setSelectedLeadIds([]);
      return updatedCount;
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao atualizar leads em lote",
        variant: "destructive",
      });
      console.error("Error updating leads in batch:", error);
      return 0;
    }
  };

  const deleteLeadsInBatch = async (ids: number[]): Promise<number> => {
    try {
      const response = await invokeSupabaseFunction<{ deletedCount: number }>(
        "lead-functions",
        "POST",
        { ids },
        { slug: "batch/delete" } // Pass 'batch/delete' as the slug
      );
      await queryClient.invalidateQueries({ queryKey: ["leadsList"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      
      const deletedCount = response.deletedCount || 0;
      
      toast({
        title: "Sucesso",
        description: `${deletedCount} leads excluídos com sucesso`,
      });
      
      setSelectedLeadIds([]);
      return deletedCount;
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao excluir leads em lote",
        variant: "destructive",
      });
      console.error("Error deleting leads in batch:", error);
      return 0;
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
    updateLeadsInBatch,
    deleteLeadsInBatch,
    selectedLeadIds,
    setSelectedLeadIds
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
