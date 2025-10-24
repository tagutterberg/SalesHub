import React, { useEffect, useState } from 'react';
import { Button, Card, DataTable, Badge } from '../components/ui';
import { voyagesApi } from '../services/api';
import type { Voyage, Column } from '../types';

const Voyages: React.FC = () => {
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadVoyages();
  }, [currentPage]);

  const loadVoyages = async () => {
    try {
      setIsLoading(true);
      const response = await voyagesApi.getAll({ page: currentPage, limit: 10 });
      setVoyages(response.data.data);
      setTotalPages(response.data.totalPages);
    } catch (err) {
      console.error('Failed to load voyages', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      planned: 'info',
      active: 'success',
      completed: 'default',
      cancelled: 'danger',
    } as const;
    return variants[status as keyof typeof variants] || 'default';
  };

  const columns: Column<Voyage>[] = [
    { key: 'voyage_number', header: 'Voyage #', width: '15%' },
    {
      key: 'tanker',
      header: 'Tanker',
      width: '25%',
      render: (voyage) => voyage.tanker?.name || '-',
    },
    {
      key: 'cargoes',
      header: 'Cargoes',
      width: '25%',
      render: (voyage) => voyage.cargoes || '-',
    },
    {
      key: 'purchase_price',
      header: 'Purchase Price',
      width: '15%',
      render: (voyage) => voyage.purchase_price ? `$${voyage.purchase_price.toLocaleString()}` : '-',
    },
    {
      key: 'status',
      header: 'Status',
      width: '15%',
      render: (voyage) => (
        <Badge variant={getStatusBadge(voyage.status)} size="sm">
          {voyage.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Voyages</h1>
        <Button onClick={() => alert('Create voyage functionality coming soon')}>Create Voyage</Button>
      </div>

      <Card>
        <DataTable
          data={voyages}
          columns={columns}
          keyExtractor={(voyage) => voyage.id}
          isLoading={isLoading}
          emptyMessage="No voyages found"
          pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }}
        />
      </Card>
    </div>
  );
};

export default Voyages;
