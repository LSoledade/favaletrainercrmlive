import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lead, InsertLead } from "@shared/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LeadManagement() {
  const { data: leads, isLoading, error } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { 
    setIsDialogOpen, 
    selectedLead, 
    setSelectedLead,
    deleteLead,
    selectedLeadIds,
    setSelectedLeadIds,
    updateLeadsInBatch,
    deleteLeadsInBatch
  } = useLeadContext();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    source: "",
    status: "",
    campaign: ""
  });
  const [batchStatusValue, setBatchStatusValue] = useState("");
  const [batchSourceValue, setBatchSourceValue] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const csvLinkRef = useRef<HTMLAnchorElement>(null);

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

  const handleBatchStatusUpdate = async () => {
    if (selectedLeadIds.length > 0 && batchStatusValue) {
      await updateLeadsInBatch(selectedLeadIds, { status: batchStatusValue });
      setBatchStatusValue("");
    }
  };

  const handleBatchSourceUpdate = async () => {
    if (selectedLeadIds.length > 0 && batchSourceValue) {
      await updateLeadsInBatch(selectedLeadIds, { source: batchSourceValue });
      setBatchSourceValue("");
    }
  };

  const handleBatchDelete = () => {
    if (selectedLeadIds.length > 0) {
      setBatchDeleteDialogOpen(true);
    }
  };

  const confirmBatchDelete = async () => {
    if (selectedLeadIds.length > 0) {
      await deleteLeadsInBatch(selectedLeadIds);
      setBatchDeleteDialogOpen(false);
    }
  };

  const handleExportLeads = () => {
    if (!filteredLeads || filteredLeads.length === 0) return;
    
    setExportLoading(true);
    
    try {
      // Define CSV headers
      const headers = [
        'ID', 'Nome', 'Email', 'Telefone', 'Estado', 'Status', 
        'Fonte', 'Campanha', 'Tags', 'Data de Entrada', 'Observações'
      ];
      
      // Map leads to CSV rows
      const csvRows = filteredLeads.map(lead => {
        const values = [
          lead.id,
          lead.name,
          lead.email,
          lead.phone,
          lead.state,
          lead.status,
          lead.source,
          lead.campaign,
          lead.tags.join(', '),
          new Date(lead.entryDate).toLocaleDateString('pt-BR'),
          lead.notes
        ];
        
        // Escape values that might contain commas
        return values.map(value => 
          typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value
        ).join(',');
      });
      
      // Combine headers and rows
      const csvContent = [headers.join(','), ...csvRows].join('\n');
      
      // Create a Blob and generate a download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      if (csvLinkRef.current) {
        csvLinkRef.current.href = url;
        csvLinkRef.current.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
        csvLinkRef.current.click();
      }
      
    } catch (error) {
      console.error('Erro ao exportar leads:', error);
    } finally {
      setExportLoading(false);
    }
  };

  // Filtered leads processing
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
        <h2 className="font-heading text-2xl font-semibold text-secondary dark:text-white dark:glow-text mb-4 md:mb-0">
          Gerenciamento de Leads
        </h2>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <button className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center transition-colors duration-200">
            <span className="material-icons text-sm mr-1 text-primary-400 dark:text-pink-400">filter_list</span>
            Filtrar
          </button>
          <button 
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center transition-colors duration-200"
            onClick={handleExportLeads}
            disabled={exportLoading || !filteredLeads || filteredLeads.length === 0}
          >
            <span className="material-icons text-sm mr-1 text-primary-400 dark:text-pink-400">{exportLoading ? 'hourglass_empty' : 'file_download'}</span>
            {exportLoading ? 'Exportando...' : 'Exportar'}
          </button>
          <a ref={csvLinkRef} style={{ display: 'none' }} />
          <button 
            className="bg-primary text-white rounded-md px-4 py-2 text-sm flex items-center hover:bg-primary/90 dark:glow-button-sm transition-all duration-200"
            onClick={handleNewLead}
          >
            <span className="material-icons text-sm mr-1">add</span>
            Novo Lead
          </button>
        </div>
      </div>

      {/* Search and filter bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6 transition-colors duration-200">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="col-span-1 md:col-span-3 lg:col-span-2">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Pesquisar leads..." 
                className="w-full border dark:border-gray-700 rounded-md pl-10 pr-4 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="material-icons absolute left-3 top-2 text-gray-400 dark:text-gray-300 text-sm">search</span>
            </div>
          </div>
          <div>
            <select 
              className="w-full border dark:border-gray-700 rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
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
              className="w-full border dark:border-gray-700 rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
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
              className="w-full border dark:border-gray-700 rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
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
      
      {/* Batch Operations Bar - only visible when leads are selected */}
      {selectedLeadIds.length > 0 && (
        <div className="bg-primary-50 dark:bg-gray-800 border border-primary-200 dark:border-gray-700 rounded-lg p-4 mb-6 flex flex-wrap items-center gap-4 transition-colors duration-200">
          <div className="flex items-center">
            <span className="font-semibold text-primary dark:text-pink-400 mr-2">{selectedLeadIds.length}</span>
            <span className="text-gray-700 dark:text-gray-300">leads selecionados</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select
              value={batchStatusValue}
              onValueChange={setBatchStatusValue}
            >
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Alterar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="Aluno">Aluno</SelectItem>
              </SelectContent>
            </Select>
            
            <button 
              className="bg-primary text-white rounded-md px-3 py-1 text-sm hover:bg-primary/90 dark:glow-button-xs transition-all duration-200"
              onClick={handleBatchStatusUpdate}
              disabled={!batchStatusValue}
            >
              Aplicar
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select
              value={batchSourceValue}
              onValueChange={setBatchSourceValue}
            >
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Alterar origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Favale">Favale</SelectItem>
                <SelectItem value="Pink">Pink</SelectItem>
              </SelectContent>
            </Select>
            
            <button 
              className="bg-primary text-white rounded-md px-3 py-1 text-sm hover:bg-primary/90 dark:glow-button-xs transition-all duration-200"
              onClick={handleBatchSourceUpdate}
              disabled={!batchSourceValue}
            >
              Aplicar
            </button>
          </div>
          
          <button 
            className="ml-auto bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-md px-3 py-1 text-sm transition-colors duration-200"
            onClick={handleBatchDelete}
          >
            Excluir selecionados
          </button>
        </div>
      )}

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
              className="bg-red-600 hover:bg-red-700 dark:glow-red-sm transition-all duration-200"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Leads Selecionados</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedLeadIds.length} leads?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBatchDelete}
              className="bg-red-600 hover:bg-red-700 dark:glow-red-sm transition-all duration-200"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
