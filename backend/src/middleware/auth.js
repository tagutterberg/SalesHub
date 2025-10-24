const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { ApiError, asyncHandler } = require('./errorHandler');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Authenticate user - verify JWT token
const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError('Not authorized, no token provided', 401);
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');

    // Get user from token
    const user = await User.findByPk(decoded.id);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    if (!user.is_active) {
      throw new ApiError('User account is deactivated', 403);
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError('Invalid token', 401);
    }
    if (error.name === 'TokenExpiredError') {
      throw new ApiError('Token expired', 401);
    }
    throw error;
  }
});

// Authorize based on roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError('Not authenticated', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(`Role '${req.user.role}' is not authorized to access this resource`, 403);
    }

    next();
  };
};

// Audit log middleware
const auditLog = (action, resourceType) => {
  return asyncHandler(async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to log after response
    res.json = function(data) {
      // Log the action
      AuditLog.create({
        user_id: req.user ? req.user.id : null,
        action,
        resource_type: resourceType,
        resource_id: data?.id || req.params?.id || null,
        details: {
          method: req.method,
          path: req.path,
          body: req.body,
          query: req.query,
        },
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent'),
        status: 'success',
      }).catch(err => console.error('Audit log error:', err));

      // Call original json method
      return originalJson(data);
    };

    next();
  });
};

// Optional authentication - doesn't fail if no token
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      const user = await User.findByPk(decoded.id);

      if (user && user.is_active) {
        req.user = user;
      }
    } catch (error) {
      // Ignore errors for optional auth
    }
  }

  next();
});

module.exports = {
  generateToken,
  authenticate,
  authorize,
  auditLog,
  optionalAuth,
};
