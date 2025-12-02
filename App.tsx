import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { Inventory } from './pages/Inventory';
import { Login } from './pages/Login';
import { Finance } from './pages/Finance';
import { CRM } from './pages/CRM';
import { Settings } from './pages/Settings';
import { Reports } from './pages/Reports';
import { StorageService } from './services/storageService';

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
    <HashRouter>
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
    </HashRouter>
  );
};

export default App;