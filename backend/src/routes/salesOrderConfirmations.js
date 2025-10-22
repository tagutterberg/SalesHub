const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/salesOrderConfirmationsController');
const { validateSOC, validateId } = require('../middleware/validation');
const { body } = require('express-validator');

/**
 * @route   GET /api/sales-order-confirmations/by-order/:orderId
 * @desc    Get all SOCs for a specific order
 * @access  Public
 */
router.get('/by-order/:orderId', validateId, getSOCsByOrder);

/**
 * @route   GET /api/sales-order-confirmations
 * @desc    Get all Sales Order Confirmations with filters
 * @access  Public
 */
router.get('/', getAllSOCs);

/**
 * @route   GET /api/sales-order-confirmations/:id
 * @desc    Get SOC by ID with relationships
 * @access  Public
 */
router.get('/:id', validateId, getSOCById);

/**
 * @route   GET /api/sales-order-confirmations/:id/download
 * @desc    Download SOC PDF
 * @access  Public
 */
router.get('/:id/download', validateId, downloadSOC);

/**
 * @route   POST /api/sales-order-confirmations
 * @desc    Create new Sales Order Confirmation
 * @access  Public
 */
router.post('/', validateSOC, createSOC);

/**
 * @route   POST /api/sales-order-confirmations/:id/generate-pdf
 * @desc    Generate PDF for SOC
 * @access  Public
 */
router.post(
  '/:id/generate-pdf',
  validateId,
  body('template_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Template ID must be a positive integer'),
  generateSOCPDFDocument
);

/**
 * @route   POST /api/sales-order-confirmations/:id/send-email
 * @desc    Send SOC via email
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
  sendSOCEmail
);

/**
 * @route   PUT /api/sales-order-confirmations/:id
 * @desc    Update SOC
 * @access  Public
 */
router.put('/:id', validateId, updateSOC);

/**
 * @route   PUT /api/sales-order-confirmations/:id/status
 * @desc    Update SOC status
 * @access  Public
 */
router.put(
  '/:id/status',
  validateId,
  body('status').notEmpty().withMessage('Status is required').isIn(['draft', 'sent', 'confirmed', 'cancelled']).withMessage('Invalid status'),
  updateSOCStatus
);

/**
 * @route   DELETE /api/sales-order-confirmations/:id
 * @desc    Delete SOC
 * @access  Public
 */
router.delete('/:id', validateId, deleteSOC);

module.exports = router;
