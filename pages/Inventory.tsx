import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { CsvService } from '../services/csvService';
import { IProduct, IKardexEntry, TransactionType } from '../types';
import { Button, Input, Card, formatCurrency, Badge, ConfirmModal, AlertModal } from '../components/UI';
import { Plus, Search, FileText, ArrowUpRight, ArrowDownLeft, AlertCircle, Download, Upload, FileSpreadsheet, Printer, X, Trash2, Tag, Eye, ChevronLeft } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import JsBarcode from 'jsbarcode';

// Barcode Component
const BarcodeRenderer: React.FC<{ value: string; className?: string }> = ({ value, className }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (svgRef.current) {
            try {
                JsBarcode(svgRef.current, value, {
                    format: (value.length === 13 && !isNaN(Number(value))) ? "EAN13" : "CODE128",
                    width: 2,
                    height: 30, // Adjusted height
                    displayValue: true,
                    fontSize: 12,
                    margin: 0,
                    background: "transparent"
                });
            } catch (e) {
                console.error("Barcode error", e);
            }
        }
    }, [value]);

    return <svg ref={svgRef} className={`w-full h-full max-w-full ${className}`} />;
};

export const Inventory: React.FC = () => {
    const [products, setProducts] = useState<IProduct[]>([]);
    const [kardex, setKardex] = useState<IKardexEntry[]>([]);
    const [view, setView] = useState<'LIST' | 'KARDEX'>('LIST');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showLabelModal, setShowLabelModal] = useState(false);

    // Custom Alert/Confirm States
    const [confirmState, setConfirmState] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void }>({
        isOpen: false, title: '', message: '', onConfirm: () => { }
    });
    const [alertState, setAlertState] = useState<{ isOpen: boolean, title: string, message: string, type: 'info' | 'error' | 'success' }>({
        isOpen: false, title: '', message: '', type: 'info'
    });

    const showAlert = (message: string, title: string = 'Atenção', type: 'info' | 'error' | 'success' = 'info') => {
        setAlertState({ isOpen: true, message, title, type });
    };

    // Label Printing State
    const [labelQueue, setLabelQueue] = useState<{ product: IProduct, qty: number }[]>([]);
    const [labelSearch, setLabelSearch] = useState('');
    const [qtyToAdd, setQtyToAdd] = useState(1);
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    // New Product Form State
    const [newProd, setNewProd] = useState<Partial<IProduct>>({
        taxGroup: 'A', unit: 'UN', origin: '0'
    });
    const [auditResult, setAuditResult] = useState<any>(null);

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        const p = StorageService.getProducts();
        const k = StorageService.getKardex();
        setProducts(p);
        setKardex(k.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    const handleAudit = async () => {
        if (newProd.name && newProd.ncm) {
            setAuditResult("Analisando...");
            const result = await GeminiService.auditProduct(newProd.name, newProd.ncm);
            setAuditResult(result);
        }
    };

    const saveProduct = () => {
        if (!newProd.name || !newProd.code) return;
        const prod: IProduct = {
            id: crypto.randomUUID(),
            code: newProd.code,
            name: newProd.name,
            price: Number(newProd.price || 0),
            cost: Number(newProd.cost || 0),
            stock: Number(newProd.stock || 0),
            ncm: newProd.ncm || '',
            cest: newProd.cest || '',
            origin: newProd.origin as any || '0',
            minStock: Number(newProd.minStock || 0),
            taxGroup: newProd.taxGroup as any || 'A',
            unit: newProd.unit as any || 'UN',
        };
        StorageService.saveProduct(prod);
        // Initial Stock Movement
        if (prod.stock > 0) {
            StorageService.updateStock(prod.id, prod.stock, TransactionType.ENTRY, 'INIT', 'Estoque Inicial');
        }
        setShowAddModal(false);
        setNewProd({});
        setAuditResult(null);
        refreshData();
    };

    // CSV Handlers
    const handleExport = () => {
        CsvService.exportProducts(products);
    };

    const handleDownloadTemplate = () => {
        CsvService.downloadTemplate();
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const parsedProducts = await CsvService.parseCsv(file);
            if (parsedProducts.length > 0) {
                setConfirmState({
                    isOpen: true,
                    title: 'Importação de Dados',
                    message: `Encontrados ${parsedProducts.length} produtos. Deseja importar? \n(Códigos existentes serão atualizados)`,
                    onConfirm: () => {
                        const validProducts = parsedProducts.map(p => ({
                            ...p,
                            id: p.id || crypto.randomUUID(),
                            stock: p.stock || 0
                        })) as IProduct[];

                        StorageService.saveProductsBatch(validProducts);
                        refreshData();
                        setShowImportModal(false);
                        showAlert('Importação concluída com sucesso!', 'Sucesso', 'success');
                    }
                });
            } else {
                showAlert('Nenhum produto válido encontrado no arquivo.', 'Erro', 'error');
            }
        } catch (err) {
            showAlert('Erro ao processar arquivo. Verifique o formato.', 'Erro', 'error');
        }
        e.target.value = '';
    };

    // Label Handlers
    const addToLabelQueue = (product: IProduct, quantity: number) => {
        setLabelQueue(prev => {
            const existingIdx = prev.findIndex(i => i.product.id === product.id);
            if (existingIdx >= 0) {
                const newQueue = [...prev];
                newQueue[existingIdx].qty += quantity;
                return newQueue;
            }
            return [...prev, { product, qty: quantity }];
        });
        setLabelSearch('');
        setQtyToAdd(1);
    };

    const updateLabelQty = (id: string, newQty: number) => {
        if (newQty < 1) return;
        setLabelQueue(prev => prev.map(item => item.product.id === id ? { ...item, qty: newQty } : item));
    };

    const removeFromLabelQueue = (id: string) => {
        setLabelQueue(prev => prev.filter(item => item.product.id !== id));
    };

    const handlePrint = () => {
        window.print();
    };

    // Filter products for suggestions
    const suggestedProducts = labelSearch.length > 0
        ? products.filter(p => p.name.toLowerCase().includes(labelSearch.toLowerCase()) || p.code.includes(labelSearch)).slice(0, 10)
        : [];

    // Flatten queue for preview
    const flatLabels = labelQueue.flatMap(item => Array(item.qty).fill(item.product));

    return (
        <div className="space-y-6">

            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
            />

            <AlertModal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Controle de Estoque</h1>
                    <p className="text-slate-500">Gerencie produtos e visualize o Kardex</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                        <button
                            onClick={() => setView('LIST')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${view === 'LIST' ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Produtos
                        </button>
                        <button
                            onClick={() => setView('KARDEX')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${view === 'KARDEX' ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Kardex (Livro)
                        </button>
                    </div>
                    <Button variant="secondary" onClick={() => { setShowLabelModal(true); setIsPreviewMode(false); }}>
                        <Printer size={18} /> Etiquetas
                    </Button>
                    <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                        <FileSpreadsheet size={18} /> Excel/CSV
                    </Button>
                    <Button onClick={() => setShowAddModal(true)}>
                        <Plus size={18} /> Novo Produto
                    </Button>
                </div>
            </div>

            {view === 'LIST' ? (
                <Card className="overflow-hidden p-0">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input className="w-full pl-10 pr-4 py-2 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Buscar por nome, EAN ou NCM..." />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">Código</th>
                                    <th className="px-6 py-3">Produto</th>
                                    <th className="px-6 py-3">NCM</th>
                                    <th className="px-6 py-3 text-right">Estoque</th>
                                    <th className="px-6 py-3 text-right">Custo</th>
                                    <th className="px-6 py-3 text-right">Venda</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {products.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 font-mono text-slate-500">{p.code}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                                        <td className="px-6 py-4 text-slate-500">{p.ncm}</td>
                                        <td className={`px-6 py-4 text-right font-bold ${p.stock <= p.minStock ? 'text-red-600' : 'text-slate-700'}`}>
                                            {p.stock} {p.unit}
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-500">{formatCurrency(p.cost)}</td>
                                        <td className="px-6 py-4 text-right text-slate-900">{formatCurrency(p.price)}</td>
                                        <td className="px-6 py-4">
                                            {p.stock <= p.minStock ? <Badge color="bg-red-100 text-red-700">Crítico</Badge> : <Badge color="bg-emerald-100 text-emerald-700">Ok</Badge>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <Card className="overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">Data/Hora</th>
                                    <th className="px-6 py-3">Produto</th>
                                    <th className="px-6 py-3">Tipo</th>
                                    <th className="px-6 py-3">Doc Ref.</th>
                                    <th className="px-6 py-3 text-right">Qtd Mov.</th>
                                    <th className="px-6 py-3 text-right">Saldo Final</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {kardex.map(k => {
                                    const prodName = products.find(p => p.id === k.productId)?.name || 'Desconhecido';
                                    const isEntry = k.type === TransactionType.ENTRY || k.type === TransactionType.ADJUSTMENT && k.quantity > 0;
                                    return (
                                        <tr key={k.id} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-4 text-slate-500">{new Date(k.date).toLocaleString()}</td>
                                            <td className="px-6 py-4 font-medium text-slate-900">{prodName}</td>
                                            <td className="px-6 py-4">
                                                <div className={`flex items-center gap-1 ${isEntry ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {isEntry ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                                                    <span className="font-bold">{k.type}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-500">{k.documentRef || '-'}</td>
                                            <td className={`px-6 py-4 text-right font-bold ${isEntry ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {isEntry ? '+' : ''}{k.quantity}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-900">{k.balanceAfter}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Import/Export Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-lg p-6">
                        <h3 className="text-xl font-bold mb-2">Importar/Exportar Produtos</h3>
                        <p className="text-sm text-slate-500 mb-6">Use planilhas (Excel/CSV) para gerenciar seu estoque em massa.</p>

                        <div className="space-y-6">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Download size={18} /> Exportar Dados</h4>
                                <div className="flex gap-3">
                                    <Button variant="secondary" onClick={handleDownloadTemplate} className="text-sm w-full">Baixar Modelo em Branco</Button>
                                    <Button variant="secondary" onClick={handleExport} className="text-sm w-full">Exportar Estoque Atual</Button>
                                </div>
                            </div>

                            <div className="p-4 bg-brand-50 rounded-lg border border-brand-200">
                                <h4 className="font-bold text-brand-800 mb-2 flex items-center gap-2"><Upload size={18} /> Importar Planilha</h4>
                                <p className="text-xs text-brand-600 mb-3">Selecione o arquivo .csv preenchido conforme o modelo. Produtos com códigos existentes serão atualizados.</p>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleImport}
                                    className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-brand-100 file:text-brand-700
                                hover:file:bg-brand-200
                            "
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <Button onClick={() => setShowImportModal(false)}>Fechar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Improved Label Printing Modal with Preview */}
            {showLabelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Printer className="text-brand-600" />
                                    {isPreviewMode ? 'Pré-visualização de Impressão' : 'Gerador de Etiquetas'}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {isPreviewMode
                                        ? 'Verifique o layout antes de imprimir. Papel: 3 Colunas (33x21mm)'
                                        : 'Selecione os produtos para compor a fila de impressão.'
                                    }
                                </p>
                            </div>
                            <button onClick={() => setShowLabelModal(false)} className="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-slate-200 rounded-full"><X size={24} /></button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-hidden relative">
                            {!isPreviewMode ? (
                                <div className="flex h-full flex-col md:flex-row">
                                    {/* Left: Search & Add */}
                                    <div className="w-full md:w-5/12 p-6 border-r border-slate-200 flex flex-col gap-6 bg-white z-10">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Adicionar à Fila</label>
                                            <div className="flex gap-2 mb-2">
                                                <div className="w-24">
                                                    <label className="text-[10px] uppercase font-bold text-slate-400">Qtd</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={qtyToAdd}
                                                        onChange={(e) => setQtyToAdd(parseInt(e.target.value) || 1)}
                                                        className="w-full p-3 border border-slate-300 rounded-lg text-center font-bold text-slate-800 focus:ring-2 focus:ring-brand-500 outline-none"
                                                    />
                                                </div>
                                                <div className="flex-1 relative">
                                                    <label className="text-[10px] uppercase font-bold text-slate-400">Buscar Produto (Nome ou EAN)</label>
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                                        <input
                                                            value={labelSearch}
                                                            onChange={(e) => setLabelSearch(e.target.value)}
                                                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none"
                                                            placeholder="Digite para buscar..."
                                                            autoFocus
                                                        />
                                                    </div>

                                                    {/* Autocomplete Suggestions */}
                                                    {labelSearch.length > 0 && (
                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 max-h-64 overflow-y-auto z-50">
                                                            {suggestedProducts.length > 0 ? (
                                                                suggestedProducts.map(p => (
                                                                    <button
                                                                        key={p.id}
                                                                        onClick={() => addToLabelQueue(p, qtyToAdd)}
                                                                        className="w-full text-left p-3 hover:bg-brand-50 border-b border-slate-50 last:border-none flex justify-between items-center transition group"
                                                                    >
                                                                        <div>
                                                                            <p className="font-bold text-sm text-slate-800 group-hover:text-brand-700">{p.name}</p>
                                                                            <p className="text-xs text-slate-400">{p.code} • {formatCurrency(p.price)}</p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-brand-600 opacity-0 group-hover:opacity-100 transition">
                                                                            <span className="text-xs font-bold">Adicionar {qtyToAdd}x</span>
                                                                            <Plus size={18} />
                                                                        </div>
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <div className="p-4 text-center text-slate-400 text-sm">Nenhum produto encontrado.</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-400">Dica: Defina a quantidade primeiro, depois busque e clique no produto.</p>
                                        </div>

                                        <div className="bg-brand-50 p-4 rounded-xl border border-brand-100 flex-1 flex flex-col items-center justify-center text-brand-800 opacity-70">
                                            <Tag size={48} className="mb-2" />
                                            <p className="text-center text-sm font-medium">Selecione produtos ao lado para montar sua fila de impressão.</p>
                                        </div>
                                    </div>

                                    {/* Right: Queue */}
                                    <div className="w-full md:w-7/12 bg-slate-50 flex flex-col">
                                        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm">
                                            <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                                <span className="bg-slate-800 text-white text-xs px-2 py-0.5 rounded-full">{labelQueue.length}</span>
                                                Itens na Fila
                                            </h4>
                                            <button onClick={() => setLabelQueue([])} className="text-xs text-red-500 hover:text-red-700 hover:underline">Limpar Fila</button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                            {labelQueue.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                                    <Printer size={48} className="mb-4 opacity-20" />
                                                    <p>Sua fila de impressão está vazia.</p>
                                                </div>
                                            ) : (
                                                labelQueue.map(item => (
                                                    <div key={item.product.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 flex items-center justify-between group hover:border-brand-300 transition">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-500 font-bold text-xs">
                                                                {item.qty}x
                                                            </div>
                                                            <div className="truncate">
                                                                <p className="font-bold text-sm text-slate-800 truncate">{item.product.name}</p>
                                                                <p className="text-[10px] text-slate-500 font-mono">{item.product.code}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex items-center border border-slate-200 rounded-md bg-slate-50">
                                                                <button onClick={() => updateLabelQty(item.product.id, item.qty - 1)} className="px-2 py-1 hover:bg-slate-200 text-slate-600">-</button>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={item.qty}
                                                                    onChange={(e) => updateLabelQty(item.product.id, parseInt(e.target.value) || 1)}
                                                                    className="w-10 text-center bg-transparent text-sm font-bold outline-none"
                                                                />
                                                                <button onClick={() => updateLabelQty(item.product.id, item.qty + 1)} className="px-2 py-1 hover:bg-slate-200 text-slate-600">+</button>
                                                            </div>
                                                            <button onClick={() => removeFromLabelQueue(item.product.id)} className="text-slate-400 hover:text-red-500 p-1 rounded transition">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className="p-4 bg-white border-t border-slate-200">
                                            <div className="flex justify-between text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <span>Total de Etiquetas:</span>
                                                <span className="font-bold text-lg text-brand-600">{labelQueue.reduce((acc, i) => acc + i.qty, 0)}</span>
                                            </div>
                                            <Button onClick={() => setIsPreviewMode(true)} disabled={labelQueue.length === 0} className="w-full py-3 text-lg font-bold shadow-lg shadow-brand-200">
                                                <Eye size={20} /> Pré-visualizar Impressão
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // PREVIEW MODE
                                <div className="h-full flex flex-col bg-slate-200">
                                    <div className="flex-1 overflow-auto p-8 flex justify-center">
                                        {/* Simulated Paper Roll Container */}
                                        <div className="bg-white shadow-xl relative" style={{ width: '105mm', minHeight: '100mm', paddingBottom: '20px' }}>
                                            {/* Paper texture/edges */}
                                            <div className="absolute top-0 left-0 bottom-0 w-[1px] bg-slate-100 border-l border-slate-200"></div>
                                            <div className="absolute top-0 right-0 bottom-0 w-[1px] bg-slate-100 border-r border-slate-200"></div>

                                            {/* Content mimicking print CSS exactly */}
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(3, 33mm)',
                                                justifyContent: 'start',
                                                padding: 0,
                                                margin: 0
                                            }}>
                                                {flatLabels.map((prod, idx) => (
                                                    <div key={`${prod.id}-${idx}`}
                                                        className="relative border-b border-dashed border-slate-200 border-r"
                                                        style={{ width: '33mm', height: '21mm', padding: '1mm 2mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' }}>

                                                        <div className="w-full text-center">
                                                            <p className="text-[8px] font-bold leading-tight truncate w-full uppercase text-black">{prod.name.substring(0, 18)}</p>
                                                        </div>
                                                        <div className="w-full text-center -mt-1">
                                                            <p className="text-[10px] font-black text-black">R$ {prod.price.toFixed(2).replace('.', ',')}</p>
                                                        </div>
                                                        <div className="w-[95%] h-[12mm] flex items-center justify-center overflow-hidden">
                                                            <BarcodeRenderer value={prod.code} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preview Actions */}
                                    <div className="p-4 bg-white border-t border-slate-300 flex justify-between items-center z-20">
                                        <Button variant="secondary" onClick={() => setIsPreviewMode(false)} className="px-6">
                                            <ChevronLeft size={20} /> Voltar e Editar
                                        </Button>
                                        <div className="text-center text-sm text-slate-500">
                                            <p className="font-bold text-slate-700">{flatLabels.length} Etiquetas</p>
                                            <p>~{Math.ceil(flatLabels.length / 3)} Linhas de impressão</p>
                                        </div>
                                        <Button onClick={handlePrint} className="px-8 py-3 bg-brand-700 hover:bg-brand-800 text-lg">
                                            <Printer size={20} /> Imprimir Agora
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Printable Area - Remains unchanged for actual printing */}
            <div id="printable-area" className="hidden">
                <style>{`
            #printable-area {
                display: grid;
                grid-template-columns: repeat(3, 33mm);
                /* Usually thermal rolls have specific gaps, but standard 3-col is approx 105-108mm width */
                width: 105mm; 
                justify-content: start;
            }
            .label-cell {
                width: 33mm;
                height: 21mm;
                padding: 1mm 2mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                overflow: hidden;
                box-sizing: border-box;
                page-break-inside: avoid;
                text-align: center;
                /* Debug border, remove in prod if needed, but helps alignment */
                /* border: 1px dashed #ccc; */ 
            }
         `}</style>
                {flatLabels.map((prod, idx) => (
                    <div key={`${prod.id}-${idx}`} className="label-cell">
                        <div className="w-full text-center">
                            <p className="text-[8px] font-bold leading-tight truncate w-full uppercase text-black">{prod.name.substring(0, 18)}</p>
                        </div>
                        <div className="w-full text-center -mt-1">
                            <p className="text-[10px] font-black text-black">R$ {prod.price.toFixed(2).replace('.', ',')}</p>
                        </div>
                        <div className="w-[95%] h-[12mm] flex items-center justify-center overflow-hidden">
                            <BarcodeRenderer value={prod.code} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Product Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex justify-between">
                            <h3 className="text-xl font-bold">Cadastro de Produto</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Código EAN/Barras" value={newProd.code || ''} onChange={e => setNewProd({ ...newProd, code: e.target.value })} placeholder="789..." />
                                <Input label="Nome do Produto" value={newProd.name || ''} onChange={e => setNewProd({ ...newProd, name: e.target.value })} />
                            </div>

                            {/* Fiscal Data Section */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1"><FileText size={14} /> Dados Fiscais (NFC-e)</h4>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex justify-between items-end gap-2">
                                        <Input label="NCM" value={newProd.ncm || ''} onChange={e => setNewProd({ ...newProd, ncm: e.target.value })} className="flex-1" />
                                    </div>
                                    <Input label="CEST" value={newProd.cest || ''} onChange={e => setNewProd({ ...newProd, cest: e.target.value })} />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Origem da Mercadoria</label>
                                    <select
                                        className="border border-slate-300 rounded-md p-2 text-sm bg-white"
                                        value={newProd.origin}
                                        onChange={e => setNewProd({ ...newProd, origin: e.target.value as any })}
                                    >
                                        <option value="0">0 - Nacional</option>
                                        <option value="1">1 - Estrangeira (Imp. Direta)</option>
                                        <option value="2">2 - Estrangeira (Adq. Mercado Interno)</option>
                                        <option value="3">3 - Nacional (Conteúdo Imp. {'>'} 40%)</option>
                                        <option value="5">5 - Nacional (Conteúdo Imp. {'<='} 40%)</option>
                                    </select>
                                </div>

                                {/* Gemini Audit */}
                                <div className="mt-2">
                                    <Button variant="secondary" onClick={handleAudit} type="button" className="w-full text-xs py-1 h-8">
                                        <AlertCircle size={14} /> Auditar Dados Fiscais com IA
                                    </Button>
                                    {auditResult && typeof auditResult === 'string' && <p className="text-xs text-brand-600 mt-2 text-center">{auditResult}</p>}
                                    {auditResult && typeof auditResult === 'object' && (
                                        <div className={`mt-2 text-sm p-2 rounded ${auditResult.valid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                            <span className="font-bold">{auditResult.valid ? "NCM Válido!" : "Atenção: NCM pode estar incorreto."}</span>
                                            <p className="mt-1 text-xs">{auditResult.reason}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <Input label="Preço Custo" type="number" value={newProd.cost} onChange={e => setNewProd({ ...newProd, cost: parseFloat(e.target.value) })} />
                                <Input label="Preço Venda" type="number" value={newProd.price} onChange={e => setNewProd({ ...newProd, price: parseFloat(e.target.value) })} />
                                <Input label="Estoque Inicial" type="number" value={newProd.stock} onChange={e => setNewProd({ ...newProd, stock: parseFloat(e.target.value) })} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Unidade</label>
                                    <select className="border border-slate-300 rounded-md p-2" value={newProd.unit} onChange={e => setNewProd({ ...newProd, unit: e.target.value as any })}>
                                        <option value="UN">UN - Unidade</option>
                                        <option value="KG">KG - Quilograma</option>
                                        <option value="L">L - Litro</option>
                                        <option value="CX">CX - Caixa</option>
                                    </select>
                                </div>
                                <Input label="Estoque Mínimo" type="number" value={newProd.minStock} onChange={e => setNewProd({ ...newProd, minStock: parseFloat(e.target.value) })} />
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Grupo Tributário</label>
                                    <select className="border border-slate-300 rounded-md p-2" value={newProd.taxGroup} onChange={e => setNewProd({ ...newProd, taxGroup: e.target.value as any })}>
                                        <option value="A">Grupo A - Tributado</option>
                                        <option value="B">Grupo B - Isento</option>
                                        <option value="C">Grupo C - Subst. Trib.</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancelar</Button>
                            <Button onClick={saveProduct}>Salvar Produto</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
