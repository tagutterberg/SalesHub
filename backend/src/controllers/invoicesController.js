const { Invoice, Order, Vessel, SalesOrderConfirmation, Voyage, CompanySettings } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getNextInvoiceNumber } = require('./companySettingsController');
const { generateInvoicePDF } = require('../services/pdfService');
const { deleteFile } = require('../middleware/upload');
const { Op } = require('sequelize');

/**
 * Get all Invoices
 * @route GET /api/invoices
 * @query page, limit, payment_status, customer, date_from, date_to
 */
const getAllInvoices = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    payment_status,
    customer,
    date_from,
    date_to,
    overdue_only
  } = req.query;

  const offset = (page - 1) * limit;
  const whereClause = {};

  if (payment_status) whereClause.payment_status = payment_status;

  if (overdue_only === 'true') {
    const today = new Date().toISOString().split('T')[0];
    whereClause.due_date = { [Op.lt]: today };
    whereClause.payment_status = { [Op.in]: ['unpaid', 'partially_paid'] };
  }

  if (date_from && date_to) {
    whereClause.issue_date = { [Op.between]: [date_from, date_to] };
  } else if (date_from) {
    whereClause.issue_date = { [Op.gte]: date_from };
  } else if (date_to) {
    whereClause.issue_date = { [Op.lte]: date_to };
  }

  const { count, rows } = await Invoice.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['created_at', 'DESC']],
    include: [
      {
        model: Order,
        as: 'order',
        ...(customer && {
          where: {
            customer_company: { [Op.iLike]: `%${customer}%` }
          }
        }),
        attributes: ['id', 'product', 'customer_company', 'delivery_date'],
        include: [
          {
            model: Vessel,
            as: 'vessel',
            attributes: ['id', 'name', 'imo_number']
          }
        ]
      },
      {
        model: SalesOrderConfirmation,
        as: 'sales_order_confirmation',
        attributes: ['id', 'soc_number', 'status']
      }
    ]
  });

  res.json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  });
});

/**
 * Get overdue invoices
 * @route GET /api/invoices/overdue
 */
const getOverdueInvoices = asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const invoices = await Invoice.findAll({
    where: {
      due_date: { [Op.lt]: today },
      payment_status: { [Op.in]: ['unpaid', 'partially_paid'] }
    },
    order: [['due_date', 'ASC']],
    include: [
      {
        model: Order,
        as: 'order',
        attributes: ['id', 'customer_company'],
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

  // Auto-update status to overdue
  const updatePromises = invoices.map(invoice => {
    if (invoice.payment_status !== 'overdue') {
      return invoice.update({ payment_status: 'overdue' });
    }
    return Promise.resolve();
  });

  await Promise.all(updatePromises);

  res.json({
    success: true,
    data: invoices,
    count: invoices.length
  });
});

/**
 * Get Invoice by ID
 * @route GET /api/invoices/:id
 */
const getInvoiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const invoice = await Invoice.findByPk(id, {
    include: [
      {
        model: Order,
        as: 'order',
        include: [
          {
            model: Vessel,
            as: 'vessel'
          },
          {
            model: Voyage,
            as: 'voyage',
            attributes: ['id', 'voyage_number']
          }
        ]
      },
      {
        model: SalesOrderConfirmation,
        as: 'sales_order_confirmation',
        attributes: ['id', 'soc_number']
      }
    ]
  });

  if (!invoice) {
    throw new ApiError('Invoice not found', 404);
  }

  res.json({
    success: true,
    data: invoice
  });
});

/**
 * Get Invoices by Order ID
 * @route GET /api/invoices/by-order/:orderId
 */
const getInvoicesByOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const invoices = await Invoice.findAll({
    where: { order_id: orderId },
    order: [['created_at', 'DESC']],
    include: [
      {
        model: SalesOrderConfirmation,
        as: 'sales_order_confirmation',
        attributes: ['id', 'soc_number']
      }
    ]
  });

  res.json({
    success: true,
    data: invoices
  });
});

/**
 * Create new Invoice with auto-calculation
 * @route POST /api/invoices
 */
const createInvoice = asyncHandler(async (req, res) => {
  const {
    order_id,
    soc_id,
    issue_date,
    due_date,
    tax_rate,
    discount_amount,
    notes,
    terms_conditions,
    created_by
  } = req.body;

  // Verify order exists and has delivery date
  const order = await Order.findByPk(order_id, {
    include: [
      {
        model: Vessel,
        as: 'vessel'
      },
      {
        model: Voyage,
        as: 'voyage'
      }
    ]
  });

  if (!order) {
    throw new ApiError('Order not found', 404);
  }

  if (!order.delivery_date) {
    throw new ApiError('Cannot generate invoice: Order must have a delivery date', 400);
  }

  // Check for duplicate invoice for this order (warning)
  const existingInvoices = await Invoice.findAll({
    where: { order_id }
  });

  if (existingInvoices.length > 0) {
    console.warn(`Warning: Order ${order_id} already has ${existingInvoices.length} invoice(s)`);
  }

  // Verify SOC if provided
  if (soc_id) {
    const soc = await SalesOrderConfirmation.findByPk(soc_id);
    if (!soc) {
      throw new ApiError('Sales Order Confirmation not found', 404);
    }
    if (soc.order_id !== order_id) {
      throw new ApiError('SOC does not belong to this order', 400);
    }
  }

  // Get company settings for default tax rate
  const companySettings = await CompanySettings.findOne();
  const defaultTaxRate = companySettings ? companySettings.tax_rate : 0;

  // Auto-calculate invoice amounts
  const quantity = order.price_unit === 'MT' ? order.quantity_mt : order.quantity_cbm;
  const subtotal = parseFloat((quantity * order.unit_price).toFixed(2));
  const taxRateToUse = tax_rate !== undefined ? tax_rate : defaultTaxRate;
  const taxAmount = parseFloat((subtotal * (taxRateToUse / 100)).toFixed(2));
  const discountAmt = discount_amount || 0;
  const totalAmount = parseFloat((subtotal + taxAmount - discountAmt).toFixed(2));

  // Generate next invoice number
  const invoiceNumber = await getNextInvoiceNumber();

  // Calculate due date if not provided (default: 30 days from issue date)
  const issueDateObj = issue_date ? new Date(issue_date) : new Date();
  const dueDateObj = due_date ? new Date(due_date) : new Date(issueDateObj);
  if (!due_date) {
    dueDateObj.setDate(dueDateObj.getDate() + 30);
  }

  // Create invoice
  const invoice = await Invoice.create({
    invoice_number: invoiceNumber,
    order_id,
    soc_id: soc_id || null,
    issue_date: issueDateObj.toISOString().split('T')[0],
    due_date: dueDateObj.toISOString().split('T')[0],
    subtotal,
    tax_amount: taxAmount,
    tax_rate: taxRateToUse,
    discount_amount: discountAmt,
    total_amount: totalAmount,
    currency: order.currency,
    payment_status: 'unpaid',
    notes,
    terms_conditions: terms_conditions || (companySettings ? companySettings.payment_terms : null),
    created_by
  });

  // Fetch with relationships
  const invoiceWithDetails = await Invoice.findByPk(invoice.id, {
    include: [
      {
        model: Order,
        as: 'order',
        include: [
          {
            model: Vessel,
            as: 'vessel'
          }
        ]
      },
      {
        model: SalesOrderConfirmation,
        as: 'sales_order_confirmation',
        attributes: ['id', 'soc_number']
      }
    ]
  });

  res.status(201).json({
    success: true,
    message: 'Invoice created successfully',
    data: invoiceWithDetails,
    calculation: {
      subtotal,
      tax_rate: taxRateToUse,
      tax_amount: taxAmount,
      discount_amount: discountAmt,
      total_amount: totalAmount
    }
  });
});

/**
 * Create batch invoices
 * @route POST /api/invoices/batch
 */
const createBatchInvoices = asyncHandler(async (req, res) => {
  const { order_ids, tax_rate, due_days, created_by } = req.body;

  if (!Array.isArray(order_ids) || order_ids.length === 0) {
    throw new ApiError('order_ids must be a non-empty array', 400);
  }

  const results = [];
  const errors = [];

  for (const order_id of order_ids) {
    try {
      const order = await Order.findByPk(order_id);
      if (!order || !order.delivery_date) {
        errors.push({ order_id, error: 'Order not found or missing delivery date' });
        continue;
      }

      // Calculate amounts
      const quantity = order.price_unit === 'MT' ? order.quantity_mt : order.quantity_cbm;
      const subtotal = parseFloat((quantity * order.unit_price).toFixed(2));
      const taxAmount = parseFloat((subtotal * ((tax_rate || 0) / 100)).toFixed(2));
      const totalAmount = parseFloat((subtotal + taxAmount).toFixed(2));

      const invoiceNumber = await getNextInvoiceNumber();
      const issueDate = new Date();
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + (due_days || 30));

      const invoice = await Invoice.create({
        invoice_number: invoiceNumber,
        order_id,
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        subtotal,
        tax_amount: taxAmount,
        tax_rate: tax_rate || 0,
        discount_amount: 0,
        total_amount: totalAmount,
        currency: order.currency,
        payment_status: 'unpaid',
        created_by
      });

      results.push(invoice);
    } catch (error) {
      errors.push({ order_id, error: error.message });
    }
  }

  res.status(201).json({
    success: true,
    message: `Created ${results.length} invoices`,
    data: results,
    errors: errors.length > 0 ? errors : undefined
  });
});

/**
 * Update Invoice
 * @route PUT /api/invoices/:id
 */
const updateInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    due_date,
    tax_rate,
    discount_amount,
    notes,
    terms_conditions
  } = req.body;

  const invoice = await Invoice.findByPk(id, {
    include: [
      {
        model: Order,
        as: 'order'
      }
    ]
  });

  if (!invoice) {
    throw new ApiError('Invoice not found', 404);
  }

  // Prevent editing if paid
  if (invoice.payment_status === 'paid') {
    throw new ApiError('Cannot edit paid invoice', 403);
  }

  // Recalculate if tax_rate or discount_amount changed
  let updateData = { due_date, notes, terms_conditions };

  if (tax_rate !== undefined || discount_amount !== undefined) {
    const newTaxRate = tax_rate !== undefined ? tax_rate : invoice.tax_rate;
    const newDiscount = discount_amount !== undefined ? discount_amount : invoice.discount_amount;

    const taxAmount = parseFloat((invoice.subtotal * (newTaxRate / 100)).toFixed(2));
    const totalAmount = parseFloat((invoice.subtotal + taxAmount - newDiscount).toFixed(2));

    updateData = {
      ...updateData,
      tax_rate: newTaxRate,
      tax_amount: taxAmount,
      discount_amount: newDiscount,
      total_amount: totalAmount
    };
  }

  await invoice.update(updateData);

  // Fetch with relationships
  const updatedInvoice = await Invoice.findByPk(id, {
    include: [
      {
        model: Order,
        as: 'order',
        include: [
          {
            model: Vessel,
            as: 'vessel'
          }
        ]
      }
    ]
  });

  res.json({
    success: true,
    message: 'Invoice updated successfully',
    data: updatedInvoice
  });
});

/**
 * Update payment status
 * @route PUT /api/invoices/:id/payment-status
 */
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { payment_status, payment_date } = req.body;

  if (!['unpaid', 'partially_paid', 'paid', 'overdue'].includes(payment_status)) {
    throw new ApiError('Invalid payment status', 400);
  }

  const invoice = await Invoice.findByPk(id);

  if (!invoice) {
    throw new ApiError('Invoice not found', 404);
  }

  const updateData = { payment_status };

  // Require payment date when marking as paid
  if (payment_status === 'paid') {
    if (!payment_date && !invoice.payment_date) {
      throw new ApiError('Payment date is required when marking invoice as paid', 400);
    }
    updateData.payment_date = payment_date || invoice.payment_date;
  }

  await invoice.update(updateData);

  res.json({
    success: true,
    message: `Invoice payment status updated to: ${payment_status}`,
    data: invoice
  });
});

/**
 * Record payment
 * @route POST /api/invoices/:id/record-payment
 */
const recordPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { payment_date, amount_paid, notes } = req.body;

  const invoice = await Invoice.findByPk(id);

  if (!invoice) {
    throw new ApiError('Invoice not found', 404);
  }

  if (invoice.payment_status === 'paid') {
    throw new ApiError('Invoice is already marked as paid', 400);
  }

  const updateData = {
    payment_date: payment_date || new Date().toISOString().split('T')[0]
  };

  // Determine payment status based on amount
  if (amount_paid) {
    if (amount_paid >= invoice.total_amount) {
      updateData.payment_status = 'paid';
    } else if (amount_paid > 0) {
      updateData.payment_status = 'partially_paid';
    }
  } else {
    updateData.payment_status = 'paid';
  }

  if (notes) {
    updateData.notes = invoice.notes ? `${invoice.notes}\n\nPayment: ${notes}` : `Payment: ${notes}`;
  }

  await invoice.update(updateData);

  res.json({
    success: true,
    message: 'Payment recorded successfully',
    data: invoice
  });
});

/**
 * Generate PDF for Invoice
 * @route POST /api/invoices/:id/generate-pdf
 */
const generateInvoicePDFDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { template_id } = req.body;

  const invoice = await Invoice.findByPk(id, {
    include: [
      {
        model: Order,
        as: 'order',
        include: [
          {
            model: Vessel,
            as: 'vessel'
          },
          {
            model: Voyage,
            as: 'voyage'
          }
        ]
      },
      {
        model: SalesOrderConfirmation,
        as: 'sales_order_confirmation'
      }
    ]
  });

  if (!invoice) {
    throw new ApiError('Invoice not found', 404);
  }

  // Delete old PDF if exists
  if (invoice.pdf_path) {
    deleteFile(`.${invoice.pdf_path}`);
  }

  // Prepare data for PDF generation
  const pdfData = {
    invoice_number: invoice.invoice_number,
    issue_date: invoice.issue_date,
    due_date: invoice.due_date,
    payment_status: invoice.payment_status,
    payment_date: invoice.payment_date,
    subtotal: invoice.subtotal,
    tax_rate: invoice.tax_rate,
    tax_amount: invoice.tax_amount,
    discount_amount: invoice.discount_amount,
    total_amount: invoice.total_amount,
    currency: invoice.currency,
    notes: invoice.notes,
    terms_conditions: invoice.terms_conditions,
    soc_number: invoice.sales_order_confirmation?.soc_number,
    voyage_number: invoice.order.voyage?.voyage_number,
    order: invoice.order,
    vessel: invoice.order.vessel
  };

  // Generate PDF
  const pdfPath = await generateInvoicePDF(pdfData, template_id);

  // Update invoice with PDF path
  await invoice.update({ pdf_path: pdfPath });

  res.json({
    success: true,
    message: 'PDF generated successfully',
    data: {
      pdf_path: pdfPath,
      invoice_number: invoice.invoice_number
    }
  });
});

/**
 * Download Invoice PDF
 * @route GET /api/invoices/:id/download
 */
const downloadInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const invoice = await Invoice.findByPk(id);

  if (!invoice) {
    throw new ApiError('Invoice not found', 404);
  }

  if (!invoice.pdf_path) {
    throw new ApiError('PDF not generated yet. Please generate PDF first.', 404);
  }

  const path = require('path');
  const filePath = path.join(__dirname, '../..', invoice.pdf_path);

  res.download(filePath, `Invoice-${invoice.invoice_number}.pdf`, (err) => {
    if (err) {
      throw new ApiError('Error downloading PDF', 500);
    }
  });
});

/**
 * Send Invoice via email
 * @route POST /api/invoices/:id/send-email
 */
const sendInvoiceEmail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { recipient_email, recipient_name, subject, body, template_id } = req.body;

  const invoice = await Invoice.findByPk(id, {
    include: [
      {
        model: Order,
        as: 'order',
        include: [
          {
            model: Vessel,
            as: 'vessel'
          }
        ]
      }
    ]
  });

  if (!invoice) {
    throw new ApiError('Invoice not found', 404);
  }

  // Generate PDF if not exists
  if (!invoice.pdf_path) {
    const pdfData = {
      invoice_number: invoice.invoice_number,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      payment_status: invoice.payment_status,
      subtotal: invoice.subtotal,
      tax_rate: invoice.tax_rate,
      tax_amount: invoice.tax_amount,
      discount_amount: invoice.discount_amount,
      total_amount: invoice.total_amount,
      currency: invoice.currency,
      notes: invoice.notes,
      terms_conditions: invoice.terms_conditions,
      order: invoice.order,
      vessel: invoice.order.vessel
    };
    const pdfPath = await generateInvoicePDF(pdfData, template_id);
    await invoice.update({ pdf_path: pdfPath });
  }

  // Import email service
  const { sendEmail } = require('../services/emailService');

  // Send email
  const emailResult = await sendEmail({
    to: recipient_email,
    recipient_name: recipient_name || invoice.order.customer_company,
    subject: subject || `Invoice ${invoice.invoice_number} - ${invoice.order.vessel.name}`,
    body: body || `Please find attached Invoice ${invoice.invoice_number} for ${invoice.currency} ${invoice.total_amount}. Due date: ${invoice.due_date}`,
    email_type: 'invoice',
    related_document_type: 'invoice',
    related_document_id: invoice.id,
    attachments: [
      {
        filename: `Invoice-${invoice.invoice_number}.pdf`,
        path: `.${invoice.pdf_path}`
      }
    ]
  });

  res.json({
    success: true,
    message: 'Email sent successfully',
    data: {
      email_id: emailResult.email_id,
      invoice_number: invoice.invoice_number
    }
  });
});

/**
 * Get invoice statistics
 * @route GET /api/invoices/stats
 */
const getInvoiceStats = asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const [total, unpaid, paid, overdue, totalRevenue, pendingRevenue] = await Promise.all([
    Invoice.count(),
    Invoice.count({ where: { payment_status: 'unpaid' } }),
    Invoice.count({ where: { payment_status: 'paid' } }),
    Invoice.count({
      where: {
        due_date: { [Op.lt]: today },
        payment_status: { [Op.in]: ['unpaid', 'partially_paid'] }
      }
    }),
    Invoice.sum('total_amount', { where: { payment_status: 'paid' } }),
    Invoice.sum('total_amount', { where: { payment_status: { [Op.in]: ['unpaid', 'partially_paid', 'overdue'] } } })
  ]);

  res.json({
    success: true,
    data: {
      total_invoices: total,
      unpaid: unpaid,
      paid: paid,
      overdue: overdue,
      partially_paid: total - unpaid - paid - overdue,
      total_revenue: totalRevenue || 0,
      pending_revenue: pendingRevenue || 0
    }
  });
});

/**
 * Delete Invoice
 * @route DELETE /api/invoices/:id
 */
const deleteInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const invoice = await Invoice.findByPk(id);

  if (!invoice) {
    throw new ApiError('Invoice not found', 404);
  }

  // Prevent deletion if paid
  if (invoice.payment_status === 'paid') {
    throw new ApiError('Cannot delete paid invoice', 409);
  }

  // Delete PDF file if exists
  if (invoice.pdf_path) {
    deleteFile(`.${invoice.pdf_path}`);
  }

  await invoice.destroy();

  res.json({
    success: true,
    message: 'Invoice deleted successfully'
  });
});

module.exports = {
  getAllInvoices,
  getOverdueInvoices,
  getInvoiceById,
  getInvoicesByOrder,
  createInvoice,
  createBatchInvoices,
  updateInvoice,
  updatePaymentStatus,
  recordPayment,
  generateInvoicePDFDocument,
  downloadInvoice,
  sendInvoiceEmail,
  getInvoiceStats,
  deleteInvoice
};
