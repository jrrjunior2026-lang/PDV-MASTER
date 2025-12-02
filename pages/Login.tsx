import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../services/storageService';
import { Loader2, Lock, User, ShoppingCart, LayoutDashboard } from 'lucide-react';
import { AlertModal } from '../components/UI';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertState, setAlertState] = useState<{isOpen: boolean, title: string, message: string, type: 'info'|'error'|'success'}>({
      isOpen: false, title: '', message: '', type: 'info'
  });
  const navigate = useNavigate();

  const showAlert = (message: string, title: string = 'Atenção', type: 'info'|'error'|'success' = 'info') => {
      setAlertState({ isOpen: true, message, title, type });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const user = await StorageService.login(email, password);
    setLoading(false);
    
    if (user) {
      if (user.role === 'CASHIER') {
        navigate('/pos');
      } else {
        navigate('/');
      }
    } else {
      showAlert('Credenciais inválidas. Verifique usuário e senha.', 'Erro de Acesso', 'error');
    }
  };

  const fillCredentials = (type: 'ADMIN' | 'CASHIER') => {
      if (type === 'ADMIN') {
          setEmail('admin@pdvmaster.br');
          setPassword('admin');
      } else {
          setEmail('caixa@pdvmaster.br');
          setPassword('caixa');
      }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      <AlertModal 
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-brand-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-20 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-20 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex overflow-hidden z-10 relative">
        
        {/* Left Side - Info */}
        <div className="hidden md:flex w-1/2 bg-brand-600 p-12 flex-col justify-between text-white relative">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-brand-900 opacity-90"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                        <ShoppingCart size={24} className="text-white"/>
                    </div>
                    <span className="text-2xl font-bold tracking-tight">PDV MASTER</span>
                </div>
                <h2 className="text-4xl font-bold mb-4 leading-tight">Gestão Inteligente para sua Empresa</h2>
                <p className="text-brand-100 text-lg">Controle estoque, financeiro e vendas em um único lugar com suporte de IA.</p>
            </div>
            <div className="relative z-10 text-sm text-brand-200">
                © 2024 PDV MASTER Systems. v3.0.0
            </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
            <div className="text-center mb-8 md:hidden">
                <h1 className="text-2xl font-bold text-slate-800">PDV MASTER ERP</h1>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">Bem-vindo de volta!</h2>
            <p className="text-slate-500 mb-8">Faça login para acessar o sistema.</p>

            <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Email / Usuário</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3.5 text-slate-400" size={20} />
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition bg-slate-50 focus:bg-white"
                            placeholder="ex: admin@pdvmaster.br"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-slate-400" size={20} />
                        <input 
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition bg-slate-50 focus:bg-white"
                            placeholder="•••••••"
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-200 transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-70 mt-4"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Acessar Sistema'}
                </button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-100">
                <p className="text-center text-xs text-slate-400 mb-4 uppercase font-bold tracking-wider">JR Sistemas</p>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => fillCredentials('ADMIN')} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-brand-300 transition text-sm text-slate-600 font-medium">
                        <LayoutDashboard size={16} className="text-brand-600"/> Admin
                    </button>
                    <button onClick={() => fillCredentials('CASHIER')} className="flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-emerald-300 transition text-sm text-slate-600 font-medium">
                        <ShoppingCart size={16} className="text-emerald-600"/> Caixa
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};