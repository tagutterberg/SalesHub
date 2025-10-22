const { CompanySettings } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { deleteFile } = require('../middleware/upload');

/**
 * Get company settings
 * @route GET /api/settings/company
 */
const getCompanySettings = asyncHandler(async (req, res) => {
  // Get or create singleton company settings
  let settings = await CompanySettings.findOne();

  if (!settings) {
    // Create default settings if none exist
    settings = await CompanySettings.create({
      company_name: 'Your Company Name',
      company_address: '',
      company_phone: '',
      company_email: '',
      company_website: '',
      tax_id: '',
      bank_name: '',
      bank_account: '',
      bank_swift: '',
      bank_iban: '',
      logo_url: null,
      invoice_prefix: 'INV',
      soc_prefix: 'SOC',
      invoice_counter: 0,
      soc_counter: 0,
      default_currency: 'USD',
      tax_rate: 0.00,
      payment_terms: 'Payment due within 30 days',
      email_signature: ''
    });
  }

  res.json({
    success: true,
    data: settings
  });
});

/**
 * Update company settings
 * @route PUT /api/settings/company
 */
const updateCompanySettings = asyncHandler(async (req, res) => {
  const {
    company_name,
    company_address,
    company_phone,
    company_email,
    company_website,
    tax_id,
    bank_name,
    bank_account,
    bank_swift,
    bank_iban,
    invoice_prefix,
    soc_prefix,
    default_currency,
    tax_rate,
    payment_terms,
    email_signature
  } = req.body;

  // Get or create singleton settings
  let settings = await CompanySettings.findOne();

  if (!settings) {
    settings = await CompanySettings.create(req.body);
  } else {
    await settings.update({
      company_name,
      company_address,
      company_phone,
      company_email,
      company_website,
      tax_id,
      bank_name,
      bank_account,
      bank_swift,
      bank_iban,
      invoice_prefix,
      soc_prefix,
      default_currency,
      tax_rate,
      payment_terms,
      email_signature
    });
  }

  res.json({
    success: true,
    message: 'Company settings updated successfully',
    data: settings
  });
});

/**
 * Upload company logo
 * @route POST /api/settings/company/logo
 */
const uploadCompanyLogo = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError('No logo file uploaded', 400);
  }

  // Get settings
  let settings = await CompanySettings.findOne();

  if (!settings) {
    // Create default settings if none exist
    settings = await CompanySettings.create({
      company_name: 'Your Company Name',
      invoice_prefix: 'INV',
      soc_prefix: 'SOC',
      default_currency: 'USD',
      tax_rate: 0.00
    });
  }

  // Delete old logo if exists
  if (settings.logo_url) {
    deleteFile(settings.logo_url);
  }

  // Update with new logo path
  const logoPath = `/uploads/logos/${req.file.filename}`;
  await settings.update({ logo_url: logoPath });

  res.json({
    success: true,
    message: 'Logo uploaded successfully',
    data: {
      logo_url: logoPath,
      filename: req.file.filename
    }
  });
});

/**
 * Delete company logo
 * @route DELETE /api/settings/company/logo
 */
const deleteCompanyLogo = asyncHandler(async (req, res) => {
  const settings = await CompanySettings.findOne();

  if (!settings || !settings.logo_url) {
    throw new ApiError('No logo to delete', 404);
  }

  // Delete file
  deleteFile(`.${settings.logo_url}`);

  // Update settings
  await settings.update({ logo_url: null });

  res.json({
    success: true,
    message: 'Logo deleted successfully'
  });
});

/**
 * Increment invoice counter and return next invoice number
 * @internal Used by invoice creation
 */
const getNextInvoiceNumber = async () => {
  const settings = await CompanySettings.findOne();

  if (!settings) {
    throw new ApiError('Company settings not configured', 400);
  }

  const year = new Date().getFullYear();
  const nextCounter = settings.invoice_counter + 1;
  const invoiceNumber = `${settings.invoice_prefix}-${year}-${nextCounter.toString().padStart(3, '0')}`;

  // Increment counter
  await settings.update({ invoice_counter: nextCounter });

  return invoiceNumber;
};

/**
 * Increment SOC counter and return next SOC number
 * @internal Used by SOC creation
 */
const getNextSOCNumber = async () => {
  const settings = await CompanySettings.findOne();

  if (!settings) {
    throw new ApiError('Company settings not configured', 400);
  }

  const year = new Date().getFullYear();
  const nextCounter = settings.soc_counter + 1;
  const socNumber = `${settings.soc_prefix}-${year}-${nextCounter.toString().padStart(3, '0')}`;

  // Increment counter
  await settings.update({ soc_counter: nextCounter });

  return socNumber;
};

module.exports = {
  getCompanySettings,
  updateCompanySettings,
  uploadCompanyLogo,
  deleteCompanyLogo,
  getNextInvoiceNumber,
  getNextSOCNumber
};
