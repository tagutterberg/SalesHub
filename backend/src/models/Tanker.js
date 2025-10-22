const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Tanker Model
 * Represents supply tankers that deliver bunker fuel
 */
const Tanker = sequelize.define('tankers', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Tanker name is required' }
    }
  },
  imo_number: {
    type: DataTypes.STRING(7),
    allowNull: false,
    unique: {
      msg: 'IMO number must be unique'
    },
    validate: {
      notEmpty: { msg: 'IMO number is required' },
      is: {
        args: /^\d{7}$/,
        msg: 'IMO number must be exactly 7 digits'
      }
    }
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
      name: 'idx_tankers_imo',
      unique: true,
      fields: ['imo_number']
    }
  ]
});

module.exports = Tanker;
