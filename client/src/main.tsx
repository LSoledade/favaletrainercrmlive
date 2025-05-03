import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { LeadProvider } from "./context/LeadContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <LeadProvider>
      <App />
    </LeadProvider>
  </QueryClientProvider>
);
