const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { getJobStatus, triggerJob } = require('../services/cronService');

/**
 * Get status of all cron jobs
 * @route GET /api/cron/status
 */
const getCronJobStatus = asyncHandler(async (req, res) => {
  const status = getJobStatus();

  res.json({
    success: true,
    data: status,
    message: 'Cron job status retrieved successfully'
  });
});

/**
 * Manually trigger a cron job
 * @route POST /api/cron/trigger/:jobName
 */
const triggerCronJob = asyncHandler(async (req, res) => {
  const { jobName } = req.params;

  const validJobs = [
    'overdueReminders',
    'updateInvoiceStatus',
    'dailySummary',
    'cleanupEmailLog',
    'processEmailQueue'
  ];

  if (!validJobs.includes(jobName)) {
    throw new ApiError(
      `Invalid job name. Valid jobs: ${validJobs.join(', ')}`,
      400
    );
  }

  try {
    await triggerJob(jobName);

    res.json({
      success: true,
      message: `Job "${jobName}" triggered successfully`,
      job_name: jobName
    });
  } catch (error) {
    throw new ApiError(`Failed to trigger job: ${error.message}`, 500);
  }
});

module.exports = {
  getCronJobStatus,
  triggerCronJob
};
