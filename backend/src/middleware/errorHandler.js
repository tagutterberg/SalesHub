const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');

/**
 * Global Error Handler Middleware
 * Catches all errors and returns appropriate responses
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Sequelize Validation Error
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message,
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message,
        value: e.value
      }))
    });
  }

  // Sequelize Unique Constraint Error
  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate Entry',
      message: 'A record with this value already exists',
      details: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Sequelize Foreign Key Constraint Error
  if (err instanceof ForeignKeyConstraintError) {
    return res.status(409).json({
      success: false,
      error: 'Foreign Key Constraint',
      message: 'Cannot perform this operation due to related records',
      details: err.message
    });
  }

  // Custom API Errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.name || 'Error',
      message: err.message
    });
  }

  // Default Internal Server Error
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
};

/**
 * Not Found Handler
 * Handles 404 errors for unknown routes
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
};

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors automatically
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Custom API Error Class
 */
class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ApiError
};
