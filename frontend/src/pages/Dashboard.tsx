import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, Badge, Alert } from '../components/ui';
import { dashboardApi } from '../services/api';
import type { DashboardStats, Order, Invoice, SalesOrderConfirmation } from '../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<{
    overdue_invoices: Invoice[];
    locked_orders: Order[];
    pending_socs: SalesOrderConfirmation[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, alertsRes] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getAlerts(),
      ]);
      setStats(statsRes.data);
      setAlerts(alertsRes.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert type="error" title="Error">
        {error}
      </Alert>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {alerts && (alerts.overdue_invoices.length > 0 || alerts.locked_orders.length > 0 || alerts.pending_socs.length > 0) && (
        <div className="space-y-3">
          {alerts.overdue_invoices.length > 0 && (
            <Alert type="error" title="Overdue Invoices">
              You have {alerts.overdue_invoices.length} overdue invoice(s).{' '}
              <Link to="/invoices?status=overdue" className="font-medium underline">
                View all
              </Link>
            </Alert>
          )}
          {alerts.locked_orders.length > 0 && (
            <Alert type="warning" title="Locked Orders">
              You have {alerts.locked_orders.length} locked order(s) that require attention.{' '}
              <Link to="/orders?locked=true" className="font-medium underline">
                View all
              </Link>
            </Alert>
          )}
          {alerts.pending_socs.length > 0 && (
            <Alert type="info" title="Pending Sales Order Confirmations">
              You have {alerts.pending_socs.length} pending SOC(s).{' '}
              <Link to="/socs?status=draft" className="font-medium underline">
                View all
              </Link>
            </Alert>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total_orders}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Voyages</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total_voyages}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total_invoices}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="danger" size="sm">{stats.overdue_invoices} overdue</Badge>
                <Badge variant="warning" size="sm">{stats.unpaid_invoices} unpaid</Badge>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                ${stats.total_revenue.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Revenue by Month" padding={false}>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.revenue_by_month}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Orders by Status" padding={false}>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.orders_by_status}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Orders">
          <div className="space-y-3">
            {stats.recent_orders.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent orders</p>
            ) : (
              stats.recent_orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{order.product}</p>
                    <p className="text-sm text-gray-600">{order.customer_company}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {order.currency} {order.unit_price.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(order.delivery_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            <Link
              to="/orders"
              className="block text-center text-sm font-medium text-blue-600 hover:text-blue-700 pt-2"
            >
              View all orders →
            </Link>
          </div>
        </Card>

        <Card title="Recent Invoices">
          <div className="space-y-3">
            {stats.recent_invoices.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent invoices</p>
            ) : (
              stats.recent_invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                    <p className="text-sm text-gray-600">
                      Due: {new Date(invoice.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      ${invoice.total_amount.toLocaleString()}
                    </p>
                    <Badge
                      variant={
                        invoice.payment_status === 'paid'
                          ? 'success'
                          : invoice.payment_status === 'overdue'
                          ? 'danger'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {invoice.payment_status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
            <Link
              to="/invoices"
              className="block text-center text-sm font-medium text-blue-600 hover:text-blue-700 pt-2"
            >
              View all invoices →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
