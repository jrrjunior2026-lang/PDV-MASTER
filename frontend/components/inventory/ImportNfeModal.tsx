import React, { useState, useRef } from 'react';
import { ModalOverlay, Button, Input, formatCurrency } from '../UI';
import { FileUp, Check, AlertCircle, Loader2, Package, Truck, CreditCard } from 'lucide-react';
import { NfeService, INfeData } from '../../services/nfeService';
import { StorageService } from '../../services/storageService';
import { IProduct, TransactionType } from '../../types';

interface ImportNfeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const ImportNfeModal: React.FC<ImportNfeModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState<'UPLOAD' | 'CONFERENCE' | 'FINANCIAL'>('UPLOAD');
    const [nfeData, setNfeData] = useState<INfeData | null>(null);
    const [loading, setLoading] = useState(false);
    const [installments, setInstallments] = useState('1');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const xmlString = event.target?.result as string;
            try {
                const data = NfeService.parseXml(xmlString);
                setNfeData(data);
                setStep('CONFERENCE');
            } catch (error: any) {
                console.error('Erro ao processar XML:', error);
                alert(`Erro ao processar XML da NF-e:\n${error.message || 'Verifique se o arquivo é uma NF-e válida.'}`);
            }
        };
        reader.readAsText(file);
    };

    const handleProcessEntry = async () => {
        if (!nfeData) return;
        setLoading(true);

        try {
            // Validar dados antes de processar
            if (!nfeData.supplier.name || !nfeData.supplier.document) {
                throw new Error('Dados do fornecedor incompletos. Nome e documento são obrigatórios.');
            }

            if (!nfeData.products || nfeData.products.length === 0) {
                throw new Error('Nenhum produto encontrado na NF-e.');
            }

            // 1. Register/Update Supplier
            let supplier;
            try {
                supplier = await StorageService.saveSupplier(nfeData.supplier);
            } catch (error: any) {
                console.error('Erro ao salvar fornecedor:', error);
                throw new Error(`Erro ao salvar fornecedor: ${error.message || 'Erro desconhecido'}`);
            }

            // 2. Fetch all current products once to avoid multiple requests
            const allProducts = await StorageService.getProducts();

            // 3. Process Products
            const processedProducts: string[] = [];
            const errors: string[] = [];

            for (const item of nfeData.products) {
                try {
                    // Validar item
                    if (!item.code || !item.name) {
                        errors.push(`Produto sem código ou nome: ${item.name || 'Desconhecido'}`);
                        continue;
                    }

                    // Check if product exists by code in our local list
                    let existingProduct = allProducts.find(p => p.code === item.code);

                    if (existingProduct) {
                        console.log(`Atualizando produto existente: ${existingProduct.name} (${existingProduct.code})`);

                        // Update cost price and other info
                        const updatedProduct = {
                            ...existingProduct,
                            cost: item.cost || existingProduct.cost || 0,
                            price: item.price || existingProduct.price || 0,
                            ncm: item.ncm || existingProduct.ncm || '',
                            unit: (item.unit as any) || existingProduct.unit || 'UN'
                        };

                        await StorageService.saveProduct(updatedProduct);

                        // Update stock
                        if (item.quantity && item.quantity > 0) {
                            await StorageService.updateStock(
                                existingProduct.id,
                                item.quantity,
                                TransactionType.ENTRY,
                                nfeData.number,
                                `Entrada via NFe #${nfeData.number}`
                            );
                        }

                        processedProducts.push(existingProduct.name);
                    } else {
                        console.log(`Criando novo produto: ${item.name} (${item.code})`);

                        // Create new product
                        const newProductId = crypto.randomUUID();
                        const newProduct: IProduct = {
                            id: newProductId,
                            code: item.code,
                            name: item.name,
                            price: item.price || (item.cost || 0) * 1.5, // Se não tiver preço, calcula 50% de margem
                            cost: item.cost || 0,
                            stock: 0, // Start with 0, updateStock will add the quantity
                            ncm: item.ncm || '',
                            cest: '',
                            origin: '0',
                            taxGroup: 'A',
                            unit: (item.unit as any) || 'UN',
                            minStock: 0
                        };

                        await StorageService.saveProduct(newProduct);

                        // Record in Kardex and update stock
                        if (item.quantity && item.quantity > 0) {
                            await StorageService.updateStock(
                                newProductId,
                                item.quantity,
                                TransactionType.ENTRY,
                                nfeData.number,
                                `Entrada via NFe #${nfeData.number} (Novo Produto)`
                            );
                        }

                        // Add to our local list to handle duplicates in the same XML
                        allProducts.push({ ...newProduct, stock: item.quantity || 0 });
                        processedProducts.push(newProduct.name);
                    }
                } catch (error: any) {
                    console.error(`Erro ao processar produto ${item.name}:`, error);
                    errors.push(`${item.name || 'Produto desconhecido'}: ${error.message || 'Erro desconhecido'}`);
                }
            }

            if (processedProducts.length === 0) {
                throw new Error('Nenhum produto foi processado com sucesso. ' + (errors.length > 0 ? errors.join('; ') : ''));
            }

            if (errors.length > 0) {
                console.warn('Alguns produtos tiveram erros:', errors);
                // Continuar mesmo com alguns erros, mas avisar o usuário
            }

            setStep('FINANCIAL');
        } catch (error: any) {
            console.error('Erro no processamento da NFe:', error);
            const errorMessage = error.message || 'Erro desconhecido';
            alert(`Erro ao processar entrada de mercadorias:\n\n${errorMessage}\n\nVerifique:\n- Se o XML é uma NF-e válida\n- Se os dados do fornecedor estão completos\n- Se há produtos na nota fiscal`);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateFinancial = async (generate: boolean) => {
        if (generate && nfeData) {
            const numInstallments = parseInt(installments);
            const installmentValue = nfeData.totalValue / numInstallments;

            for (let i = 1; i <= numInstallments; i++) {
                const dueDate = new Date();
                dueDate.setMonth(dueDate.getMonth() + i);

                await StorageService.addFinancialRecord({
                    id: crypto.randomUUID(),
                    type: 'EXPENSE',
                    description: `NFe #${nfeData.number} - Parc ${i}/${numInstallments} - ${nfeData.supplier.name}`,
                    amount: installmentValue,
                    category: 'COMPRA DE MERCADORIA',
                    date: dueDate.toISOString(),
                    status: 'PENDING',
                    referenceId: nfeData.number
                });
            }
        }

        onSuccess();
        onClose();
    };

    return (
        <ModalOverlay>
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Importar NF-e (XML)</h2>
                        <p className="text-slate-500 font-medium">Entrada de mercadorias e fornecedores</p>
                    </div>
                    <div className="flex gap-2">
                        <div className={`w-3 h-3 rounded-full ${step === 'UPLOAD' ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
                        <div className={`w-3 h-3 rounded-full ${step === 'CONFERENCE' ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
                        <div className={`w-3 h-3 rounded-full ${step === 'FINANCIAL' ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {step === 'UPLOAD' && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-4 border-dashed border-slate-100 rounded-[2rem] p-20 flex flex-col items-center justify-center gap-6 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group"
                        >
                            <div className="w-24 h-24 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                <FileUp size={48} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Selecione o arquivo XML</h3>
                                <p className="text-slate-500">Clique aqui ou arraste o arquivo da nota fiscal</p>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".xml"
                                onChange={handleFileUpload}
                            />
                        </div>
                    )}

                    {step === 'CONFERENCE' && nfeData && (
                        <div className="space-y-8">
                            {/* Info Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <div className="flex items-center gap-3 mb-4 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                                        <Truck size={14} /> Fornecedor
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800">{nfeData.supplier.name}</h4>
                                    <p className="text-sm text-slate-500">{nfeData.supplier.document}</p>
                                    <p className="text-xs text-slate-400 mt-2">{nfeData.supplier.address}</p>
                                </div>
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <div className="flex items-center gap-3 mb-4 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                                        <Package size={14} /> Dados da Nota
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800">NF-e #{nfeData.number}</h4>
                                    <p className="text-sm text-slate-500">Série: {nfeData.series}</p>
                                    <p className="text-sm font-black text-blue-600 mt-2">Valor Total: {formatCurrency(nfeData.totalValue)}</p>
                                </div>
                            </div>

                            {/* Products Table */}
                            <div className="border border-slate-100 rounded-3xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Produto</th>
                                            <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Qtd</th>
                                            <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Custo Un.</th>
                                            <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nfeData.products.map((item, idx) => (
                                            <tr key={idx} className="border-b border-slate-50 last:border-0">
                                                <td className="p-4">
                                                    <div className="font-bold text-slate-800">{item.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">{item.code}</div>
                                                </td>
                                                <td className="p-4 text-center font-bold text-slate-600">{item.quantity} {item.unit}</td>
                                                <td className="p-4 text-right font-bold text-slate-600">{formatCurrency(item.cost || 0)}</td>
                                                <td className="p-4 text-right font-black text-slate-800">{formatCurrency((item.cost || 0) * (item.quantity || 0))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {step === 'FINANCIAL' && (
                        <div className="flex flex-col items-center justify-center py-10 gap-8">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                                <Check size={40} />
                            </div>
                            <div className="text-center max-w-md">
                                <h3 className="text-2xl font-black text-slate-900 mb-2">Entrada Processada!</h3>
                                <p className="text-slate-500 font-medium">O estoque foi atualizado e o fornecedor cadastrado. Deseja gerar uma fatura no Contas a Pagar?</p>
                            </div>

                            <div className="w-full max-w-sm bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                                <div className="flex items-center gap-3 mb-6 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                                    <CreditCard size={14} /> Configurar Pagamento
                                </div>
                                <Input
                                    label="Número de Parcelas"
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={installments}
                                    onChange={e => setInstallments(e.target.value)}
                                />
                                <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-100 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Valor da Parcela</span>
                                    <span className="text-lg font-black text-slate-800">{formatCurrency(nfeData!.totalValue / parseInt(installments || '1'))}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                    {step === 'CONFERENCE' && (
                        <>
                            <Button variant="ghost" onClick={() => setStep('UPLOAD')} className="flex-1">Voltar</Button>
                            <Button onClick={handleProcessEntry} disabled={loading} className="flex-[2]">
                                {loading ? <Loader2 className="animate-spin" /> : <><Check size={18} /> Confirmar Entrada</>}
                            </Button>
                        </>
                    )}
                    {step === 'FINANCIAL' && (
                        <>
                            <Button variant="ghost" onClick={() => handleGenerateFinancial(false)} className="flex-1">Não Gerar</Button>
                            <Button variant="success" onClick={() => handleGenerateFinancial(true)} className="flex-[2]">
                                Gerar Contas a Pagar
                            </Button>
                        </>
                    )}
                    {step === 'UPLOAD' && (
                        <Button variant="ghost" onClick={onClose} className="w-full">Cancelar</Button>
                    )}
                </div>
            </div>
        </ModalOverlay>
    );
};
