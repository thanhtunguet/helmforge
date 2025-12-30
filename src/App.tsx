import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Landing from './pages/Landing';
import Documentation from './pages/Documentation';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import NewTemplate from './pages/NewTemplate';
import TemplateDetail from './pages/TemplateDetail';
import NewVersion from './pages/NewVersion';
import VersionDetail from './pages/VersionDetail';
import ServiceAccounts from './pages/ServiceAccounts';
import EditConfigMap from './pages/EditConfigMap';
import EditSecret from './pages/EditSecret';
import EditIngress from './pages/EditIngress';
import UserManagement from './pages/UserManagement';
import CommunityTemplates from './pages/CommunityTemplates';
import CommunityTemplateDetail from './pages/CommunityTemplateDetail';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/index.html',
    element: <Navigate to="/" replace />,
  },
  {
    path: '/docs',
    element: <Documentation />,
  },
  {
    path: '/docs/index.html',
    element: <Navigate to="/docs" replace />,
  },
  {
    path: '/auth',
    element: <Auth />,
  },
  {
    path: '/auth/index.html',
    element: <Navigate to="/auth" replace />,
  },
  // Protected routes
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/templates/new',
    element: (
      <ProtectedRoute>
        <NewTemplate />
      </ProtectedRoute>
    ),
  },
  {
    path: '/templates/:templateId',
    element: (
      <ProtectedRoute>
        <TemplateDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: '/templates/:templateId/versions/new',
    element: (
      <ProtectedRoute>
        <NewVersion />
      </ProtectedRoute>
    ),
  },
  {
    path: '/templates/:templateId/versions/:versionId',
    element: (
      <ProtectedRoute>
        <VersionDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: '/templates/:templateId/configmaps/:configMapId/edit',
    element: (
      <ProtectedRoute>
        <EditConfigMap />
      </ProtectedRoute>
    ),
  },
  {
    path: '/templates/:templateId/secrets/:secretId/edit',
    element: (
      <ProtectedRoute>
        <EditSecret />
      </ProtectedRoute>
    ),
  },
  {
    path: '/templates/:templateId/ingresses/:ingressId/edit',
    element: (
      <ProtectedRoute>
        <EditIngress />
      </ProtectedRoute>
    ),
  },
  {
    path: '/service-accounts',
    element: (
      <ProtectedRoute>
        <ServiceAccounts />
      </ProtectedRoute>
    ),
  },
  {
    path: '/community',
    element: (
      <ProtectedRoute>
        <CommunityTemplates />
      </ProtectedRoute>
    ),
  },
  {
    path: '/community/:templateId',
    element: (
      <ProtectedRoute>
        <CommunityTemplateDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: '/users',
    element: (
      <ProtectedRoute>
        <UserManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;