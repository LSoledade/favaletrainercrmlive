import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/data-display/skeleton'; // Updated path
import { Card, CardContent } from '@/components/data-display/Card'; // Updated path
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, CloudFog, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast'; // Correct global hook
import { getSupabaseQueryFn } from '@/lib/queryClient'; // Correct

const capitalCities: Record<string, string> = {
  'AC': 'Rio Branco', 'AL': 'Maceió', 'AP': 'Macapá', 'AM': 'Manaus', 'BA': 'Salvador',
  'CE': 'Fortaleza', 'DF': 'Brasília', 'ES': 'Vitória', 'GO': 'Goiânia', 'MA': 'São Luís',
  'MT': 'Cuiabá', 'MS': 'Campo Grande', 'MG': 'Belo Horizonte', 'PA': 'Belém', 'PB': 'João Pessoa',
  'PR': 'Curitiba', 'PE': 'Recife', 'PI': 'Teresina', 'RJ': 'Rio de Janeiro', 'RN': 'Natal',
  'RS': 'Porto Alegre', 'RO': 'Porto Velho', 'RR': 'Boa Vista', 'SC': 'Florianópolis',
  'SP': 'São Paulo', 'SE': 'Aracaju', 'TO': 'Palmas'
};

const cityNameMapping: Record<string, string> = {
  "San Paulo": "São Paulo", "Rio De Janeiro": "Rio de Janeiro", "Belo Horizonte": "Belo Horizonte",
  "Brazilia": "Brasília", "Recife": "Recife", "Salvador": "Salvador",
  "Porto Allegre": "Porto Alegre", "Fortaleza": "Fortaleza", "Curitiba": "Curitiba"
};

const getCityName = (apiCityName: string): string => {
  return cityNameMapping[apiCityName] || apiCityName;
};

interface DashboardStats {
  leadsByState: Record<string, number>;
  // Other stats properties if needed by this component
}

interface WeatherData {
  location: { name: string; region: string; country: string; localtime: string; };
  current: {
    temp_c: number; condition: { text: string; icon: string; code: number; };
    wind_kph: number; wind_dir: string; humidity: number; feelslike_c: number; uv: number; is_day: number;
  };
  error?: { code: number; message: string; };
}

interface WeatherApiResponse {
  data?: WeatherData;
  error?: { code: number; message: string; };
}

export default function UserWeatherWidget() {
  const [userCity, setUserCity] = useState('São Paulo'); // Default city
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboardStatsForWeather"],
    queryFn: getSupabaseQueryFn({ functionName: 'general-stats', on401: 'throw' }),
  });

  const { data: weatherResponse, isLoading: weatherLoading, error: weatherError } = useQuery<WeatherApiResponse>({
    queryKey: ['weatherData', userCity],
    queryFn: getSupabaseQueryFn({ functionName: 'weather-api', slug: encodeURIComponent(userCity), on401: 'throw' }),
    retry: (failureCount, error: Error | { status?: number }) => { // Updated error type
      if (error && 'status' in error && error.status && error.status >= 400 && error.status < 500) return false;
      return failureCount < 2;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    enabled: !!userCity,
  });

  const weather = weatherResponse?.data;

  useEffect(() => {
    if (!stats || !stats.leadsByState) return;
    try {
      let maxLeads = 0;
      let dominantState = 'SP';
      for (const [state, count] of Object.entries(stats.leadsByState)) {
        if (count > maxLeads) {
          maxLeads = count;
          dominantState = state;
        }
      }
      setUserCity(capitalCities[dominantState] || 'São Paulo');
    } catch (error) {
      console.error('Erro ao determinar a cidade do usuário:', error);
      setUserCity('São Paulo');
    }
  }, [stats]);

  if (statsLoading || weatherLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col space-y-2">
            <Skeleton className="h-6 w-24" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getWeatherIcon = (code: number) => {
    const isDay = weather?.current?.is_day === 1;
    if (code === 1000) return isDay ? <Sun className="h-8 w-8 text-yellow-500" /> : <span className="material-icons text-indigo-300 text-3xl">nightlight</span>;
    if ([1003, 1006, 1009].includes(code)) return isDay ? <Cloud className="h-8 w-8 text-gray-400" /> : <span className="material-icons text-gray-400 text-3xl">nights_stay</span>;
    if ([1063, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) return <CloudRain className="h-8 w-8 text-blue-400" />;
    if ([1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) return <CloudSnow className="h-8 w-8 text-blue-200" />;
    if ([1087, 1273, 1276, 1279, 1282].includes(code)) return <CloudLightning className="h-8 w-8 text-yellow-400" />;
    if ([1030, 1135, 1147].includes(code)) return <CloudFog className="h-8 w-8 text-gray-300" />;
    if ([1069, 1072, 1150, 1153, 1168, 1171, 1198, 1201, 1204, 1207, 1249, 1252, 1261, 1264].includes(code)) return <CloudRain className="h-8 w-8 text-gray-400" />;
    return <Wind className="h-8 w-8 text-blue-300" />;
  };

  if (weatherError || !weatherResponse || weatherResponse.error || !weather || weather.error) {
    console.warn('Weather data unavailable:', weatherError || weatherResponse?.error || weather?.error);
    return (
      <Card className="overflow-hidden border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Sun className="h-8 w-8 text-orange-400" /> {/* Default icon */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">Clima em {userCity}</h3>
              <p className="text-lg font-semibold text-gray-800 dark:text-white">--°C</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Dados indisponíveis</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-blue-100 dark:border-blue-900">
      <CardContent className="p-4">
        <div className="flex flex-col">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
            Clima em {getCityName(weather.location.name)}
          </h3>
          <div className="mt-2 mb-2 flex items-center space-x-3">
            <div>{getWeatherIcon(weather.current.condition.code)}</div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-gray-800 dark:text-white">{Math.round(weather.current.temp_c)}°C</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Sensação {Math.round(weather.current.feelslike_c)}°C</span>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{weather.current.condition.text}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
            <div>Umidade: {weather.current.humidity}%</div>
            <div>Vento: {Math.round(weather.current.wind_kph)} km/h</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}