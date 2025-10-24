import React, { useEffect, useState } from 'react';
import { Button, Card, DataTable, Modal, Input, Alert, Badge } from '../components/ui';
import { invoicesApi, downloadFile } from '../services/api';
import type { Invoice, RecordPaymentInput, Column } from '../types';

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentData, setPaymentData] = useState<RecordPaymentInput>({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    loadInvoices();
  }, [currentPage, filterStatus]);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      const response = await invoicesApi.getAll({
        page: currentPage,
        limit: 10,
        payment_status: filterStatus || undefined,
      });
      setInvoices(response.data.data);
      setTotalPages(response.data.totalPages);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: invoice.total_amount - (invoice.total_amount * 0), // Remaining amount
      payment_date: new Date().toISOString().split('T')[0],
    });
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      await invoicesApi.recordPayment(selectedInvoice.id, paymentData);
      setIsPaymentModalOpen(false);
      setSuccess('Payment recorded successfully');
      loadInvoices();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record payment');
    }
  };

  const handleGeneratePDF = async (invoice: Invoice) => {
    try {
      await invoicesApi.generatePDF(invoice.id);
      setSuccess('PDF generated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate PDF');
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const response = await invoicesApi.downloadPDF(invoice.id);
      downloadFile(response.data, `invoice-${invoice.invoice_number}.pdf`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to download PDF');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      await invoicesApi.delete(id);
      setSuccess('Invoice deleted successfully');
      loadInvoices();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete invoice');
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants = {
      paid: 'success',
      unpaid: 'warning',
      partially_paid: 'info',
      overdue: 'danger',
    } as const;
    return variants[status as keyof typeof variants] || 'default';
  };

  const columns: Column<Invoice>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      width: '12%',
    },
    {
      key: 'issue_date',
      header: 'Issue Date',
      width: '10%',
      render: (invoice) => new Date(invoice.issue_date).toLocaleDateString(),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      width: '10%',
      render: (invoice) => new Date(invoice.due_date).toLocaleDateString(),
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      width: '10%',
      render: (invoice) => `$${invoice.subtotal.toLocaleString()}`,
    },
    {
      key: 'total_amount',
      header: 'Total',
      width: '10%',
      render: (invoice) => `$${invoice.total_amount.toLocaleString()}`,
    },
    {
      key: 'payment_status',
      header: 'Status',
      width: '12%',
      render: (invoice) => (
        <Badge variant={getPaymentStatusBadge(invoice.payment_status)} size="sm">
          {invoice.payment_status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'payment_date',
      header: 'Paid On',
      width: '10%',
      render: (invoice) => invoice.payment_date ? new Date(invoice.payment_date).toLocaleDateString() : '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '26%',
      render: (invoice) => (
        <div className="flex gap-2 flex-wrap">
          {invoice.payment_status !== 'paid' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openPaymentModal(invoice);
              }}
              className="text-green-600 hover:text-green-800 font-medium text-sm"
            >
              Pay
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleGeneratePDF(invoice);
            }}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            PDF
          </button>
          {invoice.pdf_path && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadPDF(invoice);
              }}
              className="text-purple-600 hover:text-purple-800 font-medium text-sm"
            >
              Download
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(invoice.id);
            }}
            className="text-red-600 hover:text-red-800 font-medium text-sm"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
        <div className="flex gap-3">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert type="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card>
        <DataTable
          data={invoices}
          columns={columns}
          keyExtractor={(invoice) => invoice.id}
          isLoading={isLoading}
          emptyMessage="No invoices found"
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage,
          }}
        />
      </Card>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Payment"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment}>Record Payment</Button>
          </>
        }
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900">Invoice: {selectedInvoice.invoice_number}</h3>
              <p className="text-sm text-gray-600 mt-1">
                Total Amount: ${selectedInvoice.total_amount.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                Status: <span className="capitalize">{selectedInvoice.payment_status.replace('_', ' ')}</span>
              </p>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <Input
                label="Payment Amount"
                type="number"
                step="0.01"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })}
                required
                fullWidth
              />

              <Input
                label="Payment Date"
                type="date"
                value={paymentData.payment_date}
                onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                required
                fullWidth
              />
            </form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Invoices;
