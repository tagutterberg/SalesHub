const { Tanker, Voyage } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

/**
 * Get all tankers
 * @route GET /api/tankers
 * @query page, limit, search
 */
const getAllTankers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  const offset = (page - 1) * limit;

  const whereClause = search
    ? {
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { imo_number: { [Op.iLike]: `%${search}%` } }
        ]
      }
    : {};

  const { count, rows } = await Tanker.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['name', 'ASC']]
  });

  res.json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    }
  });
});

/**
 * Get tanker by ID
 * @route GET /api/tankers/:id
 */
const getTankerById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const tanker = await Tanker.findByPk(id, {
    include: [
      {
        model: Voyage,
        as: 'voyages',
        attributes: ['id', 'voyage_number', 'status', 'cargoes', 'created_at']
      }
    ]
  });

  if (!tanker) {
    throw new ApiError('Tanker not found', 404);
  }

  res.json({
    success: true,
    data: tanker
  });
});

/**
 * Create new tanker
 * @route POST /api/tankers
 */
const createTanker = asyncHandler(async (req, res) => {
  const { name, imo_number } = req.body;

  // Check if IMO number already exists
  const existingTanker = await Tanker.findOne({ where: { imo_number } });
  if (existingTanker) {
    throw new ApiError(`Tanker with IMO number ${imo_number} already exists`, 409);
  }

  const tanker = await Tanker.create({
    name,
    imo_number
  });

  res.status(201).json({
    success: true,
    message: 'Tanker created successfully',
    data: tanker
  });
});

/**
 * Update tanker
 * @route PUT /api/tankers/:id
 */
const updateTanker = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, imo_number } = req.body;

  const tanker = await Tanker.findByPk(id);
  if (!tanker) {
    throw new ApiError('Tanker not found', 404);
  }

  // Check if IMO number is being changed and if it already exists
  if (imo_number && imo_number !== tanker.imo_number) {
    const existingTanker = await Tanker.findOne({ where: { imo_number } });
    if (existingTanker) {
      throw new ApiError(`Tanker with IMO number ${imo_number} already exists`, 409);
    }
  }

  await tanker.update({
    name,
    imo_number
  });

  res.json({
    success: true,
    message: 'Tanker updated successfully',
    data: tanker
  });
});

/**
 * Delete tanker
 * @route DELETE /api/tankers/:id
 */
const deleteTanker = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const tanker = await Tanker.findByPk(id, {
    include: [{ model: Voyage, as: 'voyages' }]
  });

  if (!tanker) {
    throw new ApiError('Tanker not found', 404);
  }

  // Check if tanker has voyages
  if (tanker.voyages && tanker.voyages.length > 0) {
    throw new ApiError('Cannot delete tanker with existing voyages', 409);
  }

  await tanker.destroy();

  res.json({
    success: true,
    message: 'Tanker deleted successfully'
  });
});

module.exports = {
  getAllTankers,
  getTankerById,
  createTanker,
  updateTanker,
  deleteTanker
};
