const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation Result Handler
 * Checks for validation errors and returns them
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Vessel Validation Rules
 */
const validateVessel = [
  body('name').trim().notEmpty().withMessage('Vessel name is required'),
  body('imo_number')
    .trim()
    .notEmpty().withMessage('IMO number is required')
    .matches(/^\d{7}$/).withMessage('IMO number must be exactly 7 digits'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Must be a valid email address'),
  body('call_sign').optional({ checkFalsy: true }).trim(),
  body('owner').optional({ checkFalsy: true }).trim(),
  handleValidationErrors
];

/**
 * Tanker Validation Rules
 */
const validateTanker = [
  body('name').trim().notEmpty().withMessage('Tanker name is required'),
  body('imo_number')
    .trim()
    .notEmpty().withMessage('IMO number is required')
    .matches(/^\d{7}$/).withMessage('IMO number must be exactly 7 digits'),
  handleValidationErrors
];

/**
 * Voyage Validation Rules
 */
const validateVoyage = [
  body('voyage_number')
    .trim()
    .notEmpty().withMessage('Voyage number is required')
    .matches(/^\d{2}-\d{2}$/).withMessage('Voyage number must be in format YY-XX (e.g., 25-01)'),
  body('tanker_id')
    .notEmpty().withMessage('Tanker ID is required')
    .isInt({ min: 1 }).withMessage('Tanker ID must be a positive integer'),
  body('cargoes').optional({ checkFalsy: true }).trim(),
  body('purchase_price').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Purchase price must be positive'),
  body('purchase_unit').optional({ checkFalsy: true }).isIn(['MT', 'CBM']).withMessage('Purchase unit must be MT or CBM'),
  body('purchase_currency').optional({ checkFalsy: true }).isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('status').optional({ checkFalsy: true }).isIn(['active', 'completed', 'cancelled']).withMessage('Invalid status'),
  handleValidationErrors
];

/**
 * Order Validation Rules
 */
const validateOrder = [
  body('vessel_id')
    .notEmpty().withMessage('Vessel ID is required')
    .isInt({ min: 1 }).withMessage('Vessel ID must be a positive integer'),
  body('voyage_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Voyage ID must be a positive integer'),
  body('product').trim().notEmpty().withMessage('Product is required'),
  body('quantity_mt').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Quantity MT must be positive'),
  body('quantity_cbm').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Quantity CBM must be positive'),
  body('delivery_date')
    .notEmpty().withMessage('Delivery date is required')
    .isISO8601().withMessage('Delivery date must be a valid date')
    .custom((value) => {
      const deliveryDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deliveryDate < today) {
        throw new Error('Delivery date must be today or later');
      }
      return true;
    }),
  body('unit_price')
    .notEmpty().withMessage('Unit price is required')
    .isFloat({ min: 0 }).withMessage('Unit price must be positive'),
  body('price_unit').isIn(['MT', 'CBM']).withMessage('Price unit must be MT or CBM'),
  body('currency')
    .notEmpty().withMessage('Currency is required')
    .isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('customer_company').trim().notEmpty().withMessage('Customer company is required'),
  body('is_locked').optional().isBoolean().withMessage('is_locked must be a boolean'),
  body('notes').optional({ checkFalsy: true }).trim(),
  body().custom((value) => {
    if (!value.quantity_mt && !value.quantity_cbm) {
      throw new Error('At least one quantity (MT or CBM) is required');
    }
    return true;
  }),
  handleValidationErrors
];

/**
 * Company Settings Validation Rules
 */
const validateCompanySettings = [
  body('company_name').trim().notEmpty().withMessage('Company name is required'),
  body('company_email').optional({ checkFalsy: true }).isEmail().withMessage('Must be a valid email address'),
  body('tax_rate').optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('invoice_prefix').optional({ checkFalsy: true }).trim(),
  body('soc_prefix').optional({ checkFalsy: true }).trim(),
  body('default_currency').optional({ checkFalsy: true }).isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  handleValidationErrors
];

/**
 * Document Template Validation Rules
 */
const validateDocumentTemplate = [
  body('template_name').trim().notEmpty().withMessage('Template name is required'),
  body('template_type').isIn(['invoice', 'sales_order_confirmation']).withMessage('Invalid template type'),
  body('logo_position').optional({ checkFalsy: true }).isIn(['left', 'center', 'right']).withMessage('Invalid logo position'),
  body('primary_color').optional({ checkFalsy: true }).matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Primary color must be a valid hex color'),
  body('secondary_color').optional({ checkFalsy: true }).matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Secondary color must be a valid hex color'),
  handleValidationErrors
];

/**
 * Sales Order Confirmation Validation Rules
 */
const validateSOC = [
  body('order_id')
    .notEmpty().withMessage('Order ID is required')
    .isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
  body('issue_date').optional({ checkFalsy: true }).isISO8601().withMessage('Issue date must be a valid date'),
  body('confirmation_date').optional({ checkFalsy: true }).isISO8601().withMessage('Confirmation date must be a valid date'),
  body('status').optional({ checkFalsy: true }).isIn(['draft', 'sent', 'confirmed', 'cancelled']).withMessage('Invalid status'),
  handleValidationErrors
];

/**
 * Invoice Validation Rules
 */
const validateInvoice = [
  body('order_id')
    .notEmpty().withMessage('Order ID is required')
    .isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
  body('soc_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('SOC ID must be a positive integer'),
  body('issue_date').optional({ checkFalsy: true }).isISO8601().withMessage('Issue date must be a valid date'),
  body('due_date')
    .notEmpty().withMessage('Due date is required')
    .isISO8601().withMessage('Due date must be a valid date'),
  body('subtotal')
    .notEmpty().withMessage('Subtotal is required')
    .isFloat({ min: 0 }).withMessage('Subtotal must be positive'),
  body('tax_amount').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Tax amount must be positive'),
  body('discount_amount').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Discount amount must be positive'),
  body('total_amount')
    .notEmpty().withMessage('Total amount is required')
    .isFloat({ min: 0 }).withMessage('Total amount must be positive'),
  body('currency')
    .notEmpty().withMessage('Currency is required')
    .isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('payment_status').optional({ checkFalsy: true })
    .isIn(['unpaid', 'partially_paid', 'paid', 'overdue']).withMessage('Invalid payment status'),
  handleValidationErrors
];

/**
 * Email Template Validation Rules
 */
const validateEmailTemplate = [
  body('template_name').trim().notEmpty().withMessage('Template name is required'),
  body('template_type')
    .isIn(['invoice', 'sales_order_confirmation', 'payment_reminder', 'custom'])
    .withMessage('Invalid template type'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('body_html').trim().notEmpty().withMessage('HTML body is required'),
  handleValidationErrors
];

/**
 * Email Settings Validation Rules
 */
const validateEmailSettings = [
  body('from_email')
    .notEmpty().withMessage('From email is required')
    .isEmail().withMessage('Must be a valid email address'),
  body('from_name').trim().notEmpty().withMessage('From name is required'),
  body('reply_to_email').optional({ checkFalsy: true }).isEmail().withMessage('Must be a valid email address'),
  body('auto_cc_email').optional({ checkFalsy: true }).isEmail().withMessage('Must be a valid email address'),
  body('smtp_port').optional({ checkFalsy: true }).isInt({ min: 1, max: 65535 }).withMessage('SMTP port must be between 1 and 65535'),
  handleValidationErrors
];

/**
 * Send Email Validation Rules
 */
const validateSendEmail = [
  body('to')
    .notEmpty().withMessage('Recipient email is required')
    .isEmail().withMessage('Must be a valid email address'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('body').trim().notEmpty().withMessage('Email body is required'),
  handleValidationErrors
];

/**
 * ID Parameter Validation
 */
const validateId = [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  handleValidationErrors
];

module.exports = {
  validateVessel,
  validateTanker,
  validateVoyage,
  validateOrder,
  validateCompanySettings,
  validateDocumentTemplate,
  validateSOC,
  validateInvoice,
  validateEmailTemplate,
  validateEmailSettings,
  validateSendEmail,
  validateId,
  handleValidationErrors
};
