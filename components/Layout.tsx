

import React from 'react';
import { LayoutDashboard, ShoppingCart, Package, Users, FileText, Settings, LogOut, Menu, ClipboardList } from 'lucide-react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { StorageService } from '../services/storageService';

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active: boolean }> = ({ to, icon, label, active }) => (
  <Link to={to} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
    {icon}
    <span>{label}</span>
  </Link>
);

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = StorageService.getCurrentUser();
  const settings = StorageService.getSettings();

  const handleLogout = () => {
    StorageService.logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-100 flex justify-center">
          {settings.appearance.logoUrl ? (
             <img 
               src={settings.appearance.logoUrl} 
               alt="Logo" 
               className="max-h-12 max-w-full object-contain"
             />
          ) : (
             <div className="flex items-center gap-2 text-brand-600">
               <ShoppingCart size={32} />
               <span className="text-xl font-bold tracking-tight">PDV MASTER</span>
             </div>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {user?.role === 'ADMIN' && (
             <NavItem to="/" active={location.pathname === '/'} icon={<LayoutDashboard size={20}/>} label="Dashboard" />
          )}
          
          <NavItem to="/pos" active={false} icon={<ShoppingCart size={20}/>} label="PDV (Frente de Caixa)" />
          
          {user?.role === 'ADMIN' && (
            <>
              <NavItem to="/inventory" active={location.pathname === '/inventory'} icon={<Package size={20}/>} label="Estoque & Kardex" />
              <NavItem to="/finance" active={location.pathname === '/finance'} icon={<FileText size={20}/>} label="Financeiro" />
              <NavItem to="/reports" active={location.pathname === '/reports'} icon={<ClipboardList size={20}/>} label="Relatórios" />
              <NavItem to="/crm" active={location.pathname === '/crm'} icon={<Users size={20}/>} label="Clientes & CRM" />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          {user?.role === 'ADMIN' && (
            <NavItem to="/settings" active={location.pathname === '/settings'} icon={<Settings size={20}/>} label="Configurações" />
          )}
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 w-full rounded-lg mt-2 transition-colors">
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <div className="md:hidden">
            <Menu className="text-slate-500" />
          </div>
          <div className="ml-auto flex items-center gap-4">
             <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-slate-700">{user?.name || 'Visitante'}</span>
                <span className="text-xs text-slate-400">{user?.role === 'ADMIN' ? 'Gerente Geral' : 'Operador de Caixa'}</span>
             </div>
             <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold">
                {user?.name?.charAt(0) || 'V'}
             </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};