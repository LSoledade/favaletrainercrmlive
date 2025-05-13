/**
 * Serviço WhatsApp API
 * Integra com a API oficial do WhatsApp e Evolution API para envio e recebimento de mensagens
 */

import axios from 'axios';
import { log } from './vite';
import { Lead } from '@shared/schema';

// Configurações da API do WhatsApp
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '6536281892435135';
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

// Evolution API configs
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evolution-api.example.com/api/v1';
const EVOLUTION_API_TOKEN = process.env.EVOLUTION_API_TOKEN || '7f3b2c4d1e6a8f0b9d3c5e7a2f4b6d8c';
const EVOLUTION_API_INSTANCE = process.env.EVOLUTION_API_INSTANCE || 'default';

// Logs para facilitar depuração
log(`Usando EVOLUTION_API_URL: ${EVOLUTION_API_URL}`, 'info');

// Interface para resposta da API WhatsApp Oficial
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

// Interface para resposta da Evolution API
interface EvolutionAPIResponse {
  key?: {
    fromMe: boolean;
    remoteJid: string;
    id: string;
  };
  status?: string;
  message?: string;
  error?: string;
  info?: any;
}

// Interface compartilhada para retorno das funções de WhatsApp
interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

/**
 * Envia mensagem de texto via Evolution API
 */
export async function sendWhatsAppMessage(lead: Lead, message: string): Promise<WhatsAppResult> {
  const phoneNumber = formatPhoneNumber(lead.phone);
  if (!phoneNumber) {
    return { success: false, error: `Número de telefone inválido: ${lead.phone}` };
  }

  log(`Enviando mensagem Evolution API para ${lead.name} (${phoneNumber})`, 'info');

  try {
    // Endpoint de texto da Evolution API
    const endpoint = `${EVOLUTION_API_URL}/message/text/${EVOLUTION_API_INSTANCE}`;
    
    // Payload conforme documentação da Evolution API
    const payload = {
      number: phoneNumber,
      options: {
        delay: 1200, // Delay em ms (recomendado pela Evolution API)
        presence: "composing" // Mostra "digitando..." antes de enviar
      },
      textMessage: {
        text: message
      }
    };

    log(`Requisição para ${endpoint}`, 'info');
    
    const response = await axios.post(
      endpoint,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_TOKEN
        },
        timeout: 15000 // 15 segundos
      }
    );

    if (response.status >= 200 && response.status < 300 && response.data) {
      log(`Mensagem enviada com sucesso via Evolution API: ${JSON.stringify(response.data)}`, 'info');
      
      // Extrair o ID da mensagem da resposta
      const messageId = response.data.key?.id || 
                        response.data.messageId || 
                        response.data.id || 
                        `temp_${Date.now()}`;
      
      return { 
        success: true, 
        messageId, 
        details: response.data 
      };
    }
    
    log(`Resposta da API: ${JSON.stringify(response.data)}`, 'warn');
    return { success: true, details: response.data };
  } catch (error) {
    log(`Erro ao enviar mensagem Evolution API: ${error}`, 'error');
    let errorMessage = 'Erro desconhecido ao enviar mensagem';
    let details = null;

    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage = error.response.data?.error || 
                      error.response.data?.message || 
                      `Erro ${error.response.status}: ${error.message}`;
        details = error.response.data;
        log(`Detalhes do erro: ${JSON.stringify(details)}`, 'error');
      } else if (error.request) {
        errorMessage = 'Não foi possível conectar ao servidor Evolution API. Verifique sua conexão.';
      } else {
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
export async function sendWhatsAppTemplate(lead: Lead, templateName: string, language: string = 'pt_BR'): Promise<WhatsAppResult> {
  if (!WHATSAPP_API_TOKEN) {
    log('WhatsApp API token não configurado', 'error');
    return { success: false, error: 'WhatsApp API token não configurado' };
  }

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
        errorMessage = error.response.data?.error?.message || 
                       error.response.data?.message || 
                       `Erro ${error.response.status}: ${error.message}`;
        details = error.response.data;
      } else if (error.request) {
        errorMessage = 'Não foi possível conectar ao servidor do WhatsApp. Verifique sua conexão.';
      } else {
        errorMessage = `Erro na configuração da requisição: ${error.message}`;
      }
    }
    
    return { success: false, error: errorMessage, details };
  }
}

/**
 * Checa conexão com Evolution API (simples: faz um request GET e espera 200)
 */
export async function checkWhatsAppConnection(): Promise<WhatsAppResult> {
  try {
    // A Evolution API não tem um endpoint padrão de healthcheck, então testamos um envio simulado (ou GET se suportado)
    const response = await axios.get(
      EVOLUTION_API_URL,
      {
        headers: {
          'Authorization': `Bearer ${EVOLUTION_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    if (response.status === 200) {
      return {
        success: true,
        details: {
          name: 'Evolution API',
          phone: 'Conexão OK',
          quality: 'N/A'
        }
      };
    }
    return { success: false, error: 'Resposta inesperada da Evolution API', details: response.data };
  } catch (error) {
    log(`Erro ao verificar conexão Evolution API: ${JSON.stringify(error)}`, 'error');
    let errorMessage = 'Erro ao verificar conexão com a Evolution API';
    let details = null;
    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage = error.response.data?.error || error.response.data?.message || `Erro ${error.response.status}: ${error.message}`;
        details = error.response.data;
      } else if (error.request) {
        errorMessage = 'Não foi possível conectar ao servidor Evolution API. Verifique sua conexão.';
      } else {
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
