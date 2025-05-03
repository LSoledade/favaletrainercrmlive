import { useState, useEffect } from "react";
import { Lead } from "@shared/schema";
import { useLeadContext } from "@/context/LeadContext";
import { formatDate } from "@/utils/formatters";

interface LeadTableProps {
  leads: Lead[];
  isLoading: boolean;
  onDelete: (lead: Lead) => void;
}

export default function LeadTable({ leads, isLoading, onDelete }: LeadTableProps) {
  const { 
    setSelectedLead, 
    setIsDialogOpen,
    selectedLeadIds,
    setSelectedLeadIds 
  } = useLeadContext();
  const [currentPage, setCurrentPage] = useState(1);
  const leadsPerPage = 10;
  
  const handleEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDialogOpen(true);
  };
  
  const handleSelectLead = (leadId: number, checked: boolean) => {
    if (checked) {
      setSelectedLeadIds([...selectedLeadIds, leadId]);
    } else {
      setSelectedLeadIds(selectedLeadIds.filter(id => id !== leadId));
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = currentLeads.map(lead => lead.id);
      setSelectedLeadIds(allIds);
    } else {
      setSelectedLeadIds([]);
    }
  };
  
  // Calculate pagination
  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const currentLeads = leads.slice(indexOfFirstLead, indexOfLastLead);
  const totalPages = Math.ceil(leads.length / leadsPerPage);
  
  // Generate page numbers for pagination
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 || 
      i === totalPages || 
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pageNumbers.push(i);
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      pageNumbers.push('...');
    }
  }
  
  // Remove duplicate ellipses
  const displayPageNumbers = pageNumbers.filter((number, index, self) => {
    return number === '...' ? self.indexOf(number) === index : true;
  });
  
  const getStatusBadgeClasses = (status: string) => {
    return status === "Aluno" 
      ? "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
      : "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800";
  };
  
  const getSourceBadgeClasses = (source: string) => {
    return source === "Favale" 
      ? "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-primary"
      : "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-secondary";
  };
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input 
                  type="checkbox" 
                  className="mr-2"
                  checked={currentLeads.length > 0 && selectedLeadIds.length === currentLeads.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data de Entrada
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Telefone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Campanha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tags
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Origem
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentLeads.length > 0 ? (
              currentLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      checked={selectedLeadIds.includes(lead.id)}
                      onChange={(e) => handleSelectLead(lead.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(lead.entryDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">{lead.name}</div>
                    <div className="text-sm text-gray-500">{lead.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {lead.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {lead.state}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {lead.campaign}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {lead.tags && lead.tags.map((tag, index) => (
                        <span 
                          key={index} 
                          className="bg-primary-light text-primary-dark text-xs px-2 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getSourceBadgeClasses(lead.source)}>
                      {lead.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadgeClasses(lead.status)}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button 
                        className="text-indigo-600 hover:text-indigo-900"
                        onClick={() => handleEdit(lead)}
                        title="Editar"
                      >
                        <span className="material-icons text-sm">edit</span>
                      </button>
                      <button 
                        className="text-red-600 hover:text-red-900"
                        onClick={() => onDelete(lead)}
                        title="Excluir"
                      >
                        <span className="material-icons text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-6 py-4 text-center text-sm text-gray-500">
                  Nenhum lead encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {leads.length > 0 && (
        <div className="px-6 py-4 flex items-center justify-between border-t">
          <div className="flex-1 flex justify-between sm:hidden">
            <button 
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </button>
            <button 
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Próximo
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{indexOfFirstLead + 1}</span> a{" "}
                <span className="font-medium">
                  {Math.min(indexOfLastLead, leads.length)}
                </span>{" "}
                de <span className="font-medium">{leads.length}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button 
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <span className="material-icons text-sm">chevron_left</span>
                </button>
                {displayPageNumbers.map((number, index) => (
                  <button
                    key={index}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                      number === currentPage
                        ? "bg-primary text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => number !== '...' && setCurrentPage(number as number)}
                    disabled={number === '...'}
                  >
                    {number}
                  </button>
                ))}
                <button 
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <span className="material-icons text-sm">chevron_right</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
