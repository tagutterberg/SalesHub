const express = require('express');
const router = express.Router();
const {
  getAllVoyages,
  getVoyageById,
  getVoyageOrders,
  getNextVoyageNumber,
  createVoyage,
  updateVoyage,
  deleteVoyage
} = require('../controllers/voyagesController');
const { validateVoyage, validateId } = require('../middleware/validation');

/**
 * @route   GET /api/voyages/next-number
 * @desc    Get suggested next voyage number
 * @access  Public
 */
router.get('/next-number', getNextVoyageNumber);

/**
 * @route   GET /api/voyages
 * @desc    Get all voyages with pagination and filters
 * @access  Public
 */
router.get('/', getAllVoyages);

/**
 * @route   GET /api/voyages/:id
 * @desc    Get voyage by ID with tanker and orders
 * @access  Public
 */
router.get('/:id', validateId, getVoyageById);

/**
 * @route   GET /api/voyages/:id/orders
 * @desc    Get all orders for a specific voyage
 * @access  Public
 */
router.get('/:id/orders', validateId, getVoyageOrders);

/**
 * @route   POST /api/voyages
 * @desc    Create new voyage
 * @access  Public
 */
router.post('/', validateVoyage, createVoyage);

/**
 * @route   PUT /api/voyages/:id
 * @desc    Update voyage
 * @access  Public
 */
router.put('/:id', validateId, validateVoyage, updateVoyage);

/**
 * @route   DELETE /api/voyages/:id
 * @desc    Delete voyage
 * @access  Public
 */
router.delete('/:id', validateId, deleteVoyage);

module.exports = router;
