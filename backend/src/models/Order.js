const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Order Model
 * Represents a bunker fuel order from a vessel
 */
const Order = sequelize.define('orders', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  vessel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'vessels',
      key: 'id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  voyage_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'voyages',
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  product: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Product is required' }
    }
  },
  quantity_mt: {
    type: DataTypes.DECIMAL(12, 3),
    allowNull: true,
    validate: {
      min: {
        args: [0],
        msg: 'Quantity MT must be positive'
      }
    }
  },
  quantity_cbm: {
    type: DataTypes.DECIMAL(12, 3),
    allowNull: true,
    validate: {
      min: {
        args: [0],
        msg: 'Quantity CBM must be positive'
      }
    }
  },
  delivery_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Delivery date is required' },
      isDate: { msg: 'Must be a valid date' }
    }
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Unit price is required' },
      min: {
        args: [0],
        msg: 'Unit price must be positive'
      }
    }
  },
  price_unit: {
    type: DataTypes.ENUM('MT', 'CBM'),
    allowNull: false,
    defaultValue: 'MT'
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
    validate: {
      len: {
        args: [3, 3],
        msg: 'Currency code must be 3 characters (e.g., USD, EUR)'
      }
    }
  },
  customer_company: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Customer company is required' }
    }
  },
  is_locked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Locked orders cannot be modified or reassigned'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
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
      name: 'idx_orders_vessel',
      fields: ['vessel_id']
    },
    {
      name: 'idx_orders_voyage',
      fields: ['voyage_id']
    },
    {
      name: 'idx_orders_delivery_date',
      fields: ['delivery_date']
    },
    {
      name: 'idx_orders_locked',
      fields: ['is_locked']
    }
  ],
  validate: {
    /**
     * Custom validation: At least one quantity (MT or CBM) must be provided
     */
    atLeastOneQuantity() {
      if (!this.quantity_mt && !this.quantity_cbm) {
        throw new Error('At least one quantity (MT or CBM) is required');
      }
    }
  }
});

module.exports = Order;
