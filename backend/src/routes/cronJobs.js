const express = require('express');
const router = express.Router();
const {
  getCronJobStatus,
  triggerCronJob
} = require('../controllers/cronJobsController');

/**
 * @route   GET /api/cron/status
 * @desc    Get status of all cron jobs
 * @access  Public
 */
router.get('/status', getCronJobStatus);

/**
 * @route   POST /api/cron/trigger/:jobName
 * @desc    Manually trigger a specific cron job
 * @access  Public
 * @params  jobName - One of: overdueReminders, updateInvoiceStatus, dailySummary, cleanupEmailLog, processEmailQueue
 */
router.post('/trigger/:jobName', triggerCronJob);

module.exports = router;
