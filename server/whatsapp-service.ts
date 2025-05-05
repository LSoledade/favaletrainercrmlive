/**
 * Serviço WhatsApp API
 * Integra com a API oficial do WhatsApp para envio e recebimento de mensagens
 */

import axios from 'axios';
import { log } from './vite';
import { Lead } from '@shared/schema';

// Configurações da API do WhatsApp
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '6536281892435135';
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

// Interface para resposta da API
interface WhatsAppAPIResponse {
  messaging_product: string;
  contacts?: {
    input: string;
    wa_id: string;
  }[];
  messages?: {
    id: string;
  }[];
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

/**
 * Envia mensagem de texto via WhatsApp API
 */
export async function sendWhatsAppMessage(lead: Lead, message: string): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  if (!WHATSAPP_API_TOKEN) {
    log('WhatsApp API token não configurado', 'error');
    return { success: false, error: 'WhatsApp API token não configurado' };
  }

  if (!lead.phone) {
    return { success: false, error: 'Lead não possui número de telefone' };
  }

  // Formatar o número de telefone (remover caracteres não numéricos)
  const phoneNumber = lead.phone.replace(/\D/g, '');
  
  try {
    const response = await axios.post<WhatsAppAPIResponse>(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`
        }
      }
    );

    if (response.data.messages && response.data.messages.length > 0) {
      const messageId = response.data.messages[0].id;
      return { success: true, messageId };
    }
    
    return { success: true };
  } catch (error) {
    log(`Erro ao enviar mensagem WhatsApp: ${JSON.stringify(error)}`, 'error');
    let errorMessage = 'Erro desconhecido ao enviar mensagem';
    
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      errorMessage = error.response.data.error.message || errorMessage;
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Envia uma mensagem de template WhatsApp
 * Templates são mensagens pré-aprovadas pela Meta
 */
export async function sendWhatsAppTemplate(lead: Lead, templateName: string, language: string = 'pt_BR'): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  if (!WHATSAPP_API_TOKEN) {
    return { success: false, error: 'WhatsApp API token não configurado' };
  }

  if (!lead.phone) {
    return { success: false, error: 'Lead não possui número de telefone' };
  }

  // Formatar o número de telefone (remover caracteres não numéricos)
  const phoneNumber = lead.phone.replace(/\D/g, '');
  
  try {
    const response = await axios.post<WhatsAppAPIResponse>(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language
          }
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`
        }
      }
    );

    if (response.data.messages && response.data.messages.length > 0) {
      const messageId = response.data.messages[0].id;
      return { success: true, messageId };
    }
    
    return { success: true };
  } catch (error) {
    log(`Erro ao enviar template WhatsApp: ${JSON.stringify(error)}`, 'error');
    let errorMessage = 'Erro desconhecido ao enviar mensagem';
    
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      errorMessage = error.response.data.error.message || errorMessage;
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Verifica se existe conexão com a API do WhatsApp
 */
export async function checkWhatsAppConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!WHATSAPP_API_TOKEN) {
    return { success: false, error: 'WhatsApp API token não configurado' };
  }
  
  try {
    // Tenta obter informações do número de telefone para verificar a conexão
    const response = await axios.get(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`
        }
      }
    );
    
    return { success: true };
  } catch (error) {
    log(`Erro ao verificar conexão WhatsApp: ${JSON.stringify(error)}`, 'error');
    let errorMessage = 'Erro ao verificar conexão com a API do WhatsApp';
    
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      errorMessage = error.response.data.error.message || errorMessage;
    }
    
    return { success: false, error: errorMessage };
  }
}
