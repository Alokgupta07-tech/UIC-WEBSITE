import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedAdminRoute } from "@/features/auth";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { Analytics } from "@vercel/analytics/react";
import Index from "./pages/Index";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import Team from "./pages/Team";
import CertifiedStudents from "./pages/CertifiedStudents";
import Resources from "./pages/Resources";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
const Gallery = lazy(() => import("./pages/Gallery"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const Attendance = lazy(() => import("./pages/Attendance"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 30_000,
      gcTime: 300_000,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <SettingsProvider>
            <AuthProvider>
              <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-muted-foreground" role="status">Loading page…</div>}>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/team" element={<Team />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/certified-students" element={<CertifiedStudents />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Public certificate verification — reachable without signing in,
                  either from a QR code or a shared verification link. */}
              <Route path="/verify/certificate/:token" element={<VerifyCertificate />} />
              <Route path="/verify/certificate" element={<VerifyCertificate />} />
              <Route
                path="/admin"
                element={
                  <ProtectedAdminRoute>
                    <Admin />
                  </ProtectedAdminRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
              </Suspense>
            </AuthProvider>
          </SettingsProvider>
        </BrowserRouter>
        <Analytics />
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
