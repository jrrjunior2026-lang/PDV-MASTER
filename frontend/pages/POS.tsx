import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, CreditCard, CheckCircle, Wifi, WifiOff, RefreshCcw, Home, User, Menu, DollarSign, X, AlertOctagon, TrendingUp, TrendingDown, Lock, ChevronRight, Monitor, Printer, Package, Copy, Smartphone, FileText, Calendar, Clock, ChevronsLeft, PlusCircle, MinusCircle, Trash2, History, Settings as SettingsIcon } from 'lucide-react';

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
    const [settings, setSettings] = useState<ISettings | null>(null);

    // Custom hooks for complex logic
    const cartControl = useCart();
    const cashRegister = useCashRegister();

    // State for modals managed by this component
    const [activeModal, setActiveModal] = useState<POSModal>('NONE');

    // Custom Alert/Confirm States (could also be moved to a hook)
    const [confirmState, setConfirmState] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void, variant?: 'primary' | 'danger' }>({
        isOpen: false, title: '', message: '', onConfirm: () => { }
    });
    const [alertState, setAlertState] = useState<{ isOpen: boolean, title: string, message: string, type: 'info' | 'error' | 'success' }>({
        isOpen: false, title: '', message: '', type: 'info'
    });

    const showAlert = (message: string, title: string = 'Atenção', type: 'info' | 'error' | 'success' = 'info') => {
        setAlertState({ isOpen: true, message, title, type });
    };

    // UI-specific state
    const [paymentSubView, setPaymentSubView] = useState<'METHODS' | 'CASH'>('METHODS');
    const [cashReceived, setCashReceived] = useState<string>('');

    // Data for specific modals
    const [pixData, setPixData] = useState<{ payload: string, img: string } | null>(null);
    const [lastSale, setLastSale] = useState<ISale | null>(null);
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [receiptType, setReceiptType] = useState<'NFCE' | 'RECIBO'>('NFCE');
    const [printType, setPrintType] = useState<'SALE' | 'CLOSING'>('SALE');

    const searchInputRef = useRef<HTMLInputElement>(null);
    const cashReceivedInputRef = useRef<HTMLInputElement>(null);

    // Load Initial Data (related to products, customers, settings)
    useEffect(() => {
        const loadData = async () => {
            const [productsData, customersData, settingsData] = await Promise.all([
                StorageService.getProducts(),
                StorageService.getCustomers(),
                StorageService.getSettings()
            ]);
            setProducts(productsData);
            setCustomers(customersData);
            setSettings(settingsData);
        };

        loadData();

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
            settings?.payment?.pixKey || '00.000.000/0001-00',
            settings?.company?.fantasyName || 'PDV MASTER',
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

    const finalizeSale = async (method: 'CREDIT' | 'DEBIT' | 'CASH' | 'PIX', cashData?: { paid: number, change: number }) => {
        if (cartControl.cart.length === 0) return;

        const user = StorageService.getCurrentUser();
        if (!user) {
            showAlert('Usuário não autenticado', 'Erro', 'error');
            return;
        }

        if (!cashRegister.register) {
            showAlert('Caixa não está aberto', 'Erro', 'error');
            return;
        }

        setProcessing(true);

        const accessKey = `352410${Math.floor(Math.random() * 100000000000000)}550010000000011000000001`;

        const saleData = await StorageService.createSale({
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            items: cartControl.cart,
            total: cartControl.total,
            subtotal: cartControl.total,
            discount: 0,
            paymentMethod: method,
            fiscalStatus: isOffline ? 'OFFLINE' : 'AUTHORIZED',
            operatorId: user.id,
            registerId: cashRegister.register.id,
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
        // Get the preview element content
        const previewElement = document.querySelector('.bg-white.shadow-2xl.w-\\[80mm\\]');
        const globalPrintArea = document.getElementById('printable-area');

        if (!previewElement || !globalPrintArea) {
            showAlert('Erro ao preparar impressão.', 'Erro', 'error');
            return;
        }

        // Inject content into global print area
        globalPrintArea.innerHTML = previewElement.innerHTML;

        // Trigger print
        window.print();

        // Clear print area after a short delay
        setTimeout(() => {
            globalPrintArea.innerHTML = '';
            closePrintModal();
        }, 500);
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

    const handleConfirmCloseRegister = async () => {
        const closedReg = await cashRegister.executeCloseRegister();
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

            switch (e.key) {
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

    // Loading state while settings are being fetched
    if (!settings) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-900 text-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p>Carregando configurações...</p>
                </div>
            </div>
        );
    }

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
            <header className="h-14 bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 flex items-center justify-between px-6 shrink-0 z-30 shadow-xl border-b border-blue-800/50">
                <div className="flex items-center gap-6">
                    <Link to="/" className="text-blue-300 hover:text-white transition-all transform hover:scale-110 active:scale-95">
                        <Home size={22} />
                    </Link>
                    <div className="h-6 w-[1px] bg-blue-800/50"></div>
                    <div className="flex flex-col">
                        <h1 className="font-black text-xs tracking-[0.2em] text-blue-100 uppercase drop-shadow-sm">
                            {settings?.company?.fantasyName || 'PDV MASTER'}
                        </h1>
                        <span className="text-[9px] text-blue-400 font-bold tracking-wider uppercase">Sistema de Gestão ERP</span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-inner ${isOffline ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                        {isOffline ? 'OFFLINE' : 'SISTEMA ONLINE'}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-blue-200 font-mono bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-800/30">
                        <span className="opacity-50">CAIXA:</span>
                        <span className="font-bold text-blue-100">{cashRegister.register?.id.slice(0, 4) || 'FECHADO'}</span>
                        <div className="w-[1px] h-3 bg-blue-800"></div>
                        <span className="opacity-50">OP:</span>
                        <span className="font-bold text-blue-100 uppercase">ADMIN</span>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT SPLIT 50/50 */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

                <CartPanel
                    cart={cartControl.cart}
                    cartEndRef={cartControl.cartEndRef}
                    logoUrl={settings?.appearance?.logoUrl}
                />

                {/* RIGHT: INFO PANEL (50%) */}
                <div className="w-full md:w-1/2 flex flex-col bg-slate-50 relative border-l border-slate-300">

                    {/* 1. TOP BAR */}
                    <div className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 z-10 shadow-sm shrink-0">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl shadow-sm transition-all duration-300 ${selectedCustomer ? 'bg-blue-600 text-white rotate-3' : 'bg-slate-100 text-slate-400'}`}>
                                <User size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] mb-0.5">Cliente Identificado</p>
                                <p className={`font-black text-xl leading-none truncate max-w-[250px] transition-colors ${selectedCustomer ? 'text-slate-800' : 'text-slate-300'}`}>
                                    {selectedCustomer ? selectedCustomer.name : 'CONSUMIDOR FINAL'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setActiveModal('CUSTOMER')}
                            className="group flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-blue-200 active:scale-95"
                        >
                            <span>Trocar</span>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] group-hover:bg-white/30">F2</span>
                        </button>
                    </div>

                    {/* 2. MIDDLE: HERO LAST ITEM */}
                    <div className="flex-1 flex flex-col justify-center items-center p-6 z-10 relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
                        {/* Decorative Background Elements */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-50 rounded-full blur-[100px] opacity-50 pointer-events-none"></div>

                        <p className="text-blue-600 font-black uppercase tracking-[0.3em] text-[9px] mb-4 flex items-center gap-3 self-center bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm">
                            <Monitor size={14} className="animate-pulse" /> Último Registro
                        </p>

                        {lastItem ? (
                            <div className="animate-slideInRight w-full max-w-2xl text-center relative z-10">
                                <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-4 drop-shadow-sm uppercase break-words line-clamp-2 py-2 px-4 tracking-tight">
                                    {lastItem.name}
                                </h1>
                                <div className="flex items-center justify-center gap-8 border-t border-slate-100 pt-6">
                                    <div className="text-center">
                                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Unitário</p>
                                        <p className="text-2xl font-bold text-slate-500">{formatCurrency(lastItem.price)}</p>
                                    </div>
                                    <div className="w-[1px] h-10 bg-slate-100"></div>
                                    <div className="text-center">
                                        <p className="text-blue-400 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Total Item</p>
                                        <p className="text-5xl font-black text-blue-600 tracking-tighter drop-shadow-md">{formatCurrency(lastItem.total)}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center opacity-10 select-none">
                                <h1 className="text-6xl md:text-[8rem] font-black text-slate-900 uppercase tracking-tighter leading-none">LIVRE</h1>
                                <p className="text-xl font-bold tracking-[1em] mt-2">AGUARDANDO PRODUTO</p>
                            </div>
                        )}
                    </div>

                    {/* 3. SEARCH BAR INTEGRATED */}
                    <div className="px-6 pb-6 pt-2 z-20 shrink-0 w-full max-w-5xl mx-auto">
                        <form onSubmit={handleSearch} className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                <Search className="text-blue-500 group-focus-within:text-blue-600 transition-colors" size={24} />
                            </div>
                            <input
                                ref={searchInputRef}
                                value={search}
                                onChange={handleInput}
                                className="block w-full pl-14 pr-6 py-4 border-2 border-slate-200 rounded-2xl leading-5 bg-white placeholder-slate-300 focus:outline-none focus:border-blue-500 focus:ring-8 focus:ring-blue-500/10 text-xl font-black transition-all shadow-2xl group-hover:border-slate-300"
                                placeholder="Digitar código ou nome (F1)"
                                autoComplete="off"
                            />
                            <div className="absolute inset-y-0 right-0 pr-6 flex items-center">
                                <kbd className="hidden sm:inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-black text-slate-400 shadow-sm uppercase tracking-tighter">
                                    Enter <ChevronRight size={12} />
                                </kbd>
                            </div>

                            {suggestions.length > 0 && (
                                <div className="absolute bottom-full left-0 w-full mb-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden z-50 animate-fadeInUp origin-bottom">
                                    <div className="bg-slate-900 px-6 py-3 text-[10px] font-black text-white uppercase flex justify-between tracking-widest">
                                        <span>Produtos Sugeridos</span>
                                        <span className="opacity-50">Selecione para adicionar</span>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {suggestions.map((p, idx) => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => handleSelectSuggestion(p)}
                                                className={`w-full text-left px-6 py-4 border-b border-slate-100 last:border-0 hover:bg-blue-50 hover:pl-8 transition-all duration-300 group flex justify-between items-center ${idx === 0 ? 'bg-blue-50/30' : ''}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-blue-600 group-hover:shadow-md transition-all duration-300">
                                                        <Package size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 text-lg leading-tight group-hover:text-blue-700">{p.name}</p>
                                                        <p className="text-xs text-slate-400 font-mono mt-1 tracking-wider">{p.code}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-slate-900 text-xl group-hover:text-blue-600">{formatCurrency(p.price)}</p>
                                                    <div className="flex items-center justify-end gap-1.5 mt-1">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${p.stock <= p.minStock ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                                        <p className={`text-[10px] font-black uppercase tracking-tighter ${p.stock <= p.minStock ? 'text-red-500' : 'text-emerald-600'}`}>
                                                            Estoque: {p.stock}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>

                    {/* 4. BOTTOM: TOTAL & PAY */}
                    <div className="bg-slate-900 p-6 z-20 text-white shadow-[0_-10px_40px_rgba(0,0,0,0.3)] shrink-0 border-t border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex flex-col">
                                <span className="text-blue-400 font-black uppercase tracking-[0.3em] text-[9px] mb-1">Total a Pagar</span>
                                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{cartControl.cart.length} Itens no carrinho</span>
                            </div>
                            <div className="text-5xl font-black tracking-tighter text-white drop-shadow-2xl">
                                {formatCurrency(cartControl.total)}
                            </div>
                        </div>
                        <button
                            disabled={cartControl.cart.length === 0}
                            onClick={() => {
                                setPaymentSubView('METHODS');
                                setCashReceived('');
                                setActiveModal('PAYMENT');
                            }}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed text-white text-2xl font-black uppercase tracking-widest rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all transform hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-4 group"
                        >
                            <span>Finalizar Venda</span>
                            <div className="flex items-center gap-2">
                                <span className="bg-white/20 px-2 py-1 rounded text-[10px] group-hover:bg-white/30 transition-colors">F5</span>
                                <ChevronRight size={24} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* FOOTER SHORTCUTS */}
            <div className="bg-slate-900 border-t border-white/5 py-2 flex justify-center gap-8 text-[9px] uppercase font-black text-slate-400 tracking-[0.2em] shrink-0 overflow-x-auto">
                {[
                    { k: 'F1', l: 'Busca' }, { k: 'F2', l: 'Cliente' }, { k: 'F5', l: 'Pagamento' },
                    { k: 'F8', l: 'Cancelar Item' }, { k: 'F10', l: 'Menu' }, { k: 'ESC', l: 'Voltar' }
                ].map(s => (
                    <button
                        key={s.k}
                        className="flex items-center gap-3 cursor-pointer hover:text-white transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap group"
                        onClick={() => {
                            const key = s.k === 'Busca' ? 'F1' : s.k === 'Voltar' ? 'Escape' : s.k.split(' ')[0];
                            window.dispatchEvent(new KeyboardEvent('keydown', { key }));
                        }}
                    >
                        <span className="bg-white/10 border border-white/10 px-2 py-0.5 rounded-lg text-blue-400 font-black shadow-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">{s.k}</span>
                        <span className="group-hover:translate-x-1 transition-transform">{s.l}</span>
                    </button>
                ))
                }
            </div>


            {/* --- MODALS --- */}

            {/* OPEN REGISTER MODAL */}
            {
                cashRegister.modal === 'OPEN_BOX' && (
                    <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center backdrop-blur-xl animate-fadeIn">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-[0_30px_100px_rgba(0,0,0,0.4)] animate-scaleIn overflow-hidden border border-white/20">
                            <div className="bg-slate-50/50 p-10 border-b border-slate-100 flex justify-between items-center">
                                <div className="flex items-center gap-5">
                                    <div className="p-4 bg-blue-600 rounded-3xl text-white shadow-lg shadow-blue-200 rotate-3"><Lock size={28} /></div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Abertura de Caixa</h2>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Inicie seu turno de trabalho</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-slate-700 flex items-center justify-end gap-2"><Calendar size={16} className="text-blue-500" /> {new Date().toLocaleDateString()}</p>
                                    <p className="text-xs text-slate-400 font-bold flex items-center justify-end gap-2 mt-1"><Clock size={14} /> {new Date().toLocaleTimeString().slice(0, 5)}</p>
                                </div>
                            </div>
                            <div className="p-12">
                                <div className="grid grid-cols-2 gap-6 mb-10">
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Operador</p>
                                        <p className="font-black text-slate-800 flex items-center gap-2 text-lg">
                                            <User size={20} className="text-blue-500" /> {StorageService.getCurrentUser()?.name || 'ADMIN'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Saldo Anterior</p>
                                        <p className={`font-black flex items-center gap-2 text-lg ${cashRegister.lastClosedRegister ? 'text-slate-800' : 'text-slate-300 italic'}`}>
                                            <DollarSign size={20} className="text-emerald-500" />
                                            {cashRegister.lastClosedRegister ? formatCurrency(cashRegister.lastClosedRegister.finalCount || 0) : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div className="mb-12">
                                    <label className="block text-slate-400 font-black mb-4 text-[10px] uppercase tracking-[0.3em] text-center">Informe o Fundo de Troco (R$)</label>
                                    <div className="relative max-w-xs mx-auto">
                                        <input
                                            autoFocus
                                            type="number"
                                            value={cashRegister.openingBalance}
                                            onChange={e => cashRegister.setOpeningBalance(e.target.value)}
                                            className="w-full text-center text-5xl py-6 font-black border-none bg-slate-50 focus:ring-0 text-slate-900 rounded-[2rem] shadow-inner placeholder-slate-200"
                                            placeholder="0,00"
                                        />
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                    </div>
                                </div>
                                <button
                                    onClick={cashRegister.openRegister}
                                    className="w-full py-6 text-xl font-black shadow-2xl bg-slate-900 hover:bg-blue-600 text-white rounded-3xl transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest"
                                >
                                    Confirmar Abertura
                                </button>
                                <div className="mt-8 text-center">
                                    <Link to="/" className="text-slate-400 hover:text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] transition-colors">Voltar ao Dashboard</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* CLOSE REGISTER MODAL */}
            {
                cashRegister.modal === 'CLOSE_BOX' && cashRegister.closingSummary && (
                    <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-6 backdrop-blur-xl animate-fadeIn">
                        <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-[0_50px_150px_rgba(0,0,0,0.5)] animate-scaleIn overflow-hidden border border-white/20">
                            <div className="bg-slate-50/50 p-10 border-b border-slate-100 flex justify-between items-center">
                                <div className="flex items-center gap-5">
                                    <div className="p-4 bg-red-600 rounded-3xl text-white shadow-lg shadow-red-200 rotate-3"><AlertOctagon size={28} /></div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Fechamento de Caixa</h2>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Encerramento do turno</p>
                                    </div>
                                </div>
                                <button onClick={() => cashRegister.setModal('NONE')} className="p-3 hover:bg-white rounded-2xl transition-colors text-slate-400 hover:text-slate-900 shadow-sm">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-12">
                                <div className="space-y-4 mb-10">
                                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Fundo de Abertura</span>
                                        <span className="font-black text-lg">{formatCurrency(cashRegister.closingSummary.opening)}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 text-emerald-700">
                                        <span className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest"><TrendingUp size={14} /> Vendas em Dinheiro</span>
                                        <span className="font-black text-lg">+ {formatCurrency(cashRegister.closingSummary.salesCash)}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100 text-blue-700">
                                        <span className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest"><TrendingUp size={14} /> Suprimentos</span>
                                        <span className="font-black text-lg">+ {formatCurrency(cashRegister.closingSummary.supply)}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-red-50/50 p-4 rounded-2xl border border-red-100 text-red-700">
                                        <span className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest"><TrendingDown size={14} /> Sangrias</span>
                                        <span className="font-black text-lg">- {formatCurrency(cashRegister.closingSummary.bleed)}</span>
                                    </div>
                                </div>

                                <div className="bg-slate-900 p-8 rounded-[2rem] mb-10 shadow-2xl">
                                    <label className="block text-blue-400 font-black mb-4 text-[10px] uppercase tracking-[0.3em] text-center">Conferência Física (Gaveta)</label>
                                    <div className="relative max-w-xs mx-auto">
                                        <input
                                            autoFocus
                                            type="number"
                                            value={cashRegister.closingCount}
                                            onChange={e => cashRegister.setClosingCount(e.target.value)}
                                            className="w-full text-center text-5xl py-4 font-black border-none bg-white/5 focus:ring-0 text-white rounded-2xl placeholder-white/10"
                                            placeholder="0,00"
                                        />
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-blue-500 rounded-full shadow-lg"></div>
                                    </div>
                                    {cashRegister.closingCount && (
                                        <div className="text-center mt-6 text-sm font-black uppercase tracking-widest ${(parseFloat(cashRegister.closingCount.replace(',', '.')) - cashRegister.closingSummary.calculated) >= -0.01 ? 'text-emerald-400' : 'text-red-400'}">
                                            Diferença: {formatCurrency(parseFloat(cashRegister.closingCount.replace(',', '.')) - cashRegister.closingSummary.calculated)}
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setConfirmState({ isOpen: true, title: 'Fechar Caixa', message: 'Deseja realmente fechar o caixa agora?', variant: 'danger', onConfirm: handleConfirmCloseRegister })}
                                    className="w-full py-6 text-xl font-black shadow-2xl bg-red-600 hover:bg-red-700 text-white rounded-3xl transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest"
                                >
                                    Confirmar Fechamento
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* PRINT RECEIPT MODAL */}
            {
                activeModal === 'PRINT_RECEIPT' && ((lastSale && printType === 'SALE') || (cashRegister.closedRegisterData && printType === 'CLOSING')) && (
                    <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-6 backdrop-blur-xl animate-fadeIn">
                        <div className="bg-white rounded-[3rem] w-full max-w-5xl h-[90vh] flex shadow-[0_50px_150px_rgba(0,0,0,0.5)] overflow-hidden animate-scaleIn border border-white/20">
                            <div className="w-1/2 bg-slate-100 p-12 overflow-y-auto flex justify-center shadow-inner">
                                <div className="bg-white shadow-2xl w-[80mm] min-h-[120mm] p-6 text-[10px] font-mono leading-tight text-slate-800 border-t-8 border-slate-900">
                                    {printType === 'SALE' && lastSale ? (
                                        <>
                                            <div className="text-center mb-4">
                                                <h2 className="font-black text-sm uppercase tracking-tighter">{settings?.company?.fantasyName || 'PDV MASTER'}</h2>
                                                <p className="text-[8px]">{settings?.company?.corporateName || ''}</p>
                                                <p className="text-[8px]">{settings?.company?.address || ''}</p>
                                                <p className="text-[8px]">CNPJ: {settings?.company?.cnpj || ''}  IE: {settings?.company?.ie || ''}</p>
                                                <div className="border-b border-dashed border-slate-300 my-3"></div>
                                                <h3 className="font-black uppercase mb-1 text-[9px]">{receiptType === 'NFCE' ? 'Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica' : 'RECIBO DE VENDA'}</h3>
                                                {receiptType === 'NFCE' && <p className="text-[7px]">Não permite aproveitamento de crédito de ICMS</p>}
                                            </div>
                                            <table className="w-full mb-4">
                                                <thead><tr className="border-b border-slate-900"><th className="text-left py-1">ITEM</th><th className="text-right py-1">QTD</th><th className="text-right py-1">TOTAL</th></tr></thead>
                                                <tbody>{lastSale.items.map((item, idx) => (<tr key={idx} className="border-b border-slate-100"><td className="py-1 truncate max-w-[35mm] uppercase font-bold">{item.name}</td><td className="text-right py-1">{item.qty}</td><td className="text-right py-1 font-bold">{item.total.toFixed(2)}</td></tr>))}</tbody>
                                            </table>
                                            <div className="flex justify-between font-black text-sm mb-1"><span>TOTAL R$</span><span>{lastSale.total.toFixed(2).replace('.', ',')}</span></div>
                                            <div className="flex justify-between text-[9px] mb-3"><span>FORMA PGTO</span><span className="font-bold uppercase">{lastSale.paymentMethod}</span></div>
                                            {lastSale.paymentMethod === 'CASH' && (<> <div className="flex justify-between text-[8px]"><span>RECEBIDO</span><span>{formatCurrency(lastSale.amountPaid || 0)}</span></div> <div className="flex justify-between font-black text-[10px] mt-1"><span>TROCO</span><span>{formatCurrency(lastSale.change || 0)}</span></div></>)}
                                            <div className="border-b border-dashed border-slate-300 my-4"></div>
                                            <div className="text-center text-[8px]"><p className="font-bold">CONSUMIDOR: {customers.find(c => c.id === lastSale.customerId)?.name || 'NÃO IDENTIFICADO'}</p>{customers.find(c => c.id === lastSale.customerId)?.document && (<p>CPF: {customers.find(c => c.id === lastSale.customerId)?.document}</p>)}</div>
                                            {receiptType === 'NFCE' && (<div className="mt-6 text-center"><p className="mb-2 text-[8px] font-bold">CONSULTA VIA QR CODE</p><div className="flex justify-center mb-3 bg-white p-2 border border-slate-100 inline-block mx-auto">{qrCodeUrl && <img src={qrCodeUrl} className="w-28 h-28" alt="QR Code" />}</div><p className="break-all text-[7px] mb-2 font-black leading-relaxed">CHAVE DE ACESSO:<br />{lastSale.accessKey?.replace(/(.{4})/g, '$1 ')}</p><p className="text-[7px]">PROTOCOLO: 135240001234567</p><p className="text-[7px]">DATA: {new Date(lastSale.date).toLocaleString()}</p></div>)}
                                            <div className="mt-8 text-center border-t border-slate-900 pt-4"><p className="text-[7px] uppercase font-bold">Obrigado pela preferência!</p><p className="mt-2 font-black italic text-[9px] tracking-widest">PDV MASTER ERP</p></div>
                                        </>
                                    ) : (cashRegister.closedRegisterData && (
                                        <>
                                            <div className="text-center mb-6">
                                                <h2 className="font-black text-sm uppercase tracking-widest">Fechamento de Caixa</h2>
                                                <div className="border-b-2 border-slate-900 w-12 mx-auto my-3"></div>
                                                <p className="font-bold">CAIXA: {cashRegister.closedRegisterData.id.slice(0, 8).toUpperCase()}</p>
                                                <p>OPERADOR: {StorageService.getCurrentUser()?.name || 'ADMIN'}</p>
                                            </div>
                                            <div className="space-y-2 text-[9px] mb-8">
                                                <div className="flex justify-between"><span>ABERTURA:</span><span className="font-bold">{new Date(cashRegister.closedRegisterData.openedAt).toLocaleString()}</span></div>
                                                <div className="flex justify-between"><span>FECHAMENTO:</span><span className="font-bold">{new Date(cashRegister.closedRegisterData.closedAt!).toLocaleString()}</span></div>
                                            </div>
                                            <div className="border-b border-slate-900 mb-4"></div>
                                            <div className="space-y-3">
                                                <div className="flex justify-between"><span>(+) FUNDO ABERTURA</span><span className="font-bold">{formatCurrency(cashRegister.closedRegisterData.openingBalance)}</span></div>
                                                <div className="flex justify-between text-blue-600"><span>(+) TOTAL VENDAS</span><span className="font-bold">{formatCurrency(cashRegister.closedRegisterData.currentBalance - cashRegister.closedRegisterData.openingBalance)}</span></div>
                                                <div className="flex justify-between font-black text-xs pt-2 border-t border-slate-200"><span>(=) SALDO SISTEMA</span><span>{formatCurrency(cashRegister.closedRegisterData.currentBalance)}</span></div>
                                                <div className="flex justify-between font-black text-xs"><span>(=) SALDO FÍSICO</span><span>{formatCurrency(cashRegister.closedRegisterData.finalCount || 0)}</span></div>
                                                <div className="flex justify-between font-black text-sm pt-3 border-t-2 border-slate-900"><span>DIFERENÇA</span><span className={cashRegister.closedRegisterData.difference! < 0 ? 'text-red-600' : 'text-emerald-600'}>{formatCurrency(cashRegister.closedRegisterData.difference || 0)}</span></div>
                                            </div>
                                            <div className="mt-16 text-center text-[8px] uppercase font-black border-t border-dashed border-slate-300 pt-8"><p className="mb-10">Assinatura do Responsável</p><p>_______________________________________</p></div>
                                        </>
                                    )
                                    )}
                                </div>
                            </div>
                            <div className="w-1/2 p-16 bg-white flex flex-col justify-between relative overflow-hidden">
                                {/* Decorative Background */}
                                <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] -ml-48 -mt-48"></div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-5 mb-10">
                                        <div className="p-5 bg-emerald-100 text-emerald-600 rounded-[2rem] shadow-lg shadow-emerald-50 animate-bounce">
                                            <CheckCircle size={48} />
                                        </div>
                                        <div>
                                            <h2 className="text-4xl font-black text-slate-900 tracking-tight">{printType === 'SALE' ? 'Venda Concluída!' : 'Caixa Encerrado!'}</h2>
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Operação realizada com sucesso</p>
                                        </div>
                                    </div>

                                    {printType === 'SALE' && (
                                        <div className="space-y-6">
                                            <p className="text-slate-500 font-medium text-lg">Escolha o formato do comprovante:</p>
                                            <div className="grid grid-cols-1 gap-4">
                                                {[
                                                    { id: 'NFCE', title: 'Nota Fiscal (NFC-e)', desc: 'Documento fiscal oficial com QR Code', icon: <FileText size={28} />, color: 'blue' },
                                                    { id: 'RECIBO', title: 'Recibo Simples', desc: 'Comprovante não fiscal para o cliente', icon: <Printer size={28} />, color: 'slate' }
                                                ].map(t => (
                                                    <label key={t.id} className={`flex items-center gap-5 p-6 border-2 rounded-[2rem] cursor-pointer transition-all duration-300 group ${receiptType === t.id ? `border-${t.color}-500 bg-${t.color}-50 shadow-xl shadow-${t.color}-100` : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}>
                                                        <input type="radio" name="receiptType" checked={receiptType === t.id} onChange={() => setReceiptType(t.id as any)} className="hidden" />
                                                        <div className={`p-4 rounded-2xl transition-colors ${receiptType === t.id ? `bg-${t.color}-500 text-white` : 'bg-white text-slate-400 group-hover:text-slate-600'}`}>
                                                            {t.icon}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className={`font-black text-lg uppercase tracking-tight ${receiptType === t.id ? `text-${t.color}-900` : 'text-slate-700'}`}>{t.title}</p>
                                                            <p className="text-sm text-slate-400 font-medium">{t.desc}</p>
                                                        </div>
                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${receiptType === t.id ? `border-${t.color}-500 bg-${t.color}-500` : 'border-slate-300'}`}>
                                                            {receiptType === t.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 relative z-10">
                                    <button
                                        onClick={handlePrint}
                                        className="w-full py-6 bg-slate-900 hover:bg-blue-600 text-white text-xl font-black rounded-[2rem] shadow-2xl transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-4 uppercase tracking-widest"
                                    >
                                        <Printer size={28} />
                                        Imprimir {printType === 'SALE' ? (receiptType === 'NFCE' ? 'NFC-e' : 'Recibo') : 'Relatório'}
                                    </button>
                                    <button
                                        onClick={closePrintModal}
                                        className="w-full py-5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-black rounded-[1.5rem] transition-all uppercase tracking-widest text-xs"
                                    >
                                        {printType === 'SALE' ? 'Pular e Nova Venda (ESC)' : 'Fechar e Sair'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* PAYMENT MODAL */}
            {
                activeModal === 'PAYMENT' && (
                    <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-6 backdrop-blur-xl animate-fadeIn">
                        <div className="bg-white rounded-[3rem] w-full max-w-6xl h-[85vh] flex shadow-[0_50px_150px_rgba(0,0,0,0.5)] animate-scaleIn overflow-hidden border border-white/20">
                            <div className="w-1/3 bg-slate-900 p-12 flex flex-col justify-between text-white relative overflow-hidden">
                                {/* Decorative Background */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] -mr-32 -mt-32"></div>

                                <div className="relative z-10">
                                    <h3 className="text-blue-400 font-black uppercase tracking-[0.3em] mb-4 text-xs">Resumo do Pagamento</h3>
                                    <p className="text-7xl font-black tracking-tighter mb-10 drop-shadow-2xl">{formatCurrency(cartControl.total)}</p>

                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                                            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Total de Itens</span>
                                            <span className="font-black text-2xl">{cartControl.cart.length}</span>
                                        </div>
                                        <div className="flex flex-col border-b border-white/10 pb-4">
                                            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-2">Cliente</span>
                                            <span className="font-black text-xl text-blue-100 truncate">{selectedCustomer?.name || 'CONSUMIDOR FINAL'}</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setActiveModal('NONE')}
                                    className="relative z-10 w-full py-5 bg-white/10 hover:bg-white/20 text-white rounded-2xl uppercase font-black tracking-widest transition-all border border-white/10 active:scale-95"
                                >
                                    Cancelar (ESC)
                                </button>
                            </div>

                            <div className="w-2/3 p-16 bg-white overflow-y-auto relative">
                                {paymentSubView === 'METHODS' && (
                                    <div className="animate-fadeIn">
                                        <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Forma de Pagamento</h3>
                                        <p className="text-slate-400 font-bold mb-12 uppercase tracking-widest text-xs">Selecione como o cliente deseja pagar</p>

                                        <div className="grid grid-cols-2 gap-8">
                                            {[
                                                { id: 'CASH', label: 'Dinheiro', icon: <DollarSign size={48} />, color: 'emerald', action: () => setPaymentSubView('CASH') },
                                                { id: 'PIX', label: 'PIX QR Code', icon: <Smartphone size={48} />, color: 'blue', action: handlePixPayment },
                                                { id: 'DEBIT', label: 'Cartão Débito', icon: <CreditCard size={48} />, color: 'slate', action: () => finalizeSale('DEBIT') },
                                                { id: 'CREDIT', label: 'Cartão Crédito', icon: <CreditCard size={48} />, color: 'purple', action: () => finalizeSale('CREDIT') }
                                            ].map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={m.action}
                                                    className={`h-48 bg-slate-50 hover:bg-white border-2 border-transparent hover:border-${m.color}-500 rounded-[2.5rem] flex flex-col items-center justify-center gap-5 transition-all duration-300 group hover:shadow-2xl hover:shadow-${m.color}-100 transform hover:-translate-y-2`}
                                                >
                                                    <div className={`p-5 bg-${m.color}-100 text-${m.color}-600 rounded-3xl group-hover:scale-110 transition-transform duration-300`}>
                                                        {m.icon}
                                                    </div>
                                                    <span className="font-black text-xl text-slate-800 uppercase tracking-widest">{m.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {paymentSubView === 'CASH' && (
                                    <div className="animate-fadeIn flex flex-col h-full">
                                        <button onClick={() => setPaymentSubView('METHODS')} className="absolute top-10 left-10 flex items-center gap-3 text-xs font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">
                                            <ChevronsLeft size={20} /> Voltar
                                        </button>

                                        <div className="text-center mt-4 mb-12">
                                            <h3 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Pagamento em Dinheiro</h3>
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Informe o valor recebido</p>
                                        </div>

                                        <div className="max-w-md mx-auto w-full space-y-8">
                                            <div className="relative">
                                                <input
                                                    autoFocus
                                                    type="number"
                                                    value={cashReceived}
                                                    onChange={e => setCashReceived(e.target.value)}
                                                    ref={cashReceivedInputRef}
                                                    className="w-full text-center text-6xl py-8 font-black border-none bg-slate-50 focus:ring-0 text-slate-900 rounded-[2.5rem] shadow-inner placeholder-slate-200"
                                                    placeholder="0,00"
                                                />
                                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)]"></div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3">
                                                {[10, 20, 50, 100, 200, cartControl.total].map(val => (
                                                    <button
                                                        key={val}
                                                        onClick={() => setCashReceived(val.toFixed(2).replace('.', ','))}
                                                        className="py-4 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-2xl font-black transition-all active:scale-95 uppercase text-xs tracking-widest"
                                                    >
                                                        {val === cartControl.total ? 'Valor Exato' : `R$ ${val}`}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className={`p-10 rounded-[2.5rem] flex flex-col items-center justify-center text-center transition-all duration-500 ${changeAmount >= 0 ? 'bg-emerald-50 shadow-inner' : 'bg-red-50'}`}>
                                                <p className="text-[10px] font-black uppercase text-emerald-800 tracking-[0.3em] mb-2">Troco a Devolver</p>
                                                <p className="text-7xl font-black text-emerald-900 tracking-tighter drop-shadow-sm">
                                                    {formatCurrency(changeAmount >= 0 ? changeAmount : 0)}
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => finalizeSale('CASH', { paid: parseFloat(cashReceived.replace(',', '.')), change: changeAmount })}
                                                disabled={changeAmount < 0 || !cashReceived}
                                                className="w-full py-6 bg-slate-900 hover:bg-emerald-600 disabled:opacity-20 text-white text-2xl font-black rounded-[2rem] shadow-2xl transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest"
                                            >
                                                Confirmar Pagamento
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {processing && (
                                    <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center gap-6 text-blue-600 z-50">
                                        <div className="relative">
                                            <div className="w-24 h-24 border-8 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                            <RefreshCcw className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" size={32} />
                                        </div>
                                        <span className="text-2xl font-black uppercase tracking-[0.3em] animate-pulse">Processando...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* PIX MODAL (WAITING) */}
            {
                activeModal === 'PIX_WAITING' && pixData && (
                    <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-6 backdrop-blur-xl animate-fadeIn">
                        <div className="bg-white rounded-[3rem] w-full max-w-lg p-12 shadow-[0_50px_150px_rgba(0,0,0,0.5)] animate-scaleIn text-center border border-white/20">
                            <div className="mb-8">
                                <div className="p-6 bg-blue-100 text-blue-600 rounded-[2rem] inline-block shadow-lg shadow-blue-50 animate-pulse-subtle">
                                    <Smartphone size={56} />
                                </div>
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Escaneie o QR Code</h2>
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-10">Abra o app do seu banco para pagar</p>

                            <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-100 inline-block mb-10 shadow-inner">
                                <img src={pixData.img} alt="QR Code Pix" className="w-64 h-64" />
                            </div>

                            <div className="mb-10 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Valor Total</p>
                                <p className="text-5xl font-black text-blue-600 tracking-tighter">{formatCurrency(cartControl.total)}</p>
                            </div>

                            <div className="space-y-4">
                                <div className="relative group">
                                    <input readOnly value={pixData.payload} className="w-full pl-6 pr-16 py-4 bg-slate-100 rounded-2xl text-[10px] font-mono truncate border-2 border-transparent focus:border-blue-500 transition-all" />
                                    <button onClick={copyPixPayload} className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-white hover:bg-blue-600 hover:text-white rounded-xl shadow-md transition-all active:scale-90">
                                        <Copy size={18} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => finalizeSale('PIX')}
                                    className="w-full py-6 bg-slate-900 hover:bg-emerald-600 text-white text-xl font-black rounded-[2rem] shadow-2xl transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest"
                                >
                                    Pagamento Confirmado
                                </button>
                                <button onClick={() => setActiveModal('PAYMENT')} className="text-slate-400 hover:text-red-500 font-black uppercase tracking-widest text-[10px] transition-colors">
                                    Cancelar Operação
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* CUSTOMER MODAL */}
            {
                activeModal === 'CUSTOMER' && (
                    <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-6 backdrop-blur-xl animate-fadeIn">
                        <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-[0_50px_150px_rgba(0,0,0,0.5)] animate-scaleIn border border-white/20">
                            <div className="flex items-center gap-5 mb-10">
                                <div className="p-5 bg-blue-600 text-white rounded-[2rem] shadow-lg shadow-blue-100">
                                    <User size={32} />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Identificar Cliente</h3>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Vincule um cliente à venda atual</p>
                                </div>
                            </div>

                            <div className="max-h-[400px] overflow-y-auto space-y-4 mb-10 pr-4 custom-scrollbar">
                                <button
                                    onClick={() => { setSelectedCustomer(null); setActiveModal('NONE'); searchInputRef.current?.focus(); }}
                                    className="w-full text-left p-6 hover:bg-slate-900 hover:text-white rounded-[2rem] border-2 border-slate-100 transition-all duration-300 group flex justify-between items-center"
                                >
                                    <div>
                                        <span className="font-black text-xl uppercase tracking-tight">Consumidor Final</span>
                                        <p className="text-xs opacity-50 font-bold uppercase tracking-widest mt-1">Venda sem identificação</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                                        <ChevronRight size={24} />
                                    </div>
                                </button>

                                {customers.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => { setSelectedCustomer(c); setActiveModal('NONE'); searchInputRef.current?.focus(); }}
                                        className="w-full text-left p-6 hover:bg-blue-600 hover:text-white rounded-[2rem] border-2 border-slate-100 transition-all duration-300 group flex justify-between items-center"
                                    >
                                        <div className="flex-1 pr-4">
                                            <span className="font-black text-xl uppercase tracking-tight block group-hover:translate-x-1 transition-transform">{c.name}</span>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[10px] font-black bg-slate-100 group-hover:bg-white/20 px-2 py-1 rounded uppercase tracking-widest">{c.document}</span>
                                                <span className="text-xs opacity-50 font-medium truncate">{c.email || 'Sem e-mail cadastrado'}</span>
                                            </div>
                                        </div>
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                                            <ChevronRight size={24} />
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setActiveModal('NONE')}
                                className="w-full py-5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-black rounded-[1.5rem] transition-all uppercase tracking-widest text-xs"
                            >
                                Cancelar Operação
                            </button>
                        </div>
                    </div>
                )
            }

            {/* MENU MODAL */}
            {
                activeModal === 'MENU' && (
                    <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-6 backdrop-blur-xl animate-fadeIn">
                        <div className="bg-white rounded-[3rem] w-full max-w-4xl p-12 shadow-[0_50px_150px_rgba(0,0,0,0.5)] animate-scaleIn border border-white/20">
                            <div className="flex items-center justify-between mb-12">
                                <div className="flex items-center gap-5">
                                    <div className="p-5 bg-slate-900 text-white rounded-[2rem] shadow-xl">
                                        <Menu size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Menu de Funções</h3>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Acesso rápido às operações do sistema</p>
                                    </div>
                                </div>
                                <button onClick={() => setActiveModal('NONE')} className="p-4 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400 hover:text-slate-900">
                                    <X size={32} />
                                </button>
                                <div className="grid grid-cols-3 gap-6 mb-12">
                                    {[
                                        { label: 'Suprimento', icon: <PlusCircle size={32} />, color: 'emerald', action: () => cashRegister.openGenericModal('SUPRIMENTO') },
                                        { label: 'Sangria', icon: <MinusCircle size={32} />, color: 'red', action: () => cashRegister.openGenericModal('SANGRIA') },
                                        { label: 'Fechar Caixa', icon: <Lock size={32} />, color: 'slate', action: cashRegister.closeRegister },
                                        { label: 'Limpar Carrinho', icon: <Trash2 size={32} />, color: 'orange', action: () => { cartControl.clearCart(); setActiveModal('NONE'); } },
                                        { label: 'Últimas Vendas', icon: <History size={32} />, color: 'blue', action: () => { if (lastSale) { setPrintType('SALE'); setActiveModal('PRINT_RECEIPT'); } else { showAlert('Nenhuma venda realizada nesta sessão.', 'Aviso', 'info'); } } },
                                        { label: 'Configurações', icon: <SettingsIcon size={32} />, color: 'purple', action: () => window.location.href = '/settings' }
                                    ].map(item => (
                                        <button
                                            key={item.label}
                                            onClick={item.action}
                                            className="p-8 bg-slate-50 hover:bg-white border-2 border-transparent hover:border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all duration-300 group hover:shadow-2xl transform hover:-translate-y-2"
                                        >
                                            <div className={`p-5 rounded-3xl group-hover:scale-110 transition-transform duration-300 ${item.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                                item.color === 'red' ? 'bg-red-50 text-red-600' :
                                                    item.color === 'slate' ? 'bg-slate-100 text-slate-600' :
                                                        item.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                                                            item.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                                                                'bg-purple-50 text-purple-600'
                                                }`}>
                                                {item.icon}
                                            </div>
                                            <span className="font-black text-sm text-slate-800 uppercase tracking-widest">{item.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="bg-slate-900 rounded-[2rem] p-8 flex items-center justify-between text-white">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                            <User size={24} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operador Logado</p>
                                            <p className="font-black text-lg">{StorageService.getCurrentUser()?.name || 'ADMINISTRADOR'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => window.location.href = '/'} className="px-8 py-4 bg-white/10 hover:bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95">
                                        Sair do PDV
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* GENERIC CASH MODAL (SANGRIA / SUPRIMENTO) */}
            {
                cashRegister.modal === 'GENERIC' && (
                    <div className="fixed inset-0 bg-slate-950/90 z-[60] flex items-center justify-center p-6 backdrop-blur-xl animate-fadeIn">
                        <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-[0_50px_150px_rgba(0,0,0,0.5)] animate-scaleIn overflow-hidden border border-white/20">
                            <div className={`p-10 flex justify-between items-center border-b border-slate-100 ${cashRegister.genericType === 'SUPRIMENTO' ? 'bg-emerald-50/50' : 'bg-red-50/50'}`}>
                                <div className="flex items-center gap-5">
                                    <div className={`p-4 rounded-3xl text-white shadow-lg rotate-3 ${cashRegister.genericType === 'SUPRIMENTO' ? 'bg-emerald-500 shadow-emerald-100' : 'bg-red-500 shadow-red-100'}`}>
                                        {cashRegister.genericType === 'SUPRIMENTO' ? <PlusCircle size={28} /> : <MinusCircle size={28} />}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{cashRegister.genericType}</h2>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Movimentação manual de caixa</p>
                                    </div>
                                </div>
                                <button onClick={cashRegister.closeGenericModal} className="p-3 hover:bg-white rounded-2xl transition-colors text-slate-400 hover:text-slate-900 shadow-sm">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-12 space-y-10">
                                <div>
                                    <label className="block text-slate-400 font-black mb-4 text-[10px] uppercase tracking-[0.3em] text-center">Valor da Operação (R$)</label>
                                    <div className="relative max-w-xs mx-auto">
                                        <input
                                            autoFocus
                                            type="number"
                                            value={cashRegister.genericValue}
                                            onChange={e => cashRegister.setGenericValue(e.target.value)}
                                            className="w-full text-center text-5xl py-6 font-black border-none bg-slate-50 focus:ring-0 text-slate-900 rounded-[2rem] shadow-inner placeholder-slate-200"
                                            placeholder="0,00"
                                        />
                                        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full shadow-lg ${cashRegister.genericType === 'SUPRIMENTO' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-red-500 shadow-red-200'}`}></div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observação / Motivo</label>
                                    <textarea
                                        value={cashRegister.genericNote}
                                        onChange={e => cashRegister.setGenericNote(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] p-6 focus:ring-8 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-slate-800 placeholder-slate-300 min-h-[120px] resize-none"
                                        placeholder="Descreva o motivo desta movimentação..."
                                    />
                                </div>

                                <button
                                    onClick={cashRegister.handleGenericAction}
                                    disabled={!cashRegister.genericValue || parseFloat(cashRegister.genericValue) <= 0}
                                    className={`w-full py-6 text-xl font-black shadow-2xl text-white rounded-3xl transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest disabled:opacity-20 ${cashRegister.genericType === 'SUPRIMENTO' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                                >
                                    Confirmar {cashRegister.genericType}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};
