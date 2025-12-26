import React from 'react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'success' }> = ({ 
  children, variant = 'primary', className = '', ...props 
}) => {
  const base = "px-4 py-2 rounded-md font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-200",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-100"
  };
  
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// FIX: Wrapped Input component with React.forwardRef to allow passing refs to the underlying input element.
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string }>(({ label, className = '', ...props }, ref) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>}
    <input 
      ref={ref}
      className={`border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors ${className}`}
      {...props} 
    />
  </div>
));
Input.displayName = "Input";


export const Card: React.FC<{ children: React.ReactNode, title?: string, className?: string }> = ({ children, title, className = '' }) => (
  <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 ${className}`}>
    {title && <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>}
    {children}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode, color?: string }> = ({ children, color = 'bg-slate-100 text-slate-600' }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
    {children}
  </span>
);

export const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

/* --- New Modal Components --- */

export const ModalOverlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
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
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl animate-scaleIn">
        <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>{cancelText}</Button>
          <Button variant={variant} onClick={() => { onConfirm(); onClose(); }}>{confirmText}</Button>
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
  
  const defaultTitle = type === 'error' ? 'Erro' : type === 'success' ? 'Sucesso' : 'Atenção';
  
  return (
    <ModalOverlay>
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl animate-scaleIn">
        <h3 className={`text-xl font-bold mb-2 ${type === 'error' ? 'text-red-600' : 'text-slate-800'}`}>
            {title || defaultTitle}
        </h3>
        <p className="text-slate-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end">
          <Button onClick={onClose} variant={type === 'error' ? 'danger' : 'primary'}>OK</Button>
        </div>
      </div>
    </ModalOverlay>
  );
};