import { useState, useRef, ChangeEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lead, InsertLead } from "@shared/schema";
import { useLeadContext } from "@/context/LeadContext";
import { useToast } from "@/hooks/use-toast";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
    createLead,
    selectedLeadIds,
    setSelectedLeadIds,
    updateLeadsInBatch,
    deleteLeadsInBatch
  } = useLeadContext();
  
  const { toast } = useToast();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  type FilterState = {
    source: string;
    status: string;
    campaign: string;
    state: string;
    startDate: string;
    endDate: string;
    tag: string;
    dateRange: string;
  };

  const [filters, setFilters] = useState<FilterState>({
    source: "",
    status: "",
    campaign: "",
    state: "",
    startDate: "",
    endDate: "",
    tag: "",
    dateRange: ""
  });
  
  // Função que retorna todas as tags únicas dos leads
  const getUniqueTags = () => {
    if (!leads) return [];
    
    // Obter todas as tags
    const allTags = leads.flatMap(lead => lead.tags || []);
    
    // Criar um objeto para rastrear tags únicas
    const uniqueTagsObj: Record<string, boolean> = {};
    allTags.forEach(tag => {
      if (tag.trim() !== "") {
        uniqueTagsObj[tag] = true;
      }
    });
    
    // Converter de volta para array e ordenar
    return Object.keys(uniqueTagsObj).sort();
  };
  
  // Função para configurar data inicial e final com base no período selecionado
  const handleDateRangeChange = (range: string) => {
    const today = new Date();
    let startDate = "";
    let endDate = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    
    switch(range) {
      case "today":
        startDate = today.toISOString().split('T')[0];
        break;
      case "last7days":
        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 7);
        startDate = last7Days.toISOString().split('T')[0];
        break;
      case "last30days":
        const last30Days = new Date(today);
        last30Days.setDate(today.getDate() - 30);
        startDate = last30Days.toISOString().split('T')[0];
        break;
      case "thisMonth":
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = thisMonth.toISOString().split('T')[0];
        break;
      case "lastMonth":
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        startDate = lastMonth.toISOString().split('T')[0];
        endDate = lastDayLastMonth.toISOString().split('T')[0];
        break;
      case "thisYear":
        const thisYear = new Date(today.getFullYear(), 0, 1);
        startDate = thisYear.toISOString().split('T')[0];
        break;
      case "custom":
        // Mantém as datas atuais para entrada manual
        return;
      default:
        // Limpa as datas
        startDate = "";
        endDate = "";
    }
    
    setFilters(prev => ({ ...prev, startDate, endDate, dateRange: range }));
  };
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [batchStatusValue, setBatchStatusValue] = useState("");
  const [batchSourceValue, setBatchSourceValue] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const csvLinkRef = useRef<HTMLAnchorElement>(null);
  const [importLoading, setImportLoading] = useState(false);

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

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const rows = content.split('\n');
        
        if (rows.length < 2) {
          toast({
            title: "Erro na importação",
            description: "O arquivo não contém dados válidos.",
            variant: "destructive",
          });
          return;
        }
        
        // Extract headers and normalize them
        const headers = rows[0]
          .split(',')
          .map(header => header.trim().toLowerCase());
        
        const requiredHeaders = ['nome', 'email'];
        const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
        
        if (missingHeaders.length > 0) {
          toast({
            title: "Erro na importação",
            description: `O arquivo não contém os cabeçalhos obrigatórios: ${missingHeaders.join(', ')}.`,
            variant: "destructive",
          });
          return;
        }
        
        // Process each row
        const leadsToImport: InsertLead[] = [];
        const errorRows: number[] = [];
        
        for (let i = 1; i < rows.length; i++) {
          if (!rows[i].trim()) continue;
          
          const values = rows[i].split(',');
          if (values.length !== headers.length) {
            errorRows.push(i);
            continue;
          }
          
          // Create lead object from CSV row
          try {
            const leadData: Record<string, any> = {};
            
            headers.forEach((header, index) => {
              const value = values[index]?.trim() || "";
              
              switch(header) {
                case 'nome':
                  leadData.name = value;
                  break;
                case 'email':
                  leadData.email = value;
                  break;
                case 'telefone':
                  leadData.phone = value;
                  break;
                case 'estado':
                  leadData.state = value;
                  break;
                case 'campanha':
                  leadData.campaign = value;
                  break;
                case 'origem':
                  leadData.source = value;
                  break;
                case 'status':
                  leadData.status = value || "Lead";
                  break;
                case 'tags':
                  leadData.tags = value ? value.split(';').map(tag => tag.trim()) : [];
                  break;
                case 'data_entrada':
                  try {
                    leadData.entryDate = value ? new Date(value).toISOString() : new Date().toISOString();
                  } catch (e) {
                    leadData.entryDate = new Date().toISOString();
                  }
                  break;
                case 'observacoes':
                  leadData.notes = value;
                  break;
              }
            });
            
            // Validate required fields
            if (!leadData.name || !leadData.email) {
              errorRows.push(i);
              continue;
            }
            
            // Set defaults for missing fields
            if (!leadData.status) leadData.status = "Lead";
            if (!leadData.source) leadData.source = "Favale";
            if (!leadData.tags) leadData.tags = [];
            if (!leadData.entryDate) leadData.entryDate = new Date().toISOString();
            
            leadsToImport.push(leadData as InsertLead);
          } catch (error) {
            console.error(`Erro ao processar linha ${i}:`, error);
            errorRows.push(i);
          }
        }
        
        // Report results
        if (leadsToImport.length === 0) {
          toast({
            title: "Erro na importação",
            description: "Nenhum lead válido encontrado no arquivo.",
            variant: "destructive",
          });
          return;
        }
        
        // Create each lead
        let successCount = 0;
        let errorCount = 0;
        
        for (const lead of leadsToImport) {
          try {
            await createLead(lead);
            successCount++;
          } catch (error) {
            console.error('Erro ao criar lead:', error);
            errorCount++;
          }
        }
        
        // Show results
        setImportDialogOpen(false);
        toast({
          title: "Importação concluída",
          description: `${successCount} leads importados com sucesso.${errorCount > 0 ? ` ${errorCount} leads com erro.` : ''}`,
          variant: successCount > 0 ? "default" : "destructive",
        });
        
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        toast({
          title: "Erro na importação",
          description: "Ocorreu um erro ao processar o arquivo.",
          variant: "destructive",
        });
      }
    };
    
    reader.onerror = () => {
      toast({
        title: "Erro na importação",
        description: "Erro ao ler o arquivo.",
        variant: "destructive",
      });
    };
    
    reader.readAsText(file);
    e.target.value = ''; // Reset the input
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
    
    // Advanced filters
    const matchesState = filters.state === "" || lead.state === filters.state;
    
    // Tag filter
    const matchesTag = filters.tag === "" || (lead.tags && lead.tags.includes(filters.tag));
    
    // Date filters
    let matchesDateRange = true;
    if (filters.startDate && filters.endDate) {
      const leadDate = new Date(lead.entryDate);
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      // Add one day to end date to include the end date itself
      endDate.setDate(endDate.getDate() + 1);
      
      matchesDateRange = leadDate >= startDate && leadDate < endDate;
    } else if (filters.startDate) {
      const leadDate = new Date(lead.entryDate);
      const startDate = new Date(filters.startDate);
      matchesDateRange = leadDate >= startDate;
    } else if (filters.endDate) {
      const leadDate = new Date(lead.entryDate);
      const endDate = new Date(filters.endDate);
      // Add one day to end date to include the end date itself
      endDate.setDate(endDate.getDate() + 1);
      matchesDateRange = leadDate < endDate;
    }
    
    return matchesSearch && matchesSource && matchesStatus && matchesCampaign && 
           matchesState && matchesDateRange && matchesTag;
  });

  // Check if there are active filters
  const hasActiveFilters = [
    filters.source,
    filters.status,
    filters.campaign,
    filters.state,
    filters.startDate,
    filters.endDate,
    filters.tag,
    filters.dateRange
  ].some(filter => filter !== "");
  
  // Count active filters
  const activeFilterCount = [
    filters.source,
    filters.status,
    filters.campaign,
    filters.state,
    filters.tag,
    (filters.startDate || filters.endDate || filters.dateRange) ? 1 : 0, // Count date range as one filter
  ].filter(Boolean).length;

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
          <button 
            className={`${hasActiveFilters 
              ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700' 
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700'} 
              border rounded-md px-4 py-2 text-sm 
              ${hasActiveFilters 
                ? 'text-primary-700 dark:text-primary-300' 
                : 'text-gray-700 dark:text-gray-300'} 
              hover:bg-primary-50 dark:hover:bg-primary-900/20 
              flex items-center transition-colors duration-200 relative`
            }
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
          >
            <span className={`material-icons text-sm mr-1 
              ${hasActiveFilters ? 'text-primary-600 dark:text-primary-400' : 'text-primary-400 dark:text-pink-400'}`}>
              filter_list
            </span>
            Filtrar
            {hasActiveFilters && (
              <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center dark:glow-xs">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button 
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center transition-colors duration-200"
            onClick={handleExportLeads}
            disabled={exportLoading || !filteredLeads || filteredLeads.length === 0}
          >
            <span className="material-icons text-sm mr-1 text-primary-400 dark:text-pink-400">{exportLoading ? 'hourglass_empty' : 'file_download'}</span>
            {exportLoading ? 'Exportando...' : 'Exportar'}
          </button>
          <button 
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center transition-colors duration-200"
            onClick={() => setImportDialogOpen(true)}
          >
            <span className="material-icons text-sm mr-1 text-primary-400 dark:text-pink-400">upload_file</span>
            Importar
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
        
        {/* Advanced filter panel */}
        {filterMenuOpen && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Filtros Avançados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Estado</label>
                <select 
                  className="w-full border dark:border-gray-700 rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
                  value={filters.state || ""}
                  onChange={(e) => setFilters({...filters, state: e.target.value})}
                >
                  <option value="">Todos</option>
                  <option value="SP">São Paulo</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="RS">Rio Grande do Sul</option>
                  <option value="PR">Paraná</option>
                  <option value="SC">Santa Catarina</option>
                  <option value="BA">Bahia</option>
                  <option value="DF">Distrito Federal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Data de Entrada</label>
                <div className="flex items-center space-x-2">
                  <input 
                    type="date" 
                    className="flex-1 border dark:border-gray-700 rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
                    value={filters.startDate || ""}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  />
                  <span className="text-gray-500 dark:text-gray-400">até</span>
                  <input 
                    type="date" 
                    className="flex-1 border dark:border-gray-700 rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
                    value={filters.endDate || ""}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tag</label>
                <select 
                  className="w-full border dark:border-gray-700 rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
                  value={filters.tag || ""}
                  onChange={(e) => setFilters({...filters, tag: e.target.value})}
                >
                  <option value="">Todas</option>
                  {getUniqueTags().map((tag, index) => (
                    <option key={index} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Período</label>
                <select 
                  className="w-full border dark:border-gray-700 rounded-md px-3 py-2 text-sm dark:bg-gray-800 dark:text-white transition-colors duration-200"
                  value={filters.dateRange || ""}
                  onChange={(e) => handleDateRangeChange(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="today">Hoje</option>
                  <option value="last7days">Últimos 7 dias</option>
                  <option value="last30days">Últimos 30 dias</option>
                  <option value="thisMonth">Este mês</option>
                  <option value="lastMonth">Mês passado</option>
                  <option value="thisYear">Este ano</option>
                  <option value="custom">Período personalizado</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button 
                  className="w-full bg-primary text-white rounded-md px-4 py-2 text-sm flex items-center justify-center hover:bg-primary/90 dark:glow-button-xs transition-all duration-200"
                  onClick={() => setFilters({ 
                    source: "", 
                    status: "", 
                    campaign: "", 
                    state: "", 
                    startDate: "", 
                    endDate: "",
                    tag: "",
                    dateRange: ""
                  })}
                >
                  <span className="material-icons text-sm mr-1">clear</span>
                  Limpar Filtros
                </button>
              </div>
            </div>
          </div>
        )}
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
      
      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Leads</DialogTitle>
            <DialogDescription>
              Importe leads a partir de um arquivo CSV. O arquivo deve seguir o seguinte formato:
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border dark:border-gray-700 mb-4 overflow-x-auto">
              <code className="text-xs">
                <span className="text-blue-600 dark:text-blue-400">nome</span>,
                <span className="text-blue-600 dark:text-blue-400">email</span>,
                <span className="text-blue-600 dark:text-blue-400">telefone</span>,
                <span className="text-blue-600 dark:text-blue-400">estado</span>,
                <span className="text-blue-600 dark:text-blue-400">campanha</span>,
                <span className="text-blue-600 dark:text-blue-400">origem</span>,
                <span className="text-blue-600 dark:text-blue-400">status</span>,
                <span className="text-blue-600 dark:text-blue-400">tags</span>,
                <span className="text-blue-600 dark:text-blue-400">data_entrada</span>,
                <span className="text-blue-600 dark:text-blue-400">observacoes</span>
              </code>
            </div>
            
            <ul className="space-y-2 text-sm">
              <li><span className="font-medium">nome</span>: Nome completo do lead (obrigatório)</li>
              <li><span className="font-medium">email</span>: Email do lead (obrigatório)</li>
              <li><span className="font-medium">telefone</span>: Número de telefone</li>
              <li><span className="font-medium">estado</span>: Sigla do estado (ex: SP, RJ)</li>
              <li><span className="font-medium">campanha</span>: Canal de origem (Instagram, Facebook, Email, Site, Indicação)</li>
              <li><span className="font-medium">origem</span>: Deve ser "Favale" ou "Pink"</li>
              <li><span className="font-medium">status</span>: Deve ser "Lead" ou "Aluno"</li>
              <li><span className="font-medium">tags</span>: Lista de tags separadas por ponto-e-vírgula (ex: "tag1;tag2;tag3")</li>
              <li><span className="font-medium">data_entrada</span>: Data no formato YYYY-MM-DD (ex: 2023-01-31)</li>
              <li><span className="font-medium">observacoes</span>: Notas adicionais</li>
            </ul>
            
            <div className="mt-6">
              <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload}
              />
              <button 
                className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors duration-200"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="material-icons text-3xl text-gray-400 mb-2">upload_file</span>
                <span className="text-gray-600 dark:text-gray-300">Clique para selecionar um arquivo CSV</span>
                <span className="text-gray-400 text-sm mt-1">ou arraste e solte aqui</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
