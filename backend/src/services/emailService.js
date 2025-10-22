const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const { EmailSettings, EmailLog, EmailTemplate, CompanySettings } = require('../models');

/**
 * Email Service
 * Handles email sending with Nodemailer/SendGrid, retry mechanism, and template processing
 */

/**
 * Get email transporter (SMTP or SendGrid)
 */
const getTransporter = async () => {
  const settings = await EmailSettings.findOne();

  if (!settings) {
    throw new Error('Email settings not configured. Please configure SMTP or SendGrid settings.');
  }

  if (settings.use_sendgrid) {
    // Use SendGrid
    if (!settings.sendgrid_api_key) {
      throw new Error('SendGrid API key not configured');
    }
    sgMail.setApiKey(settings.sendgrid_api_key);
    return { type: 'sendgrid', settings };
  } else {
    // Use SMTP with Nodemailer
    if (!settings.smtp_host || !settings.smtp_port) {
      throw new Error('SMTP settings incomplete. Please configure SMTP host and port.');
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.smtp_secure,
      auth: settings.smtp_username && settings.smtp_password ? {
        user: settings.smtp_username,
        pass: settings.smtp_password
      } : undefined
    });

    return { type: 'smtp', transporter, settings };
  }
};

/**
 * Replace variables in template
 * @param {String} text - Text with variables like {{variable_name}}
 * @param {Object} variables - Object with variable values
 * @returns {String} - Text with variables replaced
 */
const replaceVariables = (text, variables) => {
  if (!text) return text;

  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
};

/**
 * Send email with retry mechanism
 * @param {Object} emailData - Email data
 * @returns {Object} - Result with success status and email log ID
 */
const sendEmail = async (emailData) => {
  const {
    to,
    recipient_name,
    subject,
    body,
    body_html,
    email_type,
    related_document_type,
    related_document_id,
    attachments = [],
    template_id,
    template_variables = {},
    retry_count = 0
  } = emailData;

  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [2000, 4000, 8000]; // Exponential backoff: 2s, 4s, 8s

  try {
    // Get transporter
    const { type, transporter, settings } = await getTransporter();

    // Get company settings for signature
    const companySettings = await CompanySettings.findOne();

    // Process template if template_id provided
    let finalSubject = subject;
    let finalBody = body_html || body;

    if (template_id) {
      const template = await EmailTemplate.findByPk(template_id);
      if (template) {
        finalSubject = replaceVariables(template.subject, template_variables);
        finalBody = replaceVariables(template.body_html || template.body_plain, template_variables);
      }
    }

    // Add email signature if configured
    if (settings.email_signature && finalBody) {
      finalBody += `\n\n${settings.email_signature}`;
    }

    // Prepare attachments
    const processedAttachments = attachments.map(att => ({
      filename: att.filename,
      path: att.path,
      contentType: att.contentType || 'application/pdf'
    }));

    // Create email log entry
    const emailLog = await EmailLog.create({
      recipient_email: to,
      recipient_name: recipient_name || null,
      sender_email: settings.from_email,
      subject: finalSubject,
      email_type: email_type || 'custom',
      related_document_type: related_document_type || null,
      related_document_id: related_document_id || null,
      status: 'pending',
      attachment_paths: processedAttachments.map(a => a.path)
    });

    try {
      let sendResult;

      if (type === 'sendgrid') {
        // Send via SendGrid
        const msg = {
          to: to,
          from: {
            email: settings.from_email,
            name: settings.from_name
          },
          replyTo: settings.reply_to_email || settings.from_email,
          subject: finalSubject,
          text: body || finalBody.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
          html: finalBody,
          attachments: processedAttachments.map(att => ({
            filename: att.filename,
            content: require('fs').readFileSync(att.path).toString('base64'),
            type: att.contentType,
            disposition: 'attachment'
          }))
        };

        // Add CC if configured
        if (settings.auto_cc_email) {
          msg.cc = settings.auto_cc_email;
        }

        sendResult = await sgMail.send(msg);
      } else {
        // Send via SMTP
        const mailOptions = {
          from: `"${settings.from_name}" <${settings.from_email}>`,
          to: to,
          replyTo: settings.reply_to_email || settings.from_email,
          subject: finalSubject,
          text: body || finalBody.replace(/<[^>]*>/g, ''),
          html: finalBody,
          attachments: processedAttachments
        };

        // Add CC if configured
        if (settings.auto_cc_email) {
          mailOptions.cc = settings.auto_cc_email;
        }

        sendResult = await transporter.sendMail(mailOptions);
      }

      // Update email log as sent
      await emailLog.update({
        status: 'sent',
        sent_at: new Date()
      });

      console.log(`✓ Email sent successfully to ${to} (ID: ${emailLog.id})`);

      return {
        success: true,
        email_id: emailLog.id,
        message: 'Email sent successfully',
        messageId: sendResult.messageId || sendResult[0]?.headers?.['x-message-id']
      };

    } catch (sendError) {
      console.error(`✗ Error sending email to ${to}:`, sendError.message);

      // Retry logic
      if (retry_count < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retry_count];
        console.log(`Retrying in ${delay}ms... (Attempt ${retry_count + 1}/${MAX_RETRIES})`);

        await new Promise(resolve => setTimeout(resolve, delay));

        // Update email log
        await emailLog.update({
          status: 'pending',
          error_message: `Retry ${retry_count + 1}: ${sendError.message}`
        });

        // Retry
        return sendEmail({
          ...emailData,
          retry_count: retry_count + 1
        });
      }

      // Max retries reached, mark as failed
      await emailLog.update({
        status: 'failed',
        error_message: `Failed after ${MAX_RETRIES} retries: ${sendError.message}`
      });

      throw sendError;
    }

  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
};

/**
 * Send batch emails (with queue if > 10)
 * @param {Array} emailsData - Array of email data objects
 * @returns {Object} - Results with success/failure counts
 */
const sendBatchEmails = async (emailsData) => {
  const BATCH_SIZE = 10;
  const results = {
    total: emailsData.length,
    sent: 0,
    failed: 0,
    errors: []
  };

  // Process in batches
  for (let i = 0; i < emailsData.length; i += BATCH_SIZE) {
    const batch = emailsData.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map(emailData => sendEmail(emailData))
    );

    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push({
          email: batch[index].to,
          error: result.reason.message
        });
      }
    });

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < emailsData.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
};

/**
 * Check for duplicate email (prevent sending same email within 5 minutes)
 * @param {String} to - Recipient email
 * @param {String} subject - Email subject
 * @returns {Boolean} - True if duplicate found
 */
const checkDuplicateEmail = async (to, subject) => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const duplicate = await EmailLog.findOne({
    where: {
      recipient_email: to,
      subject: subject,
      status: 'sent',
      sent_at: {
        [require('sequelize').Op.gte]: fiveMinutesAgo
      }
    }
  });

  return !!duplicate;
};

/**
 * Send invoice reminder email
 * @param {Object} invoice - Invoice data
 * @returns {Object} - Send result
 */
const sendInvoiceReminder = async (invoice) => {
  const { sendEmail } = require('./emailService');

  // Get default payment reminder template
  const template = await EmailTemplate.findOne({
    where: {
      template_type: 'payment_reminder',
      is_default: true
    }
  });

  const variables = {
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.issue_date,
    due_date: invoice.due_date,
    customer_name: invoice.order?.customer_company || 'Valued Customer',
    vessel_name: invoice.order?.vessel?.name || '',
    total_amount: invoice.total_amount,
    currency: invoice.currency,
    company_name: (await CompanySettings.findOne())?.company_name || ''
  };

  const subject = template
    ? replaceVariables(template.subject, variables)
    : `Payment Reminder - Invoice ${invoice.invoice_number} Due ${invoice.due_date}`;

  const body = template
    ? replaceVariables(template.body_html, variables)
    : `Dear ${variables.customer_name},\n\nThis is a reminder that Invoice ${invoice.invoice_number} for ${invoice.currency} ${invoice.total_amount} was due on ${invoice.due_date}.\n\nPlease arrange payment at your earliest convenience.\n\nThank you.`;

  return sendEmail({
    to: invoice.order?.vessel?.email || invoice.order?.customer_company,
    recipient_name: invoice.order?.customer_company,
    subject,
    body,
    email_type: 'payment_reminder',
    related_document_type: 'invoice',
    related_document_id: invoice.id,
    attachments: invoice.pdf_path ? [
      {
        filename: `Invoice-${invoice.invoice_number}.pdf`,
        path: `.${invoice.pdf_path}`
      }
    ] : []
  });
};

/**
 * Test email configuration
 * @param {String} testEmail - Email address to send test to
 * @returns {Object} - Test result
 */
const testEmailConfig = async (testEmail) => {
  try {
    const result = await sendEmail({
      to: testEmail,
      subject: 'Test Email - Bunker Management System',
      body: 'This is a test email from your Bunker Management System. If you received this, your email configuration is working correctly!',
      body_html: '<p>This is a test email from your <strong>Bunker Management System</strong>.</p><p>If you received this, your email configuration is working correctly!</p>',
      email_type: 'custom'
    });

    return {
      success: true,
      message: 'Test email sent successfully',
      email_id: result.email_id
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to send test email',
      error: error.message
    };
  }
};

module.exports = {
  sendEmail,
  sendBatchEmails,
  checkDuplicateEmail,
  sendInvoiceReminder,
  testEmailConfig,
  replaceVariables
};
