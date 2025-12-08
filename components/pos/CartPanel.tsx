import React from 'react';
import { ICartItem } from '../../types';
import { formatCurrency } from '../UI';
import { Image as ImageIcon } from 'lucide-react';

interface CartPanelProps {
  cart: ICartItem[];
  cartEndRef: React.RefObject<HTMLDivElement>;
  logoUrl?: string;
}

export const CartPanel: React.FC<CartPanelProps> = ({ cart, cartEndRef, logoUrl }) => {
  return (
    <div className="w-full md:w-1/2 bg-white flex flex-col border-r border-slate-300 relative shadow-lg z-20">
      {/* Background Layer (Logo / Watermark) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden p-10">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt="Logo" 
            className={`object-contain transition-all duration-500 ease-in-out ${
              cart.length === 0 
              ? 'opacity-100 w-full max-h-[70%]' 
              : 'opacity-5 w-2/3 max-h-[60%] grayscale'
            }`}
          />
        ) : (
          <div className={`transition-all duration-500 ${cart.length === 0 ? 'opacity-100' : 'opacity-5'}`}>
            <div className="w-64 h-64 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
              <ImageIcon size={120} />
            </div>
          </div>
        )}
      </div>

      {/* Empty State Text Overlay */}
      {cart.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-end justify-center pb-20 pointer-events-none">
          <h1 className="text-4xl md:text-5xl font-black text-slate-300 uppercase tracking-widest drop-shadow-md">Caixa Livre</h1>
        </div>
      )}

      {/* Content Layer (Cart Items) */}
      <div className="absolute inset-0 z-10 flex flex-col overflow-hidden min-h-0">
        {cart.length > 0 && (
          <>
            <div className="grid grid-cols-12 text-xs font-bold text-slate-500 border-b border-slate-200 py-3 px-4 bg-white/95 backdrop-blur-sm uppercase shadow-sm shrink-0 z-30">
              <div className="col-span-1">#</div>
              <div className="col-span-7">Descrição</div>
              <div className="col-span-4 text-right">Total</div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 min-h-0">
              {cart.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 items-start py-2 border-b border-dashed border-slate-300/50 last:border-0 relative">
                  <div className="col-span-1 text-slate-400 text-sm mt-1 font-mono">{idx + 1}</div>
                  <div className="col-span-7 pr-2">
                    <div className="text-lg font-bold leading-tight text-slate-800 uppercase drop-shadow-sm break-words">{item.name}</div>
                    <div className="text-xs text-slate-600 mt-1 font-medium">
                      {item.qty} {item.unit} x {formatCurrency(item.price)} ({item.code})
                    </div>
                  </div>
                  <div className="col-span-4 text-right font-bold text-lg text-slate-900 mt-1">
                    {formatCurrency(item.total)}
                  </div>
                </div>
              ))}
              <div ref={cartEndRef} className="h-4" />
            </div>

            <div className="p-4 bg-slate-100/90 border-t border-slate-200 backdrop-blur-sm mt-auto shrink-0 z-30">
              <div className="flex justify-between items-center text-slate-600 font-bold text-lg">
                <span>ITENS</span>
                <span>{cart.length}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
