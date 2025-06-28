import React from 'react'; // Import React for StrictMode if desired
import { createRoot } from "react-dom/client";
import AppRoutes from "@/routes/AppRoutes"; // Updated import
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient"; // Use @/ alias
import { AuthProvider } from "@/providers/AuthProvider"; // Import AuthProvider
import { ThemeProvider } from "@/providers/ThemeProvider"; // Import ThemeProvider
import { Toaster } from "@/components/feedback/toaster"; // Import Toaster

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
