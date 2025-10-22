const { Order, Invoice, Voyage, Vessel, Tanker, sequelize } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const XLSX = require('xlsx');

/**
 * Get Orders Report
 * @route GET /api/reports/orders
 * @query date_from, date_to, vessel_id, voyage_id, customer, status
 */
const getOrdersReport = asyncHandler(async (req, res) => {
  const {
    date_from,
    date_to,
    vessel_id,
    voyage_id,
    customer,
    locked
  } = req.query;

  const whereClause = {};

  if (vessel_id) whereClause.vessel_id = vessel_id;
  if (voyage_id) whereClause.voyage_id = voyage_id;
  if (customer) whereClause.customer_company = { [Op.iLike]: `%${customer}%` };
  if (locked !== undefined) whereClause.is_locked = locked === 'true';

  if (date_from && date_to) {
    whereClause.delivery_date = { [Op.between]: [date_from, date_to] };
  } else if (date_from) {
    whereClause.delivery_date = { [Op.gte]: date_from };
  } else if (date_to) {
    whereClause.delivery_date = { [Op.lte]: date_to };
  }

  const orders = await Order.findAll({
    where: whereClause,
    order: [['delivery_date', 'DESC']],
    include: [
      {
        model: Vessel,
        as: 'vessel',
        attributes: ['id', 'name', 'imo_number', 'owner']
      },
      {
        model: Voyage,
        as: 'voyage',
        attributes: ['id', 'voyage_number', 'status'],
        include: [
          {
            model: Tanker,
            as: 'tanker',
            attributes: ['id', 'name']
          }
        ]
      }
    ]
  });

  // Calculate summary
  const summary = {
    total_orders: orders.length,
    total_quantity_mt: orders.reduce((sum, order) => sum + (parseFloat(order.quantity_mt) || 0), 0),
    total_quantity_cbm: orders.reduce((sum, order) => sum + (parseFloat(order.quantity_cbm) || 0), 0),
    total_value: orders.reduce((sum, order) => {
      const qty = order.price_unit === 'MT' ? order.quantity_mt : order.quantity_cbm;
      return sum + (qty * order.unit_price);
    }, 0),
    locked_orders: orders.filter(o => o.is_locked).length,
    unassigned_orders: orders.filter(o => !o.voyage_id).length
  };

  res.json({
    success: true,
    data: orders,
    summary
  });
});

/**
 * Get Invoices Report
 * @route GET /api/reports/invoices
 * @query date_from, date_to, payment_status, customer
 */
const getInvoicesReport = asyncHandler(async (req, res) => {
  const {
    date_from,
    date_to,
    payment_status,
    customer
  } = req.query;

  const whereClause = {};

  if (payment_status) whereClause.payment_status = payment_status;

  if (date_from && date_to) {
    whereClause.issue_date = { [Op.between]: [date_from, date_to] };
  } else if (date_from) {
    whereClause.issue_date = { [Op.gte]: date_from };
  } else if (date_to) {
    whereClause.issue_date = { [Op.lte]: date_to };
  }

  const invoices = await Invoice.findAll({
    where: whereClause,
    order: [['issue_date', 'DESC']],
    include: [
      {
        model: Order,
        as: 'order',
        ...(customer && {
          where: {
            customer_company: { [Op.iLike]: `%${customer}%` }
          }
        }),
        include: [
          {
            model: Vessel,
            as: 'vessel',
            attributes: ['id', 'name', 'imo_number']
          }
        ]
      }
    ]
  });

  // Calculate summary by payment status
  const summary = {
    total_invoices: invoices.length,
    total_amount: invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0),
    paid_amount: invoices
      .filter(inv => inv.payment_status === 'paid')
      .reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0),
    unpaid_amount: invoices
      .filter(inv => inv.payment_status !== 'paid')
      .reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0),
    by_status: {
      paid: invoices.filter(inv => inv.payment_status === 'paid').length,
      unpaid: invoices.filter(inv => inv.payment_status === 'unpaid').length,
      partially_paid: invoices.filter(inv => inv.payment_status === 'partially_paid').length,
      overdue: invoices.filter(inv => inv.payment_status === 'overdue').length
    }
  };

  res.json({
    success: true,
    data: invoices,
    summary
  });
});

/**
 * Get Voyages Report
 * @route GET /api/reports/voyages
 * @query date_from, date_to, status, tanker_id
 */
const getVoyagesReport = asyncHandler(async (req, res) => {
  const {
    date_from,
    date_to,
    status,
    tanker_id
  } = req.query;

  const whereClause = {};

  if (status) whereClause.status = status;
  if (tanker_id) whereClause.tanker_id = tanker_id;

  if (date_from && date_to) {
    whereClause.created_at = { [Op.between]: [date_from, date_to] };
  } else if (date_from) {
    whereClause.created_at = { [Op.gte]: date_from };
  } else if (date_to) {
    whereClause.created_at = { [Op.lte]: date_to };
  }

  const voyages = await Voyage.findAll({
    where: whereClause,
    order: [['voyage_number', 'DESC']],
    include: [
      {
        model: Tanker,
        as: 'tanker',
        attributes: ['id', 'name', 'imo_number']
      },
      {
        model: Order,
        as: 'orders',
        attributes: ['id', 'product', 'quantity_mt', 'quantity_cbm', 'unit_price', 'price_unit', 'currency']
      }
    ]
  });

  // Calculate summary
  const summary = {
    total_voyages: voyages.length,
    active_voyages: voyages.filter(v => v.status === 'active').length,
    completed_voyages: voyages.filter(v => v.status === 'completed').length,
    total_orders: voyages.reduce((sum, v) => sum + (v.orders?.length || 0), 0),
    total_revenue: voyages.reduce((sum, v) => {
      return sum + (v.orders || []).reduce((orderSum, order) => {
        const qty = order.price_unit === 'MT' ? order.quantity_mt : order.quantity_cbm;
        return orderSum + (qty * order.unit_price);
      }, 0);
    }, 0)
  };

  res.json({
    success: true,
    data: voyages,
    summary
  });
});

/**
 * Get Revenue Report
 * @route GET /api/reports/revenue
 * @query date_from, date_to, group_by (month/quarter/year)
 */
const getRevenueReport = asyncHandler(async (req, res) => {
  const {
    date_from,
    date_to,
    group_by = 'month'
  } = req.query;

  const whereClause = {
    payment_status: 'paid'
  };

  if (date_from && date_to) {
    whereClause.issue_date = { [Op.between]: [date_from, date_to] };
  } else if (date_from) {
    whereClause.issue_date = { [Op.gte]: date_from };
  } else if (date_to) {
    whereClause.issue_date = { [Op.lte]: date_to };
  } else {
    // Default to last 12 months
    const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    whereClause.issue_date = { [Op.gte]: twelveMonthsAgo };
  }

  // Determine date truncation based on group_by
  let dateTrunc = 'month';
  if (group_by === 'quarter') dateTrunc = 'quarter';
  else if (group_by === 'year') dateTrunc = 'year';

  const revenueData = await Invoice.findAll({
    attributes: [
      [sequelize.fn('DATE_TRUNC', dateTrunc, sequelize.col('issue_date')), 'period'],
      [sequelize.fn('SUM', sequelize.col('total_amount')), 'revenue'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'invoice_count'],
      'currency'
    ],
    where: whereClause,
    group: ['period', 'currency'],
    order: [[sequelize.literal('period'), 'ASC']],
    raw: true
  });

  // Get total revenue
  const totalRevenue = await Invoice.sum('total_amount', { where: whereClause });

  // Get average invoice value
  const invoiceCount = await Invoice.count({ where: whereClause });
  const averageInvoiceValue = invoiceCount > 0 ? totalRevenue / invoiceCount : 0;

  res.json({
    success: true,
    data: {
      revenue_by_period: revenueData.map(item => ({
        period: new Date(item.period).toLocaleDateString('en-US', {
          year: 'numeric',
          month: group_by !== 'year' ? 'short' : undefined,
          quarter: group_by === 'quarter' ? 'numeric' : undefined
        }),
        revenue: parseFloat(item.revenue || 0),
        invoice_count: parseInt(item.invoice_count),
        currency: item.currency
      })),
      summary: {
        total_revenue: parseFloat(totalRevenue || 0),
        total_invoices: invoiceCount,
        average_invoice_value: parseFloat(averageInvoiceValue.toFixed(2))
      }
    }
  });
});

/**
 * Export Report to Excel
 * @route POST /api/reports/export
 * @body report_type, filters, data
 */
const exportReport = asyncHandler(async (req, res) => {
  const { report_type, data, filename } = req.body;

  if (!report_type || !data) {
    throw new ApiError('report_type and data are required', 400);
  }

  let worksheetData = [];
  let worksheetName = 'Report';

  switch (report_type) {
    case 'orders':
      worksheetName = 'Orders Report';
      worksheetData = data.map(order => ({
        'Order ID': order.id,
        'Vessel': order.vessel?.name || '',
        'IMO': order.vessel?.imo_number || '',
        'Customer': order.customer_company,
        'Product': order.product,
        'Quantity MT': order.quantity_mt || '',
        'Quantity CBM': order.quantity_cbm || '',
        'Unit Price': order.unit_price,
        'Currency': order.currency,
        'Delivery Date': order.delivery_date,
        'Voyage': order.voyage?.voyage_number || 'Unassigned',
        'Locked': order.is_locked ? 'Yes' : 'No'
      }));
      break;

    case 'invoices':
      worksheetName = 'Invoices Report';
      worksheetData = data.map(invoice => ({
        'Invoice Number': invoice.invoice_number,
        'Customer': invoice.order?.customer_company || '',
        'Vessel': invoice.order?.vessel?.name || '',
        'Issue Date': invoice.issue_date,
        'Due Date': invoice.due_date,
        'Subtotal': invoice.subtotal,
        'Tax': invoice.tax_amount,
        'Total': invoice.total_amount,
        'Currency': invoice.currency,
        'Payment Status': invoice.payment_status,
        'Payment Date': invoice.payment_date || ''
      }));
      break;

    case 'voyages':
      worksheetName = 'Voyages Report';
      worksheetData = data.map(voyage => ({
        'Voyage Number': voyage.voyage_number,
        'Tanker': voyage.tanker?.name || '',
        'Status': voyage.status,
        'Cargoes': voyage.cargoes || '',
        'Purchase Price': voyage.purchase_price || '',
        'Purchase Unit': voyage.purchase_unit || '',
        'Total Orders': voyage.orders?.length || 0,
        'Created Date': new Date(voyage.created_at).toLocaleDateString()
      }));
      break;

    case 'revenue':
      worksheetName = 'Revenue Report';
      worksheetData = data.revenue_by_period || [];
      break;

    default:
      throw new ApiError('Invalid report_type', 400);
  }

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, worksheetName);

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  // Set headers for file download
  const exportFilename = filename || `${report_type}_report_${new Date().toISOString().split('T')[0]}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${exportFilename}"`);
  res.send(buffer);
});

module.exports = {
  getOrdersReport,
  getInvoicesReport,
  getVoyagesReport,
  getRevenueReport,
  exportReport
};
