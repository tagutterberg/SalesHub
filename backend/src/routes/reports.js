const express = require('express');
const router = express.Router();
const {
  getOrdersReport,
  getInvoicesReport,
  getVoyagesReport,
  getRevenueReport,
  exportReport
} = require('../controllers/reportsController');
const { body } = require('express-validator');

/**
 * @route   GET /api/reports/orders
 * @desc    Get orders report with filters
 * @access  Public
 */
router.get('/orders', getOrdersReport);

/**
 * @route   GET /api/reports/invoices
 * @desc    Get invoices report with filters
 * @access  Public
 */
router.get('/invoices', getInvoicesReport);

/**
 * @route   GET /api/reports/voyages
 * @desc    Get voyages report with filters
 * @access  Public
 */
router.get('/voyages', getVoyagesReport);

/**
 * @route   GET /api/reports/revenue
 * @desc    Get revenue report grouped by period
 * @access  Public
 */
router.get('/revenue', getRevenueReport);

/**
 * @route   POST /api/reports/export
 * @desc    Export report to Excel
 * @access  Public
 */
router.post(
  '/export',
  body('report_type').notEmpty().withMessage('report_type is required')
    .isIn(['orders', 'invoices', 'voyages', 'revenue']).withMessage('Invalid report_type'),
  body('data').notEmpty().withMessage('data is required'),
  body('filename').optional().trim(),
  exportReport
);

module.exports = router;
