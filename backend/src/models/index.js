const { sequelize } = require('../config/database');

// Import all models
const Vessel = require('./Vessel');
const Tanker = require('./Tanker');
const Voyage = require('./Voyage');
const Order = require('./Order');
const CompanySettings = require('./CompanySettings');
const DocumentTemplate = require('./DocumentTemplate');
const SalesOrderConfirmation = require('./SalesOrderConfirmation');
const Invoice = require('./Invoice');
const EmailTemplate = require('./EmailTemplate');
const EmailLog = require('./EmailLog');
const EmailSettings = require('./EmailSettings');
const User = require('./User');
const AuditLog = require('./AuditLog');

/**
 * Define Model Relationships
 */

// Tanker <-> Voyage (One-to-Many)
Tanker.hasMany(Voyage, {
  foreignKey: 'tanker_id',
  as: 'voyages',
  onDelete: 'RESTRICT'
});
Voyage.belongsTo(Tanker, {
  foreignKey: 'tanker_id',
  as: 'tanker'
});

// Vessel <-> Order (One-to-Many)
Vessel.hasMany(Order, {
  foreignKey: 'vessel_id',
  as: 'orders',
  onDelete: 'RESTRICT'
});
Order.belongsTo(Vessel, {
  foreignKey: 'vessel_id',
  as: 'vessel'
});

// Voyage <-> Order (One-to-Many)
Voyage.hasMany(Order, {
  foreignKey: 'voyage_id',
  as: 'orders',
  onDelete: 'SET NULL'
});
Order.belongsTo(Voyage, {
  foreignKey: 'voyage_id',
  as: 'voyage'
});

// Order <-> SalesOrderConfirmation (One-to-Many)
Order.hasMany(SalesOrderConfirmation, {
  foreignKey: 'order_id',
  as: 'sales_order_confirmations',
  onDelete: 'RESTRICT'
});
SalesOrderConfirmation.belongsTo(Order, {
  foreignKey: 'order_id',
  as: 'order'
});

// Order <-> Invoice (One-to-Many)
Order.hasMany(Invoice, {
  foreignKey: 'order_id',
  as: 'invoices',
  onDelete: 'RESTRICT'
});
Invoice.belongsTo(Order, {
  foreignKey: 'order_id',
  as: 'order'
});

// SalesOrderConfirmation <-> Invoice (One-to-Many)
SalesOrderConfirmation.hasMany(Invoice, {
  foreignKey: 'soc_id',
  as: 'invoices',
  onDelete: 'SET NULL'
});
Invoice.belongsTo(SalesOrderConfirmation, {
  foreignKey: 'soc_id',
  as: 'sales_order_confirmation'
});

// User <-> AuditLog (One-to-Many)
User.hasMany(AuditLog, {
  foreignKey: 'user_id',
  as: 'audit_logs',
  onDelete: 'SET NULL'
});
AuditLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

/**
 * Export all models and sequelize instance
 */
module.exports = {
  sequelize,
  Vessel,
  Tanker,
  Voyage,
  Order,
  CompanySettings,
  DocumentTemplate,
  SalesOrderConfirmation,
  Invoice,
  EmailTemplate,
  EmailLog,
  EmailSettings,
  User,
  AuditLog
};
