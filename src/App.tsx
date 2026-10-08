import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { DataProvider } from "./contexts/DataContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Screens from "./pages/Screens";
import ScreenDetails from "./pages/ScreenDetails";
import ScreenEdit from "./pages/ScreenEdit";
import Users from "./pages/Users";
import Media from "./pages/Media";
import Playlists from "./pages/Playlists";
import PlaylistEditor from "./pages/PlaylistEditor";
import PlaylistPreview from "./pages/PlaylistPreview";
import Schedules from "./pages/Schedules";
import ScheduleEditor from "./pages/ScheduleEditor";
import AdminManagement from "./pages/AdminManagement";
import MessageLimits from "./pages/MessageLimits";
import AppUpdates from "./pages/AppUpdates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <DataProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Layout><Dashboard /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/screens" 
              element={
                <ProtectedRoute>
                  <Layout><Screens /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/screens/:id" 
              element={
                <ProtectedRoute>
                  <Layout><ScreenDetails /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/screens/:id/edit" 
              element={
                <ProtectedRoute>
                  <Layout><ScreenEdit /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/users" 
              element={
                <ProtectedRoute>
                  <Layout><Users /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/media" 
              element={
                <ProtectedRoute>
                  <Layout><Media /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/playlists" 
              element={
                <ProtectedRoute>
                  <Layout><Playlists /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/playlists/:id/edit" 
              element={
                <ProtectedRoute>
                  <Layout><PlaylistEditor /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/playlists/:id/preview" 
              element={
                <ProtectedRoute>
                  <PlaylistPreview />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/schedules" 
              element={
                <ProtectedRoute>
                  <Layout><Schedules /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/schedules/:id/edit" 
              element={
                <ProtectedRoute>
                  <Layout><ScheduleEditor /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/schedules/new" 
              element={
                <ProtectedRoute>
                  <Layout><ScheduleEditor /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admins" 
              element={
                <ProtectedRoute>
                  <Layout><AdminManagement /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/message-limits" 
              element={
                <ProtectedRoute>
                  <Layout><MessageLimits /></Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/app-updates" 
              element={
                <ProtectedRoute>
                  <Layout><AppUpdates /></Layout>
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
