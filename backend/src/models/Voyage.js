const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Voyage Model
 * Represents a tanker voyage carrying bunker fuel cargo
 */
const Voyage = sequelize.define('voyages', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  voyage_number: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: {
      msg: 'Voyage number must be unique'
    },
    validate: {
      notEmpty: { msg: 'Voyage number is required' },
      is: {
        args: /^\d{2}-\d{2}$/,
        msg: 'Voyage number must be in format YY-XX (e.g., 25-01)'
      }
    }
  },
  tanker_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tankers',
      key: 'id'
    },
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  },
  cargoes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of cargo products'
  },
  purchase_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    validate: {
      min: {
        args: [0],
        msg: 'Purchase price must be positive'
      }
    }
  },
  purchase_unit: {
    type: DataTypes.ENUM('MT', 'CBM'),
    allowNull: true,
    defaultValue: 'MT'
  },
  purchase_currency: {
    type: DataTypes.STRING(3),
    allowNull: true,
    defaultValue: 'USD',
    validate: {
      len: {
        args: [3, 3],
        msg: 'Currency code must be 3 characters (e.g., USD, EUR)'
      }
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'active'
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
      name: 'idx_voyages_number',
      unique: true,
      fields: ['voyage_number']
    },
    {
      name: 'idx_voyages_tanker',
      fields: ['tanker_id']
    },
    {
      name: 'idx_voyages_status',
      fields: ['status']
    }
  ]
});

module.exports = Voyage;
