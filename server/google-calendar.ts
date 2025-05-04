import { calendar as googleCalendar, auth as googleAuth } from '@googleapis/calendar';
import { storage } from './storage';
import { Trainer, Session } from '@shared/schema';
import { formatInTimeZone } from 'date-fns-tz';

// Configuração do OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Criar uma instância da API do Calendar
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Escopos necessários para acessar o calendar
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

/**
 * Gera a URL de autorização para o Google
 */
export function getAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

/**
 * Troca o código de autorização por tokens de acesso e atualização
 */
export async function getTokensFromCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expiry_date: number;
}> {
  const { tokens } = await oauth2Client.getToken(code);
  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date!,
  };
}

/**
 * Define as credenciais para o cliente OAuth2
 */
export function setCredentials(tokens: {
  access_token: string;
  refresh_token?: string;
  expiry_date: number;
}): void {
  oauth2Client.setCredentials(tokens);
}

/**
 * Cria um evento no Google Calendar
 */
export async function createCalendarEvent(session: Session, trainer: Trainer, studentName: string): Promise<string | null> {
  try {
    // Formatar as datas para ISO
    const startTimeISO = session.startTime instanceof Date ? 
      formatInTimeZone(session.startTime, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : 
      formatInTimeZone(new Date(session.startTime), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    
    const endTimeISO = session.endTime instanceof Date ? 
      formatInTimeZone(session.endTime, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : 
      formatInTimeZone(new Date(session.endTime), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

    // Cor do evento baseada na fonte (Favale = azul, Pink = rosa)
    const colorId = session.source === 'Favale' ? '1' : '3'; // 1=azul, 3=roxo/rosa
    
    // Criar o evento
    const event = {
      summary: `Treino ${session.source}: ${studentName}`,
      location: session.location,
      description: session.notes || `Sessão de treinamento para ${studentName}`,
      start: {
        dateTime: startTimeISO,
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endTimeISO,
        timeZone: 'America/Sao_Paulo',
      },
      colorId: colorId,
      attendees: [
        { email: trainer.email, responseStatus: 'accepted' },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 dia antes
          { method: 'popup', minutes: 60 } // 1 hora antes
        ],
      },
    };

    // ID do calendário do professor ou o calendário primário se não especificado
    const calendarId = trainer.calendarId || 'primary';

    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
      sendNotifications: true,
    });

    return response.data.id || null;
  } catch (error) {
    console.error('Erro ao criar evento no Google Calendar:', error);
    return null;
  }
}

/**
 * Atualiza um evento no Google Calendar
 */
export async function updateCalendarEvent(
  session: Session, 
  trainer: Trainer, 
  studentName: string, 
  eventId: string
): Promise<boolean> {
  try {
    // Formatar as datas para ISO
    const startTimeISO = session.startTime instanceof Date ? 
      formatInTimeZone(session.startTime, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : 
      formatInTimeZone(new Date(session.startTime), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    
    const endTimeISO = session.endTime instanceof Date ? 
      formatInTimeZone(session.endTime, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : 
      formatInTimeZone(new Date(session.endTime), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

    // Cor do evento baseada na fonte (Favale = azul, Pink = rosa)
    const colorId = session.source === 'Favale' ? '1' : '3'; // 1=azul, 3=roxo/rosa

    // Dados atualizados do evento
    const event = {
      summary: `Treino ${session.source}: ${studentName}`,
      location: session.location,
      description: session.notes || `Sessão de treinamento para ${studentName}`,
      start: {
        dateTime: startTimeISO,
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endTimeISO,
        timeZone: 'America/Sao_Paulo',
      },
      colorId: colorId,
      attendees: [
        { email: trainer.email, responseStatus: 'accepted' },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 dia antes
          { method: 'popup', minutes: 60 } // 1 hora antes
        ],
      },
    };
    
    // ID do calendário do professor ou o calendário primário se não especificado
    const calendarId = trainer.calendarId || 'primary';
    
    await calendar.events.update({
      calendarId: calendarId,
      eventId: eventId,
      requestBody: event,
      sendNotifications: true,
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao atualizar evento no Google Calendar:', error);
    return false;
  }
}

/**
 * Cancela (exclui) um evento no Google Calendar
 */
export async function deleteCalendarEvent(trainer: Trainer, eventId: string): Promise<boolean> {
  try {
    // ID do calendário do professor ou o calendário primário se não especificado
    const calendarId = trainer.calendarId || 'primary';
    
    await calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
      sendNotifications: true,
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao excluir evento no Google Calendar:', error);
    return false;
  }
}

/**
 * Verifica disponibilidade do professor em um período específico
 */
export async function checkTrainerAvailability(
  trainer: Trainer, 
  startTime: Date, 
  endTime: Date
): Promise<boolean> {
  try {
    // ID do calendário do professor ou o calendário primário se não especificado
    const calendarId = trainer.calendarId || 'primary';
    
    // Formatar as datas para ISO
    const startTimeISO = formatInTimeZone(startTime, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    const endTimeISO = formatInTimeZone(endTime, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    
    // Consultar eventos no período
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: startTimeISO,
      timeMax: endTimeISO,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    // Se não há eventos no período, o professor está disponível
    return response.data.items && response.data.items.length === 0;
  } catch (error) {
    console.error('Erro ao verificar disponibilidade do professor:', error);
    return false;
  }
}

/**
 * Obtém todos os eventos do calendário de um professor em um período
 */
export async function getTrainerEvents(
  trainer: Trainer, 
  startDate: Date, 
  endDate: Date
): Promise<any[]> {
  try {
    // ID do calendário do professor ou o calendário primário se não especificado
    const calendarId = trainer.calendarId || 'primary';
    
    // Formatar as datas para ISO
    const startTimeISO = formatInTimeZone(startDate, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    const endTimeISO = formatInTimeZone(endDate, 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
    
    // Consultar eventos no período
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: startTimeISO,
      timeMax: endTimeISO,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    return response.data.items || [];
  } catch (error) {
    console.error('Erro ao obter eventos do professor:', error);
    return [];
  }
}
