const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * EmailLog Model
 * Tracks all sent emails with delivery status and error tracking
 */
const EmailLog = sequelize.define('email_log', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  recipient_email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: { msg: 'Must be a valid email address' }
    }
  },
  recipient_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  sender_email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: { msg: 'Must be a valid email address' }
    }
  },
  subject: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  email_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Type of email (invoice, soc, reminder, etc.)'
  },
  related_document_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Type of related document (invoice, soc, order)'
  },
  related_document_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of related document'
  },
  status: {
    type: DataTypes.ENUM('sent', 'failed', 'pending', 'bounced'),
    allowNull: false,
    defaultValue: 'pending'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error details if email failed'
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when email was successfully sent'
  },
  opened_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when email was opened (if tracking enabled)'
  },
  attachment_paths: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of attachment file paths'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  updatedAt: false, // Email log doesn't need updated_at
  indexes: [
    {
      name: 'idx_email_log_status',
      fields: ['status']
    },
    {
      name: 'idx_email_log_recipient',
      fields: ['recipient_email']
    },
    {
      name: 'idx_email_log_type',
      fields: ['email_type']
    },
    {
      name: 'idx_email_log_created',
      fields: ['created_at']
    },
    {
      name: 'idx_email_log_related',
      fields: ['related_document_type', 'related_document_id']
    }
  ]
});

module.exports = EmailLog;
