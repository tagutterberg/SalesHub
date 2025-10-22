const { Order, Invoice, Voyage, Vessel, EmailLog, SalesOrderConfirmation } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

/**
 * Get Dashboard Statistics
 * @route GET /api/dashboard/stats
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get all stats in parallel
  const [
    totalOrders,
    totalVoyages,
    activeVoyages,
    totalInvoices,
    unpaidInvoices,
    overdueInvoices,
    totalRevenue,
    pendingRevenue,
    recentOrders,
    recentInvoices,
    recentEmailsSent,
    ordersByMonth,
    revenueByMonth
  ] = await Promise.all([
    // Total orders
    Order.count(),

    // Total voyages
    Voyage.count(),

    // Active voyages
    Voyage.count({ where: { status: 'active' } }),

    // Total invoices
    Invoice.count(),

    // Unpaid invoices
    Invoice.count({ where: { payment_status: { [Op.in]: ['unpaid', 'partially_paid'] } } }),

    // Overdue invoices
    Invoice.count({
      where: {
        due_date: { [Op.lt]: today },
        payment_status: { [Op.in]: ['unpaid', 'partially_paid'] }
      }
    }),

    // Total revenue (paid invoices)
    Invoice.sum('total_amount', { where: { payment_status: 'paid' } }),

    // Pending revenue (unpaid + partially paid)
    Invoice.sum('total_amount', {
      where: { payment_status: { [Op.in]: ['unpaid', 'partially_paid', 'overdue'] } }
    }),

    // Recent orders (last 7 days)
    Order.findAll({
      where: {
        created_at: { [Op.gte]: sevenDaysAgo }
      },
      limit: 10,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Vessel,
          as: 'vessel',
          attributes: ['id', 'name', 'imo_number']
        },
        {
          model: Voyage,
          as: 'voyage',
          attributes: ['id', 'voyage_number']
        }
      ]
    }),

    // Recent invoices (last 10)
    Invoice.findAll({
      limit: 10,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'customer_company'],
          include: [
            {
              model: Vessel,
              as: 'vessel',
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    }),

    // Recent emails sent (last 7 days)
    EmailLog.count({
      where: {
        status: 'sent',
        created_at: { [Op.gte]: sevenDaysAgo }
      }
    }),

    // Orders by month (last 12 months)
    Order.findAll({
      attributes: [
        [require('sequelize').fn('DATE_TRUNC', 'month', require('sequelize').col('created_at')), 'month'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: {
        created_at: {
          [Op.gte]: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        }
      },
      group: ['month'],
      order: [[require('sequelize').literal('month'), 'ASC']],
      raw: true
    }),

    // Revenue by month (last 12 months)
    Invoice.findAll({
      attributes: [
        [require('sequelize').fn('DATE_TRUNC', 'month', require('sequelize').col('created_at')), 'month'],
        [require('sequelize').fn('SUM', require('sequelize').col('total_amount')), 'revenue']
      ],
      where: {
        payment_status: 'paid',
        created_at: {
          [Op.gte]: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        }
      },
      group: ['month'],
      order: [[require('sequelize').literal('month'), 'ASC']],
      raw: true
    })
  ]);

  // Calculate percentage changes (compared to last 30 days vs previous 30 days)
  const previousMonthStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [ordersLastMonth, ordersPreviousMonth] = await Promise.all([
    Order.count({
      where: {
        created_at: { [Op.between]: [thirtyDaysAgo, today] }
      }
    }),
    Order.count({
      where: {
        created_at: { [Op.between]: [previousMonthStart, thirtyDaysAgo] }
      }
    })
  ]);

  const ordersChange = ordersPreviousMonth > 0
    ? (((ordersLastMonth - ordersPreviousMonth) / ordersPreviousMonth) * 100).toFixed(1)
    : 0;

  // Alerts
  const alerts = [];

  if (overdueInvoices > 0) {
    alerts.push({
      type: 'warning',
      title: 'Overdue Invoices',
      message: `You have ${overdueInvoices} overdue invoice${overdueInvoices > 1 ? 's' : ''}`,
      action: '/invoices?status=overdue'
    });
  }

  if (unpaidInvoices > 5) {
    alerts.push({
      type: 'info',
      title: 'Unpaid Invoices',
      message: `${unpaidInvoices} invoices are awaiting payment`,
      action: '/invoices?status=unpaid'
    });
  }

  const unassignedOrders = await Order.count({ where: { voyage_id: null } });
  if (unassignedOrders > 0) {
    alerts.push({
      type: 'info',
      title: 'Unassigned Orders',
      message: `${unassignedOrders} order${unassignedOrders > 1 ? 's' : ''} need${unassignedOrders === 1 ? 's' : ''} to be assigned to a voyage`,
      action: '/orders?unassigned=true'
    });
  }

  res.json({
    success: true,
    data: {
      overview: {
        total_orders: totalOrders,
        total_voyages: totalVoyages,
        active_voyages: activeVoyages,
        total_invoices: totalInvoices,
        unpaid_invoices: unpaidInvoices,
        overdue_invoices: overdueInvoices,
        orders_change: parseFloat(ordersChange)
      },
      revenue: {
        total_revenue: parseFloat(totalRevenue || 0),
        pending_revenue: parseFloat(pendingRevenue || 0),
        currency: 'USD' // Can be made dynamic based on company settings
      },
      recent_activity: {
        recent_orders: recentOrders,
        recent_invoices: recentInvoices,
        emails_sent_last_week: recentEmailsSent
      },
      charts: {
        orders_by_month: ordersByMonth.map(item => ({
          month: new Date(item.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
          count: parseInt(item.count)
        })),
        revenue_by_month: revenueByMonth.map(item => ({
          month: new Date(item.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
          revenue: parseFloat(item.revenue || 0)
        }))
      },
      alerts
    }
  });
});

module.exports = {
  getDashboardStats
};
