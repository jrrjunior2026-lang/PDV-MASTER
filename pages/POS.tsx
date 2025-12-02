import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, CreditCard, Trash2, CheckCircle, Wifi, WifiOff, RefreshCcw, Home, User, Menu, DollarSign, X, AlertOctagon, TrendingUp, TrendingDown, Lock, ChevronRight, Monitor, Printer, Image as ImageIcon, Package, Copy, Smartphone, FileText, Calendar, Clock } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { IProduct, ICartItem, ICustomer, ISettings, ICashRegister, ISale } from '../types';
import { formatCurrency, Button, Input, ConfirmModal, AlertModal } from '../components/UI';
import { PixService } from '../services/pixService';
import QRCode from 'qrcode';

export const POS: React.FC = () => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [cart, setCart] = useState<ICartItem[]>([]);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<IProduct[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);
  const [settings, setSettings] = useState<ISettings>(StorageService.getSettings());
  const [register, setRegister] = useState<ICashRegister | null>(null);
  const [lastClosedRegister, setLastClosedRegister] = useState<ICashRegister | null>(null);
  
  // Modals State
  const [activeModal, setActiveModal] = useState<'NONE' | 'CUSTOMER' | 'PAYMENT' | 'MENU' | 'OPEN_BOX' | 'SANGRIA' | 'SUPRIMENTO' | 'PIX_WAITING' | 'PRINT_RECEIPT' | 'CLOSE_BOX'>('NONE');
  
  // Custom Alert/Confirm States
  const [confirmState, setConfirmState] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, variant?: 'primary' | 'danger'}>({
      isOpen: false, title: '', message: '', onConfirm: () => {}
  });
  const [alertState, setAlertState] = useState<{isOpen: boolean, title: string, message: string, type: 'info'|'error'|'success'}>({
      isOpen: false, title: '', message: '', type: 'info'
  });

  const showAlert = (message: string, title: string = 'Atenção', type: 'info'|'error'|'success' = 'info') => {
      setAlertState({ isOpen: true, message, title, type });
  };

  // Forms State
  const [cashValue, setCashValue] = useState<string>('');
  const [cashReason, setCashReason] = useState<string>('');
  
  // PIX State
  const [pixData, setPixData] = useState<{payload: string, img: string} | null>(null);
  
  // Printing State
  const [lastSale, setLastSale] = useState<ISale | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [receiptType, setReceiptType] = useState<'NFCE' | 'RECIBO'>('NFCE');
  const [printType, setPrintType] = useState<'SALE' | 'CLOSING'>('SALE');

  // Closing State
  const [closingSummary, setClosingSummary] = useState<any>(null);
  const [closingCount, setClosingCount] = useState<string>('');
  const [closedRegisterData, setClosedRegisterData] = useState<ICashRegister | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const cartEndRef = useRef<HTMLDivElement>(null);

  // Load Initial Data
  useEffect(() => {
    setProducts(StorageService.getProducts());
    setCustomers(StorageService.getCustomers());
    setSettings(StorageService.getSettings());
    
    const currentReg = StorageService.getCurrentRegister();
    setRegister(currentReg);
    
    if (!currentReg) {
        // Fetch last closed register info for opening modal context
        const lastClosed = StorageService.getLastClosedRegister();
        setLastClosedRegister(lastClosed);
        setActiveModal('OPEN_BOX');
    } else {
        searchInputRef.current?.focus();
    }

    const interval = setInterval(() => {
        setIsOffline(Math.random() > 0.95);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (cart.length > 0) {
        cartEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [cart]);

  // Generate QR Code for Receipt when sale is completed
  useEffect(() => {
    if (activeModal === 'PRINT_RECEIPT' && lastSale && printType === 'SALE') {
        const url = `http://www.sefaz.gov.br/nfce/qrcode?p=${lastSale.accessKey}|2|1|1|${lastSale.total.toFixed(2).replace('.', '')}|${lastSale.date}`;
        QRCode.toDataURL(url, { width: 150, margin: 0 }).then(setQrCodeUrl);
    }
  }, [activeModal, lastSale, printType]);

  // --- Actions ---

  const addToCart = useCallback((product: IProduct) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, qty: p.qty + 1, total: (p.qty + 1) * p.price } : p);
      }
      return [...prev, { ...product, qty: 1, total: product.price }];
    });
    setSearch('');
    setSuggestions([]); 
  }, []);

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
        addToCart(match);
        return;
    }
    
    if (suggestions.length === 1) {
        addToCart(suggestions[0]);
        return;
    }

    const nameMatch = products.find(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (nameMatch) {
        addToCart(nameMatch);
        return;
    }

    showAlert('Produto não encontrado!');
    setSearch('');
    setSuggestions([]);
  };

  const handleSelectSuggestion = (product: IProduct) => {
      addToCart(product);
      searchInputRef.current?.focus();
  };

  const handlePixPayment = async () => {
    const total = cart.reduce((acc, item) => acc + item.total, 0);
    const txId = crypto.randomUUID().replace(/-/g, '').substring(0, 25);
    
    const payload = PixService.generatePayload(
        settings.payment.pixKey || '00.000.000/0001-00',
        settings.company.fantasyName || 'PDV MASTER',
        'SAO PAULO',
        txId,
        total
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

  const finalizeSale = async (method: 'CREDIT' | 'DEBIT' | 'CASH' | 'PIX') => {
    if (cart.length === 0) return;
    setProcessing(true);
    
    const accessKey = `352410${Math.floor(Math.random() * 100000000000000)}550010000000011000000001`;
    const total = cart.reduce((acc, item) => acc + item.total, 0);
    
    const saleData = await StorageService.createSale({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      items: cart,
      total,
      paymentMethod: method,
      fiscalStatus: isOffline ? 'OFFLINE' : 'AUTHORIZED',
      accessKey: accessKey,
      customerId: selectedCustomer?.id
    });

    if (saleData) {
      if (method === 'CASH') {
          setRegister(StorageService.getCurrentRegister());
      }
      
      setLastSale(saleData);
      setCart([]);
      setSelectedCustomer(null);
      setProcessing(false);
      setPrintType('SALE');
      setActiveModal('PRINT_RECEIPT'); 
      setPixData(null);
      setReceiptType('NFCE');
    }
  };

  const handlePrint = () => {
      window.print();
  };

  const closePrintModal = () => {
      setActiveModal('NONE');
      setLastSale(null);
      if (printType === 'CLOSING') {
          setActiveModal('OPEN_BOX'); 
      } else {
          searchInputRef.current?.focus();
      }
  };

  // --- Cash Management & Shortcuts ---
  const handleOpenRegister = () => {
    const val = parseFloat(cashValue.replace(',', '.'));
    if (isNaN(val)) return showAlert('Valor inválido. Digite um número.');
    
    const reg = StorageService.openRegister(val, 'ADMIN');
    setRegister(reg);
    setActiveModal('NONE');
    setCashValue('');
    searchInputRef.current?.focus();
  };

  const handleSangriaSuprimento = (type: 'BLEED' | 'SUPPLY') => {
    const val = parseFloat(cashValue.replace(',', '.'));
    if (isNaN(val) || !cashReason) return showAlert('Preencha valor e motivo');

    StorageService.addCashTransaction({
        id: crypto.randomUUID(),
        registerId: register!.id,
        type: type,
        amount: val,
        description: cashReason,
        date: new Date().toISOString()
    });
    
    setRegister(StorageService.getCurrentRegister());
    setActiveModal('NONE');
    setCashValue('');
    setCashReason('');
    showAlert(`${type === 'BLEED' ? 'Sangria' : 'Suprimento'} realizada com sucesso.`, 'Sucesso', 'success');
  };

  const initCloseRegister = () => {
      const summary = StorageService.getRegisterSummary();
      setClosingSummary(summary);
      setClosingCount('');
      setActiveModal('CLOSE_BOX');
  };

  const confirmCloseRegister = () => {
      const count = parseFloat(closingCount.replace(',', '.'));
      if (isNaN(count)) return showAlert('Informe o valor contado na gaveta.');

      setConfirmState({
          isOpen: true,
          title: 'Fechar Caixa',
          message: 'Deseja realmente fechar o caixa agora? Esta ação emitirá a Redução Z.',
          variant: 'danger',
          onConfirm: () => {
              const closedReg = StorageService.closeRegister(count);
              if (closedReg) {
                  setClosedRegisterData(closedReg);
                  setRegister(null);
                  setPrintType('CLOSING');
                  setActiveModal('PRINT_RECEIPT');
              }
          }
      });
  };

  const handleCloseRegister = () => {
      // Direct Close from Menu (deprecated, redirects to proper flow)
      initCloseRegister();
  };

  const handleCancelItem = () => {
    if (cart.length > 0) {
        setConfirmState({
            isOpen: true,
            title: 'Cancelar Item',
            message: `Deseja remover o item "${cart[cart.length - 1].name}" do carrinho?`,
            variant: 'danger',
            onConfirm: () => {
                setCart(prev => prev.slice(0, -1));
            }
        });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (activeModal === 'OPEN_BOX' || confirmState.isOpen || alertState.isOpen) return;

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
                if (cart.length > 0) setActiveModal('PAYMENT');
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
                } else if (activeModal !== 'NONE') {
                    if (activeModal === 'PIX_WAITING') setActiveModal('PAYMENT');
                    else if (activeModal === 'PRINT_RECEIPT') closePrintModal();
                    else setActiveModal('NONE');
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
  }, [activeModal, cart, suggestions, printType, confirmState, alertState]);

  const total = cart.reduce((acc, item) => acc + item.total, 0);
  const lastItem = cart[cart.length - 1];

  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-800 font-sans overflow-hidden">
        
        {/* Modals for Alert and Confirm */}
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
                    CAIXA: {register?.id.slice(0,4) || 'FECHADO'} | OP: ADMIN
                </div>
            </div>
        </header>

        {/* MAIN CONTENT SPLIT 50/50 */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* LEFT: RECEIPT CART (50%) */}
            <div className="w-full md:w-1/2 bg-white flex flex-col border-r border-slate-300 relative shadow-lg z-20">
                
                {/* Background Layer (Logo / Watermark) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden p-10">
                    {settings.appearance.logoUrl ? (
                        <img 
                            src={settings.appearance.logoUrl} 
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
                        <div className="text-6xl font-black tracking-tighter">{formatCurrency(total)}</div>
                    </div>
                    <button 
                        disabled={cart.length === 0}
                        onClick={() => setActiveModal('PAYMENT')}
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
                        const evt = new KeyboardEvent('keydown', { key: s.k === 'Busca' ? 'F1' : s.k === 'Voltar' ? 'Escape' : s.k.split(' ')[0] });
                        window.dispatchEvent(evt);
                    }}
                 >
                     <span className="bg-slate-100 border-2 border-slate-300 px-2 py-0.5 rounded text-slate-700 text-xs font-black shadow-sm">{s.k}</span> 
                     <span>{s.l}</span>
                 </button>
             ))}
        </div>

        {/* --- MODALS --- */}
        
        {/* OPEN REGISTER MODAL (UPDATED) */}
        {activeModal === 'OPEN_BOX' && (
            <div className="fixed inset-0 bg-blue-950/90 z-50 flex items-center justify-center backdrop-blur-md">
                 <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl animate-scaleIn overflow-hidden">
                     {/* Header */}
                     <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <Lock size={24} />
                            </div>
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
                         {/* Info Cards */}
                         <div className="grid grid-cols-2 gap-4 mb-6">
                             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                 <p className="text-xs text-slate-400 font-bold uppercase mb-1">Operador</p>
                                 <p className="font-bold text-slate-700 flex items-center gap-2"><User size={16}/> ADMIN</p>
                             </div>
                             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                 <p className="text-xs text-slate-400 font-bold uppercase mb-1">Saldo Anterior</p>
                                 <p className={`font-bold flex items-center gap-2 ${lastClosedRegister ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                                     <DollarSign size={16}/> 
                                     {lastClosedRegister ? formatCurrency(lastClosedRegister.finalCount || 0) : 'N/A'}
                                 </p>
                             </div>
                         </div>

                         {/* Input Area */}
                         <div className="mb-8">
                             <label className="block text-slate-600 font-bold mb-3 text-sm uppercase tracking-wider text-center">
                                 Informe o Fundo de Troco (R$)
                             </label>
                             <div className="relative max-w-xs mx-auto">
                                <Input 
                                    autoFocus
                                    type="number"
                                    value={cashValue}
                                    onChange={e => setCashValue(e.target.value)}
                                    className="text-center text-4xl py-4 font-black border-2 border-blue-100 text-slate-800 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 rounded-xl shadow-inner bg-slate-50"
                                    placeholder="0,00"
                                />
                             </div>
                         </div>
                         
                         {/* Action Buttons */}
                         <Button onClick={handleOpenRegister} className="w-full py-4 text-lg font-bold shadow-xl bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                            CONFIRMAR ABERTURA
                         </Button>
                         <div className="mt-4 text-center">
                            <Link to="/" className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-wider transition-colors">Voltar ao Dashboard</Link>
                         </div>
                     </div>
                 </div>
            </div>
        )}

        {/* CLOSE REGISTER MODAL */}
        {activeModal === 'CLOSE_BOX' && closingSummary && (
            <div className="fixed inset-0 bg-blue-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
                <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl animate-scaleIn overflow-hidden">
                    <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <AlertOctagon className="text-red-500"/> Fechamento de Caixa
                        </h2>
                        <button onClick={() => setActiveModal('MENU')} className="text-slate-400 hover:text-slate-600"><X/></button>
                    </div>
                    
                    <div className="p-8">
                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2">
                                <span className="text-slate-500 font-medium">Fundo de Abertura</span>
                                <span className="font-bold text-slate-700">{formatCurrency(closingSummary.opening)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2 text-emerald-600">
                                <span className="font-medium flex items-center gap-2"><TrendingUp size={16}/> Vendas em Dinheiro</span>
                                <span className="font-bold">+ {formatCurrency(closingSummary.salesCash)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2 text-blue-600">
                                <span className="font-medium flex items-center gap-2"><TrendingUp size={16}/> Suprimentos</span>
                                <span className="font-bold">+ {formatCurrency(closingSummary.supply)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-dashed border-slate-200 pb-2 text-red-600">
                                <span className="font-medium flex items-center gap-2"><TrendingDown size={16}/> Sangrias</span>
                                <span className="font-bold">- {formatCurrency(closingSummary.bleed)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 bg-slate-100 p-3 rounded-lg">
                                <span className="font-bold text-slate-700 uppercase text-sm">Saldo Esperado</span>
                                <span className="font-black text-xl text-slate-800">{formatCurrency(closingSummary.calculated)}</span>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl mb-6">
                            <label className="block text-amber-900 font-bold mb-2 uppercase text-xs tracking-wider">Conferência Física (Contagem da Gaveta)</label>
                            <Input 
                                autoFocus
                                type="number"
                                value={closingCount}
                                onChange={e => setClosingCount(e.target.value)}
                                className="text-center text-3xl font-black bg-white border-amber-300 focus:ring-amber-500 text-amber-900"
                                placeholder="0,00"
                            />
                            {closingCount && (
                                <div className={`text-center mt-3 text-sm font-bold ${
                                    (parseFloat(closingCount.replace(',','.')) - closingSummary.calculated) >= -0.01 
                                    ? 'text-emerald-600' 
                                    : 'text-red-600'
                                }`}>
                                    Diferença: {formatCurrency(parseFloat(closingCount.replace(',','.')) - closingSummary.calculated)}
                                </div>
                            )}
                        </div>

                        <Button onClick={confirmCloseRegister} className="w-full py-4 text-lg font-bold shadow-lg bg-slate-800 hover:bg-slate-900 text-white">
                            CONFIRMAR FECHAMENTO
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* PRINT RECEIPT MODAL */}
        {activeModal === 'PRINT_RECEIPT' && ((lastSale && printType === 'SALE') || (closedRegisterData && printType === 'CLOSING')) && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex shadow-2xl overflow-hidden animate-scaleIn">
                    {/* Left: Preview */}
                    <div className="w-1/2 bg-slate-100 p-8 overflow-y-auto flex justify-center">
                        <div className="bg-white shadow-lg w-[80mm] min-h-[120mm] p-4 text-[10px] font-mono leading-tight text-slate-800 border-t-4 border-slate-300 relative">
                             {/* Print Content Switcher */}
                             {printType === 'SALE' && lastSale ? (
                                <>
                                    <div className="text-center mb-2">
                                        <h2 className="font-bold text-sm uppercase">{settings.company.fantasyName}</h2>
                                        <p>{settings.company.corporateName}</p>
                                        <p>{settings.company.address}</p>
                                        <p>CNPJ: {settings.company.cnpj}  IE: {settings.company.ie}</p>
                                        <hr className="border-dashed border-slate-300 my-2" />
                                        <h3 className="font-bold uppercase mb-1">
                                            {receiptType === 'NFCE' ? 'Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica' : 'RECIBO SIMPLES - SEM VALOR FISCAL'}
                                        </h3>
                                        {receiptType === 'NFCE' && <p>Não permite aproveitamento de crédito de ICMS</p>}
                                    </div>
                                    
                                    <table className="w-full mb-2">
                                        <thead>
                                            <tr className="border-b border-dashed border-slate-400">
                                                <th className="text-left">Item</th>
                                                <th className="text-right">Qtd</th>
                                                <th className="text-right">Unit</th>
                                                <th className="text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lastSale.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="truncate max-w-[30mm]">{item.name}</td>
                                                    <td className="text-right">{item.qty}</td>
                                                    <td className="text-right">{item.price.toFixed(2)}</td>
                                                    <td className="text-right">{item.total.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    
                                    <hr className="border-dashed border-slate-300 my-2" />
                                    <div className="flex justify-between font-bold text-xs">
                                        <span>TOTAL R$</span>
                                        <span>{lastSale.total.toFixed(2).replace('.',',')}</span>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span>Forma Pagamento</span>
                                        <span>{lastSale.paymentMethod}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Valor Pago</span>
                                        <span>{lastSale.total.toFixed(2).replace('.',',')}</span>
                                    </div>
                                    
                                    <hr className="border-dashed border-slate-300 my-2" />
                                    
                                    <div className="text-center">
                                        <p>Consumidor: {customers.find(c => c.id === lastSale.customerId)?.name || 'Não Identificado'}</p>
                                        {customers.find(c => c.id === lastSale.customerId)?.document && (
                                            <p>CPF: {customers.find(c => c.id === lastSale.customerId)?.document}</p>
                                        )}
                                    </div>

                                    {receiptType === 'NFCE' && (
                                        <div className="mt-4 text-center">
                                            <p className="mb-1 text-[9px]">Consulta via Leitor de QR Code</p>
                                            <div className="flex justify-center mb-1">
                                                {qrCodeUrl && <img src={qrCodeUrl} className="w-24 h-24" alt="QR Code" />}
                                            </div>
                                            <p className="break-all text-[8px] mb-2 font-bold">Chave de Acesso: <br/> {lastSale.accessKey?.replace(/(.{4})/g, '$1 ')}</p>
                                            <p>Protocolo de Autorização: 135240001234567</p>
                                            <p>Data de Autorização: {new Date(lastSale.date).toLocaleString()}</p>
                                        </div>
                                    )}
                                    <div className="mt-4 text-center border-t border-dashed border-slate-300 pt-2">
                                        <p>Tributos Totais Incidentes (Lei Federal 12.741/2012): R$ {(lastSale.total * 0.18).toFixed(2)}</p>
                                        <p className="mt-2 font-bold italic">PDV MASTER ERP</p>
                                    </div>
                                </>
                             ) : (
                                // CLOSING REPORT
                                closedRegisterData && (
                                    <>
                                        <div className="text-center mb-4">
                                            <h2 className="font-bold text-sm uppercase">Relatório de Fechamento</h2>
                                            <p>Caixa: {closedRegisterData.id.slice(0,8)}</p>
                                            <p>Operador: ADMIN</p>
                                            <p>Abertura: {new Date(closedRegisterData.openedAt).toLocaleString()}</p>
                                            <p>Fechamento: {new Date(closedRegisterData.closedAt!).toLocaleString()}</p>
                                        </div>
                                        <hr className="border-dashed border-slate-300 my-2" />
                                        
                                        <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <span>(+) Abertura</span>
                                                <span>{formatCurrency(closedRegisterData.openingBalance)}</span>
                                            </div>
                                            {/* We need to recalculate totals here or pass them, simplified for demo */}
                                            <div className="flex justify-between font-bold mt-2">
                                                <span>(=) Saldo Sistema</span>
                                                <span>{formatCurrency(closedRegisterData.currentBalance)}</span>
                                            </div>
                                            <div className="flex justify-between font-bold">
                                                <span>(=) Saldo Físico</span>
                                                <span>{formatCurrency(closedRegisterData.finalCount || 0)}</span>
                                            </div>
                                            <hr className="border-dashed border-slate-300 my-2" />
                                            <div className="flex justify-between font-black text-xs">
                                                <span>DIFERENÇA</span>
                                                <span>{formatCurrency(closedRegisterData.difference || 0)}</span>
                                            </div>
                                        </div>
                                        <div className="mt-8 text-center text-[9px] italic">
                                            <p>Conferido por: _______________________</p>
                                        </div>
                                    </>
                                )
                             )}
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="w-1/2 p-10 bg-white flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-6 text-emerald-600">
                                <CheckCircle size={48} />
                                <h2 className="text-3xl font-bold text-slate-800">
                                    {printType === 'SALE' ? 'Venda Finalizada!' : 'Caixa Fechado!'}
                                </h2>
                            </div>
                            <p className="text-slate-500 mb-8 text-lg">
                                {printType === 'SALE' 
                                 ? 'Selecione o tipo de comprovante para imprimir.'
                                 : 'Imprima o relatório de fechamento para conferência.'}
                            </p>
                            
                            {printType === 'SALE' && (
                                <div className="space-y-4">
                                    <label className="flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 transition group">
                                        <input type="radio" name="receiptType" checked={receiptType === 'NFCE'} onChange={() => setReceiptType('NFCE')} className="w-5 h-5 text-blue-600" />
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-800 group-hover:text-blue-700">Nota Fiscal (NFC-e)</p>
                                            <p className="text-sm text-slate-400">Documento fiscal válido com QR Code</p>
                                        </div>
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FileText size={24}/></div>
                                    </label>
                                    
                                    <label className="flex items-center gap-4 p-4 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 transition group">
                                        <input type="radio" name="receiptType" checked={receiptType === 'RECIBO'} onChange={() => setReceiptType('RECIBO')} className="w-5 h-5 text-blue-600" />
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-800 group-hover:text-blue-700">Recibo Simples</p>
                                            <p className="text-sm text-slate-400">Comprovante de venda sem valor fiscal</p>
                                        </div>
                                        <div className="p-2 bg-slate-100 text-slate-600 rounded-lg"><Printer size={24}/></div>
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <Button onClick={handlePrint} className="w-full py-4 text-xl font-bold shadow-lg shadow-blue-200 gap-3">
                                <Printer size={24}/> IMPRIMIR {printType === 'SALE' ? (receiptType === 'NFCE' ? 'NFC-e' : 'RECIBO') : 'RELATÓRIO'}
                            </Button>
                            <Button variant="secondary" onClick={closePrintModal} className="w-full py-4 font-bold text-slate-500">
                                {printType === 'SALE' ? 'Fechar e Nova Venda (ESC)' : 'Fechar Sistema'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* GENERIC CASH MODAL */}
        {(activeModal === 'SANGRIA' || activeModal === 'SUPRIMENTO') && (
             <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-scaleIn">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        {activeModal === 'SANGRIA' ? <TrendingDown className="text-red-500"/> : <TrendingUp className="text-emerald-500"/>}
                        {activeModal === 'SANGRIA' ? 'Realizar Sangria' : 'Realizar Suprimento'}
                    </h3>
                    <div className="space-y-4">
                        <Input 
                            label="Valor (R$)"
                            type="number"
                            autoFocus
                            value={cashValue}
                            onChange={e => setCashValue(e.target.value)}
                            className="text-lg font-bold"
                        />
                        <Input 
                            label="Motivo / Descrição"
                            value={cashReason}
                            onChange={e => setCashReason(e.target.value)}
                        />
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setActiveModal('MENU')}>Cancelar</Button>
                        <Button 
                            variant={activeModal === 'SANGRIA' ? 'danger' : 'success'} 
                            onClick={() => handleSangriaSuprimento(activeModal === 'SANGRIA' ? 'BLEED' : 'SUPPLY')}
                        >
                            Confirmar
                        </Button>
                    </div>
                </div>
             </div>
        )}

        {/* F10 MENU */}
        {activeModal === 'MENU' && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-fadeIn">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Menu className="text-blue-600"/> Menu de Funções</h2>
                        <button onClick={() => setActiveModal('NONE')} className="text-slate-400 hover:text-red-500"><X /></button>
                    </div>
                    <div className="p-8 grid grid-cols-2 md:grid-cols-3 gap-6">
                        <button onClick={() => setActiveModal('SUPRIMENTO')} className="p-6 bg-white hover:bg-emerald-50 rounded-xl flex flex-col items-center gap-3 transition border border-slate-200 hover:border-emerald-500 shadow-sm group">
                            <div className="p-3 bg-emerald-100 rounded-full text-emerald-600 group-hover:scale-110 transition"><TrendingUp size={32} /></div>
                            <span className="font-bold text-slate-700 group-hover:text-emerald-800">Suprimento</span>
                        </button>
                        <button onClick={() => setActiveModal('SANGRIA')} className="p-6 bg-white hover:bg-red-50 rounded-xl flex flex-col items-center gap-3 transition border border-slate-200 hover:border-red-500 shadow-sm group">
                             <div className="p-3 bg-red-100 rounded-full text-red-600 group-hover:scale-110 transition"><TrendingDown size={32} /></div>
                            <span className="font-bold text-slate-700 group-hover:text-red-800">Sangria</span>
                        </button>
                        <button onClick={handleCloseRegister} className="p-6 bg-white hover:bg-amber-50 rounded-xl flex flex-col items-center gap-3 transition border border-slate-200 hover:border-amber-500 shadow-sm group">
                             <div className="p-3 bg-amber-100 rounded-full text-amber-600 group-hover:scale-110 transition"><AlertOctagon size={32} /></div>
                            <span className="font-bold text-slate-700 group-hover:text-amber-800">Fechar Caixa</span>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* PAYMENT MODAL */}
        {activeModal === 'PAYMENT' && (
             <div className="fixed inset-0 bg-blue-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
                <div className="bg-white rounded-xl w-full max-w-5xl h-[85vh] flex shadow-2xl overflow-hidden animate-scaleIn">
                    {/* Left: Summary */}
                    <div className="w-1/3 bg-slate-50 p-10 flex flex-col justify-between border-r border-slate-200 relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
                        <div>
                            <h3 className="text-slate-400 font-bold uppercase tracking-wider mb-2 text-sm">Resumo do Pagamento</h3>
                            <p className="text-6xl font-black text-slate-800 tracking-tighter mb-8">{formatCurrency(total)}</p>
                            
                            <div className="space-y-4 text-slate-600">
                                <div className="flex justify-between border-b border-slate-200 pb-3">
                                    <span className="font-medium">Quantidade de Itens</span>
                                    <span className="font-bold text-lg">{cart.length}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200 pb-3">
                                    <span className="font-medium">Cliente</span>
                                    <span className="font-bold text-right">{selectedCustomer?.name || 'Não Identificado'}</span>
                                </div>
                            </div>
                        </div>
                        <Button variant="secondary" onClick={() => setActiveModal('NONE')} className="w-full py-4 uppercase font-bold text-slate-500 hover:text-slate-800">
                            Voltar (ESC)
                        </Button>
                    </div>

                    {/* Right: Methods */}
                    <div className="w-2/3 p-10 bg-white overflow-y-auto">
                        <h3 className="text-2xl font-bold text-slate-800 mb-8">Como o cliente vai pagar?</h3>
                        
                        <div className="grid grid-cols-2 gap-6">
                            <button onClick={() => finalizeSale('CASH')} className="h-40 bg-white hover:bg-emerald-50 hover:border-emerald-500 border-2 border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-4 transition group shadow-sm hover:shadow-md">
                                <div className="p-4 bg-emerald-100 rounded-full text-emerald-600 group-hover:scale-110 transition"><DollarSign size={40}/></div>
                                <span className="font-bold text-xl text-slate-700">Dinheiro</span>
                            </button>
                             <button onClick={handlePixPayment} className="h-40 bg-white hover:bg-brand-50 hover:border-brand-500 border-2 border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-4 transition group shadow-sm hover:shadow-md">
                                <div className="p-4 bg-brand-100 rounded-full text-brand-600 group-hover:scale-110 transition"><Smartphone size={40}/></div>
                                <span className="font-bold text-xl text-slate-700">PIX</span>
                            </button>
                             <button onClick={() => finalizeSale('DEBIT')} className="h-40 bg-white hover:bg-blue-50 hover:border-blue-500 border-2 border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-4 transition group shadow-sm hover:shadow-md">
                                <div className="p-4 bg-blue-100 rounded-full text-blue-600 group-hover:scale-110 transition"><CreditCard size={40}/></div>
                                <span className="font-bold text-xl text-slate-700">Débito</span>
                            </button>
                             <button onClick={() => finalizeSale('CREDIT')} className="h-40 bg-white hover:bg-purple-50 hover:border-purple-500 border-2 border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-4 transition group shadow-sm hover:shadow-md">
                                <div className="p-4 bg-purple-100 rounded-full text-purple-600 group-hover:scale-110 transition"><CreditCard size={40}/></div>
                                <span className="font-bold text-xl text-slate-700">Crédito</span>
                            </button>
                        </div>
                        
                        {processing && (
                            <div className="mt-8 flex flex-col items-center justify-center gap-3 text-blue-600 animate-pulse font-bold bg-blue-50 p-8 rounded-xl border border-blue-100">
                                <RefreshCcw className="animate-spin" size={32} /> 
                                <span className="text-lg">Processando Pagamento e Emitindo Nota...</span>
                            </div>
                        )}
                    </div>
                </div>
             </div>
        )}

        {/* PIX MODAL (WAITING) */}
        {activeModal === 'PIX_WAITING' && pixData && (
             <div className="fixed inset-0 bg-blue-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
                <div className="bg-white rounded-xl w-full max-w-lg p-8 shadow-2xl animate-scaleIn text-center">
                    <div className="mb-6 flex justify-center">
                         <div className="p-4 bg-brand-100 rounded-full text-brand-600 animate-pulse">
                            <Smartphone size={48} />
                         </div>
                    </div>
                    
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Escaneie o QR Code</h2>
                    <p className="text-slate-500 mb-6 font-medium">Abra o aplicativo do seu banco e pague via PIX</p>
                    
                    <div className="bg-white p-4 rounded-xl border-2 border-slate-200 inline-block mb-6 shadow-sm">
                        <img src={pixData.img} alt="QR Code Pix" className="w-64 h-64 mix-blend-multiply" />
                    </div>

                    <div className="mb-8">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Valor a Pagar</p>
                        <p className="text-4xl font-black text-brand-600">{formatCurrency(cart.reduce((a,b) => a+b.total, 0))}</p>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <input 
                                readOnly 
                                value={pixData.payload} 
                                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 font-mono truncate focus:outline-none"
                            />
                            <button 
                                onClick={copyPixPayload}
                                className="absolute right-2 top-2 p-1.5 bg-white border border-slate-200 rounded text-brand-600 hover:bg-brand-50"
                            >
                                <Copy size={16} />
                            </button>
                        </div>
                        
                        <Button 
                            onClick={() => finalizeSale('PIX')} 
                            className="w-full py-4 text-lg font-bold shadow-lg shadow-brand-200 animate-pulse"
                        >
                            CONFIRMAR PAGAMENTO RECEBIDO
                        </Button>
                        <button 
                            onClick={() => setActiveModal('PAYMENT')} 
                            className="text-slate-400 hover:text-red-500 text-sm font-bold uppercase tracking-wider"
                        >
                            Cancelar / Voltar
                        </button>
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
                        <button 
                            onClick={() => { setSelectedCustomer(null); setActiveModal('NONE'); searchInputRef.current?.focus(); }}
                            className="w-full text-left p-4 hover:bg-blue-50 rounded-xl text-slate-600 border-2 border-slate-100 hover:border-blue-300 transition"
                        >
                            <span className="font-bold text-lg">Consumidor Final</span>
                            <span className="block text-xs text-slate-400 uppercase font-bold mt-1">Sem identificação fiscal</span>
                        </button>
                        {customers.map(c => (
                            <button 
                                key={c.id}
                                onClick={() => { setSelectedCustomer(c); setActiveModal('NONE'); searchInputRef.current?.focus(); }}
                                className="w-full text-left p-4 hover:bg-blue-50 rounded-xl text-slate-600 border-2 border-slate-100 hover:border-blue-300 transition flex justify-between items-center group"
                            >
                                <div>
                                    <span className="font-bold block text-slate-800 text-lg group-hover:text-blue-700">{c.name}</span>
                                    <span className="text-xs text-slate-400">{c.email || 'Sem email'}</span>
                                </div>
                                <span className="text-slate-500 font-mono text-sm bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{c.document}</span>
                            </button>
                        ))}
                    </div>
                    <Button variant="secondary" onClick={() => setActiveModal('NONE')} className="w-full py-3">Cancelar</Button>
                 </div>
             </div>
        )}

        {/* HIDDEN PRINTABLE AREA FOR BROWSER PRINT */}
        {(lastSale || closedRegisterData) && (
            <div id="printable-area" className="hidden">
                 <style>{`
                    #printable-area {
                        width: 80mm;
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 10px;
                        padding: 2mm;
                        color: black;
                        background: white;
                    }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .text-left { text-align: left; }
                    .font-bold { font-weight: bold; }
                    .uppercase { text-transform: uppercase; }
                    .dashed-line { border-bottom: 1px dashed black; margin: 5px 0; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 2px 0; }
                 `}</style>
                 {printType === 'SALE' && lastSale ? (
                    <>
                        <div className="text-center">
                            <h2 className="font-bold uppercase text-xs">{settings.company.fantasyName}</h2>
                            <p>{settings.company.corporateName}</p>
                            <p>{settings.company.address}</p>
                            <p>CNPJ: {settings.company.cnpj}  IE: {settings.company.ie}</p>
                            <div className="dashed-line"></div>
                            <h3 className="font-bold uppercase">
                                {receiptType === 'NFCE' ? 'DANFE NFC-e - Documento Auxiliar' : 'RECIBO SIMPLES'}
                            </h3>
                            {receiptType === 'NFCE' && <p>Não permite aproveitamento de crédito de ICMS</p>}
                            <div className="dashed-line"></div>
                        </div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th className="text-left">ITEM</th>
                                    <th className="text-right">QTD</th>
                                    <th className="text-right">UNIT</th>
                                    <th className="text-right">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lastSale.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td colSpan={4} className="text-left">{idx + 1} {item.name}</td>
                                    </tr>
                                ))}
                                {lastSale.items.map((item, idx) => (
                                    <tr key={`val-${idx}`}>
                                        <td></td>
                                        <td className="text-right">{item.qty} {item.unit}</td>
                                        <td className="text-right">{item.price.toFixed(2)}</td>
                                        <td className="text-right">{item.total.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        <div className="dashed-line"></div>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold'}}>
                            <span>TOTAL R$</span>
                            <span>{lastSale.total.toFixed(2).replace('.',',')}</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between'}}>
                            <span>{lastSale.paymentMethod}</span>
                            <span>{lastSale.total.toFixed(2).replace('.',',')}</span>
                        </div>
                        
                        <div className="dashed-line"></div>
                        
                        <div className="text-center">
                            <p>Consumidor: {customers.find(c => c.id === lastSale.customerId)?.name || 'Não Identificado'}</p>
                            {customers.find(c => c.id === lastSale.customerId)?.document && (
                                <p>CPF: {customers.find(c => c.id === lastSale.customerId)?.document}</p>
                            )}
                        </div>

                        {receiptType === 'NFCE' && (
                            <div className="text-center" style={{marginTop: '10px'}}>
                                <p style={{fontSize: '9px', marginBottom: '5px'}}>Consulta via Leitor de QR Code</p>
                                <div style={{display: 'flex', justifyContent: 'center', marginBottom: '5px'}}>
                                    {qrCodeUrl && <img src={qrCodeUrl} style={{width: '90px', height: '90px'}} alt="QR Code" />}
                                </div>
                                <p style={{fontSize: '8px', wordBreak: 'break-all'}}><strong>Chave de Acesso:</strong><br/> {lastSale.accessKey?.replace(/(.{4})/g, '$1 ')}</p>
                                <p>Protocolo: 135240001234567</p>
                                <p>Data: {new Date(lastSale.date).toLocaleString()}</p>
                            </div>
                        )}
                        
                        <div className="dashed-line"></div>
                        <div className="text-center">
                            <p>Trib aprox R$: {(lastSale.total * 0.18).toFixed(2)} Federal</p>
                            <p>Fonte: IBPT</p>
                            <p style={{marginTop: '5px', fontWeight: 'bold', fontStyle: 'italic'}}>PDV MASTER ERP</p>
                        </div>
                    </>
                 ) : (
                    // CLOSING REPORT PRINT
                    closedRegisterData && (
                        <>
                            <div className="text-center">
                                <h2 className="font-bold uppercase text-xs">{settings.company.fantasyName}</h2>
                                <p>RELATÓRIO DE FECHAMENTO</p>
                                <p>{new Date().toLocaleString()}</p>
                                <div className="dashed-line"></div>
                            </div>
                            <div>
                                <p>Caixa: {closedRegisterData.id.slice(0,8)}</p>
                                <p>Operador: ADMIN</p>
                                <p>Abertura: {new Date(closedRegisterData.openedAt).toLocaleString()}</p>
                                <p>Fechamento: {new Date(closedRegisterData.closedAt!).toLocaleString()}</p>
                            </div>
                            <div className="dashed-line"></div>
                            <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span>(+) Fundo Abertura</span>
                                <span>{closedRegisterData.openingBalance.toFixed(2)}</span>
                            </div>
                            <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold'}}>
                                <span>(=) Saldo Sistema</span>
                                <span>{closedRegisterData.currentBalance.toFixed(2)}</span>
                            </div>
                            <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                <span>(=) Saldo Físico</span>
                                <span>{closedRegisterData.finalCount?.toFixed(2)}</span>
                            </div>
                            <div className="dashed-line"></div>
                            <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold'}}>
                                <span>DIFERENÇA (QUEBRA)</span>
                                <span>{closedRegisterData.difference?.toFixed(2)}</span>
                            </div>
                            <div className="dashed-line"></div>
                            <div className="text-center" style={{marginTop: '20px'}}>
                                <p>_______________________________</p>
                                <p>Assinatura do Operador</p>
                            </div>
                        </>
                    )
                 )}
            </div>
        )}

    </div>
  );
};