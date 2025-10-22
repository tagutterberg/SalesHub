const express = require('express');
const router = express.Router();
const {
  getAllVessels,
  getVesselById,
  searchVessels,
  createVessel,
  updateVessel,
  deleteVessel
} = require('../controllers/vesselsController');
const { validateVessel, validateId } = require('../middleware/validation');

/**
 * @route   GET /api/vessels/search
 * @desc    Search vessels by name (autocomplete)
 * @access  Public
 */
router.get('/search', searchVessels);

/**
 * @route   GET /api/vessels
 * @desc    Get all vessels with pagination and search
 * @access  Public
 */
router.get('/', getAllVessels);

/**
 * @route   GET /api/vessels/:id
 * @desc    Get vessel by ID with related orders
 * @access  Public
 */
router.get('/:id', validateId, getVesselById);

/**
 * @route   POST /api/vessels
 * @desc    Create new vessel
 * @access  Public
 */
router.post('/', validateVessel, createVessel);

/**
 * @route   PUT /api/vessels/:id
 * @desc    Update vessel
 * @access  Public
 */
router.put('/:id', validateId, validateVessel, updateVessel);

/**
 * @route   DELETE /api/vessels/:id
 * @desc    Delete vessel
 * @access  Public
 */
router.delete('/:id', validateId, deleteVessel);

module.exports = router;
