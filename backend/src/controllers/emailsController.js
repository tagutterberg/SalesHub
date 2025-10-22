const { EmailLog, Invoice, Order, Vessel } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { sendEmail, sendBatchEmails, sendInvoiceReminder, checkDuplicateEmail } = require('../services/emailService');
const { Op } = require('sequelize');

/**
 * Get Email Log (History)
 * @route GET /api/emails/log
 * @query page, limit, status, email_type, recipient
 */
const getEmailLog = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    email_type,
    recipient,
    date_from,
    date_to
  } = req.query;

  const offset = (page - 1) * limit;
  const whereClause = {};

  if (status) whereClause.status = status;
  if (email_type) whereClause.email_type = email_type;
  if (recipient) {
    whereClause.recipient_email = { [Op.iLike]: `%${recipient}%` };
  }

  if (date_from && date_to) {
    whereClause.created_at = { [Op.between]: [date_from, date_to] };
  } else if (date_from) {
    whereClause.created_at = { [Op.gte]: date_from };
  } else if (date_to) {
    whereClause.created_at = { [Op.lte]: date_to };
  }

  const { count, rows } = await EmailLog.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['created_at', 'DESC']]
  });

  res.json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  });
});

/**
 * Get Email Log entry by ID
 * @route GET /api/emails/log/:id
 */
const getEmailLogById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const emailLog = await EmailLog.findByPk(id);

  if (!emailLog) {
    throw new ApiError('Email log entry not found', 404);
  }

  res.json({
    success: true,
    data: emailLog
  });
});

/**
 * Send custom email
 * @route POST /api/emails/send
 */
const sendCustomEmail = asyncHandler(async (req, res) => {
  const {
    to,
    recipient_name,
    subject,
    body,
    body_html,
    attachments,
    template_id,
    template_variables
  } = req.body;

  // Check for duplicate within 5 minutes
  const isDuplicate = await checkDuplicateEmail(to, subject);
  if (isDuplicate) {
    throw new ApiError('Duplicate email detected. Same email was sent to this recipient within the last 5 minutes.', 409);
  }

  const result = await sendEmail({
    to,
    recipient_name,
    subject,
    body,
    body_html,
    email_type: 'custom',
    attachments,
    template_id,
    template_variables
  });

  res.json({
    success: true,
    message: 'Email sent successfully',
    email_id: result.email_id
  });
});

/**
 * Send payment reminder for invoice
 * @route POST /api/emails/send-reminder/:invoiceId
 */
const sendPaymentReminder = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;

  const invoice = await Invoice.findByPk(invoiceId, {
    include: [
      {
        model: Order,
        as: 'order',
        include: [
          {
            model: Vessel,
            as: 'vessel'
          }
        ]
      }
    ]
  });

  if (!invoice) {
    throw new ApiError('Invoice not found', 404);
  }

  if (invoice.payment_status === 'paid') {
    throw new ApiError('Cannot send reminder for paid invoice', 400);
  }

  if (!invoice.order?.vessel?.email && !invoice.order?.customer_company) {
    throw new ApiError('No recipient email found for this invoice', 400);
  }

  const result = await sendInvoiceReminder(invoice);

  res.json({
    success: true,
    message: 'Payment reminder sent successfully',
    email_id: result.email_id
  });
});

/**
 * Send batch emails
 * @route POST /api/emails/batch-send
 */
const batchSendEmails = asyncHandler(async (req, res) => {
  const { emails } = req.body;

  if (!Array.isArray(emails) || emails.length === 0) {
    throw new ApiError('emails must be a non-empty array', 400);
  }

  if (emails.length > 100) {
    throw new ApiError('Maximum 100 emails can be sent in a batch', 400);
  }

  const results = await sendBatchEmails(emails);

  res.json({
    success: true,
    message: `Batch email operation completed. Sent: ${results.sent}, Failed: ${results.failed}`,
    data: results
  });
});

/**
 * Resend failed email
 * @route POST /api/emails/log/:id/resend
 */
const resendEmail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const emailLog = await EmailLog.findByPk(id);

  if (!emailLog) {
    throw new ApiError('Email log entry not found', 404);
  }

  if (emailLog.status === 'sent') {
    throw new ApiError('Email was already sent successfully', 400);
  }

  // Resend email
  const result = await sendEmail({
    to: emailLog.recipient_email,
    recipient_name: emailLog.recipient_name,
    subject: emailLog.subject,
    body: 'Resending email...',
    email_type: emailLog.email_type,
    related_document_type: emailLog.related_document_type,
    related_document_id: emailLog.related_document_id,
    attachments: emailLog.attachment_paths ? emailLog.attachment_paths.map(path => ({
      filename: path.split('/').pop(),
      path: path
    })) : []
  });

  res.json({
    success: true,
    message: 'Email resent successfully',
    email_id: result.email_id
  });
});

/**
 * Get email statistics
 * @route GET /api/emails/stats
 */
const getEmailStats = asyncHandler(async (req, res) => {
  const [total, sent, failed, pending, bounced] = await Promise.all([
    EmailLog.count(),
    EmailLog.count({ where: { status: 'sent' } }),
    EmailLog.count({ where: { status: 'failed' } }),
    EmailLog.count({ where: { status: 'pending' } }),
    EmailLog.count({ where: { status: 'bounced' } })
  ]);

  // Get stats by type
  const statsByType = await EmailLog.findAll({
    attributes: [
      'email_type',
      [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
    ],
    group: ['email_type']
  });

  // Recent activity (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentActivity = await EmailLog.count({
    where: {
      created_at: { [Op.gte]: sevenDaysAgo }
    }
  });

  res.json({
    success: true,
    data: {
      total_emails: total,
      sent: sent,
      failed: failed,
      pending: pending,
      bounced: bounced,
      success_rate: total > 0 ? ((sent / total) * 100).toFixed(2) : 0,
      by_type: statsByType,
      last_7_days: recentActivity
    }
  });
});

/**
 * Delete email log entry
 * @route DELETE /api/emails/log/:id
 */
const deleteEmailLog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const emailLog = await EmailLog.findByPk(id);

  if (!emailLog) {
    throw new ApiError('Email log entry not found', 404);
  }

  await emailLog.destroy();

  res.json({
    success: true,
    message: 'Email log entry deleted successfully'
  });
});

module.exports = {
  getEmailLog,
  getEmailLogById,
  sendCustomEmail,
  sendPaymentReminder,
  batchSendEmails,
  resendEmail,
  getEmailStats,
  deleteEmailLog
};
