const { SalesOrderConfirmation, Order, Vessel, Voyage, Tanker } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getNextSOCNumber } = require('./companySettingsController');
const { generateSOCPDF } = require('../services/pdfService');
const { deleteFile } = require('../middleware/upload');
const { Op } = require('sequelize');

/**
 * Get all Sales Order Confirmations
 * @route GET /api/sales-order-confirmations
 * @query page, limit, status, order_id
 */
const getAllSOCs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, order_id } = req.query;
  const offset = (page - 1) * limit;

  const whereClause = {};
  if (status) whereClause.status = status;
  if (order_id) whereClause.order_id = order_id;

  const { count, rows } = await SalesOrderConfirmation.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['created_at', 'DESC']],
    include: [
      {
        model: Order,
        as: 'order',
        attributes: ['id', 'product', 'quantity_mt', 'quantity_cbm', 'delivery_date', 'customer_company'],
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
 * Get Sales Order Confirmation by ID
 * @route GET /api/sales-order-confirmations/:id
 */
const getSOCById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const soc = await SalesOrderConfirmation.findByPk(id, {
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
            include: [
              {
                model: Tanker,
                as: 'tanker'
              }
            ]
          }
        ]
      }
    ]
  });

  if (!soc) {
    throw new ApiError('Sales Order Confirmation not found', 404);
  }

  res.json({
    success: true,
    data: soc
  });
});

/**
 * Get SOCs by Order ID
 * @route GET /api/sales-order-confirmations/by-order/:orderId
 */
const getSOCsByOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const socs = await SalesOrderConfirmation.findAll({
    where: { order_id: orderId },
    order: [['created_at', 'DESC']]
  });

  res.json({
    success: true,
    data: socs
  });
});

/**
 * Create new Sales Order Confirmation
 * @route POST /api/sales-order-confirmations
 */
const createSOC = asyncHandler(async (req, res) => {
  const {
    order_id,
    issue_date,
    confirmation_date,
    notes,
    terms_conditions,
    status,
    created_by
  } = req.body;

  // Verify order exists and has complete information
  const order = await Order.findByPk(order_id, {
    include: [
      {
        model: Vessel,
        as: 'vessel'
      }
    ]
  });

  if (!order) {
    throw new ApiError('Order not found', 404);
  }

  // Validate order has all required fields
  if (!order.product || !order.delivery_date || !order.unit_price) {
    throw new ApiError('Cannot generate SOC: Order is incomplete. Required fields: product, delivery_date, unit_price', 400);
  }

  if (!order.quantity_mt && !order.quantity_cbm) {
    throw new ApiError('Cannot generate SOC: Order must have at least one quantity (MT or CBM)', 400);
  }

  // Generate next SOC number
  const socNumber = await getNextSOCNumber();

  // Create SOC
  const soc = await SalesOrderConfirmation.create({
    soc_number: socNumber,
    order_id,
    issue_date: issue_date || new Date().toISOString().split('T')[0],
    confirmation_date,
    notes,
    terms_conditions,
    status: status || 'draft',
    created_by
  });

  // Fetch with relationships
  const socWithDetails = await SalesOrderConfirmation.findByPk(soc.id, {
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

  res.status(201).json({
    success: true,
    message: 'Sales Order Confirmation created successfully',
    data: socWithDetails
  });
});

/**
 * Update Sales Order Confirmation
 * @route PUT /api/sales-order-confirmations/:id
 */
const updateSOC = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    confirmation_date,
    notes,
    terms_conditions,
    status
  } = req.body;

  const soc = await SalesOrderConfirmation.findByPk(id);

  if (!soc) {
    throw new ApiError('Sales Order Confirmation not found', 404);
  }

  // Prevent editing if already confirmed or cancelled
  if (soc.status === 'confirmed' || soc.status === 'cancelled') {
    throw new ApiError(`Cannot edit SOC with status: ${soc.status}`, 403);
  }

  await soc.update({
    confirmation_date,
    notes,
    terms_conditions,
    status
  });

  // Fetch with relationships
  const updatedSOC = await SalesOrderConfirmation.findByPk(id, {
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
    message: 'Sales Order Confirmation updated successfully',
    data: updatedSOC
  });
});

/**
 * Update SOC status
 * @route PUT /api/sales-order-confirmations/:id/status
 */
const updateSOCStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['draft', 'sent', 'confirmed', 'cancelled'].includes(status)) {
    throw new ApiError('Invalid status. Must be: draft, sent, confirmed, or cancelled', 400);
  }

  const soc = await SalesOrderConfirmation.findByPk(id);

  if (!soc) {
    throw new ApiError('Sales Order Confirmation not found', 404);
  }

  await soc.update({ status });

  res.json({
    success: true,
    message: `SOC status updated to: ${status}`,
    data: soc
  });
});

/**
 * Generate PDF for SOC
 * @route POST /api/sales-order-confirmations/:id/generate-pdf
 */
const generateSOCPDFDocument = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { template_id } = req.body;

  const soc = await SalesOrderConfirmation.findByPk(id, {
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
            include: [
              {
                model: Tanker,
                as: 'tanker'
              }
            ]
          }
        ]
      }
    ]
  });

  if (!soc) {
    throw new ApiError('Sales Order Confirmation not found', 404);
  }

  // Delete old PDF if exists
  if (soc.pdf_path) {
    deleteFile(`.${soc.pdf_path}`);
  }

  // Prepare data for PDF generation
  const pdfData = {
    soc_number: soc.soc_number,
    issue_date: soc.issue_date,
    confirmation_date: soc.confirmation_date,
    notes: soc.notes,
    terms_conditions: soc.terms_conditions,
    order: soc.order,
    vessel: soc.order.vessel,
    voyage: soc.order.voyage
  };

  // Generate PDF
  const pdfPath = await generateSOCPDF(pdfData, template_id);

  // Update SOC with PDF path
  await soc.update({ pdf_path: pdfPath });

  res.json({
    success: true,
    message: 'PDF generated successfully',
    data: {
      pdf_path: pdfPath,
      soc_number: soc.soc_number
    }
  });
});

/**
 * Download SOC PDF
 * @route GET /api/sales-order-confirmations/:id/download
 */
const downloadSOC = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const soc = await SalesOrderConfirmation.findByPk(id);

  if (!soc) {
    throw new ApiError('Sales Order Confirmation not found', 404);
  }

  if (!soc.pdf_path) {
    throw new ApiError('PDF not generated yet. Please generate PDF first.', 404);
  }

  const path = require('path');
  const filePath = path.join(__dirname, '../..', soc.pdf_path);

  res.download(filePath, `SOC-${soc.soc_number}.pdf`, (err) => {
    if (err) {
      throw new ApiError('Error downloading PDF', 500);
    }
  });
});

/**
 * Send SOC via email
 * @route POST /api/sales-order-confirmations/:id/send-email
 */
const sendSOCEmail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { recipient_email, recipient_name, subject, body, template_id } = req.body;

  const soc = await SalesOrderConfirmation.findByPk(id, {
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

  if (!soc) {
    throw new ApiError('Sales Order Confirmation not found', 404);
  }

  // Generate PDF if not exists
  if (!soc.pdf_path) {
    const pdfData = {
      soc_number: soc.soc_number,
      issue_date: soc.issue_date,
      confirmation_date: soc.confirmation_date,
      notes: soc.notes,
      terms_conditions: soc.terms_conditions,
      order: soc.order,
      vessel: soc.order.vessel
    };
    const pdfPath = await generateSOCPDF(pdfData, template_id);
    await soc.update({ pdf_path: pdfPath });
  }

  // Import email service
  const { sendEmail } = require('../services/emailService');

  // Send email
  const emailResult = await sendEmail({
    to: recipient_email,
    recipient_name: recipient_name || soc.order.customer_company,
    subject: subject || `Sales Order Confirmation ${soc.soc_number}`,
    body: body || `Please find attached Sales Order Confirmation ${soc.soc_number} for ${soc.order.vessel.name}.`,
    email_type: 'sales_order_confirmation',
    related_document_type: 'soc',
    related_document_id: soc.id,
    attachments: [
      {
        filename: `SOC-${soc.soc_number}.pdf`,
        path: `.${soc.pdf_path}`
      }
    ]
  });

  // Update status to sent if successful
  if (emailResult.success) {
    await soc.update({ status: 'sent' });
  }

  res.json({
    success: true,
    message: 'Email sent successfully',
    data: {
      email_id: emailResult.email_id,
      soc_number: soc.soc_number
    }
  });
});

/**
 * Delete Sales Order Confirmation
 * @route DELETE /api/sales-order-confirmations/:id
 */
const deleteSOC = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const soc = await SalesOrderConfirmation.findByPk(id);

  if (!soc) {
    throw new ApiError('Sales Order Confirmation not found', 404);
  }

  // Prevent deletion if confirmed
  if (soc.status === 'confirmed') {
    throw new ApiError('Cannot delete confirmed Sales Order Confirmation', 409);
  }

  // Delete PDF file if exists
  if (soc.pdf_path) {
    deleteFile(`.${soc.pdf_path}`);
  }

  await soc.destroy();

  res.json({
    success: true,
    message: 'Sales Order Confirmation deleted successfully'
  });
});

module.exports = {
  getAllSOCs,
  getSOCById,
  getSOCsByOrder,
  createSOC,
  updateSOC,
  updateSOCStatus,
  generateSOCPDFDocument,
  downloadSOC,
  sendSOCEmail,
  deleteSOC
};
