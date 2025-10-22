const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * SalesOrderConfirmation Model
 * Represents a sales order confirmation document for an order
 */
const SalesOrderConfirmation = sequelize.define('sales_order_confirmations', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  soc_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: {
      msg: 'SOC number must be unique'
    },
    validate: {
      notEmpty: { msg: 'SOC number is required' }
    }
  },
  order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  issue_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    validate: {
      isDate: { msg: 'Must be a valid date' }
    }
  },
  confirmation_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    validate: {
      isDate: { msg: 'Must be a valid date' }
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  terms_conditions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'confirmed', 'cancelled'),
    allowNull: false,
    defaultValue: 'draft'
  },
  pdf_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Path to generated PDF document'
  },
  created_by: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'User who created the SOC'
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
      name: 'idx_soc_number',
      unique: true,
      fields: ['soc_number']
    },
    {
      name: 'idx_soc_order',
      fields: ['order_id']
    },
    {
      name: 'idx_soc_status',
      fields: ['status']
    }
  ]
});

module.exports = SalesOrderConfirmation;
