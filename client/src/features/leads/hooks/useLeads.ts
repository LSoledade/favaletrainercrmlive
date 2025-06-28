import { useQuery } from "@tanstack/react-query";
import { Lead } from "@/types"; // Updated
import { fetchLeadsService } from "../services/leadServices";

export const useLeads = () => {
  return useQuery<Lead[], Error>({ // Explicitly type Error for the error object
    queryKey: ["leadsList"], // Standardized query key
    queryFn: fetchLeadsService, // Use the service function
    // Add other React Query options as needed, e.g., staleTime, gcTime
  });
};

// Example for a single lead, if needed later
// import { fetchLeadByIdService } from "../services/leadServices"; // Assuming this service exists
// export const useLead = (leadId: string | number) => {
//   return useQuery<Lead, Error>({
//     queryKey: ["lead", leadId],
//     queryFn: () => fetchLeadByIdService(leadId), // Service function would take leadId
//     enabled: !!leadId, // Only run if leadId is provided
//   });
// };
