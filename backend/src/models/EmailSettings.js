const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * EmailSettings Model
 * Stores email configuration for SMTP and SendGrid
 * Should only have one record (singleton pattern)
 */
const EmailSettings = sequelize.define('email_settings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  smtp_host: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  smtp_port: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 587
  },
  smtp_username: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  smtp_password: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Encrypted SMTP password'
  },
  smtp_secure: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Use TLS/SSL for SMTP'
  },
  from_email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: { msg: 'Must be a valid email address' }
    }
  },
  from_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'Bunker Management System'
  },
  reply_to_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: { msg: 'Must be a valid email address' }
    }
  },
  use_sendgrid: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Use SendGrid instead of SMTP'
  },
  sendgrid_api_key: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'SendGrid API key'
  },
  email_signature: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Default email signature HTML'
  },
  auto_cc_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: { msg: 'Must be a valid email address' }
    },
    comment: 'Automatically CC this email on all outgoing emails'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
});

module.exports = EmailSettings;
