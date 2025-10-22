const { Voyage, Tanker, Order, Vessel } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

/**
 * Get all voyages
 * @route GET /api/voyages
 * @query page, limit, status, search
 */
const getAllVoyages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search = '' } = req.query;
  const offset = (page - 1) * limit;

  const whereClause = {};

  if (status) {
    whereClause.status = status;
  }

  if (search) {
    whereClause[Op.or] = [
      { voyage_number: { [Op.iLike]: `%${search}%` } },
      { cargoes: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const { count, rows } = await Voyage.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['voyage_number', 'DESC']],
    include: [
      {
        model: Tanker,
        as: 'tanker',
        attributes: ['id', 'name', 'imo_number']
      }
    ]
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
 * Get voyage by ID with orders
 * @route GET /api/voyages/:id
 */
const getVoyageById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const voyage = await Voyage.findByPk(id, {
    include: [
      {
        model: Tanker,
        as: 'tanker',
        attributes: ['id', 'name', 'imo_number']
      },
      {
        model: Order,
        as: 'orders',
        include: [
          {
            model: Vessel,
            as: 'vessel',
            attributes: ['id', 'name', 'imo_number']
          }
        ]
      }
    ]
  });

  if (!voyage) {
    throw new ApiError('Voyage not found', 404);
  }

  res.json({
    success: true,
    data: voyage
  });
});

/**
 * Get orders for a specific voyage
 * @route GET /api/voyages/:id/orders
 */
const getVoyageOrders = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const voyage = await Voyage.findByPk(id);
  if (!voyage) {
    throw new ApiError('Voyage not found', 404);
  }

  const orders = await Order.findAll({
    where: { voyage_id: id },
    include: [
      {
        model: Vessel,
        as: 'vessel',
        attributes: ['id', 'name', 'imo_number', 'call_sign']
      }
    ],
    order: [['delivery_date', 'ASC']]
  });

  res.json({
    success: true,
    data: orders
  });
});

/**
 * Get next voyage number suggestion
 * @route GET /api/voyages/next-number
 */
const getNextVoyageNumber = asyncHandler(async (req, res) => {
  const currentYear = new Date().getFullYear().toString().slice(-2); // Get last 2 digits of year

  // Find the latest voyage number for current year
  const latestVoyage = await Voyage.findOne({
    where: {
      voyage_number: {
        [Op.like]: `${currentYear}-%`
      }
    },
    order: [['voyage_number', 'DESC']]
  });

  let nextNumber = 1;
  if (latestVoyage) {
    const lastNumber = parseInt(latestVoyage.voyage_number.split('-')[1]);
    nextNumber = lastNumber + 1;
  }

  const suggestedNumber = `${currentYear}-${nextNumber.toString().padStart(2, '0')}`;

  res.json({
    success: true,
    data: {
      suggested_number: suggestedNumber,
      year: currentYear,
      sequence: nextNumber
    }
  });
});

/**
 * Create new voyage
 * @route POST /api/voyages
 */
const createVoyage = asyncHandler(async (req, res) => {
  const {
    voyage_number,
    tanker_id,
    cargoes,
    purchase_price,
    purchase_unit,
    purchase_currency,
    status
  } = req.body;

  // Check if voyage number already exists
  const existingVoyage = await Voyage.findOne({ where: { voyage_number } });
  if (existingVoyage) {
    throw new ApiError(`Voyage number ${voyage_number} already exists`, 409);
  }

  // Verify tanker exists
  const tanker = await Tanker.findByPk(tanker_id);
  if (!tanker) {
    throw new ApiError('Tanker not found', 404);
  }

  const voyage = await Voyage.create({
    voyage_number,
    tanker_id,
    cargoes,
    purchase_price,
    purchase_unit,
    purchase_currency,
    status: status || 'active'
  });

  // Fetch with tanker details
  const voyageWithTanker = await Voyage.findByPk(voyage.id, {
    include: [
      {
        model: Tanker,
        as: 'tanker',
        attributes: ['id', 'name', 'imo_number']
      }
    ]
  });

  res.status(201).json({
    success: true,
    message: 'Voyage created successfully',
    data: voyageWithTanker
  });
});

/**
 * Update voyage
 * @route PUT /api/voyages/:id
 */
const updateVoyage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    voyage_number,
    tanker_id,
    cargoes,
    purchase_price,
    purchase_unit,
    purchase_currency,
    status
  } = req.body;

  const voyage = await Voyage.findByPk(id);
  if (!voyage) {
    throw new ApiError('Voyage not found', 404);
  }

  // Check if voyage number is being changed and if it already exists
  if (voyage_number && voyage_number !== voyage.voyage_number) {
    const existingVoyage = await Voyage.findOne({ where: { voyage_number } });
    if (existingVoyage) {
      throw new ApiError(`Voyage number ${voyage_number} already exists`, 409);
    }
  }

  // Verify tanker exists if being changed
  if (tanker_id && tanker_id !== voyage.tanker_id) {
    const tanker = await Tanker.findByPk(tanker_id);
    if (!tanker) {
      throw new ApiError('Tanker not found', 404);
    }
  }

  await voyage.update({
    voyage_number,
    tanker_id,
    cargoes,
    purchase_price,
    purchase_unit,
    purchase_currency,
    status
  });

  // Fetch with tanker details
  const updatedVoyage = await Voyage.findByPk(id, {
    include: [
      {
        model: Tanker,
        as: 'tanker',
        attributes: ['id', 'name', 'imo_number']
      }
    ]
  });

  res.json({
    success: true,
    message: 'Voyage updated successfully',
    data: updatedVoyage
  });
});

/**
 * Delete voyage
 * @route DELETE /api/voyages/:id
 */
const deleteVoyage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const voyage = await Voyage.findByPk(id, {
    include: [
      {
        model: Order,
        as: 'orders',
        where: { is_locked: true },
        required: false
      }
    ]
  });

  if (!voyage) {
    throw new ApiError('Voyage not found', 404);
  }

  // Check if voyage has locked orders
  if (voyage.orders && voyage.orders.length > 0) {
    throw new ApiError('Cannot delete voyage with locked orders', 409);
  }

  // Set voyage_id to null for all orders before deleting
  await Order.update(
    { voyage_id: null },
    { where: { voyage_id: id } }
  );

  await voyage.destroy();

  res.json({
    success: true,
    message: 'Voyage deleted successfully'
  });
});

module.exports = {
  getAllVoyages,
  getVoyageById,
  getVoyageOrders,
  getNextVoyageNumber,
  createVoyage,
  updateVoyage,
  deleteVoyage
};
