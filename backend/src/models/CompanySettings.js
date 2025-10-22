const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CompanySettings Model
 * Stores company information used in documents and invoices
 * Should only have one record (singleton pattern)
 */
const CompanySettings = sequelize.define('company_settings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Company name is required' }
    }
  },
  company_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  company_phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  company_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: { msg: 'Must be a valid email address' }
    }
  },
  company_website: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  tax_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Tax identification number'
  },
  bank_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  bank_account: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  bank_swift: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  bank_iban: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  logo_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Path to uploaded company logo'
  },
  invoice_prefix: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'INV',
    comment: 'Prefix for invoice numbers (e.g., INV-2025-001)'
  },
  soc_prefix: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'SOC',
    comment: 'Prefix for sales order confirmation numbers'
  },
  invoice_counter: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Sequential counter for invoice numbering'
  },
  soc_counter: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Sequential counter for SOC numbering'
  },
  default_currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD'
  },
  tax_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Default tax rate percentage (e.g., 18.00 for 18%)',
    validate: {
      min: {
        args: [0],
        msg: 'Tax rate must be positive'
      },
      max: {
        args: [100],
        msg: 'Tax rate cannot exceed 100%'
      }
    }
  },
  payment_terms: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: 'Payment due within 30 days',
    comment: 'Default payment terms text'
  },
  email_signature: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Default email signature for outgoing emails'
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

module.exports = CompanySettings;
