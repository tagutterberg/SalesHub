const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    // Examples: 'login', 'logout', 'create_order', 'update_invoice', 'delete_vessel'
  },
  resource_type: {
    type: DataTypes.STRING,
    // Examples: 'order', 'invoice', 'vessel', 'user'
  },
  resource_id: {
    type: DataTypes.INTEGER,
  },
  details: {
    type: DataTypes.JSONB,
    // Store additional details like changed fields, old/new values
  },
  ip_address: {
    type: DataTypes.STRING,
  },
  user_agent: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM('success', 'failure'),
    defaultValue: 'success',
  },
  error_message: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'audit_logs',
  underscored: true,
  updatedAt: false, // Audit logs are immutable
});

module.exports = AuditLog;
