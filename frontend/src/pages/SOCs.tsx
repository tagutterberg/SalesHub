import React, { useEffect, useState } from 'react';
import { Card, DataTable, Badge } from '../components/ui';
import { socsApi } from '../services/api';
import type { SalesOrderConfirmation, Column } from '../types';

const SOCs: React.FC = () => {
  const [socs, setSocs] = useState<SalesOrderConfirmation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadSOCs();
  }, [currentPage]);

  const loadSOCs = async () => {
    try {
      setIsLoading(true);
      const response = await socsApi.getAll({ page: currentPage, limit: 10 });
      setSocs(response.data.data);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      console.error('Failed to load SOCs', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'default',
      sent: 'info',
      confirmed: 'success',
      cancelled: 'danger',
    } as const;
    return variants[status as keyof typeof variants] || 'default';
  };

  const columns: Column<SalesOrderConfirmation>[] = [
    { key: 'soc_number', header: 'SOC #', width: '20%' },
    {
      key: 'issue_date',
      header: 'Issue Date',
      width: '20%',
      render: (soc) => new Date(soc.issue_date).toLocaleDateString(),
    },
    {
      key: 'status',
      header: 'Status',
      width: '15%',
      render: (soc) => (
        <Badge variant={getStatusBadge(soc.status)} size="sm">
          {soc.status}
        </Badge>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      width: '35%',
      render: (soc) => soc.notes || '-',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Sales Order Confirmations</h1>

      <Card>
        <DataTable
          data={socs}
          columns={columns}
          keyExtractor={(soc) => soc.id}
          isLoading={isLoading}
          emptyMessage="No sales order confirmations found"
          pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }}
        />
      </Card>
    </div>
  );
};

export default SOCs;
