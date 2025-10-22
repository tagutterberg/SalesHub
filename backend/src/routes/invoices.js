const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/invoicesController');
const { validateInvoice, validateId } = require('../middleware/validation');
const { body } = require('express-validator');

/**
 * @route   GET /api/invoices/overdue
 * @desc    Get all overdue invoices
 * @access  Public
 */
router.get('/overdue', getOverdueInvoices);

/**
 * @route   GET /api/invoices/stats
 * @desc    Get invoice statistics
 * @access  Public
 */
router.get('/stats', getInvoiceStats);

/**
 * @route   GET /api/invoices/by-order/:orderId
 * @desc    Get all invoices for a specific order
 * @access  Public
 */
router.get('/by-order/:orderId', validateId, getInvoicesByOrder);

/**
 * @route   GET /api/invoices
 * @desc    Get all invoices with filters
 * @access  Public
 */
router.get('/', getAllInvoices);

/**
 * @route   GET /api/invoices/:id
 * @desc    Get invoice by ID with relationships
 * @access  Public
 */
router.get('/:id', validateId, getInvoiceById);

/**
 * @route   GET /api/invoices/:id/download
 * @desc    Download invoice PDF
 * @access  Public
 */
router.get('/:id/download', validateId, downloadInvoice);

/**
 * @route   POST /api/invoices
 * @desc    Create new invoice with auto-calculation
 * @access  Public
 */
router.post('/', validateInvoice, createInvoice);

/**
 * @route   POST /api/invoices/batch
 * @desc    Create batch invoices
 * @access  Public
 */
router.post(
  '/batch',
  body('order_ids').isArray({ min: 1 }).withMessage('order_ids must be a non-empty array'),
  body('tax_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('due_days').optional().isInt({ min: 1 }).withMessage('Due days must be a positive integer'),
  createBatchInvoices
);

/**
 * @route   POST /api/invoices/:id/generate-pdf
 * @desc    Generate PDF for invoice
 * @access  Public
 */
router.post(
  '/:id/generate-pdf',
  validateId,
  body('template_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Template ID must be a positive integer'),
  generateInvoicePDFDocument
);

/**
 * @route   POST /api/invoices/:id/send-email
 * @desc    Send invoice via email
 * @access  Public
 */
router.post(
  '/:id/send-email',
  validateId,
  body('recipient_email').notEmpty().withMessage('Recipient email is required').isEmail().withMessage('Must be a valid email'),
  body('recipient_name').optional().trim(),
  body('subject').optional().trim(),
  body('body').optional().trim(),
  body('template_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Template ID must be a positive integer'),
  sendInvoiceEmail
);

/**
 * @route   POST /api/invoices/:id/record-payment
 * @desc    Record payment for invoice
 * @access  Public
 */
router.post(
  '/:id/record-payment',
  validateId,
  body('payment_date').optional().isISO8601().withMessage('Payment date must be a valid date'),
  body('amount_paid').optional().isFloat({ min: 0 }).withMessage('Amount paid must be positive'),
  body('notes').optional().trim(),
  recordPayment
);

/**
 * @route   PUT /api/invoices/:id
 * @desc    Update invoice
 * @access  Public
 */
router.put('/:id', validateId, updateInvoice);

/**
 * @route   PUT /api/invoices/:id/payment-status
 * @desc    Update payment status
 * @access  Public
 */
router.put(
  '/:id/payment-status',
  validateId,
  body('payment_status').notEmpty().withMessage('Payment status is required')
    .isIn(['unpaid', 'partially_paid', 'paid', 'overdue']).withMessage('Invalid payment status'),
  body('payment_date').optional().isISO8601().withMessage('Payment date must be a valid date'),
  updatePaymentStatus
);

/**
 * @route   DELETE /api/invoices/:id
 * @desc    Delete invoice
 * @access  Public
 */
router.delete('/:id', validateId, deleteInvoice);

module.exports = router;
