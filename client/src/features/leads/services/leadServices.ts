import { Lead } from "@/types"; // Updated
import { getSupabaseQueryFn } from "@/lib/queryClient";

// Service function to fetch all leads
// This function will be used by useQuery's queryFn
export const fetchLeadsService = getSupabaseQueryFn<Lead[]>({
  functionName: 'lead-functions', // Assuming 'lead-functions' can return all leads by default or with a specific slug
  // If your 'lead-functions' needs a specific slug for fetching all leads, add it here:
  // slug: 'all',
  on401: 'throw', // Or handle as needed, e.g., 'returnNull'
});

// If you need a function that directly calls and returns a promise (e.g., for mutations or outside React Query)
// export const getAllLeads = async (): Promise<Lead[]> => {
//   const queryFn = getSupabaseQueryFn<Lead[]>({ functionName: 'lead-functions', on401: 'throw' });
//   // @ts-ignore TODO: queryFn expects a QueryFunctionContext, but we can call it directly for simple cases if needed
//   // This direct call might not be standard for getSupabaseQueryFn, which is designed for queryFn.
//   // A better approach for direct calls might be to use invokeSupabaseFunction directly.
//   // For now, this service is primarily for use with useQuery.
//   return queryFn();
// };
