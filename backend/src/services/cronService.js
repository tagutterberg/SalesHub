const cron = require('node-cron');
const { Invoice, Order, Vessel, EmailLog, CompanySettings } = require('../models');
const { sendInvoiceReminder, sendEmail } = require('./emailService');
const { Op } = require('sequelize');

/**
 * Cron Job Service
 * Manages scheduled tasks for email automation and system maintenance
 */

// Store active cron jobs
const activeCronJobs = {};

/**
 * Send overdue invoice reminders
 * Runs daily at 9:00 AM
 */
const overdueInvoiceReminderJob = cron.schedule('0 9 * * *', async () => {
  console.log('🕐 Running overdue invoice reminder job...');

  try {
    const today = new Date().toISOString().split('T')[0];

    // Find overdue invoices that haven't been reminded in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const overdueInvoices = await Invoice.findAll({
      where: {
        due_date: { [Op.lt]: today },
        payment_status: { [Op.in]: ['unpaid', 'partially_paid', 'overdue'] }
      },
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

    let remindersSent = 0;
    let remindersFailed = 0;

    for (const invoice of overdueInvoices) {
      // Check if reminder was sent recently
      const recentReminder = await EmailLog.findOne({
        where: {
          email_type: 'payment_reminder',
          related_document_type: 'invoice',
          related_document_id: invoice.id,
          status: 'sent',
          created_at: { [Op.gte]: sevenDaysAgo }
        }
      });

      // Skip if reminder sent in last 7 days
      if (recentReminder) {
        console.log(`  ⏭️  Skipping invoice ${invoice.invoice_number} (reminder sent recently)`);
        continue;
      }

      // Skip if no recipient email
      if (!invoice.order?.vessel?.email && !invoice.order?.customer_company) {
        console.log(`  ⚠️  Skipping invoice ${invoice.invoice_number} (no recipient email)`);
        continue;
      }

      try {
        await sendInvoiceReminder(invoice);

        // Update invoice status to overdue if not already
        if (invoice.payment_status !== 'overdue') {
          await invoice.update({ payment_status: 'overdue' });
        }

        remindersSent++;
        console.log(`  ✓ Sent reminder for invoice ${invoice.invoice_number}`);
      } catch (error) {
        remindersFailed++;
        console.error(`  ✗ Failed to send reminder for invoice ${invoice.invoice_number}:`, error.message);
      }
    }

    console.log(`✅ Overdue reminder job complete: ${remindersSent} sent, ${remindersFailed} failed`);
  } catch (error) {
    console.error('❌ Overdue reminder job failed:', error);
  }
}, {
  scheduled: false // Don't start immediately, will be started manually
});

/**
 * Update invoice statuses (mark overdue)
 * Runs daily at 1:00 AM
 */
const updateInvoiceStatusJob = cron.schedule('0 1 * * *', async () => {
  console.log('🕐 Running invoice status update job...');

  try {
    const today = new Date().toISOString().split('T')[0];

    // Find unpaid/partially paid invoices past due date
    const result = await Invoice.update(
      { payment_status: 'overdue' },
      {
        where: {
          due_date: { [Op.lt]: today },
          payment_status: { [Op.in]: ['unpaid', 'partially_paid'] }
        }
      }
    );

    console.log(`✅ Invoice status update complete: ${result[0]} invoices marked as overdue`);
  } catch (error) {
    console.error('❌ Invoice status update job failed:', error);
  }
}, {
  scheduled: false
});

/**
 * Send daily summary email
 * Runs daily at 8:00 AM
 */
const dailySummaryJob = cron.schedule('0 8 * * *', async () => {
  console.log('🕐 Running daily summary email job...');

  try {
    const companySettings = await CompanySettings.findOne();
    if (!companySettings || !companySettings.company_email) {
      console.log('  ⏭️  Skipping: No company email configured');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get statistics for yesterday
    const [
      newOrders,
      newInvoices,
      emailsSent,
      overdueCount,
      totalRevenue
    ] = await Promise.all([
      Order.count({
        where: {
          created_at: { [Op.between]: [yesterday, today] }
        }
      }),
      Invoice.count({
        where: {
          created_at: { [Op.between]: [yesterday, today] }
        }
      }),
      EmailLog.count({
        where: {
          status: 'sent',
          created_at: { [Op.between]: [yesterday, today] }
        }
      }),
      Invoice.count({
        where: {
          due_date: { [Op.lt]: today },
          payment_status: { [Op.in]: ['unpaid', 'partially_paid', 'overdue'] }
        }
      }),
      Invoice.sum('total_amount', {
        where: {
          payment_status: 'paid',
          payment_date: { [Op.between]: [yesterday, today] }
        }
      })
    ]);

    const summaryHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563EB;">Daily Summary - ${new Date(yesterday).toLocaleDateString()}</h2>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1f2937;">Activity Overview</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0;"><strong>New Orders:</strong></td>
              <td style="text-align: right;">${newOrders}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>New Invoices:</strong></td>
              <td style="text-align: right;">${newInvoices}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Emails Sent:</strong></td>
              <td style="text-align: right;">${emailsSent}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Revenue Collected:</strong></td>
              <td style="text-align: right;">$${(totalRevenue || 0).toFixed(2)}</td>
            </tr>
          </table>
        </div>

        ${overdueCount > 0 ? `
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #dc2626;">⚠️ Attention Required</h3>
            <p><strong>${overdueCount}</strong> invoice${overdueCount > 1 ? 's are' : ' is'} currently overdue.</p>
          </div>
        ` : ''}

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated daily summary from your Bunker Management System.
        </p>
      </div>
    `;

    await sendEmail({
      to: companySettings.company_email,
      subject: `Daily Summary - ${new Date(yesterday).toLocaleDateString()}`,
      body_html: summaryHTML,
      email_type: 'custom'
    });

    console.log(`✅ Daily summary sent to ${companySettings.company_email}`);
  } catch (error) {
    console.error('❌ Daily summary job failed:', error);
  }
}, {
  scheduled: false
});

/**
 * Clean up old email logs (keep last 90 days)
 * Runs weekly on Sunday at 2:00 AM
 */
const cleanupEmailLogJob = cron.schedule('0 2 * * 0', async () => {
  console.log('🕐 Running email log cleanup job...');

  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await EmailLog.destroy({
      where: {
        created_at: { [Op.lt]: ninetyDaysAgo },
        status: { [Op.in]: ['sent', 'failed', 'bounced'] } // Keep pending emails
      }
    });

    console.log(`✅ Email log cleanup complete: ${result} old records deleted`);
  } catch (error) {
    console.error('❌ Email log cleanup job failed:', error);
  }
}, {
  scheduled: false
});

/**
 * Process pending email queue
 * Runs every 5 minutes
 */
const processEmailQueueJob = cron.schedule('*/5 * * * *', async () => {
  console.log('🕐 Processing email queue...');

  try {
    // Find pending emails older than 1 minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const pendingEmails = await EmailLog.findAll({
      where: {
        status: 'pending',
        created_at: { [Op.lt]: oneMinuteAgo }
      },
      limit: 10 // Process 10 at a time
    });

    if (pendingEmails.length === 0) {
      console.log('  ℹ️  No pending emails in queue');
      return;
    }

    let processed = 0;
    for (const emailLog of pendingEmails) {
      try {
        // Attempt to resend
        const { sendEmail } = require('./emailService');

        await sendEmail({
          to: emailLog.recipient_email,
          recipient_name: emailLog.recipient_name,
          subject: emailLog.subject,
          body: 'Processing queued email...',
          email_type: emailLog.email_type,
          related_document_type: emailLog.related_document_type,
          related_document_id: emailLog.related_document_id
        });

        processed++;
      } catch (error) {
        console.error(`  ✗ Failed to process email ${emailLog.id}:`, error.message);

        // Mark as failed if too old (> 1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (emailLog.created_at < oneHourAgo) {
          await emailLog.update({
            status: 'failed',
            error_message: 'Failed to process after 1 hour in queue'
          });
        }
      }
    }

    console.log(`✅ Email queue processed: ${processed}/${pendingEmails.length} emails sent`);
  } catch (error) {
    console.error('❌ Email queue processing job failed:', error);
  }
}, {
  scheduled: false
});

/**
 * Start all cron jobs
 */
const startAllJobs = () => {
  console.log('🚀 Starting all cron jobs...');

  overdueInvoiceReminderJob.start();
  activeCronJobs.overdueReminders = overdueInvoiceReminderJob;
  console.log('  ✓ Overdue invoice reminders (daily at 9:00 AM)');

  updateInvoiceStatusJob.start();
  activeCronJobs.updateInvoiceStatus = updateInvoiceStatusJob;
  console.log('  ✓ Invoice status updates (daily at 1:00 AM)');

  dailySummaryJob.start();
  activeCronJobs.dailySummary = dailySummaryJob;
  console.log('  ✓ Daily summary emails (daily at 8:00 AM)');

  cleanupEmailLogJob.start();
  activeCronJobs.cleanupEmailLog = cleanupEmailLogJob;
  console.log('  ✓ Email log cleanup (weekly on Sunday at 2:00 AM)');

  processEmailQueueJob.start();
  activeCronJobs.processEmailQueue = processEmailQueueJob;
  console.log('  ✓ Email queue processor (every 5 minutes)');

  console.log('✅ All cron jobs started successfully');
};

/**
 * Stop all cron jobs
 */
const stopAllJobs = () => {
  console.log('🛑 Stopping all cron jobs...');

  Object.values(activeCronJobs).forEach(job => {
    job.stop();
  });

  console.log('✅ All cron jobs stopped');
};

/**
 * Get status of all cron jobs
 */
const getJobStatus = () => {
  return {
    overdueReminders: {
      name: 'Overdue Invoice Reminders',
      schedule: 'Daily at 9:00 AM',
      status: activeCronJobs.overdueReminders ? 'running' : 'stopped'
    },
    updateInvoiceStatus: {
      name: 'Invoice Status Updates',
      schedule: 'Daily at 1:00 AM',
      status: activeCronJobs.updateInvoiceStatus ? 'running' : 'stopped'
    },
    dailySummary: {
      name: 'Daily Summary Email',
      schedule: 'Daily at 8:00 AM',
      status: activeCronJobs.dailySummary ? 'running' : 'stopped'
    },
    cleanupEmailLog: {
      name: 'Email Log Cleanup',
      schedule: 'Weekly on Sunday at 2:00 AM',
      status: activeCronJobs.cleanupEmailLog ? 'running' : 'stopped'
    },
    processEmailQueue: {
      name: 'Email Queue Processor',
      schedule: 'Every 5 minutes',
      status: activeCronJobs.processEmailQueue ? 'running' : 'stopped'
    }
  };
};

/**
 * Manually trigger a specific job
 */
const triggerJob = async (jobName) => {
  console.log(`🔧 Manually triggering job: ${jobName}`);

  switch (jobName) {
    case 'overdueReminders':
      return overdueInvoiceReminderJob._task();
    case 'updateInvoiceStatus':
      return updateInvoiceStatusJob._task();
    case 'dailySummary':
      return dailySummaryJob._task();
    case 'cleanupEmailLog':
      return cleanupEmailLogJob._task();
    case 'processEmailQueue':
      return processEmailQueueJob._task();
    default:
      throw new Error(`Unknown job: ${jobName}`);
  }
};

module.exports = {
  startAllJobs,
  stopAllJobs,
  getJobStatus,
  triggerJob,
  // Export individual jobs for testing
  overdueInvoiceReminderJob,
  updateInvoiceStatusJob,
  dailySummaryJob,
  cleanupEmailLogJob,
  processEmailQueueJob
};
