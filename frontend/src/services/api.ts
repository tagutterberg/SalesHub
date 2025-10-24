import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  Vessel,
  Tanker,
  Voyage,
  Order,
  CompanySettings,
  DocumentTemplate,
  SalesOrderConfirmation,
  Invoice,
  EmailTemplate,
  EmailLog,
  EmailSettings,
  DashboardStats,
  PaginatedResponse,
  CreateVesselInput,
  CreateTankerInput,
  CreateVoyageInput,
  CreateOrderInput,
  CreateInvoiceInput,
  RecordPaymentInput,
  CreateSOCInput,
  SendEmailInput,
} from '../types';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth tokens (if needed in future)
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Vessels API
export const vesselsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<PaginatedResponse<Vessel>>('/vessels', { params }),

  getById: (id: number) =>
    apiClient.get<Vessel>(`/vessels/${id}`),

  create: (data: CreateVesselInput) =>
    apiClient.post<Vessel>('/vessels', data),

  update: (id: number, data: Partial<CreateVesselInput>) =>
    apiClient.put<Vessel>(`/vessels/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/vessels/${id}`),

  getOrders: (id: number) =>
    apiClient.get<Order[]>(`/vessels/${id}/orders`),
};

// Tankers API
export const tankersApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<PaginatedResponse<Tanker>>('/tankers', { params }),

  getById: (id: number) =>
    apiClient.get<Tanker>(`/tankers/${id}`),

  create: (data: CreateTankerInput) =>
    apiClient.post<Tanker>('/tankers', data),

  update: (id: number, data: Partial<CreateTankerInput>) =>
    apiClient.put<Tanker>(`/tankers/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/tankers/${id}`),
};

// Voyages API
export const voyagesApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string; tanker_id?: number }) =>
    apiClient.get<PaginatedResponse<Voyage>>('/voyages', { params }),

  getById: (id: number) =>
    apiClient.get<Voyage>(`/voyages/${id}`),

  create: (data: CreateVoyageInput) =>
    apiClient.post<Voyage>('/voyages', data),

  update: (id: number, data: Partial<CreateVoyageInput>) =>
    apiClient.put<Voyage>(`/voyages/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/voyages/${id}`),

  getOrders: (id: number) =>
    apiClient.get<Order[]>(`/voyages/${id}/orders`),

  getNextNumber: () =>
    apiClient.get<{ suggested_number: string }>('/voyages/next-number'),
};

// Orders API
export const ordersApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    vessel_id?: number;
    voyage_id?: number;
    is_locked?: boolean;
    start_date?: string;
    end_date?: string;
  }) =>
    apiClient.get<PaginatedResponse<Order>>('/orders', { params }),

  getById: (id: number) =>
    apiClient.get<Order>(`/orders/${id}`),

  create: (data: CreateOrderInput) =>
    apiClient.post<Order>('/orders', data),

  update: (id: number, data: Partial<CreateOrderInput>) =>
    apiClient.put<Order>(`/orders/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/orders/${id}`),

  lock: (id: number) =>
    apiClient.post(`/orders/${id}/lock`),

  unlock: (id: number) =>
    apiClient.post(`/orders/${id}/unlock`),

  assignToVoyage: (id: number, voyage_id: number) =>
    apiClient.post(`/orders/${id}/assign-voyage`, { voyage_id }),

  getInvoices: (id: number) =>
    apiClient.get<Invoice[]>(`/orders/${id}/invoices`),

  getSOCs: (id: number) =>
    apiClient.get<SalesOrderConfirmation[]>(`/orders/${id}/socs`),
};

// Company Settings API
export const companySettingsApi = {
  get: () =>
    apiClient.get<CompanySettings>('/company-settings'),

  update: (data: Partial<CompanySettings>) =>
    apiClient.put<CompanySettings>('/company-settings', data),

  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return apiClient.post<CompanySettings>('/company-settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteLogo: () =>
    apiClient.delete('/company-settings/logo'),
};

// Document Templates API
export const documentTemplatesApi = {
  getAll: (type?: string) =>
    apiClient.get<DocumentTemplate[]>('/document-templates', { params: { type } }),

  getById: (id: number) =>
    apiClient.get<DocumentTemplate>(`/document-templates/${id}`),

  create: (data: Partial<DocumentTemplate>) =>
    apiClient.post<DocumentTemplate>('/document-templates', data),

  update: (id: number, data: Partial<DocumentTemplate>) =>
    apiClient.put<DocumentTemplate>(`/document-templates/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/document-templates/${id}`),

  clone: (id: number, new_name: string) =>
    apiClient.post<DocumentTemplate>(`/document-templates/${id}/clone`, { new_name }),

  setDefault: (id: number, template_type: string) =>
    apiClient.post(`/document-templates/${id}/set-default`, { template_type }),

  getDefault: (template_type: string) =>
    apiClient.get<DocumentTemplate>('/document-templates/default', { params: { template_type } }),
};

// Sales Order Confirmations API
export const socsApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string; order_id?: number }) =>
    apiClient.get<PaginatedResponse<SalesOrderConfirmation>>('/socs', { params }),

  getById: (id: number) =>
    apiClient.get<SalesOrderConfirmation>(`/socs/${id}`),

  create: (data: CreateSOCInput) =>
    apiClient.post<SalesOrderConfirmation>('/socs', data),

  update: (id: number, data: Partial<CreateSOCInput>) =>
    apiClient.put<SalesOrderConfirmation>(`/socs/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/socs/${id}`),

  generatePDF: (id: number, template_id?: number) =>
    apiClient.post<{ pdf_path: string }>(`/socs/${id}/generate-pdf`, { template_id }),

  downloadPDF: (id: number) =>
    apiClient.get(`/socs/${id}/download`, { responseType: 'blob' }),

  sendEmail: (id: number, data: { recipient_email: string; template_id?: number; custom_message?: string }) =>
    apiClient.post(`/socs/${id}/send-email`, data),

  updateStatus: (id: number, status: string) =>
    apiClient.patch<SalesOrderConfirmation>(`/socs/${id}/status`, { status }),

  getNextNumber: () =>
    apiClient.get<{ suggested_number: string }>('/socs/next-number'),
};

// Invoices API
export const invoicesApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    payment_status?: string;
    order_id?: number;
    start_date?: string;
    end_date?: string;
  }) =>
    apiClient.get<PaginatedResponse<Invoice>>('/invoices', { params }),

  getById: (id: number) =>
    apiClient.get<Invoice>(`/invoices/${id}`),

  create: (data: CreateInvoiceInput) =>
    apiClient.post<Invoice>('/invoices', data),

  createBatch: (data: { order_ids: number[]; issue_date: string; due_date: string }) =>
    apiClient.post<Invoice[]>('/invoices/batch', data),

  update: (id: number, data: Partial<CreateInvoiceInput>) =>
    apiClient.put<Invoice>(`/invoices/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/invoices/${id}`),

  generatePDF: (id: number, template_id?: number) =>
    apiClient.post<{ pdf_path: string }>(`/invoices/${id}/generate-pdf`, { template_id }),

  downloadPDF: (id: number) =>
    apiClient.get(`/invoices/${id}/download`, { responseType: 'blob' }),

  sendEmail: (id: number, data: { recipient_email: string; template_id?: number; custom_message?: string }) =>
    apiClient.post(`/invoices/${id}/send-email`, data),

  recordPayment: (id: number, data: RecordPaymentInput) =>
    apiClient.post<Invoice>(`/invoices/${id}/payment`, data),

  updatePaymentStatus: (id: number, payment_status: string) =>
    apiClient.patch<Invoice>(`/invoices/${id}/payment-status`, { payment_status }),

  getOverdue: () =>
    apiClient.get<Invoice[]>('/invoices/overdue'),

  getTotalRevenue: (params?: { start_date?: string; end_date?: string }) =>
    apiClient.get<{ total_revenue: number; currency: string }>('/invoices/revenue', { params }),

  getNextNumber: () =>
    apiClient.get<{ suggested_number: string }>('/invoices/next-number'),
};

// Email Templates API
export const emailTemplatesApi = {
  getAll: (type?: string) =>
    apiClient.get<EmailTemplate[]>('/email-templates', { params: { type } }),

  getById: (id: number) =>
    apiClient.get<EmailTemplate>(`/email-templates/${id}`),

  create: (data: Partial<EmailTemplate>) =>
    apiClient.post<EmailTemplate>('/email-templates', data),

  update: (id: number, data: Partial<EmailTemplate>) =>
    apiClient.put<EmailTemplate>(`/email-templates/${id}`, data),

  delete: (id: number) =>
    apiClient.delete(`/email-templates/${id}`),

  clone: (id: number, new_name: string) =>
    apiClient.post<EmailTemplate>(`/email-templates/${id}/clone`, { new_name }),

  preview: (id: number, sample_variables: Record<string, any>) =>
    apiClient.post<{ subject: string; body_html: string }>(`/email-templates/${id}/preview`, { sample_variables }),

  getDefault: (template_type: string) =>
    apiClient.get<EmailTemplate>('/email-templates/default', { params: { template_type } }),
};

// Email Settings API
export const emailSettingsApi = {
  get: () =>
    apiClient.get<EmailSettings>('/email-settings'),

  update: (data: Partial<EmailSettings>) =>
    apiClient.put<EmailSettings>('/email-settings', data),

  test: (test_email: string) =>
    apiClient.post('/email-settings/test', { test_email }),
};

// Emails API
export const emailsApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string; email_type?: string }) =>
    apiClient.get<PaginatedResponse<EmailLog>>('/emails', { params }),

  getById: (id: number) =>
    apiClient.get<EmailLog>(`/emails/${id}`),

  send: (data: SendEmailInput) =>
    apiClient.post<EmailLog>('/emails/send', data),

  sendBatch: (emails: SendEmailInput[]) =>
    apiClient.post<EmailLog[]>('/emails/send-batch', { emails }),

  retry: (id: number) =>
    apiClient.post<EmailLog>(`/emails/${id}/retry`),

  getByDocument: (document_type: string, document_id: number) =>
    apiClient.get<EmailLog[]>('/emails/by-document', { params: { document_type, document_id } }),

  getStats: () =>
    apiClient.get<{ total: number; sent: number; failed: number; pending: number }>('/emails/stats'),

  cleanup: (days: number) =>
    apiClient.delete('/emails/cleanup', { params: { days } }),
};

// Dashboard API
export const dashboardApi = {
  getStats: () =>
    apiClient.get<DashboardStats>('/dashboard/stats'),

  getAlerts: () =>
    apiClient.get<{ overdue_invoices: Invoice[]; locked_orders: Order[]; pending_socs: SalesOrderConfirmation[] }>('/dashboard/alerts'),
};

// Reports API
export const reportsApi = {
  getOrders: (params: { start_date?: string; end_date?: string; vessel_id?: number; voyage_id?: number; format?: 'json' | 'xlsx' }) =>
    apiClient.get('/reports/orders', {
      params,
      responseType: params.format === 'xlsx' ? 'blob' : 'json'
    }),

  getInvoices: (params: { start_date?: string; end_date?: string; payment_status?: string; format?: 'json' | 'xlsx' }) =>
    apiClient.get('/reports/invoices', {
      params,
      responseType: params.format === 'xlsx' ? 'blob' : 'json'
    }),

  getRevenue: (params: { start_date?: string; end_date?: string; group_by?: 'month' | 'quarter' | 'year'; format?: 'json' | 'xlsx' }) =>
    apiClient.get('/reports/revenue', {
      params,
      responseType: params.format === 'xlsx' ? 'blob' : 'json'
    }),

  getVoyages: (params: { start_date?: string; end_date?: string; status?: string; tanker_id?: number; format?: 'json' | 'xlsx' }) =>
    apiClient.get('/reports/voyages', {
      params,
      responseType: params.format === 'xlsx' ? 'blob' : 'json'
    }),
};

// Cron Jobs API
export const cronJobsApi = {
  getStatus: () =>
    apiClient.get<{ jobs: Array<{ name: string; schedule: string; running: boolean; last_run?: string }> }>('/cron/status'),

  trigger: (jobName: string) =>
    apiClient.post(`/cron/trigger/${jobName}`),
};

// Helper function to download blob files
export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default apiClient;
