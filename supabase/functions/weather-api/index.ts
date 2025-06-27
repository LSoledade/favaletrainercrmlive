// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- Env Vars & Configuration ---
const weatherApiKey = Deno.env.get('WEATHER_API_KEY');
const weatherApiBaseUrl = "https://api.weatherapi.com/v1";
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

if (!weatherApiKey) console.error("WEATHER_API_KEY is not set. Weather function will not work.");
if (!supabaseUrl || !supabaseAnonKey) console.error("Supabase URL or Anon Key is missing.");

// --- Types (align with WeatherAPI.com response structure) ---
interface WeatherApiError {
  code: number;
  message: string;
}
interface WeatherLocation {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  localtime: string;
}
interface WeatherCondition {
  text: string;
  icon: string;
  code: number;
}
interface WeatherCurrent {
  temp_c: number;
  temp_f: number;
  condition: WeatherCondition;
  wind_kph: number;
  wind_dir: string;
  humidity: number;
  feelslike_c: number;
  feelslike_f: number;
  uv: number;
  is_day: number; // 1 for day, 0 for night
}
interface WeatherForecastDay {
  date: string;
  day: {
    maxtemp_c: number;
    mintemp_c: number;
    condition: WeatherCondition;
    // Add other daily forecast fields if needed
  };
  // Add astro, hour array if needed
}
interface WeatherData {
  location?: WeatherLocation;
  current?: WeatherCurrent;
  forecast?: {
    forecastday: WeatherForecastDay[];
  };
  error?: WeatherApiError; // Error object from WeatherAPI
}

// --- Helper Function to Fetch Weather ---
async function fetchWeatherFromApi(city: string, days: number = 1, lang: string = 'pt'): Promise<WeatherData> {
  if (!weatherApiKey) {
    console.error("Attempted to fetch weather, but WEATHER_API_KEY is not set.");
    return { error: { code: 503, message: "Configuração do servidor de clima incompleta." } }; // 503 Service Unavailable
  }
  const queryParams = new URLSearchParams({
    key: weatherApiKey,
    q: city,
    days: days.toString(),
    lang: lang,
    aqi: 'no', // Air Quality Index
    alerts: 'no' // Weather alerts
  });
  const url = `${weatherApiBaseUrl}/forecast.json?${queryParams.toString()}`;

  try {
    const response = await fetch(url);
    const data: WeatherData = await response.json(); // Type assertion

    // WeatherAPI often returns 200 OK even for API errors (like unknown city),
    // so we must check the 'error' field in the response body.
    if (data.error) {
      console.warn(`WeatherAPI error for city "${city}": Code ${data.error.code}, Message: ${data.error.message}`);
      return { error: data.error }; // Return the API's error structure
    }
    if (!response.ok) { // Should ideally not happen if data.error is checked, but good for network issues
        console.warn(`WeatherAPI HTTP error for city "${city}": Status ${response.status}`);
        return { error: { code: response.status, message: `Erro de comunicação com a API de clima: ${response.statusText}` }};
    }
    return data; // Successful response
  } catch (e) {
    console.error(`Network or parsing error fetching weather for "${city}":`, e.message);
    return { error: { code: 500, message: `Erro de rede ou parsing: ${e.message}` } };
  }
}

// --- Request Handler ---
Deno.serve(async (req) => {
  const headers = { "Content-Type": "application/json" };
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: "Configuração do Supabase no servidor incompleta." }), { status: 503, headers });
  }

  const userSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } }
  });

  const { data: { user } } = await userSupabaseClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401, headers });
  }

  if (!weatherApiKey) { // Re-check here as it's critical for the function's purpose
     return new Response(JSON.stringify({ error: "Chave da API de Clima não está configurada no servidor." }),
      { status: 503, headers }); // 503 Service Unavailable
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(part => part);
  const actionOrCity = pathParts[3]; // e.g., 'status' or city name

  try {
    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: "Método não permitido. Use GET." }), { status: 405, headers });
    }

    if (actionOrCity === 'status') {
      const testCity = "Sao Paulo"; // A city likely to return valid data for status check
      const data = await fetchWeatherFromApi(testCity, 1);
      if (data.error || !data.location || !data.current) { // Check for actual data presence
        return new Response(JSON.stringify({ data: { status: 'error', message: `API de clima retornou erro: ${data.error?.message || 'Resposta inesperada.'}` } }),
          { status: data.error?.code === 1006 ? 404 : 503, headers }); // 1006 is "No location found"
      }
      return new Response(JSON.stringify({ data: { status: 'connected', message: `Serviço de clima conectado. Clima atual em ${data.location.name}: ${data.current.condition.text}` } }),
        { headers, status: 200 });
    }

    if (actionOrCity && actionOrCity !== 'status') {
      const city = decodeURIComponent(actionOrCity);
      if (!city.trim()) {
        return new Response(JSON.stringify({ error: "Nome da cidade não pode ser vazio." }), { status: 400, headers });
      }
      const weatherData = await fetchWeatherFromApi(city);

      if (weatherData.error) {
        let statusCode = 500; // Default server/service error
        // Map WeatherAPI error codes to HTTP status codes
        // Refer to https://www.weatherapi.com/docs/errors.aspx
        switch (weatherData.error.code) {
            case 1002: // API key not provided - Should be caught by initial check
            case 1003: // q parameter missing
            case 1005: // API request url is invalid
                statusCode = 400; // Bad Request
                break;
            case 1006: // No location found for query
                statusCode = 404; // Not Found
                break;
            case 2006: // API key provided is invalid
            case 2007: // API key has exceeded calls per month quota
            case 2008: // API key has been disabled
            case 2009: // API key does not have access to the resource.
                statusCode = 403; // Forbidden
                break;
            case 9999: // Internal application error.
            default:
                statusCode = 503; // Service Unavailable (treat upstream errors as such)
                break;
        }
        return new Response(JSON.stringify({ error: weatherData.error.message, code: weatherData.error.code }),
          { status: statusCode, headers });
      }
      // Successfully fetched weather data
      return new Response(JSON.stringify({ data: weatherData }), { headers, status: 200 });
    }

    return new Response(JSON.stringify({ error: "Rota de clima não encontrada." }), { status: 404, headers });

  } catch (error) { // Catch unexpected errors from the function logic itself
    console.error('Erro inesperado na função Weather API:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || "Erro interno do servidor ao processar pedido de clima." }), { status: 500, headers });
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
