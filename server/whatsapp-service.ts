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
 * Checa conexão com Evolution API
 * Verifica o status da instância usando o endpoint de instância da Evolution API
 */
export async function checkWhatsAppConnection(): Promise<WhatsAppResult> {
  try {
    // Para ambientes de produção, usar a URL real da sua Evolution API
    // Se estamos em ambiente de desenvolvimento e sem URL definida, tentamos simular uma resposta positiva
    if (EVOLUTION_API_URL.includes('example.com') && process.env.NODE_ENV === 'development') {
      log('Ambiente de desenvolvimento detectado. Simulando resposta da Evolution API.', 'info');
      return {
        success: true,
        details: {
          name: 'Evolution API (Simulação)',
          phone: '+5511987654321',
          instance: EVOLUTION_API_INSTANCE,
          status: 'CONNECTED',
          qrcode: null
        }
      };
    }

    // Endpoint específico para verificar o status da instância
    const statusEndpoint = `${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_API_INSTANCE}`;
    
    log(`Verificando conexão com a Evolution API: ${statusEndpoint}`, 'info');
    
    const response = await axios.get(
      statusEndpoint,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_TOKEN
        },
        timeout: 15000
      }
    );

    if (response.status >= 200 && response.status < 300) {
      log(`Resposta Evolution API: ${JSON.stringify(response.data)}`, 'info');
      
      // Verificar o estado da conexão na resposta
      const state = response.data?.state || response.data?.status;
      const connected = state === 'CONNECTED' || state === 'ONLINE' || state === true;
      
      if (connected) {
        return {
          success: true,
          details: {
            name: 'Evolution API',
            phone: response.data?.phone || 'Conexão OK',
            instance: EVOLUTION_API_INSTANCE,
            status: state,
            qrcode: response.data?.qrcode || null
          }
        };
      } else {
        return { 
          success: false, 
          error: `WhatsApp não conectado. Estado: ${state}`, 
          details: response.data
        };
      }
    }
    
    return { 
      success: false, 
      error: 'Resposta inesperada da Evolution API', 
      details: response.data 
    };
  } catch (error) {
    log(`Erro ao verificar conexão Evolution API: ${error}`, 'error');
    let errorMessage = 'Erro ao verificar conexão com a Evolution API';
    let details = null;
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage = error.response.data?.error || 
                      error.response.data?.message || 
                      `Erro ${error.response.status}: ${error.message}`;
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
 * Envia imagem via Evolution API
 */
export async function sendWhatsAppImage(
  lead: Lead, 
  imageUrl: string, 
  caption: string = ''
): Promise<WhatsAppResult> {
  const phoneNumber = formatPhoneNumber(lead.phone);
  if (!phoneNumber) {
    return { success: false, error: `Número de telefone inválido: ${lead.phone}` };
  }

  log(`Enviando imagem Evolution API para ${lead.name} (${phoneNumber})`, 'info');

  try {
    // Endpoint de imagem da Evolution API
    const endpoint = `${EVOLUTION_API_URL}/message/image/${EVOLUTION_API_INSTANCE}`;
    
    // Payload conforme documentação da Evolution API
    const payload = {
      number: phoneNumber,
      options: {
        delay: 1200,
        presence: "composing" 
      },
      imageMessage: {
        image: imageUrl, // URL da imagem
        caption: caption  // Legenda opcional
      }
    };

    log(`Requisição de imagem para ${endpoint}`, 'info');
    
    const response = await axios.post(
      endpoint,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_TOKEN
        },
        timeout: 20000 // 20 segundos (upload de imagem pode demorar mais)
      }
    );

    if (response.status >= 200 && response.status < 300 && response.data) {
      log(`Imagem enviada com sucesso via Evolution API: ${JSON.stringify(response.data)}`, 'info');
      
      // Extrair o ID da mensagem da resposta
      const messageId = response.data.key?.id || 
                        response.data.messageId || 
                        response.data.id || 
                        `temp_img_${Date.now()}`;
      
      return { 
        success: true, 
        messageId, 
        details: response.data 
      };
    }
    
    log(`Resposta da API (imagem): ${JSON.stringify(response.data)}`, 'warn');
    return { success: true, details: response.data };
  } catch (error) {
    log(`Erro ao enviar imagem Evolution API: ${error}`, 'error');
    let errorMessage = 'Erro desconhecido ao enviar imagem';
    let details = null;

    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage = error.response.data?.error || 
                      error.response.data?.message || 
                      `Erro ${error.response.status}: ${error.message}`;
        details = error.response.data;
        log(`Detalhes do erro (imagem): ${JSON.stringify(details)}`, 'error');
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
 * Obtém o QR Code da instância para fazer o pareamento com o WhatsApp
 */
export async function getWhatsAppQRCode(): Promise<WhatsAppResult> {
  try {
    // Se estamos em ambiente de desenvolvimento e sem URL definida, retornar QR simulado
    if (EVOLUTION_API_URL.includes('example.com') && process.env.NODE_ENV === 'development') {
      log('Ambiente de desenvolvimento detectado. Retornando QR code simulado.', 'info');
      return {
        success: true,
        details: {
          qrcode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAMAAABlApw1AAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAABCUExURUxpcQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMJYXskAAAAVdFJOUwAQIDBAUGBwgI+fr7/P3+/vDyAg76azD6gAAAQFSURBVHja7d3bkqM4EAVQVAIk2W3j+P+/nXnsndDEbgxC6lJVnXkLwpTuShVC11/rr/U1/PPrl5ee+98l4r9fhaBfC+N/vwzhJeB/b2ZQHvxVCS8D/0fCa8D/kYAE/B8JSLgC/knCJeB/Efyt4X8ryE/4FgnGnuBr9wTfE0xvCUa+JAj7Qwl8SRD9kYC+JODvmeCfN8GpAyb08HOYHjrMj4aYHw0dPRqYnw2dvB2Hnw1j/G54NHT2k+m5oT/xTmMbpnPvZdSGh97suA0dBDswHDp4IDkNvQTDLw7DMBz+kOJsGPnUMwyTPukZhnA6guLQ+eko0+F+Osx0OH8+0OHo4MO9zofzAzLDcHRIdhhOnpJ1YTg6pNUN4eQ5ZRyGg6f1hqHvPaRrGA6+sDAMncdElqHnm2tDhuHYF0iWYcA31zpBeBMQhN4hWT/0D8l6ARkgZIC+Rzwyw8XuWJih5xGPxHD5Jz4zDL3fXLMhgj8bIvhr2GIcBBNyJ/+TYcC/9HAbwoVL7G6oXIBrhhzw6YYc8A1D4QJcMQT/NuSALxty3w01+JphCPq6X01IHF/drjuG8C4UAr5iiHy3lP3wUu3qEt9tVaJM9x06I98thcfnGG7oO3REwZcMXdwvcPQEtmuGCTl0TMEXDD3g64be8E3D8IbvDN8MPeJ7w3eI7w0/I7437CN+MHxP+N7wHeF7wxjxg2FP+MHQEb5g6AbfGGbxreGnNfb3HhUTTOfLubVFfjSZUZ9PJ48GS+4TGQV5NvSdJ3R+ysX3iZwfmH1PTm/DuoTq+6nRtYtR7ylJLBu8HuIXTTiRgY/QvUVjS8YkhPclq9tEDMkAbWzTkAwWjpnzYXHnDhX33Ck1e0/FvXesbr8D2H8H7HKjMQG2GSsBthktALYZMQE2GnUCbDTyAthqfAqw1Qh1gM3GygDbJcAESLiQwARImBLCBEi4lMUESLiYxxX5mfOlVK7I30u55BsmQPI1M5gAyRcNYQIkXzWFCZB83RgmQPKFc5gAyVcOYgIkXzqJCZB87SgmQPLFszABkq8ehgnA1+/CBNi6vQMmwNaNjWECbN3aGiZA8NbmQgJsXmFBTIDNS3RgAoTszcJU5K9bNM9Ffi7RpZtxASZvPx9XdG+ApXl1AFPeT7bLdXZIANP9CVPjDWkATLfoTI13JH7vwanGPJi7yDUmuvi9Cb3GXKi3yDWGul6RXmMyVF3kGrPhLgwsTIcb9Yv0GvPhhv0ivcKEyMPF+kUVJpx+3EwYOB/uuXk1YeR0uG8U2Uw4OtzZi/+cD/feIpuzmfPh7ltkczb1L4a7d5FpNnQ+3N2LTMMQ+HL392JeV+Tn/uDuxYRqyH+3/8Lv9lCv+qs8/g85XeXvFOX/rQAAAABJRU5ErkJggg==",
          status: "DISCONNECTED"
        }
      };
    }

    // Endpoint para obter o QR code da instância
    const qrCodeEndpoint = `${EVOLUTION_API_URL}/instance/qrcode/${EVOLUTION_API_INSTANCE}`;
    
    log(`Obtendo QR code da instância: ${qrCodeEndpoint}`, 'info');
    
    const response = await axios.get(
      qrCodeEndpoint,
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_TOKEN
        },
        timeout: 15000
      }
    );

    if (response.status >= 200 && response.status < 300) {
      log('QR code obtido com sucesso', 'info');
      
      return {
        success: true,
        details: {
          qrcode: response.data?.qrcode || null,
          status: response.data?.status || 'DISCONNECTED'
        }
      };
    }
    
    return { 
      success: false, 
      error: 'Resposta inesperada ao obter QR code', 
      details: response.data 
    };
  } catch (error) {
    log(`Erro ao obter QR code: ${error}`, 'error');
    let errorMessage = 'Erro ao obter QR code';
    let details = null;
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage = error.response.data?.error || 
                      error.response.data?.message || 
                      `Erro ${error.response.status}: ${error.message}`;
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
 * Verifica o status de uma mensagem enviada
 * @param messageId ID da mensagem para verificar o status
 */
export async function checkMessageStatus(messageId: string): Promise<WhatsAppResult> {
  try {
    // Em ambiente de desenvolvimento, simular uma resposta
    if (EVOLUTION_API_URL.includes('example.com') && process.env.NODE_ENV === 'development') {
      log('Ambiente de desenvolvimento detectado. Simulando status de mensagem.', 'info');
      
      // Gerar um status aleatório para testes
      const statuses = ['sent', 'delivered', 'read'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      return {
        success: true,
        details: {
          status: randomStatus,
          timestamp: new Date().toISOString()
        }
      };
    }

    // Endpoint para verificar status da mensagem
    const statusEndpoint = `${EVOLUTION_API_URL}/message/statusMessage/${EVOLUTION_API_INSTANCE}`;
    
    log(`Verificando status da mensagem ${messageId}`, 'info');
    
    const response = await axios.post(
      statusEndpoint,
      { id: messageId },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_TOKEN
        },
        timeout: 10000
      }
    );

    if (response.status >= 200 && response.status < 300) {
      log(`Status obtido: ${JSON.stringify(response.data)}`, 'info');
      
      // Normalizar o status para os valores que usamos no sistema
      let normalizedStatus = 'sent';
      if (response.data?.status) {
        const status = response.data.status.toLowerCase();
        
        if (status.includes('read') || status === 'read') {
          normalizedStatus = 'read';
        } else if (status.includes('delivered') || status === 'delivery_ack') {
          normalizedStatus = 'delivered';
        }
      }
      
      return {
        success: true,
        details: {
          status: normalizedStatus,
          originalStatus: response.data?.status,
          timestamp: response.data?.timestamp || new Date().toISOString()
        }
      };
    }
    
    return { 
      success: false, 
      error: 'Resposta inesperada ao verificar status', 
      details: response.data 
    };
  } catch (error) {
    log(`Erro ao verificar status da mensagem: ${error}`, 'error');
    let errorMessage = 'Erro ao verificar status da mensagem';
    let details = null;
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage = error.response.data?.error || 
                      error.response.data?.message || 
                      `Erro ${error.response.status}: ${error.message}`;
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
