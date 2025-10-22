const { Vessel, Order } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

/**
 * Get all vessels
 * @route GET /api/vessels
 * @query page, limit, search
 */
const getAllVessels = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  const offset = (page - 1) * limit;

  const whereClause = search
    ? {
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { imo_number: { [Op.iLike]: `%${search}%` } },
          { call_sign: { [Op.iLike]: `%${search}%` } },
          { owner: { [Op.iLike]: `%${search}%` } }
        ]
      }
    : {};

  const { count, rows } = await Vessel.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['name', 'ASC']],
    attributes: {
      exclude: []
    }
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
 * Get vessel by ID
 * @route GET /api/vessels/:id
 */
const getVesselById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const vessel = await Vessel.findByPk(id, {
    include: [
      {
        model: Order,
        as: 'orders',
        attributes: ['id', 'product', 'quantity_mt', 'quantity_cbm', 'delivery_date', 'unit_price', 'currency', 'is_locked']
      }
    ]
  });

  if (!vessel) {
    throw new ApiError('Vessel not found', 404);
  }

  res.json({
    success: true,
    data: vessel
  });
});

/**
 * Search vessels by name
 * @route GET /api/vessels/search?name=
 */
const searchVessels = asyncHandler(async (req, res) => {
  const { name } = req.query;

  if (!name || name.trim().length < 2) {
    return res.json({
      success: true,
      data: []
    });
  }

  const vessels = await Vessel.findAll({
    where: {
      name: { [Op.iLike]: `%${name}%` }
    },
    limit: 10,
    order: [['name', 'ASC']],
    attributes: ['id', 'name', 'imo_number', 'call_sign', 'owner', 'email']
  });

  res.json({
    success: true,
    data: vessels
  });
});

/**
 * Create new vessel
 * @route POST /api/vessels
 */
const createVessel = asyncHandler(async (req, res) => {
  const { name, imo_number, call_sign, email, owner } = req.body;

  // Check if IMO number already exists
  const existingVessel = await Vessel.findOne({ where: { imo_number } });
  if (existingVessel) {
    throw new ApiError(`Vessel with IMO number ${imo_number} already exists`, 409);
  }

  const vessel = await Vessel.create({
    name,
    imo_number,
    call_sign,
    email,
    owner
  });

  res.status(201).json({
    success: true,
    message: 'Vessel created successfully',
    data: vessel
  });
});

/**
 * Update vessel
 * @route PUT /api/vessels/:id
 */
const updateVessel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, imo_number, call_sign, email, owner } = req.body;

  const vessel = await Vessel.findByPk(id);
  if (!vessel) {
    throw new ApiError('Vessel not found', 404);
  }

  // Check if IMO number is being changed and if it already exists
  if (imo_number && imo_number !== vessel.imo_number) {
    const existingVessel = await Vessel.findOne({ where: { imo_number } });
    if (existingVessel) {
      throw new ApiError(`Vessel with IMO number ${imo_number} already exists`, 409);
    }
  }

  await vessel.update({
    name,
    imo_number,
    call_sign,
    email,
    owner
  });

  res.json({
    success: true,
    message: 'Vessel updated successfully',
    data: vessel
  });
});

/**
 * Delete vessel
 * @route DELETE /api/vessels/:id
 */
const deleteVessel = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const vessel = await Vessel.findByPk(id, {
    include: [{ model: Order, as: 'orders' }]
  });

  if (!vessel) {
    throw new ApiError('Vessel not found', 404);
  }

  // Check if vessel has orders
  if (vessel.orders && vessel.orders.length > 0) {
    throw new ApiError('Cannot delete vessel with existing orders', 409);
  }

  await vessel.destroy();

  res.json({
    success: true,
    message: 'Vessel deleted successfully'
  });
});

module.exports = {
  getAllVessels,
  getVesselById,
  searchVessels,
  createVessel,
  updateVessel,
  deleteVessel
};
