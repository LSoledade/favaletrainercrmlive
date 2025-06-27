// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Weather API Configuration ---
const WEATHER_API_KEY = Deno.env.get('WEATHER_API_KEY'); // Ensure this is set in Supabase Vault/Env Vars
const WEATHER_API_BASE_URL = "https://api.weatherapi.com/v1";

// --- Types (from weather-service.ts) ---
interface WeatherData {
  location?: { // Make location and current optional to handle error cases better
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    localtime: string;
  };
  current?: {
    temp_c: number;
    temp_f: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    wind_kph: number;
    wind_dir: string;
    humidity: number;
    feelslike_c: number;
    feelslike_f: number;
    uv: number;
    is_day: number;
  };
  forecast?: {
    forecastday: {
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
      };
    }[];
  };
  error?: { // This is the crucial part for error handling
    code: number;
    message: string;
  };
}

// --- Helper Function to Fetch Weather ---
async function fetchWeather(city: string): Promise<WeatherData> {
  if (!WEATHER_API_KEY) {
    console.error("WEATHER_API_KEY is not set.");
    return { error: { code: 500, message: "Configuração do servidor de clima incompleta." } };
  }
  const url = `${WEATHER_API_BASE_URL}/forecast.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)}&days=1&lang=pt`;
  try {
    const response = await fetch(url);
    const data: WeatherData = await response.json();
    if (!response.ok || data.error) { // WeatherAPI often returns 200 OK even for errors, check data.error
      console.warn(`Weather API error for ${city}:`, data.error?.message || `Status ${response.status}`);
      // Return the error structure from the API if available
      return { error: data.error || { code: response.status, message: `Erro da API de clima: ${response.statusText}` }};
    }
    return data;
  } catch (e) {
    console.error(`Network or parsing error fetching weather for ${city}:`, e);
    return { error: { code: 500, message: `Erro de rede ou parsing: ${e.message}` } };
  }
}

// --- Request Handler ---
Deno.serve(async (req) => {
  // Initialize Supabase client for user authentication (optional, but good practice)
  const userSupabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  const { data: { user } } = await userSupabaseClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ message: "Não autenticado" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  if (!WEATHER_API_KEY) {
     return new Response(JSON.stringify({ status: 'error', message: "Chave da API de Clima não configurada no servidor." }),
      { status: 503, headers: { "Content-Type": "application/json" }});
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(part => part);
  // Expected path: /functions/v1/weather-api/status or /functions/v1/weather-api/<city_name>
  const actionOrCity = pathParts[3];

  try {
    if (req.method === 'GET' && actionOrCity === 'status') {
      const testCity = "São Paulo"; // Use a reliable city for status check
      const data = await fetchWeather(testCity);
      if (data.error) {
        return new Response(JSON.stringify({ status: 'error', message: `Erro na API de clima: ${data.error.message}` }),
          { status: 503, headers: { "Content-Type": "application/json" }});
      }
      return new Response(JSON.stringify({ status: 'connected', message: `Serviço de clima conectado. Clima em ${data.location?.name}: ${data.current?.condition?.text}` }),
        { status: 200, headers: { "Content-Type": "application/json" }});
    }

    if (req.method === 'GET' && actionOrCity && actionOrCity !== 'status') {
      const city = decodeURIComponent(actionOrCity);
      const weatherData = await fetchWeather(city);

      if (weatherData.error) {
        // Determine appropriate status code based on common WeatherAPI error codes
        let statusCode = 500; // Default server error
        if (weatherData.error.code === 1006) statusCode = 404; // No location found for query
        if (weatherData.error.code === 1003 || weatherData.error.code === 1005 ) statusCode = 400; // q parameter missing or invalid API key URL
        if (weatherData.error.code === 2007 || weatherData.error.code === 2008) statusCode = 403; // API key has reached calls per month quota or disabled

        return new Response(JSON.stringify({ message: weatherData.error.message, code: weatherData.error.code }),
          { status: statusCode, headers: { "Content-Type": "application/json" }});
      }
      return new Response(JSON.stringify(weatherData), { status: 200, headers: { "Content-Type": "application/json" }});
    }

    return new Response(JSON.stringify({ message: "Rota de clima não encontrada ou método não permitido" }), { status: 404 });

  } catch (error) {
    console.error('Erro na função Weather API:', error);
    return new Response(JSON.stringify({ message: error.message || "Erro interno do servidor de clima" }), { status: 500 });
  }
});

/*
Environment Variables:
- `WEATHER_API_KEY`: Your API key for WeatherAPI.com. This MUST be set in the Supabase project's Vault or Edge Function environment variables.

Invocation Examples:

GET weather service status:
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/weather-api/status' \
  --header 'Authorization: Bearer YOUR_USER_JWT'

GET weather for a city (e.g., London):
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/weather-api/London' \
  --header 'Authorization: Bearer YOUR_USER_JWT'

GET weather for a city with space (e.g., New York):
curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/weather-api/New%20York' \
  --header 'Authorization: Bearer YOUR_USER_JWT'
*/
