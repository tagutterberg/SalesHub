import React, { useEffect, useState } from 'react';
import { Card, DataTable, Badge } from '../components/ui';
import { emailsApi } from '../services/api';
import type { EmailLog, Column } from '../types';

const EmailLogs: React.FC = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [currentPage]);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const response = await emailsApi.getAll({ page: currentPage, limit: 20 });
      setLogs(response.data.data);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      console.error('Failed to load email logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: 'success',
      pending: 'warning',
      failed: 'danger',
      bounced: 'danger',
    } as const;
    return variants[status as keyof typeof variants] || 'default';
  };

  const columns: Column<EmailLog>[] = [
    {
      key: 'sent_at',
      header: 'Date',
      width: '15%',
      render: (log) => log.sent_at ? new Date(log.sent_at).toLocaleString() : '-',
    },
    { key: 'recipient_email', header: 'Recipient', width: '25%' },
    { key: 'subject', header: 'Subject', width: '25%' },
    {
      key: 'email_type',
      header: 'Type',
      width: '15%',
      render: (log) => (
        <Badge variant="info" size="sm">
          {log.email_type}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '15%',
      render: (log) => (
        <Badge variant={getStatusBadge(log.status)} size="sm">
          {log.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Email Logs</h1>

      <Card>
        <DataTable
          data={logs}
          columns={columns}
          keyExtractor={(log) => log.id}
          isLoading={isLoading}
          emptyMessage="No email logs found"
          pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }}
        />
      </Card>
    </div>
  );
};

export default EmailLogs;
