import React, { useEffect, useState } from 'react';
import { Button, Card, DataTable, Modal, Input, Alert } from '../components/ui';
import { vesselsApi } from '../services/api';
import type { Vessel, CreateVesselInput, Column } from '../types';

const Vessels: React.FC = () => {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVessel, setEditingVessel] = useState<Vessel | null>(null);
  const [formData, setFormData] = useState<CreateVesselInput>({
    name: '',
    imo_number: '',
    call_sign: '',
    email: '',
    owner: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadVessels();
  }, [currentPage, searchTerm]);

  const loadVessels = async () => {
    try {
      setIsLoading(true);
      const response = await vesselsApi.getAll({
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
      });
      setVessels(response.data.data);
      setTotalPages(response.data.totalPages);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load vessels');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingVessel(null);
    setFormData({
      name: '',
      imo_number: '',
      call_sign: '',
      email: '',
      owner: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (vessel: Vessel) => {
    setEditingVessel(vessel);
    setFormData({
      name: vessel.name,
      imo_number: vessel.imo_number,
      call_sign: vessel.call_sign || '',
      email: vessel.email || '',
      owner: vessel.owner || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.imo_number.trim()) {
      errors.imo_number = 'IMO number is required';
    } else if (!/^\d{7}$/.test(formData.imo_number)) {
      errors.imo_number = 'IMO number must be exactly 7 digits';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (editingVessel) {
        await vesselsApi.update(editingVessel.id, formData);
      } else {
        await vesselsApi.create(formData);
      }
      setIsModalOpen(false);
      loadVessels();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save vessel');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this vessel?')) return;

    try {
      await vesselsApi.delete(id);
      loadVessels();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete vessel');
    }
  };

  const columns: Column<Vessel>[] = [
    {
      key: 'name',
      header: 'Vessel Name',
      width: '20%',
    },
    {
      key: 'imo_number',
      header: 'IMO Number',
      width: '15%',
    },
    {
      key: 'call_sign',
      header: 'Call Sign',
      width: '15%',
      render: (vessel) => vessel.call_sign || '-',
    },
    {
      key: 'email',
      header: 'Email',
      width: '20%',
      render: (vessel) => vessel.email || '-',
    },
    {
      key: 'owner',
      header: 'Owner',
      width: '15%',
      render: (vessel) => vessel.owner || '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '15%',
      render: (vessel) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(vessel);
            }}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(vessel.id);
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
        <h1 className="text-3xl font-bold text-gray-900">Vessels</h1>
        <Button onClick={openCreateModal}>Create Vessel</Button>
      </div>

      {error && (
        <Alert type="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <div className="mb-4">
          <Input
            placeholder="Search vessels..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            fullWidth
          />
        </div>

        <DataTable
          data={vessels}
          columns={columns}
          keyExtractor={(vessel) => vessel.id}
          isLoading={isLoading}
          emptyMessage="No vessels found"
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setCurrentPage,
          }}
        />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVessel ? 'Edit Vessel' : 'Create Vessel'}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingVessel ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Vessel Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={formErrors.name}
            required
            fullWidth
          />

          <Input
            label="IMO Number"
            value={formData.imo_number}
            onChange={(e) => setFormData({ ...formData, imo_number: e.target.value })}
            error={formErrors.imo_number}
            placeholder="7 digits"
            required
            fullWidth
          />

          <Input
            label="Call Sign"
            value={formData.call_sign}
            onChange={(e) => setFormData({ ...formData, call_sign: e.target.value })}
            fullWidth
          />

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={formErrors.email}
            fullWidth
          />

          <Input
            label="Owner"
            value={formData.owner}
            onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
            fullWidth
          />
        </form>
      </Modal>
    </div>
  );
};

export default Vessels;
