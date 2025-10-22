const { EmailSettings } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { testEmailConfig } = require('../services/emailService');

/**
 * Get Email Settings
 * @route GET /api/settings/email
 */
const getEmailSettings = asyncHandler(async (req, res) => {
  // Get or create singleton email settings
  let settings = await EmailSettings.findOne();

  if (!settings) {
    // Create default settings if none exist
    settings = await EmailSettings.create({
      smtp_host: '',
      smtp_port: 587,
      smtp_username: '',
      smtp_password: '',
      smtp_secure: false,
      from_email: '',
      from_name: 'Bunker Management System',
      reply_to_email: '',
      use_sendgrid: false,
      sendgrid_api_key: '',
      email_signature: '',
      auto_cc_email: ''
    });
  }

  // Don't expose sensitive data
  const safeSettings = {
    id: settings.id,
    smtp_host: settings.smtp_host,
    smtp_port: settings.smtp_port,
    smtp_username: settings.smtp_username,
    smtp_password: settings.smtp_password ? '********' : '', // Masked
    smtp_secure: settings.smtp_secure,
    from_email: settings.from_email,
    from_name: settings.from_name,
    reply_to_email: settings.reply_to_email,
    use_sendgrid: settings.use_sendgrid,
    sendgrid_api_key: settings.sendgrid_api_key ? '********' : '', // Masked
    email_signature: settings.email_signature,
    auto_cc_email: settings.auto_cc_email,
    created_at: settings.created_at,
    updated_at: settings.updated_at
  };

  res.json({
    success: true,
    data: safeSettings
  });
});

/**
 * Update Email Settings
 * @route PUT /api/settings/email
 */
const updateEmailSettings = asyncHandler(async (req, res) => {
  const {
    smtp_host,
    smtp_port,
    smtp_username,
    smtp_password,
    smtp_secure,
    from_email,
    from_name,
    reply_to_email,
    use_sendgrid,
    sendgrid_api_key,
    email_signature,
    auto_cc_email
  } = req.body;

  // Get or create singleton settings
  let settings = await EmailSettings.findOne();

  const updateData = {
    smtp_host,
    smtp_port,
    smtp_username,
    smtp_secure,
    from_email,
    from_name,
    reply_to_email,
    use_sendgrid,
    email_signature,
    auto_cc_email
  };

  // Only update password if provided (not masked value)
  if (smtp_password && smtp_password !== '********') {
    updateData.smtp_password = smtp_password;
  }

  // Only update SendGrid API key if provided (not masked value)
  if (sendgrid_api_key && sendgrid_api_key !== '********') {
    updateData.sendgrid_api_key = sendgrid_api_key;
  }

  if (!settings) {
    settings = await EmailSettings.create(updateData);
  } else {
    await settings.update(updateData);
  }

  // Return safe data
  const safeSettings = {
    id: settings.id,
    smtp_host: settings.smtp_host,
    smtp_port: settings.smtp_port,
    smtp_username: settings.smtp_username,
    smtp_password: settings.smtp_password ? '********' : '',
    smtp_secure: settings.smtp_secure,
    from_email: settings.from_email,
    from_name: settings.from_name,
    reply_to_email: settings.reply_to_email,
    use_sendgrid: settings.use_sendgrid,
    sendgrid_api_key: settings.sendgrid_api_key ? '********' : '',
    email_signature: settings.email_signature,
    auto_cc_email: settings.auto_cc_email,
    updated_at: settings.updated_at
  };

  res.json({
    success: true,
    message: 'Email settings updated successfully',
    data: safeSettings
  });
});

/**
 * Test Email Configuration
 * @route POST /api/settings/email/test
 */
const testEmail = asyncHandler(async (req, res) => {
  const { test_email } = req.body;

  if (!test_email) {
    throw new ApiError('Test email address is required', 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(test_email)) {
    throw new ApiError('Invalid email address format', 400);
  }

  // Check if email settings exist
  const settings = await EmailSettings.findOne();
  if (!settings || !settings.from_email) {
    throw new ApiError('Email settings not configured. Please configure email settings first.', 400);
  }

  // Send test email
  const result = await testEmailConfig(test_email);

  if (result.success) {
    res.json({
      success: true,
      message: `Test email sent successfully to ${test_email}`,
      email_id: result.email_id
    });
  } else {
    throw new ApiError(result.message + ': ' + result.error, 500);
  }
});

module.exports = {
  getEmailSettings,
  updateEmailSettings,
  testEmail
};
