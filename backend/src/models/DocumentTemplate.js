const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * DocumentTemplate Model
 * Stores customizable templates for invoices and sales order confirmations
 */
const DocumentTemplate = sequelize.define('document_templates', {
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
    type: DataTypes.ENUM('invoice', 'sales_order_confirmation'),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Template type is required' }
    }
  },
  layout_config: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'JSON configuration for custom layout elements'
  },
  header_height: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 150,
    comment: 'Header height in pixels'
  },
  footer_height: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    comment: 'Footer height in pixels'
  },
  margin_top: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 20,
    comment: 'Top margin in mm'
  },
  margin_bottom: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 20,
    comment: 'Bottom margin in mm'
  },
  margin_left: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 20,
    comment: 'Left margin in mm'
  },
  margin_right: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 20,
    comment: 'Right margin in mm'
  },
  font_family: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Arial, sans-serif'
  },
  primary_color: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#2563EB',
    comment: 'Primary brand color (hex)'
  },
  secondary_color: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#64748B',
    comment: 'Secondary color (hex)'
  },
  show_logo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  logo_position: {
    type: DataTypes.ENUM('left', 'center', 'right'),
    allowNull: false,
    defaultValue: 'left'
  },
  logo_width: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 150,
    comment: 'Logo width in pixels'
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
      name: 'idx_doc_templates_type',
      fields: ['template_type']
    },
    {
      name: 'idx_doc_templates_default',
      fields: ['template_type', 'is_default']
    }
  ]
});

module.exports = DocumentTemplate;
