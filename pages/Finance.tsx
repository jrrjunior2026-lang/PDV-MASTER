import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { IFinancialRecord } from '../types';
import { Button, Input, Card, formatCurrency, Badge } from '../components/UI';
import { ArrowUpCircle, ArrowDownCircle, Plus, Filter } from 'lucide-react';

export const Finance: React.FC = () => {
  const [records, setRecords] = useState<IFinancialRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newRec, setNewRec] = useState<Partial<IFinancialRecord>>({ type: 'EXPENSE', status: 'PENDING' });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const data = StorageService.getFinancialRecords();
    setRecords(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleSave = () => {
    if (!newRec.description || !newRec.amount) return;
    const record: IFinancialRecord = {
      id: crypto.randomUUID(),
      type: newRec.type as any,
      description: newRec.description,
      amount: Number(newRec.amount),
      category: newRec.category || 'Geral',
      date: newRec.date || new Date().toISOString(),
      status: newRec.status as any
    };
    StorageService.addFinancialRecord(record);
    refreshData();
    setShowModal(false);
    setNewRec({ type: 'EXPENSE', status: 'PENDING' });
  };

  const income = records.filter(r => r.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
  const expense = records.filter(r => r.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
  const balance = income - expense;

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financeiro</h1>
          <p className="text-slate-500">Contas a Pagar e Receber</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={18} /> Lançamento
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                    <ArrowUpCircle size={24} />
                </div>
                <div>
                    <p className="text-sm text-slate-500 uppercase font-bold">Receitas</p>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(income)}</p>
                </div>
            </div>
        </Card>
        <Card className="border-l-4 border-l-red-500">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-full">
                    <ArrowDownCircle size={24} />
                </div>
                <div>
                    <p className="text-sm text-slate-500 uppercase font-bold">Despesas</p>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(expense)}</p>
                </div>
            </div>
        </Card>
        <Card className={`border-l-4 ${balance >= 0 ? 'border-l-blue-500' : 'border-l-red-500'}`}>
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${balance >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                    <span className="font-bold text-lg">Total</span>
                </div>
                <div>
                    <p className="text-sm text-slate-500 uppercase font-bold">Saldo</p>
                    <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatCurrency(balance)}</p>
                </div>
            </div>
        </Card>
      </div>

      {/* List */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700">Extrato de Lançamentos</h3>
            <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
                <Filter size={16} /> Filtrar
            </button>
        </div>
        <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                    <th className="px-6 py-3">Data</th>
                    <th className="px-6 py-3">Descrição</th>
                    <th className="px-6 py-3">Categoria</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Valor</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-500">{new Date(r.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">{r.description}</td>
                        <td className="px-6 py-4 text-slate-500"><span className="px-2 py-1 bg-slate-100 rounded text-xs">{r.category}</span></td>
                        <td className="px-6 py-4">
                            {r.status === 'PAID' 
                             ? <Badge color="bg-emerald-100 text-emerald-700">Pago</Badge>
                             : <Badge color="bg-amber-100 text-amber-700">Pendente</Badge>
                            }
                        </td>
                        <td className={`px-6 py-4 text-right font-bold ${r.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {r.type === 'INCOME' ? '+' : '-'}{formatCurrency(r.amount)}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg p-6">
                <h3 className="text-xl font-bold mb-4">Novo Lançamento</h3>
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="type" checked={newRec.type === 'INCOME'} onChange={() => setNewRec({...newRec, type: 'INCOME'})} />
                            <span className="text-emerald-600 font-bold">Receita</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="type" checked={newRec.type === 'EXPENSE'} onChange={() => setNewRec({...newRec, type: 'EXPENSE'})} />
                            <span className="text-red-600 font-bold">Despesa</span>
                        </label>
                    </div>
                    <Input label="Descrição" value={newRec.description || ''} onChange={e => setNewRec({...newRec, description: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Valor (R$)" type="number" value={newRec.amount} onChange={e => setNewRec({...newRec, amount: parseFloat(e.target.value)})} />
                        <Input label="Categoria" value={newRec.category || ''} onChange={e => setNewRec({...newRec, category: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Data Vencimento" type="date" value={newRec.date?.split('T')[0]} onChange={e => setNewRec({...newRec, date: new Date(e.target.value).toISOString()})} />
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
                            <select className="border border-slate-300 rounded-md p-2" value={newRec.status} onChange={e => setNewRec({...newRec, status: e.target.value as any})}>
                                <option value="PENDING">Pendente</option>
                                <option value="PAID">Pago/Recebido</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar</Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};