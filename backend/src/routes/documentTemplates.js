const express = require('express');
const router = express.Router();
const {
  getAllTemplates,
  getTemplateById,
  getDefaultTemplate,
  createTemplate,
  updateTemplate,
  setDefaultTemplate,
  cloneTemplate,
  deleteTemplate
} = require('../controllers/documentTemplatesController');
const { validateDocumentTemplate, validateId } = require('../middleware/validation');
const { body } = require('express-validator');

/**
 * @route   GET /api/templates/default/:type
 * @desc    Get default template for a specific type
 * @access  Public
 */
router.get('/default/:type', getDefaultTemplate);

/**
 * @route   GET /api/templates
 * @desc    Get all document templates (optionally filter by type)
 * @access  Public
 */
router.get('/', getAllTemplates);

/**
 * @route   GET /api/templates/:id
 * @desc    Get template by ID
 * @access  Public
 */
router.get('/:id', validateId, getTemplateById);

/**
 * @route   POST /api/templates
 * @desc    Create new template
 * @access  Public
 */
router.post('/', validateDocumentTemplate, createTemplate);

/**
 * @route   POST /api/templates/:id/clone
 * @desc    Clone an existing template
 * @access  Public
 */
router.post(
  '/:id/clone',
  validateId,
  body('template_name').optional().trim().notEmpty().withMessage('Template name is required'),
  cloneTemplate
);

/**
 * @route   PUT /api/templates/:id
 * @desc    Update template
 * @access  Public
 */
router.put('/:id', validateId, validateDocumentTemplate, updateTemplate);

/**
 * @route   PUT /api/templates/:id/set-default
 * @desc    Set template as default for its type
 * @access  Public
 */
router.put('/:id/set-default', validateId, setDefaultTemplate);

/**
 * @route   DELETE /api/templates/:id
 * @desc    Delete template
 * @access  Public
 */
router.delete('/:id', validateId, deleteTemplate);

module.exports = router;
