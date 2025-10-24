const express = require('express');
const router = express.Router();
const {
  getAllAuditLogs,
  getAuditLogById,
  getUserActivityLogs,
  getAuditStats,
} = require('../controllers/auditLogsController');
const { authenticate, authorize } = require('../middleware/auth');

// Routes
router.get('/', authenticate, authorize('admin'), getAllAuditLogs);
router.get('/stats', authenticate, authorize('admin'), getAuditStats);
router.get('/user/:userId', authenticate, getUserActivityLogs);
router.get('/:id', authenticate, authorize('admin'), getAuditLogById);

module.exports = router;
