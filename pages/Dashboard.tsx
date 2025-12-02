
import React, { useEffect, useState } from 'react';
import { Card, formatCurrency } from '../components/UI';
import { StorageService } from '../services/storageService';
import { GeminiService } from '../services/geminiService';
import { ISale, IProduct } from '../types';
import { TrendingUp, AlertTriangle, DollarSign, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const Dashboard: React.FC = () => {
  const [sales, setSales] = useState<ISale[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [insight, setInsight] = useState<string>("Carregando análise inteligente...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = StorageService.getSales();
    const p = StorageService.getProducts();
    setSales(s);
    setProducts(p);
    setLoading(false);

    // Initial AI analysis
    GeminiService.analyzeBusiness(s, p).then(setInsight);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const todaySales = sales.filter(s => new Date(s.date).toDateString() === new Date().toDateString()).length;

  const chartData = sales.slice(-10).map((s, idx) => ({
    name: `Venda ${idx+1}`,
    total: s.total
  }));

  if (loading) return <div>Carregando sistema...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>
        <span className="text-sm text-slate-500">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-brand-500">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium uppercase">Faturamento Total</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="p-2 bg-brand-50 rounded-lg text-brand-600"><DollarSign size={20}/></div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
           <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium uppercase">Vendas Hoje</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{todaySales}</p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><TrendingUp size={20}/></div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
           <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium uppercase">Produtos Críticos</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{lowStockCount}</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><AlertTriangle size={20}/></div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-indigo-500">
           <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium uppercase">Total Produtos</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{products.length}</p>
            </div>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Package size={20}/></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2 flex flex-col h-full min-h-[400px]" title="Vendas Recentes">
          <h3 className="text-lg font-bold mb-4">Fluxo de Vendas</h3>
          <div className="flex-1 w-full min-h-[300px] min-w-0">
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" hide />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `R$${val}`} />
                    <Tooltip 
                      cursor={{fill: '#f1f5f9'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                    Sem dados de vendas para exibir no gráfico.
                </div>
            )}
          </div>
        </Card>

        {/* AI Insight */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-none h-full">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-white/20 rounded-md">
              <span className="font-bold text-sm">AI</span>
            </div>
            <h3 className="font-bold text-lg">Gemini Intelligence</h3>
          </div>
          <div className="prose prose-invert prose-sm max-w-none">
            <p className="whitespace-pre-line text-slate-300 leading-relaxed">
              {insight}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
            <span>Modelo: Gemini 2.5 Flash</span>
            <button 
              onClick={() => {
                setInsight("Atualizando análise...");
                GeminiService.analyzeBusiness(sales, products).then(setInsight);
              }}
              className="text-brand-300 hover:text-white transition-colors"
            >
              Atualizar
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
