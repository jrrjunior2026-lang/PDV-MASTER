import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StorageService } from './services/storageService';

// Lazy load components for better performance
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const POS = lazy(() => import('./pages/POS').then(m => ({ default: m.POS })));
const Inventory = lazy(() => import('./pages/Inventory').then(m => ({ default: m.Inventory })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Finance = lazy(() => import('./pages/Finance').then(m => ({ default: m.Finance })));
const CRM = lazy(() => import('./pages/CRM').then(m => ({ default: m.CRM })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));

// Loading fallback component
const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
  </div>
);

interface ProtectedRouteProps {
  allowedRoles?: Array<'ADMIN' | 'CASHIER'>;
}

const ProtectedRoute: React.FC<React.PropsWithChildren<ProtectedRouteProps>> = ({ children, allowedRoles }) => {
  const user = StorageService.getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check Role Access
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If Cashier tries to access Admin routes, send to POS
    if (user.role === 'CASHIER') {
      return <Navigate to="/pos" replace />;
    }
    // Default fallback
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// This component acts as a wrapper for all routes that need the main layout
const AppLayout: React.FC = () => (
  <Layout />
);

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Routes WITHOUT the main layout (e.g., fullscreen) */}
            <Route path="/login" element={<Login />} />

            {/* POS route is protected but also fullscreen */}
            <Route
              path="/pos"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'CASHIER']}>
                  <POS />
                </ProtectedRoute>
              }
            />

            {/* Routes WITH the main layout */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']}><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/reports" element={<Reports />} />
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;
