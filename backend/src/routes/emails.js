const express = require('express');
const router = express.Router();
const {
  getEmailLog,
  getEmailLogById,
  sendCustomEmail,
  sendPaymentReminder,
  batchSendEmails,
  resendEmail,
  getEmailStats,
  deleteEmailLog
} = require('../controllers/emailsController');
const { validateSendEmail, validateId } = require('../middleware/validation');
const { body } = require('express-validator');

/**
 * @route   GET /api/emails/stats
 * @desc    Get email statistics
 * @access  Public
 */
router.get('/stats', getEmailStats);

/**
 * @route   GET /api/emails/log
 * @desc    Get email log (history) with filters
 * @access  Public
 */
router.get('/log', getEmailLog);

/**
 * @route   GET /api/emails/log/:id
 * @desc    Get email log entry by ID
 * @access  Public
 */
router.get('/log/:id', validateId, getEmailLogById);

/**
 * @route   POST /api/emails/send
 * @desc    Send custom email
 * @access  Public
 */
router.post('/send', validateSendEmail, sendCustomEmail);

/**
 * @route   POST /api/emails/send-reminder/:invoiceId
 * @desc    Send payment reminder for invoice
 * @access  Public
 */
router.post('/send-reminder/:invoiceId', validateId, sendPaymentReminder);

/**
 * @route   POST /api/emails/batch-send
 * @desc    Send batch emails
 * @access  Public
 */
router.post(
  '/batch-send',
  body('emails').isArray({ min: 1, max: 100 }).withMessage('emails must be an array with 1-100 items'),
  batchSendEmails
);

/**
 * @route   POST /api/emails/log/:id/resend
 * @desc    Resend failed email
 * @access  Public
 */
router.post('/log/:id/resend', validateId, resendEmail);

/**
 * @route   DELETE /api/emails/log/:id
 * @desc    Delete email log entry
 * @access  Public
 */
router.delete('/log/:id', validateId, deleteEmailLog);

module.exports = router;
