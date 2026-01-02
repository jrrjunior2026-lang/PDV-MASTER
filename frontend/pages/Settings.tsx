import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { ISettings, IAuditLog } from '../types';
import { Button, Input, Card, AlertModal, Badge, ConfirmModal } from '../components/UI';
import { Building2, FileCheck, CreditCard, Palette, Save, Upload, Trash2, Image as ImageIcon, Users, UserPlus, Pencil, Shield, AlertTriangle, Search, Zap, KeyRound, FileLock } from 'lucide-react';
import { apiService } from '../services/apiService';
import { AuditService } from '../services/auditService'; // Import Audit
import { SyncStatusIndicator } from '../components/SyncStatus';

export const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'COMPANY' | 'FISCAL' | 'PAYMENT' | 'APPEARANCE' | 'USERS' | 'SECURITY' | 'SYNC' | 'ACBR'>('COMPANY');
    const [settings, setSettings] = useState<ISettings | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            const settingsData = await StorageService.getSettings();
            setSettings(settingsData);
        };
        loadSettings();
    }, []);
    const [loading, setLoading] = useState(false);
    const [certLoading, setCertLoading] = useState(false);

    // State for certificate
    const [certificateFile, setCertificateFile] = useState<File | null>(null);
    const [certificatePassword, setCertificatePassword] = useState('');

    // Users State
    const [users, setUsers] = useState<any[]>([]);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'CASHIER' });

    // Audit State
    const [logs, setLogs] = useState<IAuditLog[]>([]);
    const [logFilter, setLogFilter] = useState('');

    const [alertState, setAlertState] = useState<{ isOpen: boolean, title: string, message: string, type: 'info' | 'error' | 'success' }>({
        isOpen: false, title: '', message: '', type: 'info'
    });

    const [confirmState, setConfirmState] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void }>({
        isOpen: false, title: '', message: '', onConfirm: () => { }
    });

    useEffect(() => {
        if (activeTab === 'USERS') {
            refreshUsers();
        } else if (activeTab === 'SECURITY') {
            refreshLogs();
        }
    }, [activeTab]);

    const refreshUsers = async () => {
        const usersData = await StorageService.getUsers();
        setUsers(usersData);
    };

    const refreshLogs = () => {
        setLogs(AuditService.getLogs());
    };

    const showAlert = (message: string, title: string = 'Atenção', type: 'info' | 'error' | 'success' = 'info') => {
        setAlertState({ isOpen: true, message, title, type });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await StorageService.saveSettings(settings);
            showAlert('Configurações salvas com sucesso!', 'Sucesso', 'success');
        } catch (error: any) {
            showAlert(error.message || 'Erro ao salvar configurações.', 'Erro', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2048 * 1024) { // 2MB limit
                showAlert('A imagem é muito grande. O limite é 2MB.', 'Erro', 'error');
                return;
            }
            setLoading(true);
            try {
                const response = await apiService.uploadLogo(file);
                showAlert('Logo salva com sucesso!', 'Sucesso', 'success');
                // Optionally set the logo URL for display
                setSettings(prev => ({
                    ...prev,
                    appearance: { ...prev.appearance, logoUrl: response.path }
                }));
            } catch (error: any) {
                showAlert(error.message || 'Erro ao fazer upload da logo.', 'Erro', 'error');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.name.endsWith('.pfx')) {
            setCertificateFile(file);
        } else {
            showAlert('Por favor, selecione um arquivo .pfx válido.', 'Erro', 'error');
            setCertificateFile(null);
            e.target.value = ''; // Reset file input
        }
    };

    const handleSaveCertificate = async () => {
        if (!certificateFile) {
            return showAlert('Nenhum arquivo de certificado selecionado.', 'Erro', 'error');
        }
        if (!certificatePassword) {
            return showAlert('Por favor, informe a senha do certificado.', 'Erro', 'error');
        }

        setCertLoading(true);
        try {
            const response = await apiService.uploadCertificate(certificateFile, certificatePassword);
            showAlert(response.message || 'Certificado salvo com sucesso!', 'Sucesso', 'success');
            setCertificateFile(null);
            setCertificatePassword('');
            // Clear the file input visually
            const fileInput = document.getElementById('cert-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

        } catch (error: any) {
            showAlert(error.message || 'Ocorreu um erro ao salvar o certificado.', 'Erro', 'error');
        } finally {
            setCertLoading(false);
        }
    };

    // User Actions
    const handleEditUser = (user: any) => {
        setEditingUser(user);
        setUserForm({ name: user.name, email: user.email, password: user.password, role: user.role });
        setShowUserModal(true);
    };

    const handleDeleteUser = (id: string) => {
        if (users.length <= 1) {
            return showAlert('Não é possível excluir o único usuário do sistema.', 'Erro', 'error');
        }
        setConfirmState({
            isOpen: true,
            title: 'Excluir Usuário',
            message: 'Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.',
            onConfirm: async () => {
                try {
                    await StorageService.deleteUser(id);
                    await refreshUsers();
                    showAlert('Usuário excluído.', 'Sucesso', 'success');
                } catch (error: any) {
                    showAlert(error.message || 'Erro ao excluir usuário.', 'Erro', 'error');
                }
            }
        });
    };

    const handleSaveUser = async () => {
        if (!userForm.name || !userForm.email || !userForm.password) {
            return showAlert('Preencha todos os campos obrigatórios.');
        }

        const userPayload = {
            id: editingUser ? editingUser.id : crypto.randomUUID(),
            ...userForm
        };

        try {
            await StorageService.saveUser(userPayload);
            setShowUserModal(false);
            setEditingUser(null);
            setUserForm({ name: '', email: '', password: '', role: 'CASHIER' });
            await refreshUsers();
            showAlert(editingUser ? 'Usuário atualizado!' : 'Usuário criado com sucesso!', 'Sucesso', 'success');
        } catch (error: any) {
            showAlert(error.message || 'Erro ao salvar usuário.', 'Erro', 'error');
        }
    };

    const tabs = [
        { id: 'COMPANY', label: 'Empresa', icon: <Building2 size={20} /> },
        { id: 'FISCAL', label: 'Fiscal (NFC-e)', icon: <FileCheck size={20} /> },
        { id: 'PAYMENT', label: 'Pagamentos', icon: <CreditCard size={20} /> },
        { id: 'APPEARANCE', label: 'Visual & PDV', icon: <Palette size={20} /> },
        { id: 'USERS', label: 'Usuários', icon: <Users size={20} /> },
        { id: 'SYNC', label: 'Sincronização', icon: <Zap size={20} /> },
        { id: 'ACBR', label: 'ACBr Monitor', icon: <Zap size={20} className="text-blue-500" /> },
        { id: 'SECURITY', label: 'Segurança & Auditoria', icon: <Shield size={20} /> },
    ];

    const filteredLogs = logs.filter(l =>
        l.details.toLowerCase().includes(logFilter.toLowerCase()) ||
        l.userName.toLowerCase().includes(logFilter.toLowerCase()) ||
        l.action.toLowerCase().includes(logFilter.toLowerCase())
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">

            <AlertModal
                isOpen={alertState.isOpen}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
            />

            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                variant="danger"
            />

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Configurações do Sistema</h1>
                    <p className="text-slate-500">Gerencie dados da empresa, emissão fiscal e personalização.</p>
                </div>
                {activeTab !== 'USERS' && activeTab !== 'SECURITY' && (
                    <Button onClick={handleSave} disabled={loading} className="gap-2">
                        <Save size={18} /> {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Sidebar Navigation */}
                <div className="md:col-span-1 space-y-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === tab.id
                                ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-transparent'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="md:col-span-3">
                    {!settings ? (
                        <Card>
                            <div className="flex items-center justify-center py-20">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
                                    <p className="text-slate-600">Carregando configurações...</p>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <Card>
                            {activeTab === 'COMPANY' && (
                                <div className="space-y-5 animate-fadeIn">
                                    <h3 className="text-lg font-bold border-b border-slate-100 pb-2">Dados da Empresa</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <Input label="Razão Social" value={settings.company.corporateName} onChange={e => setSettings({ ...settings, company: { ...settings.company, corporateName: e.target.value } })} />
                                        <Input label="Nome Fantasia" value={settings.company.fantasyName} onChange={e => setSettings({ ...settings, company: { ...settings.company, fantasyName: e.target.value } })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="CNPJ" value={settings.company.cnpj} onChange={e => setSettings({ ...settings, company: { ...settings.company, cnpj: e.target.value } })} placeholder="00.000.000/0000-00" />
                                        <Input label="Inscrição Estadual (IE)" value={settings.company.ie} onChange={e => setSettings({ ...settings, company: { ...settings.company, ie: e.target.value } })} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Regime Tributário</label>
                                        <select
                                            className="border border-slate-300 rounded-md p-2 bg-white"
                                            value={settings.company.taxRegime}
                                            onChange={e => setSettings({ ...settings, company: { ...settings.company, taxRegime: e.target.value as any } })}
                                        >
                                            <option value="1">1 - Simples Nacional</option>
                                            <option value="3">3 - Regime Normal</option>
                                        </select>
                                    </div>
                                    <Input label="Endereço Completo" value={settings.company.address} onChange={e => setSettings({ ...settings, company: { ...settings.company, address: e.target.value } })} />
                                    <Input label="Telefone" value={settings.company.phone} onChange={e => setSettings({ ...settings, company: { ...settings.company, phone: e.target.value } })} />
                                </div>
                            )}

                            {activeTab === 'FISCAL' && (
                                <div className="space-y-5 animate-fadeIn">
                                    <h3 className="text-lg font-bold border-b border-slate-100 pb-2 flex items-center gap-2">
                                        <FileCheck className="text-brand-600" /> Configuração NFC-e
                                    </h3>
                                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-sm text-amber-800 mb-4">
                                        <p className="font-bold">⚠️ Atenção</p>
                                        <p>Certifique-se de usar o CSC (Código de Segurança do Contribuinte) correto obtido no portal da SEFAZ do seu estado.</p>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-semibold text-slate-500 uppercase">Ambiente de Emissão</label>
                                        <select
                                            className="border border-slate-300 rounded-md p-2 bg-white font-medium"
                                            value={settings.fiscal.environment}
                                            onChange={e => setSettings({ ...settings, fiscal: { ...settings.fiscal, environment: e.target.value as any } })}
                                        >
                                            <option value="2">Homologação (Testes)</option>
                                            <option value="1">Produção (Validade Jurídica)</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="Série NFC-e" type="number" value={settings.fiscal.nfceSeries} onChange={e => setSettings({ ...settings, fiscal: { ...settings.fiscal, nfceSeries: parseInt(e.target.value) } })} />
                                        <Input label="ID do CSC (Token ID)" value={settings.fiscal.cscId} onChange={e => setSettings({ ...settings, fiscal: { ...settings.fiscal, cscId: e.target.value } })} placeholder="Ex: 000001" />
                                    </div>
                                    <Input label="Código CSC (Token)" value={settings.fiscal.cscToken} onChange={e => setSettings({ ...settings, fiscal: { ...settings.fiscal, cscToken: e.target.value } })} placeholder="Ex: A1B2C3D4..." />

                                    <div className="!mt-8 pt-6 border-t-2 border-dashed border-slate-200 space-y-4">
                                        <h4 className="text-md font-bold text-slate-800 flex items-center gap-2"><FileLock size={20} /> Certificado Digital A1</h4>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Arquivo do Certificado (.pfx)</label>
                                            <div className="flex items-center gap-4">
                                                <label htmlFor="cert-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition border border-slate-300">
                                                    <Upload size={18} /> Selecionar Arquivo
                                                </label>
                                                <input
                                                    type="file"
                                                    id="cert-upload"
                                                    className="hidden"
                                                    accept=".pfx"
                                                    onChange={handleCertUpload}
                                                />
                                                <span className="text-sm text-slate-500">{certificateFile ? certificateFile.name : 'Nenhum arquivo selecionado.'}</span>
                                            </div>
                                        </div>

                                        <Input
                                            label="Senha do Certificado"
                                            type="password"
                                            value={certificatePassword}
                                            onChange={e => setCertificatePassword(e.target.value)}
                                            placeholder="Digite a senha do seu certificado"
                                            icon={<KeyRound size={18} />}
                                        />

                                        <Button onClick={handleSaveCertificate} disabled={certLoading} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                                            <Save size={18} /> {certLoading ? 'Salvando...' : 'Salvar Certificado e Senha'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'PAYMENT' && (
                                <div className="space-y-5 animate-fadeIn">
                                    <h3 className="text-lg font-bold border-b border-slate-100 pb-2">Configurações de Recebimento</h3>

                                    <div className="space-y-4">
                                        <h4 className="font-bold text-slate-700 flex items-center gap-2">
                                            <div className="w-6 h-6 bg-brand-600 rounded flex items-center justify-center text-white text-xs font-bold">PIX</div>
                                            Chave Pix Principal
                                        </h4>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="flex flex-col gap-1 col-span-1">
                                                <label className="text-xs font-semibold text-slate-500 uppercase">Tipo de Chave</label>
                                                <select
                                                    className="border border-slate-300 rounded-md p-2 bg-white"
                                                    value={settings.payment.pixKeyType}
                                                    onChange={e => setSettings({ ...settings, payment: { ...settings.payment, pixKeyType: e.target.value as any } })}
                                                >
                                                    <option value="CNPJ">CNPJ</option>
                                                    <option value="CPF">CPF</option>
                                                    <option value="EMAIL">E-mail</option>
                                                    <option value="PHONE">Telefone</option>
                                                    <option value="RANDOM">Aleatória</option>
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <Input label="Chave Pix" value={settings.payment.pixKey} onChange={e => setSettings({ ...settings, payment: { ...settings.payment, pixKey: e.target.value } })} />
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500">Esta chave será utilizada para gerar o QR Code no PDV.</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'APPEARANCE' && (
                                <div className="space-y-5 animate-fadeIn">
                                    <h3 className="text-lg font-bold border-b border-slate-100 pb-2">Personalização Visual</h3>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Logomarca da Empresa</label>
                                        <div className="flex items-start gap-6">
                                            <div className="w-40 h-40 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden relative">
                                                {settings.appearance.logoUrl ? (
                                                    <img src={settings.appearance.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                                ) : (
                                                    <div className="text-slate-400 flex flex-col items-center">
                                                        <ImageIcon size={32} className="mb-2" />
                                                        <span className="text-xs">Sem Logo</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        id="logo-upload"
                                                        className="hidden"
                                                        accept="image/png, image/jpeg"
                                                        onChange={handleLogoUpload}
                                                    />
                                                    <label htmlFor="logo-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition">
                                                        <Upload size={18} /> Carregar Imagem
                                                    </label>
                                                </div>
                                                {settings.appearance.logoUrl && (
                                                    <button
                                                        onClick={() => setSettings(prev => ({ ...prev, appearance: { ...prev.appearance, logoUrl: null } }))}
                                                        title="Remover logo atual"
                                                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition text-sm font-medium"
                                                    >
                                                        <Trash2 size={16} /> Remover Logo
                                                    </button>
                                                )}
                                                <p className="text-xs text-slate-500">
                                                    Recomendado: PNG ou JPG com fundo transparente. Máx 2MB.<br />
                                                    Esta imagem aparecerá como marca d'água no fundo do carrinho do PDV.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'USERS' && (
                                <div className="space-y-5 animate-fadeIn">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Users className="text-brand-600" /> Gerenciamento de Usuários
                                        </h3>
                                        <Button onClick={() => { setEditingUser(null); setUserForm({ name: '', email: '', password: '', role: 'CASHIER' }); setShowUserModal(true); }}>
                                            <UserPlus size={18} /> Novo Usuário
                                        </Button>
                                    </div>

                                    <div className="overflow-hidden border border-slate-200 rounded-lg">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                                                <tr>
                                                    <th className="px-6 py-3">Nome</th>
                                                    <th className="px-6 py-3">Email / Login</th>
                                                    <th className="px-6 py-3">Função</th>
                                                    <th className="px-6 py-3 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {users.map(u => (
                                                    <tr key={u.id} className="hover:bg-slate-50 transition">
                                                        <td className="px-6 py-4 font-medium text-slate-800">{u.name}</td>
                                                        <td className="px-6 py-4 text-slate-500">{u.email}</td>
                                                        <td className="px-6 py-4">
                                                            {u.role === 'ADMIN'
                                                                ? <Badge color="bg-blue-100 text-blue-700">Administrador</Badge>
                                                                : <Badge color="bg-emerald-100 text-emerald-700">Operador de Caixa</Badge>
                                                            }
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => handleEditUser(u)} title="Editar usuário" className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition">
                                                                    <Pencil size={16} />
                                                                </button>
                                                                <button onClick={() => handleDeleteUser(u.id)} title="Excluir usuário" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'SYNC' && (
                                <div className="animate-fadeIn">
                                    <SyncStatusIndicator />
                                </div>
                            )}

                            {activeTab === 'ACBR' && (
                                <div className="space-y-5 animate-fadeIn">
                                    <h3 className="text-lg font-bold border-b border-slate-100 pb-2 flex items-center gap-2">
                                        <Zap className="text-blue-500" /> Integração ACBr Monitor
                                    </h3>
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-sm text-blue-800 mb-4">
                                        <p className="font-bold">ℹ️ Sobre o ACBr Monitor</p>
                                        <p>O ACBr Monitor é uma ferramenta que facilita a emissão de documentos fiscais (NF-e, NFC-e). Certifique-se de que ele está rodando e com o servidor TCP ativo.</p>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                        <input
                                            type="checkbox"
                                            id="acbr-enabled"
                                            checked={settings.acbr?.enabled || false}
                                            onChange={e => setSettings({ ...settings, acbr: { ...(settings.acbr || { host: 'localhost', port: 3434 }), enabled: e.target.checked } })}
                                            className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                                        />
                                        <label htmlFor="acbr-enabled" className="font-bold text-slate-700 cursor-pointer">Ativar integração com ACBr Monitor</label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="Host (IP)"
                                            value={settings.acbr?.host || 'localhost'}
                                            onChange={e => setSettings({ ...settings, acbr: { ...(settings.acbr || { host: 'localhost', port: 3434, enabled: false }), host: e.target.value } })}
                                            placeholder="Ex: localhost ou 192.168.1.10"
                                        />
                                        <Input
                                            label="Porta TCP"
                                            type="number"
                                            value={settings.acbr?.port || 3434}
                                            onChange={e => setSettings({ ...settings, acbr: { ...(settings.acbr || { host: 'localhost', port: 3434, enabled: false }), port: parseInt(e.target.value) } })}
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <Button
                                            variant="secondary"
                                            className="gap-2"
                                            onClick={async () => {
                                                try {
                                                    const response = await apiService.get('/fiscal/status');
                                                    if (response.success) {
                                                        showAlert('Conexão com ACBr Monitor estabelecida com sucesso!', 'Sucesso', 'success');
                                                    } else {
                                                        showAlert('Não foi possível conectar ao ACBr Monitor: ' + response.message, 'Erro', 'error');
                                                    }
                                                } catch (error: any) {
                                                    showAlert('Erro ao testar conexão: ' + error.message, 'Erro', 'error');
                                                }
                                            }}
                                        >
                                            Testar Conexão
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'SECURITY' && (
                                <div className="space-y-5 animate-fadeIn">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Shield className="text-slate-600" /> Auditoria e Logs do Sistema
                                        </h3>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                            <input
                                                className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-brand-500"
                                                placeholder="Buscar logs..."
                                                value={logFilter}
                                                onChange={(e) => setLogFilter(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="overflow-hidden border border-slate-200 rounded-lg">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                                                <tr>
                                                    <th className="px-6 py-3">Data/Hora</th>
                                                    <th className="px-6 py-3">Usuário</th>
                                                    <th className="px-6 py-3">Ação</th>
                                                    <th className="px-6 py-3">Detalhes</th>
                                                    <th className="px-6 py-3 text-right">Nível</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {filteredLogs.map(log => (
                                                    <tr key={log.id} className="hover:bg-slate-50 transition">
                                                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                                            {new Date(log.timestamp).toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-4 font-medium text-slate-800">
                                                            {log.userName} <span className="text-slate-400 text-xs">({log.userRole})</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="font-bold text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{log.action}</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-600 truncate max-w-xs" title={log.details}>
                                                            {log.details}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {log.severity === 'CRITICAL' && <Badge color="bg-red-100 text-red-700">Crítico</Badge>}
                                                            {log.severity === 'WARNING' && <Badge color="bg-amber-100 text-amber-700">Atenção</Badge>}
                                                            {log.severity === 'INFO' && <Badge color="bg-blue-50 text-blue-600">Info</Badge>}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredLogs.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="p-8 text-center text-slate-400">
                                                            Nenhum registro de auditoria encontrado.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </Card>
                    )}
                </div>
            </div>

            {/* User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl animate-scaleIn">
                        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                            {editingUser ? <Pencil size={20} /> : <UserPlus size={20} />}
                            {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                        </h3>

                        <div className="space-y-4">
                            <Input
                                label="Nome Completo"
                                value={userForm.name}
                                onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                                placeholder="Ex: João da Silva"
                            />
                            <Input
                                label="Email / Login"
                                value={userForm.email}
                                onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                placeholder="usuario@sistema.com"
                            />
                            <Input
                                label="Senha"
                                type="text"
                                value={userForm.password}
                                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                placeholder="******"
                            />

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Nível de Acesso</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setUserForm({ ...userForm, role: 'ADMIN' })}
                                        title="Selecionar função Administrador"
                                        className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition ${userForm.role === 'ADMIN' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <Shield size={20} />
                                        <span className="text-sm font-bold">Administrador</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUserForm({ ...userForm, role: 'CASHIER' })}
                                        title="Selecionar função Operador de Caixa"
                                        className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition ${userForm.role === 'CASHIER' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}

                                    >
                                        <CreditCard size={20} />
                                        <span className="text-sm font-bold">Caixa</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setShowUserModal(false)}>Cancelar</Button>
                            <Button onClick={handleSaveUser}>Salvar Usuário</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
