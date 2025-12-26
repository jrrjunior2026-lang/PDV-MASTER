

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingCart, Package, Users, FileText, Settings, LogOut, Menu, X, ClipboardList, Wifi, WifiOff } from 'lucide-react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { StorageService } from '../services/storageService';
import { SyncStatusIndicator } from './SyncStatus';

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active: boolean; onClick?: () => void }> = ({ to, icon, label, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
      }`}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

const MobileNavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({ to, icon, label, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-brand-50 text-brand-700 font-semibold border-r-2 border-brand-600' : 'text-slate-600 hover:bg-slate-50'
      }`}
  >
    {icon}
    <span>{label}</span>
  </Link>
);

export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = StorageService.getCurrentUser();
  const [settings, setSettings] = useState<any>({
    appearance: { logoUrl: null, primaryColor: '#0ea5e9' }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load settings from Supabase
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings = await StorageService.getSettings();
        setSettings(loadedSettings);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleLogout = () => {
    StorageService.logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    setMobileMenuOpen(false); // Close mobile menu on navigation
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navigationItems = [
    user?.role === 'ADMIN' && { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard', active: location.pathname === '/' },
    { to: '/pos', icon: <ShoppingCart size={20} />, label: 'PDV (Caixa)', active: location.pathname === '/pos' },
    ...(user?.role === 'ADMIN' ? [
      { to: '/inventory', icon: <Package size={20} />, label: 'Estoque', active: location.pathname === '/inventory' },
      { to: '/finance', icon: <FileText size={20} />, label: 'Financeiro', active: location.pathname === '/finance' },
      { to: '/reports', icon: <ClipboardList size={20} />, label: 'Relatórios', active: location.pathname === '/reports' },
      { to: '/crm', icon: <Users size={20} />, label: 'Clientes', active: location.pathname === '/crm' },
    ] : [])
  ].filter(Boolean);

  return (
    <div className="flex h-screen bg-slate-50 relative">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-center">
          {settings?.appearance?.logoUrl ? (
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
          {navigationItems.map((item, index) =>
            item && (
              <NavItem key={index} to={item.to} icon={item.icon} label={item.label} active={item.active} />
            )
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-1">
          {/* Sync Status */}
          {user?.role === 'ADMIN' && (
            <div className="mb-3">
              <SyncStatusIndicator compact />
            </div>
          )}

          {user?.role === 'ADMIN' && (
            <NavItem to="/settings" active={location.pathname === '/settings'} icon={<Settings size={20} />} label="Configurações" />
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 w-full rounded-lg mt-2 transition-colors"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-brand-600">
            <ShoppingCart size={24} />
            <span className="text-lg font-bold">PDV MASTER</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item, index) =>
            item && (
              <MobileNavItem
                key={index}
                to={item.to}
                icon={item.icon}
                label={item.label}
                active={item.active}
                onClick={handleNavClick}
              />
            )
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          {/* Compact Sync Status for mobile */}
          {user?.role === 'ADMIN' && (
            <div className="mb-3">
              <SyncStatusIndicator compact />
            </div>
          )}

          {user?.role === 'ADMIN' && (
            <MobileNavItem
              to="/settings"
              icon={<Settings size={20} />}
              label="Configurações"
              active={location.pathname === '/settings'}
              onClick={handleNavClick}
            />
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 w-full rounded-lg mt-2 transition-colors"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="flex-shrink-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors md:hidden"
          >
            <Menu size={20} />
          </button>

          {/* Page Title for Mobile */}
          <h1 className="md:hidden text-lg font-semibold text-slate-800 truncate">
            {navigationItems.find(item => item?.active)?.label || 'PDV Master'}
          </h1>

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            {/* Sync Status - Desktop only */}
            {user?.role === 'ADMIN' && window.innerWidth >= 768 && (
              <SyncStatusIndicator compact />
            )}

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-slate-700">{user?.name || 'Visitante'}</span>
                <span className="text-xs text-slate-400">{user?.role === 'ADMIN' ? 'Gerente Geral' : 'Operador de Caixa'}</span>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-sm">
                {user?.name?.charAt(0) || 'V'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 min-h-0">
          <div className="max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
