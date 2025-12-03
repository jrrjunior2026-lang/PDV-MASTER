import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { CsvService } from '../services/csvService';
import { IProduct, ISale, IFinancialRecord, ICashRegister, ICashTransaction } from '../types';
import { Button, Input, Card, formatCurrency } from '../components/UI';
import { Printer, FileSpreadsheet, Filter, Calendar, DollarSign, Package, BarChart2, Coins } from 'lucide-react';

type ReportType = 'CASH_CLOSING' | 'SALES' | 'STOCK_POSITION' | 'FINANCIAL_STATEMENT';

export const Reports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportType>('SALES');
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});

  const generateReport = () => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    switch (activeReport) {
      case 'SALES':
        const sales = StorageService.getSalesByPeriod(start, end);
        setReportData(sales);
        setSummary({
          total: sales.reduce((acc, s) => acc + s.total, 0),
          count: sales.length,
        });
        break;
      case 'STOCK_POSITION':
        const products = StorageService.getProducts();
        setReportData(products);
        setSummary({
          costValue: products.reduce((acc, p) => acc + (p.cost * p.stock), 0),
          saleValue: products.reduce((acc, p) => acc + (p.price * p.stock), 0),
          itemCount: products.length
        });
        break;
      case 'CASH_CLOSING':
        const registers = StorageService.getClosedRegisters();
        const allTxs = StorageService.getAllCashTransactions();
        const data = registers.map(r => {
          const txs = allTxs.filter(tx => tx.registerId === r.id);
          const sales = txs.filter(t => t.type === 'SALE').reduce((a, b) => a + b.amount, 0);
          return { ...r, sales };
        });
        setReportData(data);
        break;
      case 'FINANCIAL_STATEMENT':
        const records = StorageService.getFinancialRecords().filter(r => {
          const d = new Date(r.date);
          return d >= start && d <= end;
        });
        setReportData(records);
        setSummary({
          income: records.filter(r => r.type === 'INCOME').reduce((a, b) => a + b.amount, 0),
          expense: records.filter(r => r.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0)
        });
        break;
    }
  };

  useEffect(() => {
    generateReport();
  }, [activeReport, startDate, endDate]);

  const handlePrint = () => { window.print(); };
  const handleExport = () => {
    const filename = `relatorio_${activeReport.toLowerCase()}_${new Date().toISOString().split('T')[0]}`;
    let headers: { label: string, key: string }[] = [];

    switch (activeReport) {
      case 'SALES':
        headers = [
          { label: 'ID', key: 'id' }, { label: 'Data', key: 'date' }, { label: 'Total', key: 'total' },
          { label: 'Pagamento', key: 'paymentMethod' }
        ];
        break;
      case 'STOCK_POSITION':
        headers = [
          { label: 'Código', key: 'code' }, { label: 'Nome', key: 'name' }, { label: 'Estoque', key: 'stock' },
          { label: 'Custo', key: 'cost' }, { label: 'Venda', key: 'price' }
        ];
        break;
      // Add other cases here
    }
    CsvService.exportToCsv(reportData, headers, filename);
  };

  const reports = [
    { id: 'SALES', label: 'Vendas por Período', icon: <DollarSign size={20} /> },
    { id: 'STOCK_POSITION', label: 'Posição de Estoque', icon: <Package size={20} /> },
    { id: 'CASH_CLOSING', label: 'Fechamentos de Caixa', icon: <Coins size={20} /> },
    { id: 'FINANCIAL_STATEMENT', label: 'Extrato Financeiro', icon: <BarChart2 size={20} /> },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Relatórios Gerenciais</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-2">
          {reports.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id as ReportType)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all text-left ${activeReport === r.id
                  ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
            >
              {r.icon}
              {r.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          <Card className="p-0 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-slate-500" />
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-sm py-1" />
                <span className="text-slate-500">até</span>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-sm py-1" />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handlePrint}><Printer size={16} /> Imprimir</Button>
                <Button variant="secondary" onClick={handleExport}><FileSpreadsheet size={16} /> Exportar CSV</Button>
              </div>
            </div>

            <div id="printable-area" className="p-6">
              <h2 className="text-xl font-bold mb-4 print:text-black">{reports.find(r => r.id === activeReport)?.label}</h2>
              {/* Table for Sales */}
              {activeReport === 'SALES' && (
                <>
                  <div className="mb-4 p-4 bg-brand-50 rounded-lg border border-brand-100 text-center">
                    <p className="text-sm text-brand-700">Total Vendido no Período:</p>
                    <p className="text-3xl font-bold text-brand-800">{formatCurrency(summary.total || 0)}</p>
                    <p className="text-xs text-brand-600">({summary.count} vendas)</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-100"><tr><th className="px-4 py-2 text-left">Data</th><th className="px-4 py-2 text-left">Itens</th><th className="px-4 py-2 text-right">Total</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.map(sale => (
                        <tr key={sale.id}>
                          <td className="px-4 py-2">{new Date(sale.date).toLocaleString()}</td>
                          <td className="px-4 py-2">{sale.items ? sale.items.length : 0}</td>
                          <td className="px-4 py-2 text-right font-bold">{formatCurrency(sale.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              {activeReport === 'STOCK_POSITION' && (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-center">
                      <p className="text-sm text-blue-700">Valor de Custo Total:</p>
                      <p className="text-2xl font-bold text-blue-800">{formatCurrency(summary.costValue || 0)}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                      <p className="text-sm text-emerald-700">Valor de Venda Total:</p>
                      <p className="text-2xl font-bold text-emerald-800">{formatCurrency(summary.saleValue || 0)}</p>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-100"><tr><th className="px-4 py-2 text-left">Produto</th><th className="px-4 py-2 text-right">Estoque</th><th className="px-4 py-2 text-right">Vl. Custo</th><th className="px-4 py-2 text-right">Vl. Venda</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.map(p => (
                        <tr key={p.id}>
                          <td className="px-4 py-2 font-medium">{p.name}</td>
                          <td className="px-4 py-2 text-right font-bold">{p.stock} {p.unit}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(p.stock * p.cost)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(p.stock * p.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
              {activeReport === 'CASH_CLOSING' && (
                <table className="w-full text-sm">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-100"><tr><th className="px-4 py-2 text-left">Data Fechamento</th><th className="px-4 py-2 text-right">Sistema</th><th className="px-4 py-2 text-right">Contado</th><th className="px-4 py-2 text-right">Diferença</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.map(r => (
                      <tr key={r.id}>
                        <td className="px-4 py-2">{new Date(r.closedAt).toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(r.currentBalance)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(r.finalCount)}</td>
                        <td className={`px-4 py-2 text-right font-bold ${r.difference === 0 ? 'text-slate-600' : 'text-red-600'}`}>{formatCurrency(r.difference)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {activeReport === 'FINANCIAL_STATEMENT' && (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-4 bg-emerald-50 rounded-lg text-center"><p className="text-sm text-emerald-700">Receitas</p><p className="text-xl font-bold text-emerald-800">{formatCurrency(summary.income || 0)}</p></div>
                    <div className="p-4 bg-red-50 rounded-lg text-center"><p className="text-sm text-red-700">Despesas</p><p className="text-xl font-bold text-red-800">{formatCurrency(summary.expense || 0)}</p></div>
                    <div className="p-4 bg-blue-50 rounded-lg text-center"><p className="text-sm text-blue-700">Saldo</p><p className="text-xl font-bold text-blue-800">{formatCurrency((summary.income || 0) - (summary.expense || 0))}</p></div>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-100"><tr><th className="px-4 py-2 text-left">Data</th><th className="px-4 py-2 text-left">Descrição</th><th className="px-4 py-2 text-right">Valor</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.map(r => (
                        <tr key={r.id}>
                          <td className="px-4 py-2">{new Date(r.date).toLocaleDateString()}</td>
                          <td className="px-4 py-2">{r.description}</td>
                          <td className={`px-4 py-2 text-right font-bold ${r.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(r.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>

          </Card>
        </div>
      </div>
    </div>
  );
};
