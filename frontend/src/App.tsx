import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import About from "./pages/About";
import Dashboard from "./pages/Dashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import DeafDashboard from "./pages/DeafDashboard";
import BlindMode from "./pages/BlindMode";
import LearnMode from "./pages/LearnMode";
import DeafLearnMode from "./pages/DeafLearnMode";
import DeafVideoMode from "./pages/DeafVideoMode";
import Flowchart from "./pages/Flowchart";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

import { ThemeProvider } from "@/context/ThemeContext";
import { ThemeLayout } from "@/components/ThemeLayout";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <ThemeLayout>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/about" element={<About />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
              <Route path="/deaf-dashboard" element={<DeafDashboard />} />
              <Route path="/blind" element={<BlindMode />} />
              <Route path="/learn" element={<LearnMode />} />
              <Route path="/deaf-learn" element={<DeafLearnMode />} />
              <Route path="/deaf-video" element={<DeafVideoMode />} />
              <Route path="/flowchart" element={<Flowchart />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ThemeLayout>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
