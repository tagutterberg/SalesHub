const express = require('express');
const router = express.Router();
const {
  getAllTankers,
  getTankerById,
  createTanker,
  updateTanker,
  deleteTanker
} = require('../controllers/tankersController');
const { validateTanker, validateId } = require('../middleware/validation');

/**
 * @route   GET /api/tankers
 * @desc    Get all tankers with pagination and search
 * @access  Public
 */
router.get('/', getAllTankers);

/**
 * @route   GET /api/tankers/:id
 * @desc    Get tanker by ID with related voyages
 * @access  Public
 */
router.get('/:id', validateId, getTankerById);

/**
 * @route   POST /api/tankers
 * @desc    Create new tanker
 * @access  Public
 */
router.post('/', validateTanker, createTanker);

/**
 * @route   PUT /api/tankers/:id
 * @desc    Update tanker
 * @access  Public
 */
router.put('/:id', validateId, validateTanker, updateTanker);

/**
 * @route   DELETE /api/tankers/:id
 * @desc    Delete tanker
 * @access  Public
 */
router.delete('/:id', validateId, deleteTanker);

module.exports = router;
