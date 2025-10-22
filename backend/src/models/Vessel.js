const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Vessel Model
 * Represents receiving vessels that order bunker fuel
 */
const Vessel = sequelize.define('vessels', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Vessel name is required' }
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
  call_sign: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: { msg: 'Must be a valid email address' }
    }
  },
  owner: {
    type: DataTypes.STRING(255),
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
      name: 'idx_vessels_name',
      fields: ['name']
    },
    {
      name: 'idx_vessels_imo',
      unique: true,
      fields: ['imo_number']
    }
  ]
});

module.exports = Vessel;
