import React from 'react';
import { ICartItem } from '../../types';
import { formatCurrency } from '../UI';
import { Image as ImageIcon, Package } from 'lucide-react';

interface CartPanelProps {
  cart: ICartItem[];
  cartEndRef: React.RefObject<HTMLDivElement>;
  logoUrl?: string;
}

export const CartPanel: React.FC<CartPanelProps> = ({ cart, cartEndRef, logoUrl }) => {
  return (
    <div className="w-full md:w-1/2 bg-white flex flex-col border-r border-slate-200 relative shadow-2xl z-20 overflow-hidden">
      {/* Background Layer (Logo / Watermark) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden p-20">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            className={`object-contain transition-all duration-700 ease-in-out ${cart.length === 0
              ? 'opacity-20 w-full max-h-[60%] scale-100'
              : 'opacity-[0.03] w-1/2 max-h-[40%] grayscale scale-110'
              }`}
          />
        ) : (
          <div className={`transition-all duration-700 ${cart.length === 0 ? 'opacity-10' : 'opacity-[0.02] scale-125'}`}>
            <div className="w-80 h-80 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
              <ImageIcon size={160} />
            </div>
          </div>
        )}
      </div>

      {/* Empty State Text Overlay */}
      {cart.length === 0 && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pb-20 pointer-events-none animate-fadeIn">
          <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-500 mb-6 shadow-inner border border-blue-100/50">
            <Package size={48} className="animate-pulse-subtle" />
          </div>
          <h1 className="text-5xl font-black text-slate-200 uppercase tracking-[0.2em] drop-shadow-sm">Caixa Livre</h1>
          <p className="text-slate-400 font-bold mt-4 tracking-widest uppercase text-xs opacity-50">Aguardando primeiro item...</p>
        </div>
      )}

      {/* Content Layer (Cart Items) */}
      <div className="absolute inset-0 z-10 flex flex-col overflow-hidden min-h-0">
        {cart.length > 0 && (
          <>
            <div className="grid grid-cols-12 text-[10px] font-black text-slate-400 border-b border-slate-100 py-4 px-6 bg-white/80 backdrop-blur-md uppercase tracking-[0.2em] shadow-sm shrink-0 z-30">
              <div className="col-span-1">#</div>
              <div className="col-span-7">Descrição do Produto</div>
              <div className="col-span-4 text-right">Subtotal</div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-2 min-h-0 bg-slate-50/30">
              {cart.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 items-center py-4 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300 group animate-slideInRight" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="col-span-1 text-slate-300 text-xs font-black font-mono">{String(idx + 1).padStart(2, '0')}</div>
                  <div className="col-span-7 pr-4">
                    <div className="text-lg font-black leading-tight text-slate-800 uppercase tracking-tight group-hover:text-blue-700 transition-colors">{item.name}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-tighter">{item.qty} {item.unit}</span>
                      <span className="text-slate-300">×</span>
                      <span className="text-xs font-bold text-slate-400">{formatCurrency(item.price)}</span>
                      <span className="text-slate-200 ml-auto font-mono text-[10px]">{item.code}</span>
                    </div>
                  </div>
                  <div className="col-span-4 text-right">
                    <div className="text-xl font-black text-slate-900 tracking-tighter">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={cartEndRef} className="h-10" />
            </div>

            <div className="p-6 bg-white border-t border-slate-100 shrink-0 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo da Compra</span>
                  <span className="text-slate-800 font-black text-xl">{cart.length} {cart.length === 1 ? 'PRODUTO' : 'PRODUTOS'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <Package size={20} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
