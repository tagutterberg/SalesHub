import React, { useEffect, useState } from 'react';
import { Button, Card, DataTable, Modal, Input, Select, Alert, Badge } from '../components/ui';
import { ordersApi, vesselsApi, voyagesApi } from '../services/api';
import type { Order, CreateOrderInput, Column, Vessel, Voyage } from '../types';

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState<CreateOrderInput>({
    vessel_id: 0,
    product: '',
    delivery_date: '',
    unit_price: 0,
    price_unit: 'MT',
    currency: 'USD',
    customer_company: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadOrders();
    loadVessels();
    loadVoyages();
  }, [currentPage]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const response = await ordersApi.getAll({ page: currentPage, limit: 10 });
      setOrders(response.data.data);
      setTotalPages(response.data.totalPages);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVessels = async () => {
    try {
      const response = await vesselsApi.getAll({ limit: 1000 });
      setVessels(response.data.data);
    } catch (err) {
      console.error('Failed to load vessels', err);
    }
  };

  const loadVoyages = async () => {
    try {
      const response = await voyagesApi.getAll({ limit: 1000 });
      setVoyages(response.data.data);
    } catch (err) {
      console.error('Failed to load voyages', err);
    }
  };

  const handleLockToggle = async (order: Order) => {
    try {
      if (order.is_locked) {
        await ordersApi.unlock(order.id);
        setSuccess('Order unlocked successfully');
      } else {
        await ordersApi.lock(order.id);
        setSuccess('Order locked successfully');
      }
      loadOrders();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle lock status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingOrder) {
        await ordersApi.update(editingOrder.id, formData);
      } else {
        await ordersApi.create(formData);
      }
      setIsModalOpen(false);
      setSuccess(`Order ${editingOrder ? 'updated' : 'created'} successfully`);
      loadOrders();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save order');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this order?')) return;

    try {
      await ordersApi.delete(id);
      setSuccess('Order deleted successfully');
      loadOrders();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete order');
    }
  };

  const openCreateModal = () => {
    setEditingOrder(null);
    setFormData({
      vessel_id: 0,
      product: '',
      delivery_date: '',
      unit_price: 0,
      price_unit: 'MT',
      currency: 'USD',
      customer_company: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      vessel_id: order.vessel_id,
      voyage_id: order.voyage_id,
      product: order.product,
      quantity_mt: order.quantity_mt,
      quantity_cbm: order.quantity_cbm,
      delivery_date: order.delivery_date.split('T')[0],
      unit_price: order.unit_price,
      price_unit: order.price_unit,
      currency: order.currency,
      customer_company: order.customer_company,
      customer_contact: order.customer_contact,
      customer_email: order.customer_email,
      port_of_delivery: order.port_of_delivery,
      special_instructions: order.special_instructions,
    });
    setIsModalOpen(true);
  };

  const columns: Column<Order>[] = [
    {
      key: 'id',
      header: 'ID',
      width: '5%',
    },
    {
      key: 'product',
      header: 'Product',
      width: '15%',
    },
    {
      key: 'customer_company',
      header: 'Customer',
      width: '15%',
    },
    {
      key: 'quantity',
      header: 'Quantity',
      width: '12%',
      render: (order) => (
        <span>
          {order.quantity_mt ? `${order.quantity_mt} MT` : ''}
          {order.quantity_cbm ? `${order.quantity_cbm} CBM` : ''}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      width: '12%',
      render: (order) => `${order.currency} ${order.unit_price}/${order.price_unit}`,
    },
    {
      key: 'delivery_date',
      header: 'Delivery Date',
      width: '12%',
      render: (order) => new Date(order.delivery_date).toLocaleDateString(),
    },
    {
      key: 'is_locked',
      header: 'Status',
      width: '10%',
      render: (order) => (
        <Badge variant={order.is_locked ? 'danger' : 'success'} size="sm">
          {order.is_locked ? 'Locked' : 'Unlocked'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '19%',
      render: (order) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(order);
            }}
            disabled={order.is_locked}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLockToggle(order);
            }}
            className="text-yellow-600 hover:text-yellow-800 font-medium text-sm"
          >
            {order.is_locked ? 'Unlock' : 'Lock'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(order.id);
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
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <Button onClick={openCreateModal}>Create Order</Button>
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
          data={orders}
          columns={columns}
          keyExtractor={(order) => order.id}
          isLoading={isLoading}
          emptyMessage="No orders found"
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
        title={editingOrder ? 'Edit Order' : 'Create Order'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingOrder ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Vessel"
              value={formData.vessel_id}
              onChange={(e) => setFormData({ ...formData, vessel_id: parseInt(e.target.value) })}
              options={vessels.map((v) => ({ value: v.id, label: v.name }))}
              placeholder="Select vessel"
              required
              fullWidth
            />

            <Select
              label="Voyage (Optional)"
              value={formData.voyage_id || ''}
              onChange={(e) => setFormData({ ...formData, voyage_id: e.target.value ? parseInt(e.target.value) : undefined })}
              options={voyages.map((v) => ({ value: v.id, label: v.voyage_number }))}
              placeholder="Select voyage"
              fullWidth
            />
          </div>

          <Input
            label="Product"
            value={formData.product}
            onChange={(e) => setFormData({ ...formData, product: e.target.value })}
            required
            fullWidth
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity (MT)"
              type="number"
              step="0.01"
              value={formData.quantity_mt || ''}
              onChange={(e) => setFormData({ ...formData, quantity_mt: e.target.value ? parseFloat(e.target.value) : undefined })}
              fullWidth
            />

            <Input
              label="Quantity (CBM)"
              type="number"
              step="0.01"
              value={formData.quantity_cbm || ''}
              onChange={(e) => setFormData({ ...formData, quantity_cbm: e.target.value ? parseFloat(e.target.value) : undefined })}
              fullWidth
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Unit Price"
              type="number"
              step="0.01"
              value={formData.unit_price}
              onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
              required
              fullWidth
            />

            <Select
              label="Price Unit"
              value={formData.price_unit}
              onChange={(e) => setFormData({ ...formData, price_unit: e.target.value as 'MT' | 'CBM' })}
              options={[
                { value: 'MT', label: 'MT' },
                { value: 'CBM', label: 'CBM' },
              ]}
              required
              fullWidth
            />

            <Select
              label="Currency"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'USD' | 'EUR' | 'GBP' })}
              options={[
                { value: 'USD', label: 'USD' },
                { value: 'EUR', label: 'EUR' },
                { value: 'GBP', label: 'GBP' },
              ]}
              required
              fullWidth
            />
          </div>

          <Input
            label="Delivery Date"
            type="date"
            value={formData.delivery_date}
            onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
            required
            fullWidth
          />

          <Input
            label="Customer Company"
            value={formData.customer_company}
            onChange={(e) => setFormData({ ...formData, customer_company: e.target.value })}
            required
            fullWidth
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Customer Contact"
              value={formData.customer_contact || ''}
              onChange={(e) => setFormData({ ...formData, customer_contact: e.target.value })}
              fullWidth
            />

            <Input
              label="Customer Email"
              type="email"
              value={formData.customer_email || ''}
              onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
              fullWidth
            />
          </div>

          <Input
            label="Port of Delivery"
            value={formData.port_of_delivery || ''}
            onChange={(e) => setFormData({ ...formData, port_of_delivery: e.target.value })}
            fullWidth
          />
        </form>
      </Modal>
    </div>
  );
};

export default Orders;
