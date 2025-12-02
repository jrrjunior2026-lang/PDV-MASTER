
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
import { StorageService } from './services/storageService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'ADMIN' | 'CASHIER'>;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
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

const App: React.FC = () => {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Admin Routes */}
          <Route path="/" element={<ProtectedRoute allowedRoles={['ADMIN']}><Dashboard /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute allowedRoles={['ADMIN']}><Inventory /></ProtectedRoute>} />
          <Route path="/finance" element={<ProtectedRoute allowedRoles={['ADMIN']}><Finance /></ProtectedRoute>} />
          <Route path="/crm" element={<ProtectedRoute allowedRoles={['ADMIN']}><CRM /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute allowedRoles={['ADMIN']}><Settings /></ProtectedRoute>} />
          
          {/* Shared/Cashier Routes */}
          <Route path="/pos" element={<ProtectedRoute allowedRoles={['ADMIN', 'CASHIER']}><POS /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
