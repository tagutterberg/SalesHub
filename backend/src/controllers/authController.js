const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');
const { generateToken } = require('../middleware/auth');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public (or Admin only in production)
const register = asyncHandler(async (req, res) => {
  const { email, password, first_name, last_name, role } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ where: { email } });
  if (userExists) {
    throw new ApiError('User already exists with this email', 400);
  }

  // Validate password strength
  if (password.length < 8) {
    throw new ApiError('Password must be at least 8 characters long', 400);
  }

  // Only admins can create admin/manager users
  let userRole = 'viewer';
  if (role && req.user && req.user.role === 'admin') {
    userRole = role;
  }

  // Create user
  const user = await User.create({
    email,
    password,
    first_name,
    last_name,
    role: userRole,
  });

  // Log registration
  await AuditLog.create({
    user_id: user.id,
    action: 'register',
    resource_type: 'user',
    resource_id: user.id,
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get('user-agent'),
  });

  // Generate token
  const token = generateToken(user.id);

  res.status(201).json({
    success: true,
    data: {
      user,
      token,
    },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw new ApiError('Please provide email and password', 400);
  }

  // Find user (include password for comparison)
  const user = await User.findOne({ where: { email } });

  if (!user) {
    // Log failed login attempt
    await AuditLog.create({
      action: 'login',
      resource_type: 'user',
      details: { email },
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('user-agent'),
      status: 'failure',
      error_message: 'Invalid credentials',
    });

    throw new ApiError('Invalid credentials', 401);
  }

  // Check if account is active
  if (!user.is_active) {
    throw new ApiError('Account is deactivated', 403);
  }

  // Compare password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    // Log failed login attempt
    await AuditLog.create({
      user_id: user.id,
      action: 'login',
      resource_type: 'user',
      resource_id: user.id,
      details: { email },
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('user-agent'),
      status: 'failure',
      error_message: 'Invalid credentials',
    });

    throw new ApiError('Invalid credentials', 401);
  }

  // Update last login
  await user.update({ last_login: new Date() });

  // Log successful login
  await AuditLog.create({
    user_id: user.id,
    action: 'login',
    resource_type: 'user',
    resource_id: user.id,
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get('user-agent'),
  });

  // Generate token
  const token = generateToken(user.id);

  res.json({
    success: true,
    data: {
      user,
      token,
    },
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);

  res.json({
    success: true,
    data: user,
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { first_name, last_name, email } = req.body;

  const user = await User.findByPk(req.user.id);

  // Check if email is being changed and if it's already taken
  if (email && email !== user.email) {
    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) {
      throw new ApiError('Email already in use', 400);
    }
  }

  // Update fields
  if (first_name) user.first_name = first_name;
  if (last_name) user.last_name = last_name;
  if (email) user.email = email;

  await user.save();

  // Log profile update
  await AuditLog.create({
    user_id: user.id,
    action: 'update_profile',
    resource_type: 'user',
    resource_id: user.id,
    details: { first_name, last_name, email },
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get('user-agent'),
  });

  res.json({
    success: true,
    data: user,
  });
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    throw new ApiError('Please provide current and new password', 400);
  }

  if (new_password.length < 8) {
    throw new ApiError('New password must be at least 8 characters long', 400);
  }

  const user = await User.findByPk(req.user.id);

  // Verify current password
  const isPasswordValid = await user.comparePassword(current_password);

  if (!isPasswordValid) {
    throw new ApiError('Current password is incorrect', 401);
  }

  // Update password
  user.password = new_password;
  await user.save();

  // Log password change
  await AuditLog.create({
    user_id: user.id,
    action: 'change_password',
    resource_type: 'user',
    resource_id: user.id,
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  // Log logout
  await AuditLog.create({
    user_id: req.user.id,
    action: 'logout',
    resource_type: 'user',
    resource_id: req.user.id,
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
};
