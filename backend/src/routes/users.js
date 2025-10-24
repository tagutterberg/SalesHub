const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
} = require('../controllers/usersController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

// Validation rules
const createUserValidation = [
  body('email').isEmail().withMessage('Must be a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'viewer'])
    .withMessage('Invalid role'),
  handleValidationErrors,
];

const updateUserValidation = [
  body('email').optional().isEmail().withMessage('Must be a valid email'),
  body('first_name').optional().notEmpty().withMessage('First name cannot be empty'),
  body('last_name').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'viewer'])
    .withMessage('Invalid role'),
  body('is_active').optional().isBoolean().withMessage('Must be a boolean'),
  handleValidationErrors,
];

// All user routes require admin access
router.use(authenticate, authorize('admin'));

// Routes
router.get('/', getAllUsers);
router.post('/', createUserValidation, createUser);
router.get('/:id', getUserById);
router.put('/:id', updateUserValidation, updateUser);
router.delete('/:id', deleteUser);
router.post('/:id/reset-password', resetUserPassword);

module.exports = router;
