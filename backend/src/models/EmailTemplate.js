const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * EmailTemplate Model
 * Stores reusable email templates with variable substitution
 */
const EmailTemplate = sequelize.define('email_templates', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  template_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Template name is required' }
    }
  },
  template_type: {
    type: DataTypes.ENUM('invoice', 'sales_order_confirmation', 'payment_reminder', 'custom'),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Template type is required' }
    }
  },
  subject: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Subject is required' }
    }
  },
  body_html: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'HTML body is required' }
    }
  },
  body_plain: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Plain text version of email body'
  },
  variables: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of available variables for this template'
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'One default template per type'
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
}, {
  indexes: [
    {
      name: 'idx_email_templates_type',
      fields: ['template_type']
    },
    {
      name: 'idx_email_templates_default',
      fields: ['template_type', 'is_default']
    }
  ]
});

module.exports = EmailTemplate;
