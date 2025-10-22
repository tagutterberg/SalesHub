const express = require('express');
const router = express.Router();
const {
  getEmailSettings,
  updateEmailSettings,
  testEmail
} = require('../controllers/emailSettingsController');
const { validateEmailSettings } = require('../middleware/validation');
const { body } = require('express-validator');

/**
 * @route   GET /api/settings/email
 * @desc    Get email settings
 * @access  Public
 */
router.get('/', getEmailSettings);

/**
 * @route   PUT /api/settings/email
 * @desc    Update email settings
 * @access  Public
 */
router.put('/', validateEmailSettings, updateEmailSettings);

/**
 * @route   POST /api/settings/email/test
 * @desc    Test email configuration by sending a test email
 * @access  Public
 */
router.post(
  '/test',
  body('test_email').notEmpty().withMessage('Test email is required').isEmail().withMessage('Must be a valid email address'),
  testEmail
);

module.exports = router;
