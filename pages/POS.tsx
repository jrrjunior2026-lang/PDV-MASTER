import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, CreditCard, CheckCircle, Wifi, WifiOff, RefreshCcw, Home, User, Menu, DollarSign, X, AlertOctagon, TrendingUp, TrendingDown, Lock, ChevronRight, Monitor, Printer, Package, Copy, Smartphone, FileText, Calendar, Clock, ChevronsLeft } from 'lucide-react';

import { StorageService } from '../services/storageService';
import { IProduct, ICustomer, ISettings, ISale } from '../types';
import { formatCurrency, Button, Input, ConfirmModal, AlertModal } from '../components/UI';
import { PixService } from '../services/pixService';
import QRCode from 'qrcode';
import { AuditService } from '../services/auditService';

import { useCart } from '../hooks/pos/useCart';
import { useCashRegister } from '../hooks/pos/useCashRegister';
import { CartPanel } from '../components/pos/CartPanel';

// Define which modals are still managed by the POS component
type POSModal = 'NONE' | 'CUSTOMER' | 'PAYMENT' | 'MENU' | 'PIX_WAITING' | 'PRINT_RECEIPT';

export const POS: React.FC = () => {
  // State that remains in the main component
  const [products, setProducts] = useState<IProduct[]>([]);
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<IProduct[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const [settings, setSettings] = useState<ISettings>(StorageService.getSettings());
  
  // Custom hooks for complex logic
  const cartControl = useCart();
  const cashRegister = useCashRegister();

  // State for modals managed by this component
  const [activeModal, setActiveModal] = useState<POSModal>('NONE');
  
  // Custom Alert/Confirm States (could also be moved to a hook)
  const [confirmState, setConfirmState] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, variant?: 'primary' | 'danger'}>({
      isOpen: false, title: '', message: '', onConfirm: () => {}
  });
  const [alertState, setAlertState] = useState<{isOpen: boolean, title: string, message: string, type: 'info'|'error'|'success'}>({
      isOpen: false, title: '', message: '', type: 'info'
  });

  const showAlert = (message: string, title: string = 'Atenção', type: 'info'|'error'|'success' = 'info') => {
      setAlertState({ isOpen: true, message, title, type });
  };
  
  // UI-specific state
  const [paymentSubView, setPaymentSubView] = useState<'METHODS' | 'CASH'>('METHODS');
  const [cashReceived, setCashReceived] = useState<string>('');

  // Data for specific modals
  const [pixData, setPixData] = useState<{payload: string, img: string} | null>(null);
  const [lastSale, setLastSale] = useState<ISale | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [receiptType, setReceiptType] = useState<'NFCE' | 'RECIBO'>('NFCE');
  const [printType, setPrintType] = useState<'SALE' | 'CLOSING'>('SALE');
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cashReceivedInputRef = useRef<HTMLInputElement>(null);

  // Load Initial Data (related to products, customers, settings)
  useEffect(() => {
    setProducts(StorageService.getProducts());
    setCustomers(StorageService.getCustomers());
    setSettings(StorageService.getSettings());
    
    if (cashRegister.modal === 'NONE') {
        searchInputRef.current?.focus();
    }

    // Mock offline status
    const interval = setInterval(() => {
        setIsOffline(Math.random() > 0.95);
    }, 5000);
    return () => clearInterval(interval);
  }, [cashRegister.modal]);
  
  // Focus cash input when changing payment view
  useEffect(() => {
    if (activeModal === 'PAYMENT' && paymentSubView === 'CASH') {
        cashReceivedInputRef.current?.focus();
    }
  }, [activeModal, paymentSubView]);

  // Generate QR Code for Receipt when sale is completed
  useEffect(() => {
    if (activeModal === 'PRINT_RECEIPT' && lastSale && printType === 'SALE') {
        const url = `http://www.sefaz.gov.br/nfce/qrcode?p=${lastSale.accessKey}|2|1|1|${lastSale.total.toFixed(2).replace('.', '')}|${lastSale.date}`;
        QRCode.toDataURL(url, { width: 150, margin: 0 }).then(setQrCodeUrl);
    }
  }, [activeModal, lastSale, printType]);

  // --- Actions ---

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);

    if (val.trim().length > 0) {
        const matches = products.filter(p => 
            p.name.toLowerCase().includes(val.toLowerCase()) || 
            p.code.includes(val)
        ).slice(0, 6); 
        setSuggestions(matches);
    } else {
        setSuggestions([]);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    
    const match = products.find(p => p.code === search);
    if (match) {
        cartControl.addToCart(match);
        setSearch('');
        setSuggestions([]); 
        return;
    }
    
    if (suggestions.length === 1) {
        cartControl.addToCart(suggestions[0]);
        setSearch('');
        setSuggestions([]); 
        return;
    }

    const nameMatch = products.find(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (nameMatch) {
        cartControl.addToCart(nameMatch);
        setSearch('');
        setSuggestions([]); 
        return;
    }

    showAlert('Produto não encontrado!');
    setSearch('');
    setSuggestions([]);
  };

  const handleSelectSuggestion = (product: IProduct) => {
      cartControl.addToCart(product);
      setSearch('');
      setSuggestions([]);
      searchInputRef.current?.focus();
  };

  const handlePixPayment = async () => {
    const txId = crypto.randomUUID().replace(/-/g, '').substring(0, 25);
    
    const payload = PixService.generatePayload(
        settings.payment.pixKey || '00.000.000/0001-00',
        settings.company.fantasyName || 'PDV MASTER',
        'SAO PAULO',
        txId,
        cartControl.total
    );

    try {
        const img = await QRCode.toDataURL(payload, { width: 300, margin: 2 });
        setPixData({ payload, img });
        setActiveModal('PIX_WAITING');
    } catch (e) {
        showAlert('Erro ao gerar QR Code');
    }
  };

  const copyPixPayload = () => {
      if (pixData) {
          navigator.clipboard.writeText(pixData.payload);
          showAlert('Código PIX copiado!', 'Sucesso', 'success');
      }
  };

  const finalizeSale = async (method: 'CREDIT' | 'DEBIT' | 'CASH' | 'PIX', cashData?: { paid: number, change: number}) => {
    if (cartControl.cart.length === 0) return;
    setProcessing(true);
    
    const accessKey = `352410${Math.floor(Math.random() * 100000000000000)}550010000000011000000001`;
    
    const saleData = await StorageService.createSale({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      items: cartControl.cart,
      total: cartControl.total,
      paymentMethod: method,
      fiscalStatus: isOffline ? 'OFFLINE' : 'AUTHORIZED',
      accessKey: accessKey,
      customerId: selectedCustomer?.id,
      amountPaid: cashData?.paid,
      change: cashData?.change,
    });

    if (saleData) {
      if (method === 'CASH') {
          // The register state is already updated inside the StorageService,
          // and useCashRegister hook should reflect this change if it refetches or updates state.
          // For now, let's assume the hook's internal state is correct.
      }
      
      setLastSale(saleData);
      cartControl.clearCart();
      setSelectedCustomer(null);
      setProcessing(false);
      setPrintType('SALE');
      setPaymentSubView('METHODS');
      setCashReceived('');
      setActiveModal('PRINT_RECEIPT'); 
      setPixData(null);
      setReceiptType('NFCE');
    }
  };

  const handlePrint = () => {
      const printableArea = document.getElementById('printable-area');
      console.log('Print request:', { printType, lastSale: !!lastSale, closedRegisterData: !!cashRegister.closedRegisterData, printableArea: !!printableArea });

      if (!printableArea) {
          alert('Área de impressão não encontrada!');
          return;
      }
      if (!printableArea.textContent?.trim()) {
          alert('Não há conteúdo para imprimir!');
          return;
      }

      const printWindow = window.open('', '_blank', 'width=600,height=400');
      if (!printWindow) {
          alert('Bloqueador de pop-ups! Permita pop-ups para imprimir.');
          return;
      }

      const content = printableArea.innerHTML;
      const styles = `
          <style>
              @page { size: 80mm auto; margin: 0; } body { font-family: monospace; font-size: 10px; line-height: 1.2; margin: 0; padding: 2mm; background: white; color: black; width: 80mm; box-sizing: border-box; } .text-center { text-align: center; } .text-right { text-align: right; } .text-left { text-align: left; } .font-bold { font-weight: bold; } .uppercase { text-transform: uppercase; } .dashed-line { border-bottom: 1px dashed black; margin: 3px 0; width: 100%; display: block; } table { width: 100%; border-collapse: collapse; font-size: 9px; } th, td { padding: 1px 0; } img { max-width: 70mm; height: auto; } @media print { html, body { margin: 0; padding: 1mm; } .dashed-line { page-break-inside: avoid; } }
          </style>
      `;

      printWindow.document.write(`<!DOCTYPE html><html><head><title>Imprimir Recibo</title>${styles}</head><body>${content}</body></html>`);
      printWindow.document.close();
      printWindow.onload = () => {
          printWindow.print();
          printWindow.close();
      };
  };

  const closePrintModal = () => {
      setActiveModal('NONE');
      setLastSale(null);
      if (printType === 'CLOSING') {
          cashRegister.resetAndPrepareForNewRegister();
      } else {
          searchInputRef.current?.focus();
      }
  };
  
  const handleConfirmCloseRegister = () => {
      const closedReg = cashRegister.executeCloseRegister();
      if (closedReg) {
          setPrintType('CLOSING');
          setActiveModal('PRINT_RECEIPT');
      } else {
          showAlert('Informe o valor contado na gaveta.');
      }
  };

  const handleCancelItem = () => {
    if (cartControl.cart.length > 0) {
        const itemToRemove = cartControl.cart[cartControl.cart.length - 1];
        setConfirmState({
            isOpen: true,
            title: 'Cancelar Item',
            message: `Deseja remover o item "${itemToRemove.name}" do carrinho?`,
            variant: 'danger',
            onConfirm: () => {
                AuditService.log('ITEM_CANCEL', `Cancelou item: ${itemToRemove.name} (R$ ${itemToRemove.total.toFixed(2)})`, 'WARNING');
                cartControl.removeLastItem();
            }
        });
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (cashRegister.modal !== 'NONE' || activeModal !== 'NONE' || confirmState.isOpen || alertState.isOpen) return;

        switch(e.key) {
            case 'F1':
                e.preventDefault();
                searchInputRef.current?.focus();
                break;
            case 'F2':
                e.preventDefault();
                setActiveModal('CUSTOMER');
                break;
            case 'F5':
                e.preventDefault();
                if (cartControl.cart.length > 0) {
                    setPaymentSubView('METHODS');
                    setCashReceived('');
                    setActiveModal('PAYMENT');
                }
                break;
            case 'F8':
                e.preventDefault();
                handleCancelItem();
                break;
            case 'F10':
                e.preventDefault();
                setActiveModal('MENU');
                break;
            case 'Escape':
                e.preventDefault();
                if (suggestions.length > 0) {
                    setSuggestions([]);
                } else {
                    searchInputRef.current?.focus();
                }
                break;
            default:
                break;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, cashRegister.modal, cartControl.cart.length, suggestions, confirmState.isOpen, alertState.isOpen]);

  const lastItem = cartControl.cart[cartControl.cart.length - 1];
  const changeAmount = parseFloat(cashReceived.replace(',', '.')) - cartControl.total;

  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-800 font-sans overflow-hidden">
        
        <ConfirmModal 
            isOpen={confirmState.isOpen}
            onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
            onConfirm={confirmState.onConfirm}
            title={confirmState.title}
            message={confirmState.message}
            variant={confirmState.variant}
        />
        
        <AlertModal 
            isOpen={alertState.isOpen}
            onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
            title={alertState.title}
            message={alertState.message}
            type={alertState.type}
        />

        {/* TOP BAR */}
        <header className="h-12 bg-blue-950 flex items-center justify-between px-4 shrink-0 z-30 shadow-md border-b border-blue-900">
            <div className="flex items-center gap-4">
                <Link to="/" className="text-blue-200 hover:text-white transition"><Home size={18} /></Link>
                <div className="h-4 w-[1px] bg-blue-800"></div>
                <h1 className="font-bold text-sm tracking-wide text-blue-100 uppercase">{settings.company.fantasyName || 'PDV MASTER'}</h1>
            </div>
            <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isOffline ? 'bg-red-900 text-red-200' : 'bg-emerald-900 text-emerald-200'}`}>
                    {isOffline ? <WifiOff size={10} /> : <Wifi size={10} />}
                    {isOffline ? 'OFFLINE' : 'ONLINE'}
                </div>
                <div className="text-xs text-blue-200 font-mono">
                    CAIXA: {cashRegister.register?.id.slice(0,4) || 'FECHADO'} | OP: ADMIN
                </div>
            </div>
        </header>

        {/* MAIN CONTENT SPLIT 50/50 */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            <CartPanel 
              cart={cartControl.cart}
              cartEndRef={cartControl.cartEndRef}
              logoUrl={settings.appearance.logoUrl}
            />

            {/* RIGHT: INFO PANEL (50%) */}
            <div className="w-full md:w-1/2 flex flex-col bg-slate-50 relative border-l border-slate-300">
                
                {/* 1. TOP BAR */}
                <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shadow-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${selectedCustomer ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                            <User size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400">Cliente Identificado</p>
                            <p className={`font-bold text-lg leading-none truncate max-w-[200px] ${selectedCustomer ? 'text-blue-800' : 'text-slate-500'}`}>
                                {selectedCustomer ? selectedCustomer.name : 'CONSUMIDOR FINAL'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setActiveModal('CUSTOMER')}
                        className="px-4 py-2 bg-slate-100 hover:bg-blue-50 text-blue-600 rounded text-xs font-bold uppercase transition border border-slate-200 hover:border-blue-200 whitespace-nowrap"
                    >
                        Trocar (F2)
                    </button>
                </div>

                {/* 2. MIDDLE: HERO LAST ITEM */}
                <div className="flex-1 flex flex-col justify-center items-center p-8 z-10 relative overflow-hidden">
                     <p className="text-blue-500 font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2 self-center">
                        <Monitor size={16}/> Último Registro
                     </p>
                     
                     {lastItem ? (
                         <div className="animate-slideInRight w-full max-w-2xl text-center">
                            <h1 className="text-4xl md:text-3xl font-black text-slate-800 leading-snug mb-6 drop-shadow-sm uppercase break-words line-clamp-3 py-2 px-2">
                                {lastItem.name}
                            </h1>
                            <div className="flex items-end justify-between border-t-2 border-slate-200 pt-6 px-4">
                                <div className="text-left">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Valor Unitário</p>
                                    <p className="text-2xl md:text-2xl font-bold text-slate-600">{formatCurrency(lastItem.price)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Item</p>
                                    <p className="text-3xl md:text-4xl font-black text-blue-600 tracking-tighter leading-none">{formatCurrency(lastItem.total)}</p>
                                </div>
                            </div>
                         </div>
                     ) : (
                         <div className="text-center opacity-20">
                            <h1 className="text-6xl md:text-8xl font-black text-slate-400 uppercase tracking-widest">LIVRE</h1>
                         </div>
                     )}
                </div>

                {/* 3. SEARCH BAR INTEGRATED */}
                <div className="px-8 pb-8 pt-4 z-20 shrink-0 w-full max-w-4xl mx-auto">
                    <form onSubmit={handleSearch} className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="text-blue-500 group-focus-within:text-blue-600" size={24} />
                        </div>
                        <input 
                            ref={searchInputRef}
                            value={search}
                            onChange={handleInput}
                            className="block w-full pl-12 pr-4 py-4 border-2 border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-xl font-bold transition shadow-md"
                            placeholder="Digitar código ou nome (F1)"
                            autoComplete="off"
                        />
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                            <kbd className="hidden sm:inline-block border border-slate-200 rounded px-2 text-sm font-sans font-medium text-slate-400">ENTER</kbd>
                        </div>

                        {suggestions.length > 0 && (
                            <div className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-fadeInUp origin-bottom">
                                <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 text-xs font-bold text-blue-600 uppercase flex justify-between">
                                    <span>Produtos Sugeridos</span>
                                    <span>(Clique para adicionar)</span>
                                </div>
                                {suggestions.map((p, idx) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => handleSelectSuggestion(p)}
                                        className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-brand-50 hover:pl-6 transition-all duration-200 group flex justify-between items-center ${idx === 0 ? 'bg-slate-50' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-brand-500 transition">
                                                <Package size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-base leading-tight group-hover:text-brand-700">{p.name}</p>
                                                <p className="text-xs text-slate-500 font-mono mt-0.5">{p.code}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-slate-700 text-lg group-hover:text-brand-600">{formatCurrency(p.price)}</p>
                                            <p className={`text-[10px] font-bold ${p.stock <= p.minStock ? 'text-red-500' : 'text-emerald-600'}`}>
                                                EST: {p.stock}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </form>
                </div>

                {/* 4. BOTTOM: TOTAL & PAY */}
                <div className="bg-blue-900 p-8 z-20 text-white shadow-[0_-5px_30px_rgba(0,0,0,0.15)] shrink-0">
                    <div className="flex justify-between items-end mb-6">
                        <div className="text-blue-300 font-bold uppercase tracking-widest text-sm mb-1">Total a Pagar</div>
                        <div className="text-6xl font-black tracking-tighter">{formatCurrency(cartControl.total)}</div>
                    </div>
                    <button 
                        disabled={cartControl.cart.length === 0}
                        onClick={() => {
                            setPaymentSubView('METHODS');
                            setCashReceived('');
                            setActiveModal('PAYMENT');
                        }}
                        className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-2xl font-black uppercase tracking-wide rounded-xl shadow-lg transition-transform active:scale-[0.99] flex items-center justify-center gap-3"
                    >
                        <span>FINALIZAR VENDA (F5)</span>
                        <ChevronRight size={28} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </div>

        {/* FOOTER SHORTCUTS */}
        <div className="bg-white border-t border-slate-200 py-3 flex justify-center gap-6 text-sm uppercase font-bold text-slate-500 tracking-wider shrink-0 overflow-x-auto">
             {[
                {k:'F1', l:'Busca'}, {k:'F2', l:'Cliente'}, {k:'F5', l:'Pagamento'}, 
                {k:'F8', l:'Cancelar Item'}, {k:'F10', l:'Menu'}, {k:'ESC', l:'Voltar'}
             ].map(s => (
                 <button 
                    key={s.k} 
                    className="flex items-center gap-2 cursor-pointer hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition active:scale-95 whitespace-nowrap" 
                    onClick={() => {
                        const key = s.k === 'Busca' ? 'F1' : s.k === 'Voltar' ? 'Escape' : s.k.split(' ')[0];
                        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
                    }}
                 >
                     <span className="bg-slate-100 border-2 border-slate-300 px-2 py-0.5 rounded text-slate-700 text-xs font-black shadow-sm">{s.k}</span> 
                     <span>{s.l}</span>
                 </button>
             ))}
        </div>

        {/* --- MODALS --- */}
        
        {/* OPEN REGISTER MODAL */}
        {cashRegister.modal === 'OPEN_BOX' && (
            <div className="fixed inset-0 bg-blue-950/90 z-50 flex items-center justify-center backdrop-blur-md">
                 <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl animate-scaleIn overflow-hidden">
                     <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Lock size={24} /></div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Abertura de Caixa</h2>
                                <p className="text-xs text-slate-500 font-medium">Inicie o turno de vendas</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-slate-700 flex items-center justify-end gap-1"><Calendar size={14}/> {new Date().toLocaleDateString()}</p>
                            <p className="text-xs text-slate-500 flex items-center justify-end gap-1"><Clock size={12}/> {new Date().toLocaleTimeString().slice(0,5)}</p>
                        </div>
                     </div>
                     <div className="p-8">
                         <div className="grid grid-cols-2 gap-4 mb-6">
                             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                 <p className="text-xs text-slate-400 font-bold uppercase mb-1">Operador</p>
                                 <p className="font-bold text-slate-700 flex items-center gap-2"><User size={16}/> ADMIN</p>
                             </div>
                             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                 <p className="text-xs text-slate-400 font-bold uppercase mb-1">Saldo Anterior</p>
                                 <p className={`font-bold flex items-center gap-2 ${cashRegister.lastClosedRegister ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                                     <DollarSign size={16}/> 
                                     {cashRegister.lastClosedRegister ? formatCurrency(cashRegister.lastClosedRegister.finalCount || 0) : 'N/A'}
                                 </p>
                             </div>
                         </div>
                         <div className="mb-8">
                             <label className="block text-slate-600 font-bold mb-3 text-sm uppercase tracking-wider text-center">Informe o Fundo de Troco (R$)</label>
                             <div className="relative max-w-xs mx-auto">
                                <Input 
                                    autoFocus
                                    type="number"
                                    value={cashRegister.openingBalance}
                                    onChange={e => cashRegister.setOpeningBalance(e.target.value)}
                                    className="text-center text-4xl py-4 font-black border-2 border-blue-100 text-slate-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 rounded-xl shadow-inner bg-slate-50"
                                    placeholder="0,00"
                                />
                             </div>
                         </div>
                         <Button onClick={cashRegister.openRegister} className="w-full py-4 text-lg font-bold shadow-xl bg-blue-600 hover:bg-blue-700 text-white rounded-xl">CONFIRMAR ABERTURA</Button>
                         <div className="mt-4 text-center">
                            <Link to="/" className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider transition-colors">Voltar ao Dashboard</Link>
                         </div>
                     </div>
                 </div>
            </div>
        )}

        {/* CLOSE REGISTER MODAL */}
        {cashRegister.modal === 'CLOSE_BOX' && cashRegister.closingSummary && (
            <div className="fixed inset-0 bg-blue-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
                <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl animate-scaleIn overflow-hidden">
                    <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><AlertOctagon className="text-red-500"/> Fechamento de Caixa</h2>
                        <button onClick={() => cashRegister.setModal('NONE')} className="text-slate-400 hover:text-slate-600"><X/></button>
                    </div>
                    <div className="p-8">
                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center"><span className="text-slate-500">Fundo de Abertura</span><span className="font-bold">{formatCurrency(cashRegister.closingSummary.opening)}</span></div>
                            <div className="flex justify-between items-center text-emerald-600"><span className="flex items-center gap-2"><TrendingUp size={16}/> Vendas em Dinheiro</span><span className="font-bold">+ {formatCurrency(cashRegister.closingSummary.salesCash)}</span></div>
                            <div className="flex justify-between items-center text-blue-600"><span className="flex items-center gap-2"><TrendingUp size={16}/> Suprimentos</span><span className="font-bold">+ {formatCurrency(cashRegister.closingSummary.supply)}</span></div>
                            <div className="flex justify-between items-center text-red-600"><span className="flex items-center gap-2"><TrendingDown size={16}/> Sangrias</span><span className="font-bold">- {formatCurrency(cashRegister.closingSummary.bleed)}</span></div>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl mb-6">
                            <label className="block text-amber-900 font-bold mb-2 uppercase text-xs tracking-wider">Conferência Física (Gaveta)</label>
                            <Input 
                                autoFocus
                                type="number"
                                value={cashRegister.closingCount}
                                onChange={e => cashRegister.setClosingCount(e.target.value)}
                                className="text-center text-3xl font-black bg-white border-amber-300 focus:ring-amber-500 text-amber-900"
                                placeholder="0,00"
                            />
                            {cashRegister.closingCount && (<div className={`text-center mt-3 text-sm font-bold ${ (parseFloat(cashRegister.closingCount.replace(',','.')) - cashRegister.closingSummary.calculated) >= -0.01 ? 'text-emerald-600' : 'text-red-600' }`}>Diferença: {formatCurrency(parseFloat(cashRegister.closingCount.replace(',','.')) - cashRegister.closingSummary.calculated)}</div>)}
                        </div>
                        <Button onClick={() => setConfirmState({ isOpen: true, title: 'Fechar Caixa', message: 'Deseja realmente fechar o caixa agora?', variant: 'danger', onConfirm: handleConfirmCloseRegister })} className="w-full py-4 text-lg font-bold shadow-lg bg-slate-800 hover:bg-slate-900 text-white">CONFIRMAR FECHAMENTO</Button>
                    </div>
                </div>
            </div>
        )}

        {/* PRINT RECEIPT MODAL */}
        {activeModal === 'PRINT_RECEIPT' && ((lastSale && printType === 'SALE') || (cashRegister.closedRegisterData && printType === 'CLOSING')) && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                 <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex shadow-2xl overflow-hidden animate-scaleIn">
                    <div className="w-1/2 bg-slate-100 p-8 overflow-y-auto flex justify-center">
                        <div id="printable-area" className="bg-white shadow-lg w-[80mm] min-h-[120mm] p-4 text-[10px] font-mono leading-tight text-slate-800 border-t-4 border-slate-300">
                             {printType === 'SALE' && lastSale ? (
                                <>
                                    <div className="text-center mb-2">
                                        <h2 className="font-bold text-sm uppercase">{settings.company.fantasyName}</h2>
                                        <p>{settings.company.corporateName}</p><p>{settings.company.address}</p>
                                        <p>CNPJ: {settings.company.cnpj}  IE: {settings.company.ie}</p>
                                        <hr className="border-dashed border-slate-300 my-2" />
                                        <h3 className="font-bold uppercase mb-1">{receiptType === 'NFCE' ? 'Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica' : 'RECIBO SIMPLES - SEM VALOR FISCAL'}</h3>
                                        {receiptType === 'NFCE' && <p>Não permite aproveitamento de crédito de ICMS</p>}
                                    </div>
                                    <table className="w-full mb-2">
                                        <thead><tr className="border-b border-dashed border-slate-400"><th className="text-left">Item</th><th className="text-right">Qtd</th><th className="text-right">Unit</th><th className="text-right">Total</th></tr></thead>
                                        <tbody>{lastSale.items.map((item, idx) => (<tr key={idx}><td className="truncate max-w-[30mm]">{item.name}</td><td className="text-right">{item.qty}</td><td className="text-right">{item.price.toFixed(2)}</td><td className="text-right">{item.total.toFixed(2)}</td></tr>))}</tbody>
                                    </table>
                                    <hr className="border-dashed border-slate-300 my-2" />
                                    <div className="flex justify-between font-bold text-xs"><span>TOTAL R$</span><span>{lastSale.total.toFixed(2).replace('.',',')}</span></div>
                                    <div className="flex justify-between mt-1"><span>Forma Pagamento</span><span>{lastSale.paymentMethod}</span></div>
                                    {lastSale.paymentMethod === 'CASH' && (<> <div className="flex justify-between"><span>Valor Recebido</span><span>{formatCurrency(lastSale.amountPaid || 0)}</span></div> <div className="flex justify-between font-bold"><span>Troco</span><span>{formatCurrency(lastSale.change || 0)}</span></div></>)}
                                    <hr className="border-dashed border-slate-300 my-2" />
                                    <div className="text-center"><p>Consumidor: {customers.find(c => c.id === lastSale.customerId)?.name || 'Não Identificado'}</p>{customers.find(c => c.id === lastSale.customerId)?.document && (<p>CPF: {customers.find(c => c.id === lastSale.customerId)?.document}</p>)}</div>
                                    {receiptType === 'NFCE' && (<div className="mt-4 text-center"><p className="mb-1 text-[9px]">Consulta via Leitor de QR Code</p><div className="flex justify-center mb-1">{qrCodeUrl && <img src={qrCodeUrl} className="w-24 h-24" alt="QR Code" />}</div><p className="break-all text-[8px] mb-2 font-bold">Chave de Acesso: <br/> {lastSale.accessKey?.replace(/(.{4})/g, '$1 ')}</p><p>Protocolo de Autorização: 135240001234567</p><p>Data de Autorização: {new Date(lastSale.date).toLocaleString()}</p></div>)}
                                    <div className="mt-4 text-center border-t border-dashed border-slate-300 pt-2"><p>Tributos Totais Incidentes (Lei Federal 12.741/2012): R$ {(lastSale.total * 0.18).toFixed(2)}</p><p className="mt-2 font-bold italic">PDV MASTER ERP</p></div>
                                </>
                             ) : ( cashRegister.closedRegisterData && (
                                    <>
                                        <div className="text-center mb-4"><h2 className="font-bold text-sm uppercase">Relatório de Fechamento</h2><p>Caixa: {cashRegister.closedRegisterData.id.slice(0,8)}</p><p>Operador: ADMIN</p><p>Abertura: {new Date(cashRegister.closedRegisterData.openedAt).toLocaleString()}</p><p>Fechamento: {new Date(cashRegister.closedRegisterData.closedAt!).toLocaleString()}</p></div>
                                        <hr className="border-dashed border-slate-300 my-2" />
                                        <div className="space-y-1"><div className="flex justify-between"><span>(+) Abertura</span><span>{formatCurrency(cashRegister.closedRegisterData.openingBalance)}</span></div><div className="flex justify-between font-bold mt-2"><span>(=) Saldo Sistema</span><span>{formatCurrency(cashRegister.closedRegisterData.currentBalance)}</span></div><div className="flex justify-between font-bold"><span>(=) Saldo Físico</span><span>{formatCurrency(cashRegister.closedRegisterData.finalCount || 0)}</span></div><hr className="border-dashed border-slate-300 my-2" /><div className="flex justify-between font-black text-xs"><span>DIFERENÇA</span><span>{formatCurrency(cashRegister.closedRegisterData.difference || 0)}</span></div></div>
                                        <div className="mt-8 text-center text-[9px] italic"><p>Conferido por: _______________________</p></div>
                                    </>
                                )
                             )}
                        </div>
                    </div>
                    <div className="w-1/2 p-10 bg-white flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-6 text-emerald-600"><CheckCircle size={48} /><h2 className="text-3xl font-bold text-slate-800">{printType === 'SALE' ? 'Venda Finalizada!' : 'Caixa Fechado!'}</h2></div>
                            <p className="text-slate-500 mb-8 text-lg">{printType === 'SALE' ? 'Selecione o tipo de comprovante para imprimir.' : 'Imprima o relatório de fechamento para conferência.'}</p>
                            {printType === 'SALE' && (
                                <div className="space-y-4"><label className="flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 transition group"><input type="radio" name="receiptType" checked={receiptType === 'NFCE'} onChange={() => setReceiptType('NFCE')} className="w-5 h-5 text-blue-600" /><div className="flex-1"><p className="font-bold text-slate-800 group-hover:text-blue-700">Nota Fiscal (NFC-e)</p><p className="text-sm text-slate-400">Documento fiscal válido com QR Code</p></div><div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FileText size={24}/></div></label><label className="flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 transition group"><input type="radio" name="receiptType" checked={receiptType === 'RECIBO'} onChange={() => setReceiptType('RECIBO')} className="w-5 h-5 text-blue-600" /><div className="flex-1"><p className="font-bold text-slate-800 group-hover:text-blue-700">Recibo Simples</p><p className="text-sm text-slate-400">Comprovante de venda sem valor fiscal</p></div><div className="p-2 bg-slate-100 text-slate-600 rounded-lg"><Printer size={24}/></div></label></div>
                            )}
                        </div>
                        <div className="space-y-3">
                            <Button onClick={handlePrint} className="w-full py-4 text-xl font-bold shadow-lg shadow-blue-200 gap-3"><Printer size={24}/> IMPRIMIR {printType === 'SALE' ? (receiptType === 'NFCE' ? 'NFC-e' : 'RECIBO') : 'RELATÓRIO'}</Button>
                            <Button variant="secondary" onClick={closePrintModal} className="w-full py-4 font-bold text-slate-500">{printType === 'SALE' ? 'Fechar e Nova Venda (ESC)' : 'Fechar e Sair'}</Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* PAYMENT MODAL */}
        {activeModal === 'PAYMENT' && (
             <div className="fixed inset-0 bg-blue-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
                <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] flex shadow-2xl overflow-hidden animate-scaleIn">
                    <div className="w-1/3 bg-slate-50 p-10 flex flex-col justify-between border-r border-slate-200"><h3 className="text-slate-400 font-bold uppercase tracking-wider mb-2 text-sm">Resumo do Pagamento</h3><p className="text-6xl font-black text-slate-800 tracking-tighter mb-8">{formatCurrency(cartControl.total)}</p><div className="space-y-4 text-slate-600"><div className="flex justify-between border-b border-slate-200 pb-3"><span className="font-medium">Itens</span><span className="font-bold text-lg">{cartControl.cart.length}</span></div><div className="flex justify-between border-b border-slate-200 pb-3"><span className="font-medium">Cliente</span><span className="font-bold text-right">{selectedCustomer?.name || 'Não Identificado'}</span></div></div><Button variant="secondary" onClick={() => setActiveModal('NONE')} className="w-full py-4 uppercase font-bold">Cancelar (ESC)</Button></div>
                    <div className="w-2/3 p-10 bg-white overflow-y-auto relative">
                        {paymentSubView === 'METHODS' && (<div className="animate-fadeIn"><h3 className="text-2xl font-bold text-slate-800 mb-8">Como o cliente vai pagar?</h3><div className="grid grid-cols-2 gap-6"><button onClick={() => setPaymentSubView('CASH')} className="h-40 bg-white hover:bg-emerald-50 border-2 rounded-2xl flex flex-col items-center justify-center gap-4 transition group"><div className="p-4 bg-emerald-100 rounded-full text-emerald-600"><DollarSign size={40}/></div><span className="font-bold text-xl">Dinheiro</span></button><button onClick={handlePixPayment} className="h-40 bg-white hover:bg-brand-50 border-2 rounded-2xl flex flex-col items-center justify-center gap-4 transition group"><div className="p-4 bg-brand-100 rounded-full text-brand-600"><Smartphone size={40}/></div><span className="font-bold text-xl">PIX</span></button><button onClick={() => finalizeSale('DEBIT')} className="h-40 bg-white hover:bg-blue-50 border-2 rounded-2xl flex flex-col items-center justify-center gap-4 transition group"><div className="p-4 bg-blue-100 rounded-full text-blue-600"><CreditCard size={40}/></div><span className="font-bold text-xl">Débito</span></button><button onClick={() => finalizeSale('CREDIT')} className="h-40 bg-white hover:bg-purple-50 border-2 rounded-2xl flex flex-col items-center justify-center gap-4 transition group"><div className="p-4 bg-purple-100 rounded-full text-purple-600"><CreditCard size={40}/></div><span className="font-bold text-xl">Crédito</span></button></div></div>)}
                        {paymentSubView === 'CASH' && (<div className="animate-fadeIn flex flex-col h-full"><button onClick={() => setPaymentSubView('METHODS')} className="absolute top-6 left-6 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800"><ChevronsLeft size={18}/> Voltar</button><h3 className="text-2xl font-bold text-slate-800 mb-2 text-center">Pagamento em Dinheiro</h3><p className="text-center text-slate-500 mb-8">Informe o valor recebido para calcular o troco.</p><div className="space-y-4 mb-6"><Input label="Valor Recebido (R$)" type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value)} ref={cashReceivedInputRef} className="text-center text-4xl py-4 font-black" placeholder="0,00" /><div className="grid grid-cols-4 gap-2">{[5, 10, 20, 50, 100, cartControl.total].map(val => (<button key={val} onClick={() => setCashReceived(val.toFixed(2).replace('.',','))} className="py-2 bg-slate-100 rounded-lg font-bold">{val === cartControl.total ? 'Exato' : `R$ ${val}`}</button>))}</div></div><div className={`flex-1 p-6 rounded-xl flex flex-col items-center justify-center text-center transition ${changeAmount >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}><p className="text-sm font-bold uppercase text-blue-800">Troco</p><p className="text-7xl font-black text-blue-900 tracking-tighter">{formatCurrency(changeAmount >= 0 ? changeAmount : 0)}</p></div><Button onClick={() => finalizeSale('CASH', { paid: parseFloat(cashReceived.replace(',','.')), change: changeAmount })} disabled={changeAmount < 0 || !cashReceived} className="w-full py-5 text-xl font-bold mt-6">Confirmar Pagamento</Button></div>)}
                        {processing && (<div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-3 text-blue-600 animate-pulse font-bold backdrop-blur-sm"><RefreshCcw className="animate-spin" size={32} /><span>Processando...</span></div>)}
                    </div>
                </div>
             </div>
        )}

        {/* PIX MODAL (WAITING) */}
        {activeModal === 'PIX_WAITING' && pixData && (
             <div className="fixed inset-0 bg-blue-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
                <div className="bg-white rounded-xl w-full max-w-lg p-8 shadow-2xl animate-scaleIn text-center">
                    <div className="mb-6"><div className="p-4 bg-brand-100 rounded-full text-brand-600 inline-block"><Smartphone size={48} /></div></div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Escaneie o QR Code</h2>
                    <p className="text-slate-500 mb-6">Abra o aplicativo do seu banco e pague via PIX</p>
                    <div className="bg-white p-4 rounded-xl border-2 inline-block mb-6"><img src={pixData.img} alt="QR Code Pix" className="w-64 h-64" /></div>
                    <div className="mb-8"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Valor</p><p className="text-4xl font-black text-brand-600">{formatCurrency(cartControl.total)}</p></div>
                    <div className="space-y-4">
                        <div className="relative"><input readOnly value={pixData.payload} className="w-full pl-4 pr-12 py-3 bg-slate-50 rounded-lg text-xs font-mono truncate" /><button onClick={copyPixPayload} className="absolute right-2 top-2 p-1.5 bg-white rounded"><Copy size={16} /></button></div>
                        <Button onClick={() => finalizeSale('PIX')} className="w-full py-4 text-lg font-bold">PAGAMENTO RECEBIDO</Button>
                        <button onClick={() => setActiveModal('PAYMENT')} className="text-slate-400 hover:text-red-500 font-bold">Cancelar</button>
                    </div>
                </div>
             </div>
        )}

        {/* CUSTOMER MODAL */}
        {activeModal === 'CUSTOMER' && (
             <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                 <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl animate-scaleIn">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><User size={24} className="text-blue-600"/> Identificar Cliente</h3>
                    <div className="max-h-64 overflow-y-auto space-y-3 mb-6 pr-2">
                        <button onClick={() => { setSelectedCustomer(null); setActiveModal('NONE'); searchInputRef.current?.focus(); }} className="w-full text-left p-4 hover:bg-blue-50 rounded-xl border-2 transition"><span className="font-bold text-lg">Consumidor Final</span></button>
                        {customers.map(c => (<button key={c.id} onClick={() => { setSelectedCustomer(c); setActiveModal('NONE'); searchInputRef.current?.focus(); }} className="w-full text-left p-4 hover:bg-blue-50 rounded-xl border-2 flex justify-between items-center group"><div><span className="font-bold block group-hover:text-blue-700">{c.name}</span><span className="text-xs text-slate-400">{c.email || 'Sem email'}</span></div><span className="font-mono text-sm bg-slate-100 px-3 py-1 rounded-lg">{c.document}</span></button>))}
                    </div>
                    <Button variant="secondary" onClick={() => setActiveModal('NONE')} className="w-full py-3">Cancelar</Button>
                 </div>
             </div>
        )}
        
        {/* F10 MENU */}
        {activeModal === 'MENU' && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-fadeIn">
                    <div className="p-6 border-b flex justify-between items-center bg-slate-50"><h2 className="text-xl font-bold flex items-center gap-2"><Menu className="text-blue-600"/> Menu de Funções</h2><button onClick={() => setActiveModal('NONE')} className="text-slate-400 hover:text-red-500"><X /></button></div>
                    <div className="p-8 grid grid-cols-2 md:grid-cols-3 gap-6">
                        <button onClick={() => { cashRegister.setModal('SUPRIMENTO'); cashRegister.setTransactionAmount(''); cashRegister.setTransactionReason(''); setActiveModal('NONE'); }} className="p-6 hover:bg-emerald-50 rounded-xl flex flex-col items-center gap-3 transition border"><div className="p-3 bg-emerald-100 rounded-full text-emerald-600"><TrendingUp size={32} /></div><span>Suprimento</span></button>
                        <button onClick={() => { cashRegister.setModal('SANGRIA'); cashRegister.setTransactionAmount(''); cashRegister.setTransactionReason(''); setActiveModal('NONE'); }} className="p-6 hover:bg-red-50 rounded-xl flex flex-col items-center gap-3 transition border"><div className="p-3 bg-red-100 rounded-full text-red-600"><TrendingDown size={32} /></div><span>Sangria</span></button>
                        <button onClick={() => { cashRegister.initiateCloseRegister(); setActiveModal('NONE'); }} className="p-6 hover:bg-amber-50 rounded-xl flex flex-col items-center gap-3 transition border"><div className="p-3 bg-amber-100 rounded-full text-amber-600"><AlertOctagon size={32} /></div><span>Fechar Caixa</span></button>
                    </div>
                </div>
            </div>
        )}

        {/* GENERIC CASH MODAL */}
        {(cashRegister.modal === 'SANGRIA' || cashRegister.modal === 'SUPRIMENTO') && (
             <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-scaleIn">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">{cashRegister.modal === 'SANGRIA' ? <TrendingDown className="text-red-500"/> : <TrendingUp className="text-emerald-500"/>}{cashRegister.modal === 'SANGRIA' ? 'Realizar Sangria' : 'Realizar Suprimento'}</h3>
                    <div className="space-y-4"><Input label="Valor (R$)" type="number" autoFocus value={cashRegister.transactionAmount} onChange={e => cashRegister.setTransactionAmount(e.target.value)} /><Input label="Motivo / Descrição" value={cashRegister.transactionReason} onChange={e => cashRegister.setTransactionReason(e.target.value)} /></div>
                    <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => cashRegister.setModal('NONE')}>Cancelar</Button><Button variant={cashRegister.modal === 'SANGRIA' ? 'danger' : 'success'} onClick={() => cashRegister.addCashTransaction(cashRegister.modal === 'SANGRIA' ? 'BLEED' : 'SUPPLY')}>Confirmar</Button></div>
                </div>
             </div>
        )}
    </div>
  );
};
