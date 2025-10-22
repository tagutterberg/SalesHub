const { Sequelize } = require('sequelize');
require('dotenv').config();

/**
 * Database Configuration
 * Sets up PostgreSQL connection using Sequelize ORM
 */
const sequelize = new Sequelize(
  process.env.DB_NAME || 'bunker_management',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  }
);

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('✗ Unable to connect to database:', error.message);
    return false;
  }
};

/**
 * Initialize database and create tables
 */
const initializeDatabase = async () => {
  try {
    // Import all models
    require('../models');

    // Sync all models with database
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✓ Database tables synchronized successfully');
    return true;
  } catch (error) {
    console.error('✗ Error initializing database:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  initializeDatabase
};
