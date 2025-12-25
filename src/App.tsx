import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Landing from "./pages/Landing";
import Documentation from "./pages/Documentation";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NewTemplate from "./pages/NewTemplate";
import TemplateDetail from "./pages/TemplateDetail";
import NewVersion from "./pages/NewVersion";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/docs" element={<Documentation />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates/new"
              element={
                <ProtectedRoute>
                  <NewTemplate />
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates/:templateId"
              element={
                <ProtectedRoute>
                  <TemplateDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates/:templateId/versions/new"
              element={
                <ProtectedRoute>
                  <NewVersion />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;