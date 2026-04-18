import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { DashboardLayout } from "./components/layout/DashboardLayout";

// Lazy Load Pages
const Dashboard = lazy(() => import("./features/dashboard/DashboardPage"));
const ProjectsPage = lazy(() => import("./features/projects/ProjectsPage"));
const PipelinePage = lazy(() => import("./features/pipelines/PipelinesPage"));
const ReportsPage = lazy(() => import("./features/reports/ReportsPage"));
const Settings = lazy(() => import("./features/settings/SettingsPage"));
const DevelopersPage = lazy(() => import("./features/developers/DevelopersPage"));
const DeveloperDetailPage = lazy(() => import("./features/developers/DeveloperDetailPage"));
const GroupsPage = lazy(() => import("./features/groups/GroupsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Loading Fallback
const PageLoader = () => (
  <DashboardLayout>
    <div className="flex items-center justify-center h-[80vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  </DashboardLayout>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/landing" replace />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/pipelines" element={<PipelinePage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/developers" element={<DevelopersPage />} />
              <Route path="/developers/:username" element={<DeveloperDetailPage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
