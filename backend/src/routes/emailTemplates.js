const express = require('express');
const router = express.Router();
const {
  getAllEmailTemplates,
  getEmailTemplateById,
  getDefaultEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  setDefaultEmailTemplate,
  previewEmailTemplate,
  deleteEmailTemplate
} = require('../controllers/emailTemplatesController');
const { validateEmailTemplate, validateId } = require('../middleware/validation');
const { body } = require('express-validator');

/**
 * @route   GET /api/email-templates/default/:type
 * @desc    Get default email template for a specific type
 * @access  Public
 */
router.get('/default/:type', getDefaultEmailTemplate);

/**
 * @route   GET /api/email-templates
 * @desc    Get all email templates (optionally filter by type)
 * @access  Public
 */
router.get('/', getAllEmailTemplates);

/**
 * @route   GET /api/email-templates/:id
 * @desc    Get email template by ID
 * @access  Public
 */
router.get('/:id', validateId, getEmailTemplateById);

/**
 * @route   POST /api/email-templates
 * @desc    Create new email template
 * @access  Public
 */
router.post('/', validateEmailTemplate, createEmailTemplate);

/**
 * @route   POST /api/email-templates/:id/preview
 * @desc    Preview email template with sample data
 * @access  Public
 */
router.post(
  '/:id/preview',
  validateId,
  body('sample_variables').optional().isObject().withMessage('Sample variables must be an object'),
  previewEmailTemplate
);

/**
 * @route   PUT /api/email-templates/:id
 * @desc    Update email template
 * @access  Public
 */
router.put('/:id', validateId, validateEmailTemplate, updateEmailTemplate);

/**
 * @route   PUT /api/email-templates/:id/set-default
 * @desc    Set email template as default for its type
 * @access  Public
 */
router.put('/:id/set-default', validateId, setDefaultEmailTemplate);

/**
 * @route   DELETE /api/email-templates/:id
 * @desc    Delete email template
 * @access  Public
 */
router.delete('/:id', validateId, deleteEmailTemplate);

module.exports = router;
