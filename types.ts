

export type Role = 'admin' | 'executive' | 'sales' | 'support' | 'dev' | 'finance' | 'client';

export enum LeadStatus {
  NEW = 'Novo',
  QUALIFIED = 'Qualificado',
  PROPOSAL = 'Proposta',
  NEGOTIATION = 'Negociação',
  CLOSED_WON = 'Ganho',
  CLOSED_LOST = 'Perdido'
}

export enum TicketPriority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  CRITICAL = 'Crítica'
}

export enum TicketStatus {
  OPEN = 'Aberto',
  IN_PROGRESS = 'Em Andamento',
  RESOLVED = 'Resolvido',
  CLOSED = 'Fechado'
}

export enum InvoiceStatus {
  DRAFT = 'Rascunho',
  PENDING = 'Pendente',
  SENT = 'Enviado',
  PAID = 'Pago',
  OVERDUE = 'Atrasado',
  CANCELLED = 'Cancelado'
}

export type ProposalStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'Trial' | 'Standard' | 'Enterprise';
  licenseExpiresAt?: string; // ISO Date para controle de licença
  subscription_status?: 'active' | 'blocked' | 'trial' | 'expired'; // Status financeiro
}

// Configurações visuais do Portal do Cliente (White-Label)
export interface PortalSettings {
  organizationId: string;
  portalName: string;
  logoUrl?: string;
  primaryColor: string; // Hex code
  welcomeMessage?: string;
  allowInvoiceDownload: boolean;
  allowTicketCreation: boolean;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  email?: string;
  cpf?: string;
  phone?: string;
  password?: string;
  organizationId?: string; // Link para a empresa (Tenant)
  relatedClientId?: string; // Link para o Cliente específico (Se role === 'client')
  // Gamification Fields
  xp?: number;
  level?: number;
}

export interface Note {
  id: string;
  text: string;
  author: string;
  created_at: string;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    sku: string;
    category: 'Service' | 'Product' | 'Subscription';
    active: boolean;
    organizationId?: string;
}

export interface ClientDocument {
    id: string;
    clientId: string;
    title: string;
    type: 'Contract' | 'Proposal' | 'NDA' | 'Image' | 'Other';
    url: string; // Em um app real, seria a URL do Storage bucket
    uploadedBy: string;
    uploadDate: string;
    size: string;
}

// --- CUSTOM FIELDS (NO-CODE) ---
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface CustomFieldDefinition {
    id: string;
    label: string; // Nome visível (ex: "Data de Aniversário")
    key: string; // Chave interna (ex: "birthday")
    type: CustomFieldType;
    module: 'leads' | 'clients';
    options?: string[]; // Para tipo 'select'
    required?: boolean;
    organizationId?: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  value: number;
  status: LeadStatus;
  source: string;
  probability: number;
  createdAt: string; // ISO Date - Essential for Sales Cycle Forecast
  lastContact: string; // ISO Date
  organizationId?: string;
  
  // New Fields
  phone?: string;
  cep?: string; // Zip Code
  address?: string;
  latitude?: number; // Real Geolocation
  longitude?: number; // Real Geolocation
  website?: string;
  parkingSpots?: number; 
  productInterest?: string; 

  // Nexus Radar (Enrichment Data)
  techStack?: string[];
  estimatedRevenue?: string;
  competitors?: string[];
  description?: string;

  // Custom Fields Data
  metadata?: Record<string, any>;
}

// Interface para Prospecção IA
export interface PotentialLead {
    id: string;
    companyName: string;
    industry: string;
    location: string;
    matchScore: number; // 0-100
    reason: string; // Por que essa empresa é um bom fit
    suggestedApproach: string; // Dica de abordagem
    estimatedSize: string;
    email?: string;
    phone?: string;
}

export interface ProspectingHistoryItem {
    id: string;
    timestamp: string;
    industry: string;
    location: string;
    keywords?: string;
    results: PotentialLead[];
}

// --- NEXUS SPY (COMPETITIVE INTELLIGENCE) ---
export interface Competitor {
    id: string;
    name: string;
    website: string;
    sector: string;
    lastAnalysis?: string;
    swot?: {
        strengths: string[];
        weaknesses: string[];
        opportunities: string[];
        threats: string[];
    };
    battlecard?: {
        killPoints: string[]; // Argumentos fatais (Vantagem nossa)
        defensePoints: string[]; // Como se defender deles
        pricing?: string;
    };
    organizationId?: string;
}

export interface MarketTrend {
    id: string;
    title: string;
    description: string;
    impact: 'High' | 'Medium' | 'Low';
    sentiment: 'Positive' | 'Negative' | 'Neutral';
    date: string;
}

export interface Client {
  id: string;
  name: string; 
  contactPerson: string;
  document?: string; // CNPJ ou CPF
  email: string;
  phone: string;
  segment: string;
  since: string;
  status: 'Active' | 'Churn Risk' | 'Inactive';
  ltv: number;
  nps?: number;
  healthScore?: number; // 0 to 100
  onboardingStatus?: 'Pending' | 'In Progress' | 'Completed';
  lastContact?: string; // ISO Date - Novo campo para controle de retenção (30 dias)
  organizationId?: string;
  contractedProducts?: string[]; // IDs or Names of products
  
  // Optional fields for consistency with leads
  cep?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  productInterest?: string;

  // Fields from Excel Import Image (Estacionamento Specific)
  contractId?: string; // "Contrato"
  contractStartDate?: string; // "Início"
  contractEndDate?: string; // "Fim"
  unit?: string; // "Unidade"
  parkingSpots?: number; // "Vagas"
  exemptSpots?: number; // "Isentas"
  vehicleCount?: number; // "Qtd. Veículos"
  credentialCount?: number; // "Qtd. Credenciais"
  pricingTable?: string; // "Tabela"
  tablePrice?: number; // "R$ Tabela"
  totalTablePrice?: number; // "R$ Tabela Total"
  specialDay?: string; // "Dia Espec."
  specialPrice?: number; // "R$ Especial"
  totalSpecialPrice?: number; // "R$ Especial Total"

  // Custom Fields Data
  metadata?: Record<string, any>;
}

export interface TicketResponse {
  id: string;
  text: string;
  author: string;
  role: 'agent' | 'client';
  date: string;
}

export interface Ticket {
  id: string;
  subject: string;
  customer: string; 
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  resolvedAt?: string; // Data em que foi marcado como resolvido (para auto-close)
  description: string;
  channel: 'Email' | 'Chat' | 'Phone';
  organizationId?: string;
  responses?: TicketResponse[]; // Array to hold conversation history
}

export interface Issue {
  id: string;
  title: string;
  type: 'Bug' | 'Feature' | 'Task';
  status: 'Backlog' | 'To Do' | 'In Progress' | 'Review' | 'Done';
  points: number;
  assignee: string;
  sprint: string;
  project: string;
  progress: number; // 0 to 100
  notes: Note[];
  organizationId?: string;
}

export interface Invoice {
  id: string;
  customer: string; 
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
  description: string;
  organizationId?: string;
}

export interface Proposal {
  id: string;
  title: string;
  leadId?: string; 
  clientName: string;
  companyName: string;
  createdDate: string;
  validUntil: string;
  status: ProposalStatus;
  introduction: string;
  scope: string[];
  price: number;
  timeline: string;
  terms: string;
  organizationId?: string;
  
  // Smart Contract Fields
  signature?: string; // Base64 image
  signedAt?: string; // ISO Date
  signedByIp?: string;
}

export interface Activity {
  id: string;
  title: string;
  type: 'Call' | 'Meeting' | 'Email' | 'Task';
  dueDate: string;
  completed: boolean;
  relatedTo: string; 
  assignee: string;
  organizationId?: string;
  description?: string; // Novo: Resumo ou notas
  metadata?: any; // Novo: Objeto JSON para dados complexos (transcrição de IA, etc)
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  module: string;
  organizationId?: string;
}

export interface SystemNotification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'alert';
    timestamp: string;
    read: boolean;
    relatedTo?: string; // ID of related entity
    organizationId?: string;
}

// Visual Toast Notification
export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
}

// --- MARKETING TYPES ---
export interface Campaign {
    id: string;
    name: string;
    status: 'Planned' | 'Active' | 'Completed' | 'Paused';
    channel: 'LinkedIn' | 'Instagram' | 'Email' | 'Google Ads' | 'Meta Ads';
    budget: number;
    spend: number;
    leadsGenerated: number;
    salesGenerated: number;
    startDate: string;
    endDate: string;
    organizationId?: string;
}

export interface MarketingContent {
    id: string;
    title: string;
    content: string;
    channel: 'LinkedIn' | 'Instagram' | 'Email' | 'Blog';
    status: 'Draft' | 'Scheduled' | 'Published';
    tone: string;
    createdAt: string;
    organizationId?: string;
}

// --- AUTOMATION & WEBHOOKS ---
export type TriggerType = 'lead_created' | 'deal_won' | 'deal_lost' | 'ticket_created' | 'client_churn_risk';
export type ActionType = 'send_email' | 'create_task' | 'notify_slack' | 'update_field';

export interface WorkflowAction {
    id: string;
    type: ActionType;
    config: {
        target?: string; // e.g. email address or user ID
        template?: string; // e.g. message body
        field?: string;
        value?: string;
    };
}

export interface WorkflowLog {
    id: string;
    workflowId: string;
    timestamp: string;
    status: 'success' | 'failed';
    details: string;
}

export interface Workflow {
    id: string;
    name: string;
    active: boolean;
    trigger: TriggerType;
    actions: WorkflowAction[];
    runs: number; // Statistic: how many times it ran
    lastRun?: string;
    logs?: WorkflowLog[]; // Histórico recente de execução
    organizationId?: string;
}

export interface WebhookConfig {
    id: string;
    name: string;
    url: string;
    triggerEvent: TriggerType;
    method: 'POST' | 'GET';
    active: boolean;
    headers?: Record<string, string>;
    organizationId?: string;
}

// --- UNIFIED INBOX ---
export interface InboxConversation {
    id: string;
    contactName: string;
    contactIdentifier: string; // Email or Phone
    type: 'WhatsApp' | 'Email' | 'Ticket';
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
    status: 'Open' | 'Closed' | 'Archived';
    messages: InboxMessage[];
    relatedEntityId?: string; // ID of Lead or Client
}

export interface InboxMessage {
    id: string;
    text: string;
    sender: 'user' | 'agent' | 'system';
    timestamp: string;
    attachmentUrl?: string;
}

// --- PROJECTS & ONBOARDING TYPES ---
export interface ProjectTask {
    id: string;
    title: string;
    status: 'Pending' | 'In Progress' | 'Done';
    dueDate?: string;
    assignee?: string;
}

export interface ProjectNote {
    id: string;
    text: string;
    author: string;
    timestamp: string;
    stage: string; // Em qual etapa estava quando anotou
}

export interface Project {
    id: string;
    title: string;
    clientName: string;
    status: 'Planning' | 'Execution' | 'Review' | 'Completed';
    progress: number; // 0-100
    startDate: string;
    deadline: string;
    manager: string; // User ID
    tasks: ProjectTask[];
    organizationId?: string;
    description?: string;
    installAddress?: string; // Novo: Local da instalação
    photos?: string[]; // Novo: Galeria de evidências (URLs)
    notes?: ProjectNote[]; // Novo: Diário de Obra
}

export interface KPIMetric {
  label: string;
  value: string;
  trend: number; // percentage
  trendLabel: string;
  color: 'blue' | 'green' | 'red' | 'yellow';
}

export interface GeminiAnalysisResult {
  summary: string;
  sentiment: 'Positivo' | 'Neutro' | 'Negativo';
  suggestedAction: string;
}

// Permission Types
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export interface PermissionMatrix {
  [role: string]: {
    [module: string]: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
    }
  }
}
