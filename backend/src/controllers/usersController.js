const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, role, is_active } = req.query;

  const offset = (page - 1) * limit;

  // Build where clause
  const where = {};

  if (search) {
    where[Op.or] = [
      { first_name: { [Op.iLike]: `%${search}%` } },
      { last_name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (is_active !== undefined) {
    where.is_active = is_active === 'true';
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset,
    order: [['created_at', 'DESC']],
  });

  res.json({
    success: true,
    data: rows,
    page: parseInt(page),
    limit: parseInt(limit),
    total: count,
    totalPages: Math.ceil(count / limit),
  });
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  res.json({
    success: true,
    data: user,
  });
});

// @desc    Create new user
// @route   POST /api/users
// @access  Private/Admin
const createUser = asyncHandler(async (req, res) => {
  const { email, password, first_name, last_name, role } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ where: { email } });
  if (userExists) {
    throw new ApiError('User already exists with this email', 400);
  }

  // Validate password
  if (password.length < 8) {
    throw new ApiError('Password must be at least 8 characters long', 400);
  }

  // Create user
  const user = await User.create({
    email,
    password,
    first_name,
    last_name,
    role: role || 'viewer',
  });

  // Log user creation
  await AuditLog.create({
    user_id: req.user.id,
    action: 'create_user',
    resource_type: 'user',
    resource_id: user.id,
    details: { created_user: user.email, role: user.role },
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get('user-agent'),
  });

  res.status(201).json({
    success: true,
    data: user,
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const { email, first_name, last_name, role, is_active } = req.body;

  const user = await User.findByPk(req.params.id);

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  // Check if email is being changed and if it's already taken
  if (email && email !== user.email) {
    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) {
      throw new ApiError('Email already in use', 400);
    }
  }

  // Prevent users from deactivating themselves
  if (is_active === false && user.id === req.user.id) {
    throw new ApiError('You cannot deactivate your own account', 400);
  }

  // Update fields
  if (email !== undefined) user.email = email;
  if (first_name !== undefined) user.first_name = first_name;
  if (last_name !== undefined) user.last_name = last_name;
  if (role !== undefined) user.role = role;
  if (is_active !== undefined) user.is_active = is_active;

  await user.save();

  // Log user update
  await AuditLog.create({
    user_id: req.user.id,
    action: 'update_user',
    resource_type: 'user',
    resource_id: user.id,
    details: { email, first_name, last_name, role, is_active },
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get('user-agent'),
  });

  res.json({
    success: true,
    data: user,
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  // Prevent users from deleting themselves
  if (user.id === req.user.id) {
    throw new ApiError('You cannot delete your own account', 400);
  }

  await user.destroy();

  // Log user deletion
  await AuditLog.create({
    user_id: req.user.id,
    action: 'delete_user',
    resource_type: 'user',
    resource_id: user.id,
    details: { deleted_user: user.email },
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'User deleted successfully',
  });
});

// @desc    Reset user password (admin only)
// @route   POST /api/users/:id/reset-password
// @access  Private/Admin
const resetUserPassword = asyncHandler(async (req, res) => {
  const { new_password } = req.body;

  if (!new_password || new_password.length < 8) {
    throw new ApiError('Password must be at least 8 characters long', 400);
  }

  const user = await User.findByPk(req.params.id);

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  user.password = new_password;
  await user.save();

  // Log password reset
  await AuditLog.create({
    user_id: req.user.id,
    action: 'reset_user_password',
    resource_type: 'user',
    resource_id: user.id,
    details: { target_user: user.email },
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'Password reset successfully',
  });
});

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
};
