const { DocumentTemplate } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

/**
 * Get all document templates
 * @route GET /api/templates
 */
const getAllTemplates = asyncHandler(async (req, res) => {
  const { type } = req.query;

  const whereClause = type ? { template_type: type } : {};

  const templates = await DocumentTemplate.findAll({
    where: whereClause,
    order: [['is_default', 'DESC'], ['template_name', 'ASC']]
  });

  res.json({
    success: true,
    data: templates
  });
});

/**
 * Get template by ID
 * @route GET /api/templates/:id
 */
const getTemplateById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const template = await DocumentTemplate.findByPk(id);

  if (!template) {
    throw new ApiError('Template not found', 404);
  }

  res.json({
    success: true,
    data: template
  });
});

/**
 * Get default template for a type
 * @route GET /api/templates/default/:type
 */
const getDefaultTemplate = asyncHandler(async (req, res) => {
  const { type } = req.params;

  const template = await DocumentTemplate.findOne({
    where: {
      template_type: type,
      is_default: true
    }
  });

  if (!template) {
    throw new ApiError(`No default template found for type: ${type}`, 404);
  }

  res.json({
    success: true,
    data: template
  });
});

/**
 * Create new template
 * @route POST /api/templates
 */
const createTemplate = asyncHandler(async (req, res) => {
  const templateData = req.body;

  // If setting as default, unset other defaults of same type
  if (templateData.is_default) {
    await DocumentTemplate.update(
      { is_default: false },
      { where: { template_type: templateData.template_type } }
    );
  }

  const template = await DocumentTemplate.create(templateData);

  res.status(201).json({
    success: true,
    message: 'Template created successfully',
    data: template
  });
});

/**
 * Update template
 * @route PUT /api/templates/:id
 */
const updateTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const template = await DocumentTemplate.findByPk(id);

  if (!template) {
    throw new ApiError('Template not found', 404);
  }

  // If setting as default, unset other defaults of same type
  if (updateData.is_default && updateData.is_default !== template.is_default) {
    await DocumentTemplate.update(
      { is_default: false },
      {
        where: {
          template_type: template.template_type,
          id: { [require('sequelize').Op.ne]: id }
        }
      }
    );
  }

  await template.update(updateData);

  res.json({
    success: true,
    message: 'Template updated successfully',
    data: template
  });
});

/**
 * Set template as default
 * @route PUT /api/templates/:id/set-default
 */
const setDefaultTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const template = await DocumentTemplate.findByPk(id);

  if (!template) {
    throw new ApiError('Template not found', 404);
  }

  // Unset other defaults of same type
  await DocumentTemplate.update(
    { is_default: false },
    { where: { template_type: template.template_type } }
  );

  // Set this template as default
  await template.update({ is_default: true });

  res.json({
    success: true,
    message: 'Template set as default successfully',
    data: template
  });
});

/**
 * Clone template
 * @route POST /api/templates/:id/clone
 */
const cloneTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { template_name } = req.body;

  const originalTemplate = await DocumentTemplate.findByPk(id);

  if (!originalTemplate) {
    throw new ApiError('Template not found', 404);
  }

  const clonedData = {
    ...originalTemplate.toJSON(),
    template_name: template_name || `${originalTemplate.template_name} (Copy)`,
    is_default: false
  };

  delete clonedData.id;
  delete clonedData.created_at;
  delete clonedData.updated_at;

  const clonedTemplate = await DocumentTemplate.create(clonedData);

  res.status(201).json({
    success: true,
    message: 'Template cloned successfully',
    data: clonedTemplate
  });
});

/**
 * Delete template
 * @route DELETE /api/templates/:id
 */
const deleteTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const template = await DocumentTemplate.findByPk(id);

  if (!template) {
    throw new ApiError('Template not found', 404);
  }

  // Prevent deletion of default template
  if (template.is_default) {
    throw new ApiError('Cannot delete default template. Set another template as default first.', 409);
  }

  await template.destroy();

  res.json({
    success: true,
    message: 'Template deleted successfully'
  });
});

module.exports = {
  getAllTemplates,
  getTemplateById,
  getDefaultTemplate,
  createTemplate,
  updateTemplate,
  setDefaultTemplate,
  cloneTemplate,
  deleteTemplate
};
