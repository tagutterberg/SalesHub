const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Invoice Model
 * Represents an invoice for a bunker order
 */
const Invoice = sequelize.define('invoices', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoice_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: {
      msg: 'Invoice number must be unique'
    },
    validate: {
      notEmpty: { msg: 'Invoice number is required' }
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
  soc_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'sales_order_confirmations',
      key: 'id'
    },
    onDelete: 'SET NULL',
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
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: { msg: 'Must be a valid date' }
    }
  },
  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: {
        args: [0],
        msg: 'Subtotal must be positive'
      }
    }
  },
  tax_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: {
        args: [0],
        msg: 'Tax amount must be positive'
      }
    }
  },
  tax_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Tax rate percentage applied'
  },
  discount_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: {
        args: [0],
        msg: 'Discount amount must be positive'
      }
    }
  },
  total_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: {
        args: [0],
        msg: 'Total amount must be positive'
      }
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
    validate: {
      len: {
        args: [3, 3],
        msg: 'Currency code must be 3 characters'
      }
    }
  },
  payment_status: {
    type: DataTypes.ENUM('unpaid', 'partially_paid', 'paid', 'overdue'),
    allowNull: false,
    defaultValue: 'unpaid'
  },
  payment_date: {
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
  pdf_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Path to generated PDF invoice'
  },
  created_by: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'User who created the invoice'
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
      name: 'idx_invoices_number',
      unique: true,
      fields: ['invoice_number']
    },
    {
      name: 'idx_invoices_order',
      fields: ['order_id']
    },
    {
      name: 'idx_invoices_payment_status',
      fields: ['payment_status']
    },
    {
      name: 'idx_invoices_due_date',
      fields: ['due_date']
    }
  ]
});

module.exports = Invoice;
