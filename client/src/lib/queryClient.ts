import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  // Para métodos ou rotas específicas que não retornam JSON
  // Special handling for logout or no content responses
  if (method === 'HEAD' || res.status === 204 || url.endsWith('/logout')) { // Adjusted for Supabase logout
    return {} as T;
  }

  // Try to parse JSON, return empty object on failure (or handle more gracefully)
  try {
    const text = await res.text();
    if (!text) return {} as T; // Handle empty response body
    return JSON.parse(text);
  } catch (error) {
    console.warn('API response was not valid JSON:', error);
    // Depending on your error handling strategy, you might throw here,
    // or return a specific error object. For now, returning empty object.
    return {} as T;
  }
}

// Helper to get Supabase client and headers for invoking functions
async function getSupabaseClientAndHeaders() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or Anon Key is not defined in environment variables.");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const session = (await supabase.auth.getSession()).data.session;
  const headers = {
    'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`, // Use user token if available, else anon key
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  return { supabase, headers };
}


// Updated apiRequest for Supabase Edge Functions
export async function invokeSupabaseFunction<T = any>(
  functionName: string, // e.g., 'user-management', 'lead-functions'
  method: string, // 'GET', 'POST', 'PATCH', 'DELETE'
  // For GET, params can be an object that will be converted to query string
  // For POST/PATCH, body is the request payload
  // For DELETE with ID, functionName might be like 'lead-functions/123' or pass ID in options
  payload?: unknown | undefined,
  options?: { slug?: string, params?: Record<string, string>} // slug for /function/slug, params for query string
): Promise<T> {
  const { supabase, headers } = await getSupabaseClientAndHeaders();

  let fullFunctionName = functionName;
  if (options?.slug) {
    fullFunctionName += `/${options.slug}`;
  }

  let queryString = "";
  if (options?.params && method === 'GET') {
    queryString = "?" + new URLSearchParams(options.params).toString();
  }

  // Supabase client's functions.invoke takes the function name and options object
  const invokeOptions: any = {
    method: method, // Ensure method is part of the options if not default POST
    headers: headers, // Pass existing headers
  };

  if (method !== 'GET' && method !== 'HEAD' && payload) {
    invokeOptions.body = payload; // Supabase client handles JSON.stringify internally for 'body'
  }

  // Note: For GET requests with query parameters, Supabase client might handle them differently.
  // If `payload` is used for GET query params with `supabase.functions.invoke`, check docs.
  // Typically, GET query params are part of the function name string or specific options.
  // The example here uses `fetch` for more direct control over GET with query params.
  // If using `supabase.functions.invoke` for GET with params, it might be like:
  // supabase.functions.invoke(fullFunctionName + queryString, invokeOptions)
  // OR invokeOptions.params = payload if that's how the client handles it.

  // Using fetch for more explicit control, especially for GET with query params
  const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const functionUrl = `${VITE_SUPABASE_URL}/functions/v1/${fullFunctionName}${queryString}`;

  const res = await fetch(functionUrl, {
    method,
    headers,
    body: (method !== 'GET' && method !== 'HEAD' && payload) ? JSON.stringify(payload) : undefined,
  });

  await throwIfResNotOk(res);

  if (method === 'HEAD' || res.status === 204 || functionName.endsWith('/logout')) { // Check base function name for logout
    return {} as T;
  }
  
  try {
    const text = await res.text();
    if (!text) return {} as T;
    return JSON.parse(text);
  } catch (error) {
    console.warn('Supabase function response was not valid JSON:', error);
    return {} as T;
  }
}


type UnauthorizedBehavior = "returnNull" | "throw";

// Updated getQueryFn for Supabase Edge Functions
export const getSupabaseQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
  functionName: string; // Expect function name like 'lead-functions'
  slug?: string; // Optional slug like an ID '123' or action 'active'
  params?: Record<string, string>; // Optional query parameters for GET requests
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, functionName, slug, params }) =>
  async ({ queryKey }) => { // queryKey might not be directly used if all info is in options
    try {
      // Construct the full function path if a slug is provided
      const fullFunctionName = slug ? `${functionName}/${slug}` : functionName;

      // Use invokeSupabaseFunction for GET requests
      // For queryFns, method is always GET. Body is not applicable.
      // Params are passed via options.params
      const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${VITE_SUPABASE_URL}/functions/v1/${fullFunctionName}${params ? '?' + new URLSearchParams(params).toString() : ''}`;

      const { headers } = await getSupabaseClientAndHeaders();

      const res = await fetch(functionUrl, {
        method: 'GET',
        headers,
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }
      await throwIfResNotOk(res);
      const text = await res.text();
      if (!text) return {} as any; // Or handle as error / null
      return JSON.parse(text);

    } catch (error) {
      if (unauthorizedBehavior === "returnNull" && 
          ((error as any)?.message?.includes("401") || (error as any)?.status === 401)) {
        return null;
      }
      throw error; // Re-throw other errors
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // queryFn is now set per-query using getSupabaseQueryFn
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
