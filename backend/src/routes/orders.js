const express = require('express');
const router = express.Router();
const {
  getAllOrders,
  getUnassignedOrders,
  getOrderById,
  getOrderDocuments,
  createOrder,
  updateOrder,
  assignOrderToVoyage,
  lockOrder,
  unlockOrder,
  deleteOrder
} = require('../controllers/ordersController');
const { validateOrder, validateId } = require('../middleware/validation');
const { body } = require('express-validator');

/**
 * @route   GET /api/orders/unassigned
 * @desc    Get all unassigned orders (no voyage)
 * @access  Public
 */
router.get('/unassigned', getUnassignedOrders);

/**
 * @route   GET /api/orders
 * @desc    Get all orders with pagination and filters
 * @access  Public
 */
router.get('/', getAllOrders);

/**
 * @route   GET /api/orders/:id
 * @desc    Get order by ID with relationships
 * @access  Public
 */
router.get('/:id', validateId, getOrderById);

/**
 * @route   GET /api/orders/:id/documents
 * @desc    Get all documents (SOC and invoices) for an order
 * @access  Public
 */
router.get('/:id/documents', validateId, getOrderDocuments);

/**
 * @route   POST /api/orders
 * @desc    Create new order
 * @access  Public
 */
router.post('/', validateOrder, createOrder);

/**
 * @route   PUT /api/orders/:id
 * @desc    Update order
 * @access  Public
 */
router.put('/:id', validateId, validateOrder, updateOrder);

/**
 * @route   PUT /api/orders/:id/assign-voyage
 * @desc    Assign order to a voyage
 * @access  Public
 */
router.put(
  '/:id/assign-voyage',
  validateId,
  body('voyage_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Voyage ID must be a positive integer'),
  assignOrderToVoyage
);

/**
 * @route   PUT /api/orders/:id/lock
 * @desc    Lock order (prevent modifications)
 * @access  Public
 */
router.put('/:id/lock', validateId, lockOrder);

/**
 * @route   PUT /api/orders/:id/unlock
 * @desc    Unlock order (allow modifications)
 * @access  Public
 */
router.put('/:id/unlock', validateId, unlockOrder);

/**
 * @route   DELETE /api/orders/:id
 * @desc    Delete order
 * @access  Public
 */
router.delete('/:id', validateId, deleteOrder);

module.exports = router;
