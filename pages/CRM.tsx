import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { ICustomer, ISale } from '../types';
import { Button, Input, Card, formatCurrency, Badge } from '../components/UI';
import { Plus, Search, User, Mail, Phone, MapPin, Sparkles } from 'lucide-react';

export const CRM: React.FC = () => {
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [sales, setSales] = useState<ISale[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<ICustomer>>({});
  const [aiPromo, setAiPromo] = useState<string>("");
  const [generatingPromo, setGeneratingPromo] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setCustomers(StorageService.getCustomers());
    setSales(StorageService.getSales());
  };

  const handleSave = () => {
    if (!newCustomer.name || !newCustomer.document) return;
    const customer: ICustomer = {
      id: crypto.randomUUID(),
      name: newCustomer.name,
      document: newCustomer.document,
      email: newCustomer.email || '',
      phone: newCustomer.phone || '',
      address: newCustomer.address || '',
      creditLimit: Number(newCustomer.creditLimit || 0)
    };
    StorageService.saveCustomer(customer);
    setShowModal(false);
    setNewCustomer({});
    refreshData();
  };

  const generatePromoMessage = async (customerName: string) => {
    setGeneratingPromo(true);
    setAiPromo("");
    // Simulate finding customer favorite products based on global sales for demo
    // In real app, filter by customerId
    const ai = await import('../services/geminiService').then(m => m.GeminiService);
    // Dummy implementation for direct AI call inside component for simplicity in this demo context
    // Ideally this goes to GeminiService
    setGeneratingPromo(false);
    setAiPromo(`Olá ${customerName}! 🌟 Notamos que você adora nossas promoções. Que tal conferir as ofertas de Arroz e Feijão hoje? Venha para o VarejoBR!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Clientes (CRM)</h1>
          <p className="text-slate-500">Administre sua base de clientes e histórico</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={18} /> Novo Cliente
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {customers.map(c => {
            // Calculate LTV (Lifetime Value) mock
            const ltv = sales.reduce((acc, s) => acc + (Math.random() > 0.8 ? s.total : 0), 0); 
            return (
                <Card key={c.id} className="hover:shadow-md transition">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                                <User size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">{c.name}</h3>
                                <p className="text-xs text-slate-500">{c.document}</p>
                            </div>
                        </div>
                        {c.creditLimit && c.creditLimit > 0 && (
                            <Badge color="bg-emerald-100 text-emerald-700">Crédito: {formatCurrency(c.creditLimit)}</Badge>
                        )}
                    </div>
                    
                    <div className="space-y-2 text-sm text-slate-600">
                        {c.email && <div className="flex items-center gap-2"><Mail size={14}/> {c.email}</div>}
                        {c.phone && <div className="flex items-center gap-2"><Phone size={14}/> {c.phone}</div>}
                        {c.address && <div className="flex items-center gap-2"><MapPin size={14}/> {c.address}</div>}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                         <div className="text-xs text-slate-500">
                            Última compra: <span className="font-semibold text-slate-700">Há 2 dias</span>
                         </div>
                         <button 
                            onClick={() => generatePromoMessage(c.name)}
                            className="text-xs flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium"
                         >
                            <Sparkles size={14} /> Marketing
                         </button>
                    </div>
                    {aiPromo && aiPromo.includes(c.name) && (
                        <div className="mt-3 bg-brand-50 p-3 rounded-lg text-xs text-brand-800 italic animate-fadeIn">
                            "{aiPromo}"
                        </div>
                    )}
                </Card>
            );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg p-6">
                <h3 className="text-xl font-bold mb-4">Cadastrar Cliente</h3>
                <div className="space-y-4">
                    <Input label="Nome Completo" value={newCustomer.name || ''} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
                    <Input label="CPF / CNPJ" value={newCustomer.document || ''} onChange={e => setNewCustomer({...newCustomer, document: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Email" value={newCustomer.email || ''} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
                        <Input label="Telefone" value={newCustomer.phone || ''} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
                    </div>
                    <Input label="Endereço" value={newCustomer.address || ''} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} />
                    <Input label="Limite de Crédito (R$)" type="number" value={newCustomer.creditLimit} onChange={e => setNewCustomer({...newCustomer, creditLimit: parseFloat(e.target.value)})} />
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar Cliente</Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};