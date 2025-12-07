
/* ... imports ... */
import React, { useState, useRef, useEffect } from 'react';
// import { useSearchParams } from 'react-router-dom'; // REMOVED
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Client360 } from '../components/Client360';
import { Client } from '../types';
import { Search, MoreHorizontal, X, Save, User, Building, Mail, Phone, MapPin, Globe, Briefcase, Filter, Upload, Download, FileSpreadsheet, Trash2, Clock, AlertCircle, ArrowRight, AlertTriangle, MessageCircle, Send, CheckCircle, FileText, Loader2, Edit, Package, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { fetchAddressByCEP, fetchCoordinates } from '../services/geoService';
import { CustomFieldRenderer } from '../components/CustomFieldRenderer';

export const Clients: React.FC = () => {
    /* ... hooks ... */
    const { clients, leads, tickets, invoices, products, addClient, addClientsBulk, removeClient, updateClient, addSystemNotification, customFields } = useData();
    const { currentUser, hasPermission } = useAuth();
    // const [searchParams, setSearchParams] = useSearchParams(); // REMOVED
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    /* ... existing refs and state ... */
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [whatsAppMessage, setWhatsAppMessage] = useState('');
    const [clientForWhatsApp, setClientForWhatsApp] = useState<Client | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ name: '', unit: '', spots: '', status: 'All', lastContact: '', value: '' });
    const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
    const [newClientForm, setNewClientForm] = useState({ name: '', contactPerson: '', email: '', phone: '', segment: '', cep: '', address: '', latitude: 0, longitude: 0, website: '', ltv: '', cnpj: '', contractedProducts: [] as string[], metadata: {} });
    const [emailError, setEmailError] = useState<string | null>(null);
    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [cnpjError, setCnpjError] = useState<string | null>(null);
    const [cepError, setCepError] = useState<string | null>(null);
    const [isLoadingCep, setIsLoadingCep] = useState(false);
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [deleteReason, setDeleteReason] = useState('');
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        document: '',
        address: '',
        parkingSpots: 0,
        value: 0, 
        status: 'Active' as 'Active' | 'Inactive' | 'Churn Risk',
        contractedProducts: [] as string[],
        metadata: {}
    });

    const [inactiveClients, setInactiveClients] = useState<Client[]>([]);
    const [showInactiveModal, setShowInactiveModal] = useState(false);

    // REMOVED Deep Linking Effect

    const handleOpenClient = (client: Client) => {
        setSelectedClient(client); // Use local state
    };

    const handleCloseClient = () => {
        setSelectedClient(null); // Use local state
    };

    /* ... (rest of logic: alerts, filters, handlers) ... */
    useEffect(() => {
        const isSessionChecked = sessionStorage.getItem('nexus_inactive_alert_shown');
        if (isSessionChecked) return;
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const stagnant = clients.filter(c => { const lastContactDate = c.lastContact ? new Date(c.lastContact) : new Date(c.since); return lastContactDate < thirtyDaysAgo && c.status === 'Active'; });
        if (stagnant.length > 0) { setInactiveClients(stagnant); setShowInactiveModal(true); sessionStorage.setItem('nexus_inactive_alert_shown', 'true'); }
    }, [clients]);

    const whatsappTemplates = [
        { label: 'Contato Geral', text: 'Olá [Nome], tudo bem? Gostaria de falar sobre o contrato da [Empresa].' },
        { label: 'Cobrança', text: 'Olá [Nome], verificamos uma pendência financeira referente à [Empresa]. Podemos ajudar?' },
        { label: 'Agendar Reunião', text: 'Oi [Nome], gostaria de agendar uma breve conversa sobre a [Empresa]. Qual sua disponibilidade?' },
    ];

    // ... (Filter logic, whatsapp templates, validation helpers - all same as before)
    const filteredClients = clients.filter(c => {
        const matchesGlobal = searchTerm === '' || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase()) || (c.contractId && c.contractId.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesName = filters.name === '' || c.name.toLowerCase().includes(filters.name.toLowerCase()) || (c.contractId && c.contractId.toLowerCase().includes(filters.name.toLowerCase()));
        const matchesUnit = filters.unit === '' || (c.unit || c.address || '').toLowerCase().includes(filters.unit.toLowerCase());
        const matchesSpots = filters.spots === '' || (c.parkingSpots !== undefined && c.parkingSpots.toString().includes(filters.spots));
        const matchesStatus = filters.status === 'All' || c.status === filters.status;
        const totalVal = c.totalTablePrice || c.ltv || 0;
        const matchesValue = filters.value === '' || totalVal.toString().includes(filters.value);
        return matchesGlobal && matchesName && matchesUnit && matchesSpots && matchesStatus && matchesValue;
    });

    // --- EXPORT FUNCTION ---
    const handleExportExcel = () => {
        if (filteredClients.length === 0) {
            addSystemNotification("Erro na Exportação", "Nenhum cliente na lista para exportar.", "alert");
            return;
        }
        
        const dataToExport = filteredClients.map(c => ({
            'ID': c.id,
            'Nome': c.name,
            'Contato': c.contactPerson,
            'Email': c.email,
            'Telefone': c.phone,
            'Documento': c.document,
            'Status': c.status,
            'Valor Total': c.totalTablePrice || c.ltv,
            'Vagas': c.parkingSpots,
            'Endereço': c.address,
            'Último Contato': new Date(c.lastContact || c.since).toLocaleDateString(),
            'Produtos': c.contractedProducts?.join(', ')
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Clientes Nexus");
        XLSX.writeFile(wb, `Clientes_Nexus_${new Date().toISOString().split('T')[0]}.xlsx`);
        addSystemNotification("Exportação Concluída", "Arquivo Excel gerado com sucesso.", "success");
    };

    // ... (Remaining handlers: handleCreateClient, handleFileUpload etc. - kept identical)
    // Minimal re-implementation for context
    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = e.target.value; setNewClientForm({ ...newClientForm, email: val }); if (val.length === 0) { setEmailError(null); } else if (!validateEmail(val)) { setEmailError('Formato de e-mail inválido'); } else { setEmailError(''); } };
    const maskPhone = (value: string) => value.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').substring(0, 15);
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => { const maskedVal = maskPhone(e.target.value); setNewClientForm({ ...newClientForm, phone: maskedVal }); if (maskedVal.length === 0) { setPhoneError(null); } else if (maskedVal.length < 14) { setPhoneError('Telefone inválido'); } else { setPhoneError(''); } };
    const maskCEP = (value: string) => value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9);
    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => { const rawCep = e.target.value; const maskedCep = maskCEP(rawCep); setNewClientForm(prev => ({ ...prev, cep: maskedCep })); if (maskedCep.length === 9) { setIsLoadingCep(true); const addressData = await fetchAddressByCEP(maskedCep); if (addressData) { const fullAddress = `${addressData.logradouro}, ${addressData.bairro}, ${addressData.localidade} - ${addressData.uf}`; const coords = await fetchCoordinates(fullAddress); setNewClientForm(prev => ({ ...prev, address: fullAddress, latitude: coords?.lat || 0, longitude: coords?.lng || 0 })); setCepError(''); } else { setCepError('CEP não encontrado.'); } setIsLoadingCep(false); } else { setCepError(null); } };
    const validateCNPJ = (cnpj: string) => { cnpj = cnpj.replace(/[^\d]+/g, ''); if (cnpj === '') return false; if (cnpj.length !== 14) return false; if (/^(\d)\1+$/.test(cnpj)) return false; return true; };
    const maskCNPJ = (value: string) => value.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').substring(0, 18);
    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => { const maskedVal = maskCNPJ(e.target.value); setNewClientForm({ ...newClientForm, cnpj: maskedVal }); if (maskedVal.length === 0) { setCnpjError(null); } else if (maskedVal.length < 18) { setCnpjError('CNPJ inválido'); } else { setCnpjError(''); } };
    const handleCreateClient = (e: React.FormEvent) => { e.preventDefault(); if (emailError || (newClientForm.email && !validateEmail(newClientForm.email))) { setEmailError('Por favor, corrija o e-mail antes de salvar.'); return; } if (phoneError || (newClientForm.phone && newClientForm.phone.length < 14)) { setPhoneError('Por favor, insira um telefone válido.'); return; } if (cnpjError || (newClientForm.cnpj && newClientForm.cnpj.length < 14)) { setCnpjError('Por favor, insira um CNPJ válido.'); return; } if (!newClientForm.cep) { setCepError('O CEP é obrigatório para localização geográfica.'); return; } const newClient: Client = { id: `C-${Date.now()}`, name: newClientForm.name, contactPerson: newClientForm.contactPerson, document: newClientForm.cnpj, email: newClientForm.email, phone: newClientForm.phone, segment: newClientForm.segment || 'Geral', since: new Date().toISOString(), status: 'Active', ltv: Number(newClientForm.ltv) || 0, nps: 0, healthScore: 100, onboardingStatus: 'Pending', cep: newClientForm.cep, address: newClientForm.address, latitude: newClientForm.latitude, longitude: newClientForm.longitude, website: newClientForm.website, lastContact: new Date().toISOString(), contractedProducts: newClientForm.contractedProducts, metadata: newClientForm.metadata }; addClient(currentUser, newClient); setIsNewClientModalOpen(false); setNewClientForm({ name: '', contactPerson: '', email: '', phone: '', segment: '', cep: '', address: '', latitude: 0, longitude: 0, website: '', ltv: '', cnpj: '', contractedProducts: [], metadata: {} }); setEmailError(null); setPhoneError(null); setCnpjError(null); setCepError(null); };
    const handleDeleteClick = (e: React.MouseEvent, client: Client) => { e.stopPropagation(); e.preventDefault(); setClientToDelete(client); setDeleteReason(''); setIsDeleteModalOpen(true); };
    
    const handleEditClick = (e: React.MouseEvent, client: Client) => { 
        e.stopPropagation(); 
        e.preventDefault(); 
        setClientToEdit(client); 
        setEditForm({ 
            name: client.name || '', 
            contactPerson: client.contactPerson || '', 
            email: client.email || '', 
            phone: client.phone || '', 
            document: client.document || '', 
            address: client.address || '', 
            parkingSpots: client.parkingSpots || 0, 
            value: client.totalTablePrice || client.ltv || 0, 
            status: client.status as any, 
            contractedProducts: client.contractedProducts || [],
            metadata: client.metadata || {}
        }); 
        setIsEditModalOpen(true); 
    };
    
    const handleSaveEdit = (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (!clientToEdit) return; 
        const updatedClient: Client = { 
            ...clientToEdit, 
            name: editForm.name, 
            contactPerson: editForm.contactPerson, 
            email: editForm.email, 
            phone: editForm.phone, 
            document: editForm.document, 
            address: editForm.address, 
            parkingSpots: editForm.parkingSpots, 
            status: editForm.status, 
            totalTablePrice: Number(editForm.value), 
            ltv: Number(editForm.value), 
            contractedProducts: editForm.contractedProducts,
            metadata: editForm.metadata
        }; 
        updateClient(currentUser, updatedClient); 
        // addSystemNotification('Cliente Atualizado', `Dados de ${updatedClient.name} foram salvos.`, 'success');
        setIsEditModalOpen(false); 
        setClientToEdit(null); 
    };
    
    const toggleProductInForm = (productName: string, isEditMode: boolean) => { if (isEditMode) { setEditForm(prev => { const exists = prev.contractedProducts.includes(productName); if (exists) return { ...prev, contractedProducts: prev.contractedProducts.filter(p => p !== productName) }; return { ...prev, contractedProducts: [...prev.contractedProducts, productName] }; }); } else { setNewClientForm(prev => { const exists = prev.contractedProducts.includes(productName); if (exists) return { ...prev, contractedProducts: prev.contractedProducts.filter(p => p !== productName) }; return { ...prev, contractedProducts: [...prev.contractedProducts, productName] }; }); } };
    const handleWhatsAppClick = (e: React.MouseEvent, client: Client) => { e.stopPropagation(); setClientForWhatsApp(client); const defaultTmpl = whatsappTemplates[0]; const text = defaultTmpl.text.replace('[Nome]', client.contactPerson.split(' ')[0]).replace('[Empresa]', client.name); setWhatsAppMessage(text); setShowWhatsAppModal(true); };
    const handleSendWhatsApp = () => { if (!clientForWhatsApp) return; const phone = clientForWhatsApp.phone?.replace(/\D/g, '') || ''; const text = encodeURIComponent(whatsAppMessage); window.open(`https://wa.me/${phone}?text=${text}`, '_blank'); setShowWhatsAppModal(false); };
    const handleConfirmDelete = () => { if (clientToDelete && deleteReason.length >= 5) { removeClient(currentUser, clientToDelete.id, deleteReason); setIsDeleteModalOpen(false); setClientToDelete(null); setDeleteReason(''); } else { alert("Por favor, forneça uma justificativa com pelo menos 5 caracteres."); } };
    const handleViewClientFromAlert = (client: Client) => { setShowInactiveModal(false); handleOpenClient(client); };
    const handleDownloadTemplate = () => { const templateData = [{ 'Contrato': 'CTR-001', 'Cliente': 'Exemplo Empresa Ltda', 'Unidade': 'Unidade Centro', 'Status': 'Ativo', 'Vagas': 100, 'Isentas': 5, 'Qtd. Veícu': 95, 'Tabela': 'Padrão 2024', 'R$ Tabela': '150,00', 'R$ Tabela Total': '15.000,00', 'R$ Especial': '12.000,00', 'Email': 'joao@empresa.com', 'Telefone': '11999999999', 'Início': '01/01/2024', 'Fim': '01/01/2025', 'Produtos': 'Internet, Gestão, Consultoria' }]; const ws = XLSX.utils.json_to_sheet(templateData); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Template Clientes"); XLSX.writeFile(wb, "template_importacao_clientes.xlsx"); };
    const parseCurrency = (value: any): number => { if (!value) return 0; if (typeof value === 'number') return value; let str = String(value).trim(); str = str.replace(/[R$\s]/g, ''); if (str === '-' || str === ' - ') return 0; if (str.includes(',') && (!str.includes('.') || str.lastIndexOf(',') > str.lastIndexOf('.'))) { str = str.replace(/\./g, '').replace(',', '.'); } else { str = str.replace(/,/g, ''); } const num = parseFloat(str); return isNaN(num) ? 0 : num; };
    const getValueByKeys = (row: any, keys: string[]) => { const rowKeys = Object.keys(row); for (const key of keys) { if (row[key] !== undefined) return row[key]; const normalizedSearchKey = key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(); const foundKey = rowKeys.find(k => { const normalizedRowKey = k.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(); return normalizedRowKey === normalizedSearchKey; }); if (foundKey) return row[foundKey]; } return undefined; };
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; try { const data = await file.arrayBuffer(); const workbook = XLSX.read(data); const worksheet = workbook.Sheets[workbook.SheetNames[0]]; const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }); if (jsonData.length === 0) { addSystemNotification("Erro de Arquivo", "O arquivo está vazio ou não pôde ser lido.", "alert"); return; } const newClients: Client[] = jsonData.map((row: any) => { const name = getValueByKeys(row, ['Cliente', 'Nome', 'Empresa', 'Name', 'Company']); const contact = getValueByKeys(row, ['Contato', 'Responsável', 'Responsavel', 'Contact']); const email = getValueByKeys(row, ['Email', 'E-mail', 'Mail']); const phone = getValueByKeys(row, ['Telefone', 'Celular', 'Fone', 'Phone', 'Mobile']); const doc = getValueByKeys(row, ['CNPJ', 'CPF', 'Documento', 'Document']); const contract = getValueByKeys(row, ['Contrato', 'Contract', 'ID']); const unit = getValueByKeys(row, ['Unidade', 'Unit', 'Filial']); const statusRaw = getValueByKeys(row, ['Status']); const status = statusRaw === 'Ativo' ? 'Active' : statusRaw === 'Inativo' ? 'Inactive' : 'Active'; const startDate = getValueByKeys(row, ['Início', 'Inicio', 'Start Date']); const endDate = getValueByKeys(row, ['Fim', 'End Date']); const rawVagas = getValueByKeys(row, ['Vagas', 'Spots', 'Qtd Vagas', 'Vagas Total']); const rawIsentas = getValueByKeys(row, ['Isentas', 'Exempt']); const rawVeiculos = getValueByKeys(row, ['Qtd. Veícu', 'Qtd. Veículos', 'Veiculos']); const rawCredenciais = getValueByKeys(row, ['Qtd. Crede', 'Qtd. Credenciais', 'Credenciais']); const tabelaNome = getValueByKeys(row, ['Tabela', 'Pricing Table']); const rawPrice = getValueByKeys(row, ['R$ Tabela', 'Valor', 'Preço', 'Mensalidade', 'Price', 'Valor Mensal']); const rawTotal = getValueByKeys(row, ['R$ Tabela Total', 'Valor Total', 'Total', 'Receita', 'LTV', 'Valor Contrato']); const diaEspec = getValueByKeys(row, ['Dia Espec.', 'Special Day']); const rawEspPrice = getValueByKeys(row, ['R$ Especial', 'Special Price']); const rawEspTotal = getValueByKeys(row, ['R$ Especial Total', 'Total Special']); const address = getValueByKeys(row, ['Endereço', 'Endereco', 'Address', 'Logradouro']); const cep = getValueByKeys(row, ['CEP', 'Zip', 'Postal Code']); const rawProducts = getValueByKeys(row, ['Produtos', 'Products', 'Serviços', 'Services', 'Contratado']); const contractedProducts = rawProducts ? String(rawProducts).split(',').map(p => p.trim()).filter(p => p) : []; const parkingSpots = rawVagas ? parseInt(String(rawVagas).replace(/\D/g,'')) : undefined; const exemptSpots = rawIsentas ? parseInt(String(rawIsentas).replace(/\D/g,'')) : undefined; const vehicleCount = rawVeiculos ? parseInt(String(rawVeiculos).replace(/\D/g,'')) : undefined; const credentialCount = rawCredenciais ? parseInt(String(rawCredenciais).replace(/\D/g,'')) : undefined; const tablePrice = parseCurrency(rawPrice); const totalTablePrice = parseCurrency(rawTotal); const specialPrice = parseCurrency(rawEspPrice); const totalSpecialPrice = parseCurrency(rawEspTotal); let finalValue = 0; if (specialPrice > 0) finalValue = specialPrice; else if (totalSpecialPrice > 0) finalValue = totalSpecialPrice; else if (totalTablePrice > 0) finalValue = totalTablePrice; else if (tablePrice > 0) finalValue = tablePrice; return { id: `C-IMP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name: name || 'Cliente Importado', contactPerson: contact || 'Gestor', email: email || '', phone: phone ? String(phone) : '', document: doc ? String(doc) : '', segment: 'Geral', contractId: contract ? String(contract) : undefined, contractStartDate: startDate ? String(startDate) : undefined, contractEndDate: endDate ? String(endDate) : undefined, unit: unit ? String(unit) : undefined, parkingSpots: isNaN(parkingSpots || NaN) ? undefined : parkingSpots, exemptSpots: isNaN(exemptSpots || NaN) ? undefined : exemptSpots, vehicleCount: isNaN(vehicleCount || NaN) ? undefined : vehicleCount, credentialCount: isNaN(credentialCount || NaN) ? undefined : credentialCount, pricingTable: tabelaNome ? String(tabelaNome) : undefined, tablePrice: tablePrice > 0 ? tablePrice : undefined, totalTablePrice: finalValue > 0 ? finalValue : undefined, specialDay: diaEspec ? String(diaEspec) : undefined, specialPrice: specialPrice > 0 ? specialPrice : undefined, totalSpecialPrice: totalSpecialPrice > 0 ? totalSpecialPrice : undefined, ltv: finalValue, status: status, since: new Date().toISOString(), lastContact: new Date().toISOString(), healthScore: 100, nps: 0, onboardingStatus: 'Completed', address: address || '', cep: cep ? String(cep) : '', latitude: 0, longitude: 0, contractedProducts: contractedProducts }; }); addClientsBulk(currentUser, newClients); } catch (error) { console.error("Erro na importação:", error); addSystemNotification("Erro Crítico", "Erro ao processar o arquivo Excel. Verifique se o arquivo não está corrompido.", "alert"); } if (fileInputRef.current) { fileInputRef.current.value = ''; } };

    return (
        <div className="p-4 md:p-8 min-h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors relative">
            {/* Header ... */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Carteira de Clientes</h1>
                    <p className="text-slate-500 dark:text-slate-400">Gestão 360° e relacionamento.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <div className="flex flex-1 md:flex-none bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
                        <button onClick={handleExportExcel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 hover:text-green-600 transition" title="Exportar Lista (Excel)"><Download size={20} /></button>
                        <div className="w-px h-auto bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <button onClick={handleDownloadTemplate} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 hover:text-blue-600 transition" title="Baixar Modelo Excel"><FileSpreadsheet size={20} /></button>
                        <div className="w-px h-auto bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white rounded transition whitespace-nowrap"><Upload size={18} /> Importar</button>
                    </div>
                    <button onClick={() => { setIsNewClientModalOpen(true); setEmailError(null); setPhoneError(null); setCnpjError(null); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 shadow-sm transition ml-2 whitespace-nowrap flex-1 md:flex-none"><User size={20} /> <span className="hidden md:inline">Novo Cliente</span></button>
                </div>
            </div>

            {/* Table Area ... */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1 overflow-visible">
                {/* ... Same content as before ... */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={20}/>
                        <input 
                            type="text" 
                            placeholder="Pesquisa Global..." 
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-700 dark:text-white focus:bg-white dark:focus:bg-slate-600 transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                        {filteredClients.length} registros
                    </div>
                </div>

                {/* ... Mobile Card View ... */}
                <div className="block md:hidden p-4 space-y-4">
                    {filteredClients.map(client => {
                        const daysInactive = client.lastContact ? Math.floor((new Date().getTime() - new Date(client.lastContact).getTime()) / (1000 * 3600 * 24)) : 999;
                        return (
                            <div key={client.id} className="bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm p-4 relative" onClick={() => handleOpenClient(client)}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{client.name}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{client.segment}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${client.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {client.status === 'Active' ? 'Ativo' : 'Inativo'}
                                    </span>
                                </div>
                                
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Valor</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200">
                                            {client.totalTablePrice ? `R$ ${client.totalTablePrice.toLocaleString()}` : `R$ ${client.ltv.toLocaleString()}`}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Vagas</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{client.parkingSpots || '-'}</span>
                                    </div>
                                    {daysInactive > 30 && (
                                        <div className="flex items-center gap-1 text-xs text-red-500 font-bold bg-red-50 dark:bg-red-900/20 p-1 rounded">
                                            <AlertCircle size={12} /> {daysInactive} dias sem contato
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 border-t border-slate-100 dark:border-slate-600 pt-3">
                                    <button onClick={(e) => handleEditClick(e, client)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-600 rounded text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1">
                                        <Edit size={14}/> Editar
                                    </button>
                                    <button onClick={(e) => handleWhatsAppClick(e, client)} className="flex-1 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-bold text-xs flex items-center justify-center gap-1">
                                        <MessageCircle size={14}/> Whats
                                    </button>
                                    <button className="flex-1 py-2 bg-blue-600 text-white rounded font-bold text-xs flex items-center justify-center gap-1">
                                        Ver <ChevronRight size={14}/>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ... Desktop Table View ... */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-medium sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3 pb-1 text-xs uppercase tracking-wider font-bold">Contrato / Cliente</th>
                                <th className="p-3 pb-1 text-xs uppercase tracking-wider font-bold">Unidade</th>
                                <th className="p-3 pb-1 text-center text-xs uppercase tracking-wider font-bold">Vagas</th>
                                <th className="p-3 pb-1 text-center text-xs uppercase tracking-wider font-bold">Status</th>
                                <th className="p-3 pb-1 text-center text-xs uppercase tracking-wider font-bold">Último Contato</th>
                                <th className="p-3 pb-1 text-right text-xs uppercase tracking-wider font-bold">Valor Total</th>
                                <th className="p-3 pb-1 text-center text-xs uppercase tracking-wider font-bold">Ações</th>
                            </tr>
                            {/* Filter Row */}
                            <tr className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                                <th className="p-2"><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-normal bg-white dark:bg-slate-800 dark:text-white" value={filters.name} onChange={e => setFilters({...filters, name: e.target.value})}/></th>
                                <th className="p-2"><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-normal bg-white dark:bg-slate-800 dark:text-white" value={filters.unit} onChange={e => setFilters({...filters, unit: e.target.value})}/></th>
                                <th className="p-2"><input type="text" className="w-16 mx-auto block border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-normal text-center bg-white dark:bg-slate-800 dark:text-white" value={filters.spots} onChange={e => setFilters({...filters, spots: e.target.value})}/></th>
                                <th className="p-2"><select className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-normal bg-white dark:bg-slate-800 dark:text-white" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}><option value="All">Todos</option><option value="Active">Ativo</option><option value="Churn Risk">Risco</option><option value="Inactive">Inativo</option></select></th>
                                <th className="p-2 text-center text-xs text-slate-400 font-normal">-</th>
                                <th className="p-2"><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-normal text-right bg-white dark:bg-slate-800 dark:text-white" value={filters.value} onChange={e => setFilters({...filters, value: e.target.value})}/></th>
                                <th className="p-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredClients.map(client => {
                                const daysInactive = client.lastContact ? Math.floor((new Date().getTime() - new Date(client.lastContact).getTime()) / (1000 * 3600 * 24)) : 999;
                                return (
                                <tr key={client.id} className="hover:bg-