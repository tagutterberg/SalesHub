// Type definitions for all data models

export interface Vessel {
  id: number;
  name: string;
  imo_number: string;
  call_sign?: string;
  email?: string;
  owner?: string;
  created_at: string;
  updated_at: string;
}

export interface Tanker {
  id: number;
  name: string;
  imo_number: string;
  created_at: string;
  updated_at: string;
}

export type VoyageStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface Voyage {
  id: number;
  voyage_number: string;
  tanker_id: number;
  cargoes?: string;
  purchase_price?: number;
  status: VoyageStatus;
  created_at: string;
  updated_at: string;
  tanker?: Tanker;
}

export type Currency = 'USD' | 'EUR' | 'GBP';
export type PriceUnit = 'MT' | 'CBM';

export interface Order {
  id: number;
  vessel_id: number;
  voyage_id?: number;
  product: string;
  quantity_mt?: number;
  quantity_cbm?: number;
  delivery_date: string;
  unit_price: number;
  price_unit: PriceUnit;
  currency: Currency;
  customer_company: string;
  customer_contact?: string;
  customer_email?: string;
  port_of_delivery?: string;
  special_instructions?: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  vessel?: Vessel;
  voyage?: Voyage;
}

export interface CompanySettings {
  id: number;
  company_name: string;
  company_address?: string;
  company_email?: string;
  company_phone?: string;
  logo_url?: string;
  invoice_prefix: string;
  soc_prefix: string;
  invoice_counter: number;
  soc_counter: number;
  tax_rate: number;
  payment_terms: number;
  created_at: string;
  updated_at: string;
}

export type TemplateType = 'invoice' | 'sales_order_confirmation';

export interface DocumentTemplate {
  id: number;
  template_name: string;
  template_type: TemplateType;
  layout_config?: Record<string, any>;
  header_text?: string;
  footer_text?: string;
  colors?: Record<string, string>;
  fonts?: Record<string, string>;
  show_logo: boolean;
  logo_position?: string;
  created_at: string;
  updated_at: string;
}

export type SOCStatus = 'draft' | 'sent' | 'confirmed' | 'cancelled';

export interface SalesOrderConfirmation {
  id: number;
  soc_number: string;
  order_id: number;
  issue_date: string;
  status: SOCStatus;
  notes?: string;
  pdf_path?: string;
  created_at: string;
  updated_at: string;
  order?: Order;
}

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue';

export interface Invoice {
  id: number;
  invoice_number: string;
  order_id: number;
  soc_id?: number;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  payment_date?: string;
  notes?: string;
  pdf_path?: string;
  created_at: string;
  updated_at: string;
  order?: Order;
  soc?: SalesOrderConfirmation;
}

export type EmailTemplateType = 'soc' | 'invoice' | 'payment_reminder' | 'custom';

export interface EmailTemplate {
  id: number;
  template_name: string;
  template_type: EmailTemplateType;
  subject: string;
  body_html: string;
  body_plain?: string;
  variables?: string[];
  created_at: string;
  updated_at: string;
}

export type EmailStatus = 'pending' | 'sent' | 'failed' | 'bounced';

export interface EmailLog {
  id: number;
  recipient_email: string;
  subject: string;
  email_type: string;
  status: EmailStatus;
  sent_at?: string;
  error_message?: string;
  attachment_paths?: string[];
  related_document_type?: string;
  related_document_id?: number;
  created_at: string;
  updated_at: string;
}

export interface EmailSettings {
  id: number;
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  smtp_from_email?: string;
  smtp_from_name?: string;
  use_sendgrid: boolean;
  sendgrid_api_key?: string;
  created_at: string;
  updated_at: string;
}

// Dashboard Statistics
export interface DashboardStats {
  total_orders: number;
  total_voyages: number;
  total_invoices: number;
  total_revenue: number;
  unpaid_invoices: number;
  overdue_invoices: number;
  recent_orders: Order[];
  recent_invoices: Invoice[];
  revenue_by_month: Array<{ month: string; revenue: number }>;
  orders_by_status: Array<{ status: string; count: number }>;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Form input types
export interface CreateVesselInput {
  name: string;
  imo_number: string;
  call_sign?: string;
  email?: string;
  owner?: string;
}

export interface CreateTankerInput {
  name: string;
  imo_number: string;
}

export interface CreateVoyageInput {
  voyage_number: string;
  tanker_id: number;
  cargoes?: string;
  purchase_price?: number;
  status: VoyageStatus;
}

export interface CreateOrderInput {
  vessel_id: number;
  voyage_id?: number;
  product: string;
  quantity_mt?: number;
  quantity_cbm?: number;
  delivery_date: string;
  unit_price: number;
  price_unit: PriceUnit;
  currency: Currency;
  customer_company: string;
  customer_contact?: string;
  customer_email?: string;
  port_of_delivery?: string;
  special_instructions?: string;
}

export interface CreateInvoiceInput {
  order_id: number;
  soc_id?: number;
  issue_date: string;
  due_date: string;
  discount_amount?: number;
  notes?: string;
}

export interface RecordPaymentInput {
  amount: number;
  payment_date: string;
}

export interface CreateSOCInput {
  order_id: number;
  issue_date: string;
  notes?: string;
}

export interface SendEmailInput {
  template_id?: number;
  recipient_email: string;
  subject?: string;
  body_html?: string;
  variables?: Record<string, any>;
  attachment_paths?: string[];
}
