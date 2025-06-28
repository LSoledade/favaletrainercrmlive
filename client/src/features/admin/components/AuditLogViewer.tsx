import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/data-display/Card"; // Updated path
import { Button } from "@/components/inputs/Button"; // Updated path
import { Input } from "@/components/inputs/InputField"; // Updated path
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/inputs/select"; // Updated path
import { Loader2, Search, RefreshCw, FileDown } from "lucide-react";
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { getSupabaseQueryFn } from '@/lib/queryClient'; // Correct

interface AuditLog {
  id?: number;
  timestamp: string;
  type: string;
  user_id: string | number;
  username: string;
  ip: string;
  details: Record<string, unknown> | null; // Updated
}

export default function AuditLogViewer() {
  const [filter, setFilter] = useState<string>('');
  const [eventType, setEventType] = useState<string>('');
  const [limit, setLimit] = useState<number>(100);

  const { data: logs, isLoading, isError, refetch } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs', limit],
    queryFn: getSupabaseQueryFn({
      functionName: 'audit-log',
      params: { count: limit.toString() },
      on401: 'throw',
    }),
  });

  const exportToCSV = () => {
    if (!logs) return;
    const headers = ['Data e Hora', 'Tipo de Evento', 'Usuário', 'ID do Usuário', 'IP', 'Detalhes'];
    const rows = logs
      .filter(filterLog)
      .map(log => [
        format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: pt }),
        log.type, log.username, log.user_id, log.ip, JSON.stringify(log.details)
      ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `logs-auditoria-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filterLog = (log: AuditLog) => {
    if (eventType && eventType !== 'all' && log.type !== eventType) return false;
    if (filter) {
      const searchLower = filter.toLowerCase();
      return (
        log.username.toLowerCase().includes(searchLower) ||
        log.type.toLowerCase().includes(searchLower) ||
        (log.ip && log.ip.toLowerCase().includes(searchLower)) || // Check if log.ip exists
        JSON.stringify(log.details).toLowerCase().includes(searchLower)
      );
    }
    return true;
  };

  const formatEventType = (type: string) => {
    const eventTypes: Record<string, string> = {
      LOGIN_SUCCESS: 'Login Sucesso', LOGIN_FAILURE: 'Falha Login', LOGOUT: 'Logout',
      USER_CREATED: 'Usuário Criado', USER_UPDATED: 'Usuário Atualizado', USER_DELETED: 'Usuário Excluído',
      LEAD_CREATED: 'Lead Criado', LEAD_UPDATED: 'Lead Atualizado', LEAD_DELETED: 'Lead Excluído',
      LEAD_BATCH_UPDATE: 'Leads (Lote)', LEAD_BATCH_DELETE: 'Leads Excluídos (Lote)'
    };
    return eventTypes[type] || type;
  };

  const uniqueEventTypes = logs ? [...new Set(logs.map(log => log.type))] : [];
  const filteredLogs = logs?.filter(filterLog) || [];

  if (isError) {
    return (
      <Card className="w-full"><CardHeader><CardTitle>Logs de Auditoria</CardTitle><CardDescription>Registro de atividades do sistema</CardDescription></CardHeader>
        <CardContent><div className="flex items-center justify-center p-6 text-red-500">Erro ao carregar os logs.</div></CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader><CardTitle>Logs de Auditoria</CardTitle><CardDescription>Registro de atividades do sistema</CardDescription></CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Input placeholder="Pesquisar logs..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-10" />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Tipo de Evento" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem>{[...uniqueEventTypes].map(type => (<SelectItem key={type} value={type}>{formatEventType(type)}</SelectItem>))}</SelectContent>
          </Select>
          <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
            <SelectTrigger className="w-full md:w-[150px]"><SelectValue placeholder="Limite" /></SelectTrigger>
            <SelectContent>
              {[50, 100, 200, 500, 1000].map(val => <SelectItem key={val} value={val.toString()}>{val} registros</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} title="Atualizar"><RefreshCw className="h-4 w-4 mr-2" />Atualizar</Button>
            <Button variant="outline" onClick={exportToCSV} title="Exportar CSV"><FileDown className="h-4 w-4 mr-2" />Exportar</Button>
          </div>
        </div>

        {isLoading ? <div className="flex justify-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        : filteredLogs.length === 0 ? <div className="text-center p-6 text-gray-500">Nenhum log encontrado.</div>
        : (
          <div className="rounded-md border overflow-hidden"><div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800"><tr>
                {['Data e Hora', 'Tipo de Evento', 'Usuário', 'IP', 'Detalhes'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y dark:divide-gray-700">
                {filteredLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 align-top">{format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: pt })}</td>
                    <td className="px-4 py-3 align-top">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.type.includes('LOGIN_FAILURE') ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                        log.type.includes('DELETED') ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                        log.type.includes('CREATED') ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        log.type.includes('UPDATED') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>{formatEventType(log.type)}</span>
                    </td>
                    <td className="px-4 py-3 align-top">{log.username}</td>
                    <td className="px-4 py-3 align-top">{log.ip}</td>
                    <td className="px-4 py-3 align-top"><div className="max-w-xs whitespace-normal break-words">
                      {Object.entries(log.details || {}).map(([key, value]) => (<div key={key} className="mb-1"><span className="font-medium">{key}:</span> {typeof value === 'object' ? JSON.stringify(value) : String(value)}</div>))}
                    </div></td>
                  </tr>))}
              </tbody></table>
          </div></div>)}
        <div className="mt-4 text-sm text-gray-500">Mostrando {filteredLogs.length} de {logs?.length || 0} registros</div>
      </CardContent>
    </Card>
  );
}
