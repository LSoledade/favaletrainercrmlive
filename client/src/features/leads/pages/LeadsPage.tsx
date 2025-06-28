import LeadManagement from "@/features/leads/components/LeadManagement"; // Updated path
import { LeadProvider } from "@/context/LeadContext"; // Correct

export default function LeadsPage() {
  return (
    <LeadProvider>
      <LeadManagement />
    </LeadProvider>
  );
}
