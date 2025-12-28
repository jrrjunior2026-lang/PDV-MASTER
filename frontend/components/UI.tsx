import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' }> = ({
  children, variant = 'primary', className = '', ...props
}) => {
  const base = "px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-300 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-3";
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-blue-600 shadow-xl hover:shadow-blue-200",
    secondary: "bg-slate-100 text-slate-600 hover:bg-slate-200",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-xl shadow-red-100",
    success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-100",
    ghost: "bg-transparent text-slate-400 hover:text-slate-900 hover:bg-slate-50"
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string }>(({ label, className = '', ...props }, ref) => (
  <div className="flex flex-col gap-2 w-full">
    {label && <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>}
    <input
      ref={ref}
      className={`bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:ring-8 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-800 placeholder-slate-300 ${className}`}
      {...props}
    />
  </div>
));
Input.displayName = "Input";


export const Card: React.FC<{ children: React.ReactNode, title?: string, className?: string }> = ({ children, title, className = '' }) => (
  <div className={`bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 ${className}`}>
    {title && <h3 className="text-xl font-black text-slate-900 mb-6 tracking-tight uppercase">{title}</h3>}
    {children}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode, color?: string }> = ({ children, color = 'bg-slate-100 text-slate-600' }) => (
  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${color}`}>
    {children}
  </span>
);

export const formatCurrency = (val: any) => {
  const num = Number(val);
  if (isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

/* --- New Modal Components --- */

export const ModalOverlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 bg-slate-950/80 z-[60] flex items-center justify-center p-6 backdrop-blur-xl animate-fadeIn">
    {children}
  </div>
);

export const ConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', variant = 'primary' }) => {
  if (!isOpen) return null;
  return (
    <ModalOverlay>
      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-[0_30px_100px_rgba(0,0,0,0.4)] animate-scaleIn border border-white/20">
        <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{title}</h3>
        <p className="text-slate-500 mb-10 leading-relaxed font-medium">{message}</p>
        <div className="flex flex-col gap-3">
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }} className="w-full py-5 text-lg">
            {confirmText}
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full py-4">
            {cancelText}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
};

export const AlertModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}> = ({ isOpen, onClose, title, message, type = 'info' }) => {
  if (!isOpen) return null;

  const defaultTitle = type === 'error' ? 'Ops! Algo deu errado' : type === 'success' ? 'Sucesso!' : 'Atenção';

  return (
    <ModalOverlay>
      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-[0_30px_100px_rgba(0,0,0,0.4)] animate-scaleIn border border-white/20 text-center">
        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 ${type === 'error' ? 'bg-red-50 text-red-500' : type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'}`}>
          {type === 'error' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
          ) : type === 'success' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          )}
        </div>
        <h3 className={`text-2xl font-black mb-3 tracking-tight ${type === 'error' ? 'text-red-600' : 'text-slate-900'}`}>
          {title || defaultTitle}
        </h3>
        <p className="text-slate-500 mb-10 leading-relaxed font-medium">{message}</p>
        <Button onClick={onClose} variant={type === 'error' ? 'danger' : 'primary'} className="w-full py-5 text-lg">
          OK, Entendi
        </Button>
      </div>
    </ModalOverlay>
  );
};