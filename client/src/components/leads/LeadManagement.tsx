import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lead } from "@shared/schema";
import { useLeadContext } from "@/context/LeadContext";
import LeadTable from "./LeadTable";
import LeadDialog from "./LeadDialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function LeadManagement() {
  const { data: leads, isLoading, error } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { 
    setIsDialogOpen, 
    selectedLead, 
    setSelectedLead,
    deleteLead 
  } = useLeadContext();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    source: "",
    status: "",
    campaign: ""
  });

  const handleNewLead = () => {
    setSelectedLead(null);
    setIsDialogOpen(true);
  };

  const handleDelete = (lead: Lead) => {
    setSelectedLead(lead);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedLead) {
      await deleteLead(selectedLead.id);
      setDeleteDialogOpen(false);
    }
  };

  const filteredLeads = leads?.filter(lead => {
    // Search term filter
    const matchesSearch = searchTerm === "" ||
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Dropdown filters
    const matchesSource = filters.source === "" || lead.source === filters.source;
    const matchesStatus = filters.status === "" || lead.status === filters.status;
    const matchesCampaign = filters.campaign === "" || lead.campaign === filters.campaign;
    
    return matchesSearch && matchesSource && matchesStatus && matchesCampaign;
  });

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md text-red-600">
        <p>Erro ao carregar leads. Por favor, tente novamente mais tarde.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with actions */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <h2 className="font-heading text-2xl font-semibold text-secondary mb-4 md:mb-0">
          Gerenciamento de Leads
        </h2>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <button className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 flex items-center">
            <span className="material-icons text-sm mr-1">filter_list</span>
            Filtrar
          </button>
          <button className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 flex items-center">
            <span className="material-icons text-sm mr-1">file_download</span>
            Exportar
          </button>
          <button 
            className="bg-primary text-white rounded-md px-4 py-2 text-sm flex items-center"
            onClick={handleNewLead}
          >
            <span className="material-icons text-sm mr-1">add</span>
            Novo Lead
          </button>
        </div>
      </div>

      {/* Search and filter bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="col-span-1 md:col-span-3 lg:col-span-2">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Pesquisar leads..." 
                className="w-full border rounded-md pl-10 pr-4 py-2 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="material-icons absolute left-3 top-2 text-gray-400 text-sm">search</span>
            </div>
          </div>
          <div>
            <select 
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={filters.source}
              onChange={(e) => setFilters({...filters, source: e.target.value})}
            >
              <option value="">Origem</option>
              <option value="Favale">Favale</option>
              <option value="Pink">Pink</option>
            </select>
          </div>
          <div>
            <select 
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">Status</option>
              <option value="Lead">Lead</option>
              <option value="Aluno">Aluno</option>
            </select>
          </div>
          <div>
            <select 
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={filters.campaign}
              onChange={(e) => setFilters({...filters, campaign: e.target.value})}
            >
              <option value="">Campanha</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="Email">E-mail</option>
              <option value="Site">Site</option>
              <option value="Indicação">Indicação</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lead table */}
      <LeadTable 
        leads={filteredLeads || []} 
        isLoading={isLoading} 
        onDelete={handleDelete}
      />

      {/* Lead Dialog */}
      <LeadDialog />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lead {selectedLead?.name}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
