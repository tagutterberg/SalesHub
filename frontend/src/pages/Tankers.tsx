import React, { useEffect, useState } from 'react';
import { Button, Card, DataTable, Modal, Input, Alert } from '../components/ui';
import { tankersApi } from '../services/api';
import type { Tanker, CreateTankerInput, Column } from '../types';

const Tankers: React.FC = () => {
  const [tankers, setTankers] = useState<Tanker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTanker, setEditingTanker] = useState<Tanker | null>(null);
  const [formData, setFormData] = useState<CreateTankerInput>({
    name: '',
    imo_number: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadTankers();
  }, [currentPage]);

  const loadTankers = async () => {
    try {
      setIsLoading(true);
      const response = await tankersApi.getAll({ page: currentPage, limit: 10 });
      setTankers(response.data.data);
      setTotalPages(response.data.totalPages);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load tankers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTanker) {
        await tankersApi.update(editingTanker.id, formData);
      } else {
        await tankersApi.create(formData);
      }
      setIsModalOpen(false);
      loadTankers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save tanker');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tanker?')) return;

    try {
      await tankersApi.delete(id);
      loadTankers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete tanker');
    }
  };

  const columns: Column<Tanker>[] = [
    { key: 'id', header: 'ID', width: '10%' },
    { key: 'name', header: 'Tanker Name', width: '40%' },
    { key: 'imo_number', header: 'IMO Number', width: '30%' },
    {
      key: 'actions',
      header: 'Actions',
      width: '20%',
      render: (tanker) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingTanker(tanker);
              setFormData({ name: tanker.name, imo_number: tanker.imo_number });
              setIsModalOpen(true);
            }}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(tanker.id)}
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
        <h1 className="text-3xl font-bold text-gray-900">Tankers</h1>
        <Button
          onClick={() => {
            setEditingTanker(null);
            setFormData({ name: '', imo_number: '' });
            setIsModalOpen(true);
          }}
        >
          Create Tanker
        </Button>
      </div>

      {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}

      <Card>
        <DataTable
          data={tankers}
          columns={columns}
          keyExtractor={(tanker) => tanker.id}
          isLoading={isLoading}
          emptyMessage="No tankers found"
          pagination={{ currentPage, totalPages, onPageChange: setCurrentPage }}
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTanker ? 'Edit Tanker' : 'Create Tanker'}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingTanker ? 'Update' : 'Create'}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tanker Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            fullWidth
          />
          <Input
            label="IMO Number"
            value={formData.imo_number}
            onChange={(e) => setFormData({ ...formData, imo_number: e.target.value })}
            placeholder="7 digits"
            required
            fullWidth
          />
        </form>
      </Modal>
    </div>
  );
};

export default Tankers;
