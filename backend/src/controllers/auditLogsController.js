const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// @desc    Get all audit logs
// @route   GET /api/audit-logs
// @access  Private/Admin
const getAllAuditLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    user_id,
    action,
    resource_type,
    status,
    start_date,
    end_date,
  } = req.query;

  const offset = (page - 1) * limit;

  // Build where clause
  const where = {};

  if (user_id) where.user_id = user_id;
  if (action) where.action = action;
  if (resource_type) where.resource_type = resource_type;
  if (status) where.status = status;

  if (start_date || end_date) {
    where.created_at = {};
    if (start_date) where.created_at[Op.gte] = new Date(start_date);
    if (end_date) where.created_at[Op.lte] = new Date(end_date);
  }

  const { count, rows } = await AuditLog.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'first_name', 'last_name'],
      },
    ],
    limit: parseInt(limit),
    offset,
    order: [['created_at', 'DESC']],
  });

  res.json({
    success: true,
    data: rows,
    page: parseInt(page),
    limit: parseInt(limit),
    total: count,
    totalPages: Math.ceil(count / limit),
  });
});

// @desc    Get audit log by ID
// @route   GET /api/audit-logs/:id
// @access  Private/Admin
const getAuditLogById = asyncHandler(async (req, res) => {
  const log = await AuditLog.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'first_name', 'last_name'],
      },
    ],
  });

  if (!log) {
    throw new ApiError('Audit log not found', 404);
  }

  res.json({
    success: true,
    data: log,
  });
});

// @desc    Get user's activity logs
// @route   GET /api/audit-logs/user/:userId
// @access  Private
const getUserActivityLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  // Users can only view their own logs unless they're admin
  const userId = req.user.role === 'admin' ? req.params.userId : req.user.id;

  const { count, rows } = await AuditLog.findAndCountAll({
    where: { user_id: userId },
    limit: parseInt(limit),
    offset,
    order: [['created_at', 'DESC']],
  });

  res.json({
    success: true,
    data: rows,
    page: parseInt(page),
    limit: parseInt(limit),
    total: count,
    totalPages: Math.ceil(count / limit),
  });
});

// @desc    Get audit log statistics
// @route   GET /api/audit-logs/stats
// @access  Private/Admin
const getAuditStats = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  const where = {};
  if (start_date || end_date) {
    where.created_at = {};
    if (start_date) where.created_at[Op.gte] = new Date(start_date);
    if (end_date) where.created_at[Op.lte] = new Date(end_date);
  }

  // Get total logs
  const totalLogs = await AuditLog.count({ where });

  // Get logs by action
  const logsByAction = await AuditLog.findAll({
    where,
    attributes: [
      'action',
      [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count'],
    ],
    group: ['action'],
    raw: true,
  });

  // Get logs by status
  const logsByStatus = await AuditLog.findAll({
    where,
    attributes: [
      'status',
      [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count'],
    ],
    group: ['status'],
    raw: true,
  });

  // Get most active users
  const mostActiveUsers = await AuditLog.findAll({
    where,
    attributes: [
      'user_id',
      [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count'],
    ],
    group: ['user_id'],
    order: [[AuditLog.sequelize.literal('count'), 'DESC']],
    limit: 10,
    raw: true,
  });

  res.json({
    success: true,
    data: {
      total_logs: totalLogs,
      logs_by_action: logsByAction,
      logs_by_status: logsByStatus,
      most_active_users: mostActiveUsers,
    },
  });
});

module.exports = {
  getAllAuditLogs,
  getAuditLogById,
  getUserActivityLogs,
  getAuditStats,
};
