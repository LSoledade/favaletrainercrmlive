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
  details?: any;
}> {
  if (!WHATSAPP_API_TOKEN) {
    log('WhatsApp API token não configurado', 'error');
    return { success: false, error: 'WhatsApp API token não configurado' };
  }

  // Formatar o número de telefone
  const phoneNumber = formatPhoneNumber(lead.phone);
  if (!phoneNumber) {
    return { success: false, error: `Número de telefone inválido: ${lead.phone}` };
  }
  
  log(`Enviando mensagem WhatsApp para ${lead.name} (${phoneNumber})`, 'info');
  
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
        },
        timeout: 10000 // 10 segundos de timeout
      }
    );

    if (response.data.messages && response.data.messages.length > 0) {
      const messageId = response.data.messages[0].id;
      log(`Mensagem enviada com sucesso. ID: ${messageId}`, 'info');
      return { success: true, messageId, details: response.data };
    }
    
    log(`Mensagem enviada, mas sem ID retornado`, 'warn');
    return { success: true, details: response.data };
  } catch (error) {
    log(`Erro ao enviar mensagem WhatsApp: ${JSON.stringify(error)}`, 'error');
    let errorMessage = 'Erro desconhecido ao enviar mensagem';
    let details = null;
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // A requisição foi feita e o servidor respondeu com um status de erro
        errorMessage = error.response.data?.error?.message || 
                       error.response.data?.message || 
                       `Erro ${error.response.status}: ${error.message}`;
        details = error.response.data;
      } else if (error.request) {
        // A requisição foi feita mas não recebeu resposta
        errorMessage = 'Não foi possível conectar ao servidor do WhatsApp. Verifique sua conexão.';
      } else {
        // Algo aconteceu na configuração da requisição que causou o erro
        errorMessage = `Erro na configuração da requisição: ${error.message}`;
      }
    }
    
    return { success: false, error: errorMessage, details };
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
  details?: any;
}> {
  if (!WHATSAPP_API_TOKEN) {
    log('WhatsApp API token não configurado', 'error');
    return { success: false, error: 'WhatsApp API token não configurado' };
  }

  // Formatar o número de telefone
  const phoneNumber = formatPhoneNumber(lead.phone);
  if (!phoneNumber) {
    return { success: false, error: `Número de telefone inválido: ${lead.phone}` };
  }
  
  log(`Enviando template WhatsApp "${templateName}" para ${lead.name} (${phoneNumber})`, 'info');
  
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
        },
        timeout: 10000 // 10 segundos de timeout
      }
    );

    if (response.data.messages && response.data.messages.length > 0) {
      const messageId = response.data.messages[0].id;
      log(`Template enviado com sucesso. ID: ${messageId}`, 'info');
      return { success: true, messageId, details: response.data };
    }
    
    log(`Template enviado, mas sem ID retornado`, 'warn');
    return { success: true, details: response.data };
  } catch (error) {
    log(`Erro ao enviar template WhatsApp: ${JSON.stringify(error)}`, 'error');
    let errorMessage = 'Erro desconhecido ao enviar mensagem';
    let details = null;
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // A requisição foi feita e o servidor respondeu com um status de erro
        errorMessage = error.response.data?.error?.message || 
                       error.response.data?.message || 
                       `Erro ${error.response.status}: ${error.message}`;
        details = error.response.data;
      } else if (error.request) {
        // A requisição foi feita mas não recebeu resposta
        errorMessage = 'Não foi possível conectar ao servidor do WhatsApp. Verifique sua conexão.';
      } else {
        // Algo aconteceu na configuração da requisição que causou o erro
        errorMessage = `Erro na configuração da requisição: ${error.message}`;
      }
    }
    
    return { success: false, error: errorMessage, details };
  }
}

/**
 * Verifica se existe conexão com a API do WhatsApp
 */
export async function checkWhatsAppConnection(): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> {
  if (!WHATSAPP_API_TOKEN) {
    log('WhatsApp API token não configurado ou inválido', 'error');
    return { 
      success: false, 
      error: 'WhatsApp API token não configurado. Configure o token no arquivo .env'
    };
  }
  
  try {
    // Tenta obter informações do número de telefone para verificar a conexão
    log(`Verificando conexão com WhatsApp: ${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}`, 'info');
    
    const response = await axios.get(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}?fields=verified_name,display_phone_number,quality_rating`,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 segundos de timeout
      }
    );
    
    if (!response.data || !response.data.id) {
      return { 
        success: false, 
        error: 'Resposta da API sem informações do número',
        details: response.data
      };
    }
    
    // Retorna sucesso com detalhes do número
    log(`Conexão com WhatsApp estabelecida: ${JSON.stringify(response.data)}`, 'info');
    return { 
      success: true,
      details: {
        name: response.data.verified_name || 'Conta WhatsApp',
        phone: response.data.display_phone_number || WHATSAPP_PHONE_ID,
        quality: response.data.quality_rating
      }
    };
  } catch (error) {
    log(`Erro ao verificar conexão WhatsApp: ${JSON.stringify(error)}`, 'error');
    let errorMessage = 'Erro ao verificar conexão com a API do WhatsApp';
    let details = null;
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // A requisição foi feita e o servidor respondeu com um status de erro
        errorMessage = error.response.data?.error?.message || 
                       error.response.data?.message || 
                       `Erro ${error.response.status}: ${error.message}`;
        details = error.response.data;
        
        // Verificar se é um erro de token expirado
        if (error.response.status === 401 && 
            (errorMessage.includes('expired') || errorMessage.includes('Session has expired'))) {
          log('Token de acesso do WhatsApp expirado. É necessário atualizá-lo.', 'error');
          errorMessage = 'Token de acesso expirado. Entre em contato com o administrador para atualizar o token.';
        }
      } else if (error.request) {
        // A requisição foi feita mas não recebeu resposta
        errorMessage = 'Não foi possível conectar ao servidor do WhatsApp. Verifique sua conexão.';
      } else {
        // Algo aconteceu na configuração da requisição que causou o erro
        errorMessage = `Erro na configuração da requisição: ${error.message}`;
      }
    }
    
    return { success: false, error: errorMessage, details };
  }
}

/**
 * Formata o número de telefone para o formato internacional
 * @param phoneNumber Número de telefone a ser formatado
 * @returns Número formatado ou null se inválido
 */
export function formatPhoneNumber(phoneNumber: string | null | undefined): string | null {
  if (!phoneNumber) return null;
  
  // Remover todos os caracteres não numéricos
  let digits = phoneNumber.replace(/\D/g, '');
  
  // Se não começar com código de país, assumir Brasil (+55)
  if (!digits.startsWith('55') && digits.length <= 11) {
    digits = '55' + digits;
  }
  
  // Verificar o tamanho mínimo (código de país + DDD + número)
  // Brasil: 55 + 2 dígitos (DDD) + 8-9 dígitos (número)
  if (digits.length < 12) {
    log(`Número de telefone inválido: ${phoneNumber} (formatado: ${digits})`, 'warn');
    return null;
  }
  
  return digits;
}
