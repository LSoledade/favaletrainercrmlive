import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Lead } from "@shared/schema";
import { useWhatsappContext } from "@/context/WhatsappContext";

export default function WhatsappPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const { openWhatsappChat } = useWhatsappContext();

  // Buscar todos os leads
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["/api/leads"],
  });

  // Filtrar leads com base na pesquisa
  const filteredLeads = leads.filter((lead: Lead) => {
    const matchesSearch = searchQuery === "" ||
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.phone && lead.phone.includes(searchQuery)) ||
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (selectedTab === "all") return matchesSearch;
    return matchesSearch && lead.status.toLowerCase() === selectedTab.toLowerCase();
  });

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">WhatsApp</CardTitle>
        <CardDescription>
          Gerencie suas conversas de WhatsApp com leads e clientes.
        </CardDescription>
        <div className="flex items-center justify-between mt-4">
          <div className="flex-1 max-w-md">
            <Input 
              placeholder="Pesquisar por nome, telefone ou email" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Tabs
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="ml-4">
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="novo">Novos</TabsTrigger>
              <TabsTrigger value="contatado">Contatados</TabsTrigger>
              <TabsTrigger value="qualificado">Qualificados</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead: Lead) => (
                <Card key={lead.id} className="overflow-hidden border hover:border-primary hover:shadow-md transition-all duration-200">
                  <CardContent className="p-0">
                    <div className="p-4 flex items-start space-x-4">
                      <Avatar className="h-12 w-12 mt-1 bg-secondary">
                        <AvatarFallback className="font-semibold text-white">
                          {lead.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1 overflow-hidden">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold truncate">{lead.name}</h3>
                          <Badge 
                            variant={lead.status === 'novo' ? 'default' : 
                                    lead.status === 'qualificado' ? 'success' : 'secondary'}
                            className="ml-2 text-[10px]">
                            {lead.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.phone || "Sem telefone"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.email || "Sem email"}
                        </p>
                        <Button 
                          variant="outline" 
                          className="mt-2 w-full text-xs h-8 bg-secondary/10 hover:bg-secondary/20 border-secondary/30"
                          onClick={() => openWhatsappChat(lead)}
                        >
                          <span className="material-icons text-sm mr-1">chat</span>
                          Iniciar Conversa
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full p-8 text-center">
                <p className="text-muted-foreground">Nenhum lead encontrado.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
