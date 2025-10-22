const { EmailTemplate } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { replaceVariables } = require('../services/emailService');

/**
 * Get all Email Templates
 * @route GET /api/email-templates
 * @query type
 */
const getAllEmailTemplates = asyncHandler(async (req, res) => {
  const { type } = req.query;

  const whereClause = type ? { template_type: type } : {};

  const templates = await EmailTemplate.findAll({
    where: whereClause,
    order: [['is_default', 'DESC'], ['template_name', 'ASC']]
  });

  res.json({
    success: true,
    data: templates
  });
});

/**
 * Get Email Template by ID
 * @route GET /api/email-templates/:id
 */
const getEmailTemplateById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const template = await EmailTemplate.findByPk(id);

  if (!template) {
    throw new ApiError('Email template not found', 404);
  }

  res.json({
    success: true,
    data: template
  });
});

/**
 * Get default template for a type
 * @route GET /api/email-templates/default/:type
 */
const getDefaultEmailTemplate = asyncHandler(async (req, res) => {
  const { type } = req.params;

  const template = await EmailTemplate.findOne({
    where: {
      template_type: type,
      is_default: true
    }
  });

  if (!template) {
    throw new ApiError(`No default email template found for type: ${type}`, 404);
  }

  res.json({
    success: true,
    data: template
  });
});

/**
 * Create new Email Template
 * @route POST /api/email-templates
 */
const createEmailTemplate = asyncHandler(async (req, res) => {
  const {
    template_name,
    template_type,
    subject,
    body_html,
    body_plain,
    variables,
    is_default
  } = req.body;

  // If setting as default, unset other defaults of same type
  if (is_default) {
    await EmailTemplate.update(
      { is_default: false },
      { where: { template_type } }
    );
  }

  const template = await EmailTemplate.create({
    template_name,
    template_type,
    subject,
    body_html,
    body_plain,
    variables: variables || [],
    is_default: is_default || false
  });

  res.status(201).json({
    success: true,
    message: 'Email template created successfully',
    data: template
  });
});

/**
 * Update Email Template
 * @route PUT /api/email-templates/:id
 */
const updateEmailTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    template_name,
    template_type,
    subject,
    body_html,
    body_plain,
    variables,
    is_default
  } = req.body;

  const template = await EmailTemplate.findByPk(id);

  if (!template) {
    throw new ApiError('Email template not found', 404);
  }

  // If setting as default, unset other defaults of same type
  if (is_default && is_default !== template.is_default) {
    await EmailTemplate.update(
      { is_default: false },
      {
        where: {
          template_type: template_type || template.template_type,
          id: { [require('sequelize').Op.ne]: id }
        }
      }
    );
  }

  await template.update({
    template_name,
    template_type,
    subject,
    body_html,
    body_plain,
    variables,
    is_default
  });

  res.json({
    success: true,
    message: 'Email template updated successfully',
    data: template
  });
});

/**
 * Set template as default
 * @route PUT /api/email-templates/:id/set-default
 */
const setDefaultEmailTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const template = await EmailTemplate.findByPk(id);

  if (!template) {
    throw new ApiError('Email template not found', 404);
  }

  // Unset other defaults of same type
  await EmailTemplate.update(
    { is_default: false },
    { where: { template_type: template.template_type } }
  );

  // Set this template as default
  await template.update({ is_default: true });

  res.json({
    success: true,
    message: 'Email template set as default successfully',
    data: template
  });
});

/**
 * Preview email template with sample data
 * @route POST /api/email-templates/:id/preview
 */
const previewEmailTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { sample_variables } = req.body;

  const template = await EmailTemplate.findByPk(id);

  if (!template) {
    throw new ApiError('Email template not found', 404);
  }

  // Default sample variables if not provided
  const sampleData = sample_variables || {
    invoice_number: 'INV-2025-001',
    soc_number: 'SOC-2025-001',
    invoice_date: '2025-01-15',
    due_date: '2025-02-15',
    customer_name: 'Sample Customer',
    vessel_name: 'MV Sample Vessel',
    delivery_date: '2025-01-20',
    product: 'Marine Gas Oil',
    quantity: '100.00',
    total_amount: '50,000.00',
    currency: 'USD',
    company_name: 'Sample Bunker Company',
    signature: 'Best regards,\nSample Company Team'
  };

  const previewSubject = replaceVariables(template.subject, sampleData);
  const previewBody = replaceVariables(template.body_html || template.body_plain, sampleData);

  res.json({
    success: true,
    data: {
      template_name: template.template_name,
      template_type: template.template_type,
      subject: previewSubject,
      body_html: previewBody,
      body_plain: template.body_plain ? replaceVariables(template.body_plain, sampleData) : null,
      available_variables: template.variables
    }
  });
});

/**
 * Delete Email Template
 * @route DELETE /api/email-templates/:id
 */
const deleteEmailTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const template = await EmailTemplate.findByPk(id);

  if (!template) {
    throw new ApiError('Email template not found', 404);
  }

  // Prevent deletion of default template
  if (template.is_default) {
    throw new ApiError('Cannot delete default email template. Set another template as default first.', 409);
  }

  await template.destroy();

  res.json({
    success: true,
    message: 'Email template deleted successfully'
  });
});

module.exports = {
  getAllEmailTemplates,
  getEmailTemplateById,
  getDefaultEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  setDefaultEmailTemplate,
  previewEmailTemplate,
  deleteEmailTemplate
};
