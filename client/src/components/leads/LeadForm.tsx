import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Lead, InsertLead, leadValidationSchema } from "@shared/schema";
import TagInput from "./TagInput";

interface LeadFormProps {
  lead?: Lead | null;
  onSubmit: (data: InsertLead) => void;
  onCancel: () => void;
}

export default function LeadForm({ lead, onSubmit, onCancel }: LeadFormProps) {
  const [tags, setTags] = useState<string[]>(lead?.tags || []);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    setValue, 
    reset
  } = useForm<InsertLead>({
    resolver: zodResolver(leadValidationSchema),
    defaultValues: lead || {
      entryDate: new Date(),
      name: "",
      email: "",
      phone: "",
      state: "",
      campaign: "",
      tags: [],
      source: "",
      status: "Lead",
      notes: ""
    }
  });
  
  // Update form when lead changes
  useEffect(() => {
    if (lead) {
      // Para edição, formatar a data no formato YYYY-MM-DD para o campo date
      const entryDate = lead.entryDate instanceof Date
        ? lead.entryDate
        : new Date(lead.entryDate);
        
      const formattedDate = entryDate.toISOString().split('T')[0];
      
      reset({
        ...lead,
        entryDate: formattedDate // Apenas para exibição no input type="date"
      } as any);
      setTags(lead.tags || []);
    } else {
      // Para novo lead, usar a data atual formatada
      const today = new Date().toISOString().split('T')[0];
      
      reset({
        entryDate: today, // Apenas para exibição no input type="date"
        name: "",
        email: "",
        phone: "",
        state: "",
        campaign: "",
        tags: [],
        source: "",
        status: "Lead",
        notes: ""
      } as any);
      setTags([]);
    }
  }, [lead, reset]);
  
  const onFormSubmit = (data: any) => {
    try {
      // Ensure entryDate is properly formatted (ISO string format) for the API
      const formData: InsertLead = {
        ...data,
        entryDate: data.entryDate instanceof Date 
          ? data.entryDate 
          : new Date(data.entryDate),
        tags
      };
      
      console.log('Submitting form data:', formData);
      onSubmit(formData);
    } catch (error) {
      console.error('Error formatting lead data:', error);
    }
  };
  
  // Handle tags updates
  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
    setValue('tags', newTags);
  };
  
  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-foreground">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Data de Entrada</label>
          <input 
            type="date" 
            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.entryDate ? "border-red-300" : ""}`}
            {...register("entryDate")}
          />
          {errors.entryDate && (
            <p className="mt-1 text-xs text-red-600">{errors.entryDate.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nome</label>
          <input 
            type="text" 
            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.name ? "border-red-300" : ""
            }`}
            {...register("name")}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">E-mail</label>
          <input 
            type="email" 
            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.email ? "border-red-300" : ""
            }`}
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Telefone</label>
          <input 
            type="tel" 
            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.phone ? "border-red-300" : ""
            }`}
            {...register("phone")}
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Estado</label>
          <select 
            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.state ? "border-red-300" : ""
            }`}
            {...register("state")}
          >
            <option value="">Selecione</option>
            <option value="AC">Acre</option>
            <option value="AL">Alagoas</option>
            <option value="AP">Amapá</option>
            <option value="AM">Amazonas</option>
            <option value="BA">Bahia</option>
            <option value="CE">Ceará</option>
            <option value="DF">Distrito Federal</option>
            <option value="ES">Espírito Santo</option>
            <option value="GO">Goiás</option>
            <option value="MA">Maranhão</option>
            <option value="MT">Mato Grosso</option>
            <option value="MS">Mato Grosso do Sul</option>
            <option value="MG">Minas Gerais</option>
            <option value="PA">Pará</option>
            <option value="PB">Paraíba</option>
            <option value="PR">Paraná</option>
            <option value="PE">Pernambuco</option>
            <option value="PI">Piauí</option>
            <option value="RJ">Rio de Janeiro</option>
            <option value="RN">Rio Grande do Norte</option>
            <option value="RS">Rio Grande do Sul</option>
            <option value="RO">Rondônia</option>
            <option value="RR">Roraima</option>
            <option value="SC">Santa Catarina</option>
            <option value="SP">São Paulo</option>
            <option value="SE">Sergipe</option>
            <option value="TO">Tocantins</option>
          </select>
          {errors.state && (
            <p className="mt-1 text-xs text-red-600">{errors.state.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Campanha</label>
          <select 
            className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${
              errors.campaign ? "border-red-300" : ""
            }`}
            {...register("campaign")}
          >
            <option value="">Selecione</option>
            <option value="Instagram">Instagram</option>
            <option value="Facebook">Facebook</option>
            <option value="Email">E-mail</option>
            <option value="Site">Site</option>
            <option value="Indicação">Indicação</option>
          </select>
          {errors.campaign && (
            <p className="mt-1 text-xs text-red-600">{errors.campaign.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Origem</label>
          <div className="flex mt-1 space-x-4">
            <label className="inline-flex items-center">
              <input 
                type="radio" 
                value="Favale" 
                className="text-primary"
                {...register("source")}
              />
              <span className="ml-2 text-sm">Favale</span>
            </label>
            <label className="inline-flex items-center">
              <input 
                type="radio" 
                value="Pink" 
                className="text-primary"
                {...register("source")}
              />
              <span className="ml-2 text-sm">Pink</span>
            </label>
          </div>
          {errors.source && (
            <p className="mt-1 text-xs text-red-600">{errors.source.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Status</label>
          <div className="flex mt-1 space-x-4">
            <label className="inline-flex items-center">
              <input 
                type="radio" 
                value="Lead" 
                className="text-primary"
                {...register("status")}
              />
              <span className="ml-2 text-sm">Lead</span>
            </label>
            <label className="inline-flex items-center">
              <input 
                type="radio" 
                value="Aluno" 
                className="text-primary"
                {...register("status")}
              />
              <span className="ml-2 text-sm">Aluno</span>
            </label>
          </div>
          {errors.status && (
            <p className="mt-1 text-xs text-red-600">{errors.status.message}</p>
          )}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tags</label>
        <TagInput tags={tags} setTags={handleTagsChange} />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Observações</label>
        <textarea 
          className="w-full border rounded-md px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-primary"
          {...register("notes")}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <button 
          type="button" 
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          className="px-4 py-2 bg-primary text-white rounded-md text-sm flex items-center hover:bg-primary/90 dark:glow-button-sm transition-all duration-200"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="material-icons text-sm mr-1">hourglass_empty</span>
              Salvando...
            </>
          ) : (
            <>Salvar</>
          )}
        </button>
      </div>
    </form>
  );
}
