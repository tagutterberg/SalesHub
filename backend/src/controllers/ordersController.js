const { Order, Vessel, Voyage, Tanker, Invoice, SalesOrderConfirmation } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

/**
 * Get all orders
 * @route GET /api/orders
 * @query page, limit, vessel_id, voyage_id, customer, status, locked
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    vessel_id,
    voyage_id,
    customer,
    date_from,
    date_to,
    locked,
    search = ''
  } = req.query;

  const offset = (page - 1) * limit;
  const whereClause = {};

  if (vessel_id) whereClause.vessel_id = vessel_id;
  if (voyage_id) whereClause.voyage_id = voyage_id;
  if (customer) whereClause.customer_company = { [Op.iLike]: `%${customer}%` };
  if (locked !== undefined) whereClause.is_locked = locked === 'true';

  if (date_from && date_to) {
    whereClause.delivery_date = {
      [Op.between]: [date_from, date_to]
    };
  } else if (date_from) {
    whereClause.delivery_date = { [Op.gte]: date_from };
  } else if (date_to) {
    whereClause.delivery_date = { [Op.lte]: date_to };
  }

  if (search) {
    whereClause[Op.or] = [
      { product: { [Op.iLike]: `%${search}%` } },
      { customer_company: { [Op.iLike]: `%${search}%` } },
      { notes: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const { count, rows } = await Order.findAndCountAll({
    where: whereClause,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['delivery_date', 'DESC']],
    include: [
      {
        model: Vessel,
        as: 'vessel',
        attributes: ['id', 'name', 'imo_number', 'call_sign']
      },
      {
        model: Voyage,
        as: 'voyage',
        attributes: ['id', 'voyage_number', 'status'],
        include: [
          {
            model: Tanker,
            as: 'tanker',
            attributes: ['id', 'name']
          }
        ]
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
 * Get unassigned orders (no voyage assigned)
 * @route GET /api/orders/unassigned
 */
const getUnassignedOrders = asyncHandler(async (req, res) => {
  const orders = await Order.findAll({
    where: {
      voyage_id: null,
      is_locked: false
    },
    include: [
      {
        model: Vessel,
        as: 'vessel',
        attributes: ['id', 'name', 'imo_number']
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
 * Get order by ID
 * @route GET /api/orders/:id
 */
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findByPk(id, {
    include: [
      {
        model: Vessel,
        as: 'vessel'
      },
      {
        model: Voyage,
        as: 'voyage',
        include: [
          {
            model: Tanker,
            as: 'tanker'
          }
        ]
      }
    ]
  });

  if (!order) {
    throw new ApiError('Order not found', 404);
  }

  res.json({
    success: true,
    data: order
  });
});

/**
 * Get documents for an order (SOC and Invoices)
 * @route GET /api/orders/:id/documents
 */
const getOrderDocuments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findByPk(id);
  if (!order) {
    throw new ApiError('Order not found', 404);
  }

  const [socs, invoices] = await Promise.all([
    SalesOrderConfirmation.findAll({
      where: { order_id: id },
      order: [['created_at', 'DESC']]
    }),
    Invoice.findAll({
      where: { order_id: id },
      order: [['created_at', 'DESC']]
    })
  ]);

  res.json({
    success: true,
    data: {
      sales_order_confirmations: socs,
      invoices: invoices
    }
  });
});

/**
 * Create new order
 * @route POST /api/orders
 */
const createOrder = asyncHandler(async (req, res) => {
  const {
    vessel_id,
    voyage_id,
    product,
    quantity_mt,
    quantity_cbm,
    delivery_date,
    unit_price,
    price_unit,
    currency,
    customer_company,
    notes
  } = req.body;

  // Verify vessel exists
  const vessel = await Vessel.findByPk(vessel_id);
  if (!vessel) {
    throw new ApiError('Vessel not found', 404);
  }

  // Verify voyage exists if provided
  if (voyage_id) {
    const voyage = await Voyage.findByPk(voyage_id);
    if (!voyage) {
      throw new ApiError('Voyage not found', 404);
    }
  }

  const order = await Order.create({
    vessel_id,
    voyage_id,
    product,
    quantity_mt,
    quantity_cbm,
    delivery_date,
    unit_price,
    price_unit,
    currency,
    customer_company,
    notes,
    is_locked: false
  });

  // Fetch with relationships
  const orderWithDetails = await Order.findByPk(order.id, {
    include: [
      {
        model: Vessel,
        as: 'vessel',
        attributes: ['id', 'name', 'imo_number']
      },
      {
        model: Voyage,
        as: 'voyage',
        attributes: ['id', 'voyage_number']
      }
    ]
  });

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: orderWithDetails
  });
});

/**
 * Update order
 * @route PUT /api/orders/:id
 */
const updateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    vessel_id,
    voyage_id,
    product,
    quantity_mt,
    quantity_cbm,
    delivery_date,
    unit_price,
    price_unit,
    currency,
    customer_company,
    notes
  } = req.body;

  const order = await Order.findByPk(id);
  if (!order) {
    throw new ApiError('Order not found', 404);
  }

  // Check if order is locked
  if (order.is_locked) {
    throw new ApiError('Cannot modify locked order. Unlock the order first.', 403);
  }

  // Verify vessel exists if being changed
  if (vessel_id && vessel_id !== order.vessel_id) {
    const vessel = await Vessel.findByPk(vessel_id);
    if (!vessel) {
      throw new ApiError('Vessel not found', 404);
    }
  }

  // Verify voyage exists if being changed
  if (voyage_id && voyage_id !== order.voyage_id) {
    const voyage = await Voyage.findByPk(voyage_id);
    if (!voyage) {
      throw new ApiError('Voyage not found', 404);
    }
  }

  await order.update({
    vessel_id,
    voyage_id,
    product,
    quantity_mt,
    quantity_cbm,
    delivery_date,
    unit_price,
    price_unit,
    currency,
    customer_company,
    notes
  });

  // Fetch with relationships
  const updatedOrder = await Order.findByPk(id, {
    include: [
      {
        model: Vessel,
        as: 'vessel'
      },
      {
        model: Voyage,
        as: 'voyage'
      }
    ]
  });

  res.json({
    success: true,
    message: 'Order updated successfully',
    data: updatedOrder
  });
});

/**
 * Assign order to voyage
 * @route PUT /api/orders/:id/assign-voyage
 */
const assignOrderToVoyage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { voyage_id } = req.body;

  const order = await Order.findByPk(id);
  if (!order) {
    throw new ApiError('Order not found', 404);
  }

  // Warning if order is locked
  if (order.is_locked) {
    throw new ApiError('Warning: Order is locked. Unlock before reassigning to a different voyage.', 403);
  }

  // Verify voyage exists
  if (voyage_id) {
    const voyage = await Voyage.findByPk(voyage_id);
    if (!voyage) {
      throw new ApiError('Voyage not found', 404);
    }
  }

  await order.update({ voyage_id });

  // Fetch with relationships
  const updatedOrder = await Order.findByPk(id, {
    include: [
      {
        model: Vessel,
        as: 'vessel'
      },
      {
        model: Voyage,
        as: 'voyage',
        include: [{ model: Tanker, as: 'tanker' }]
      }
    ]
  });

  res.json({
    success: true,
    message: 'Order assigned to voyage successfully',
    data: updatedOrder
  });
});

/**
 * Lock order
 * @route PUT /api/orders/:id/lock
 */
const lockOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findByPk(id);
  if (!order) {
    throw new ApiError('Order not found', 404);
  }

  if (order.is_locked) {
    throw new ApiError('Order is already locked', 400);
  }

  await order.update({ is_locked: true });

  res.json({
    success: true,
    message: 'Order locked successfully',
    data: order
  });
});

/**
 * Unlock order
 * @route PUT /api/orders/:id/unlock
 */
const unlockOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findByPk(id, {
    include: [
      {
        model: Invoice,
        as: 'invoices',
        where: { payment_status: { [Op.in]: ['sent', 'confirmed'] } },
        required: false
      }
    ]
  });

  if (!order) {
    throw new ApiError('Order not found', 404);
  }

  if (!order.is_locked) {
    throw new ApiError('Order is not locked', 400);
  }

  // Check if invoice has been sent
  if (order.invoices && order.invoices.length > 0) {
    throw new ApiError('Cannot unlock order: Invoice has been sent', 403);
  }

  await order.update({ is_locked: false });

  res.json({
    success: true,
    message: 'Order unlocked successfully',
    data: order
  });
});

/**
 * Delete order
 * @route DELETE /api/orders/:id
 */
const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findByPk(id, {
    include: [
      {
        model: Invoice,
        as: 'invoices',
        where: { payment_status: 'paid' },
        required: false
      }
    ]
  });

  if (!order) {
    throw new ApiError('Order not found', 404);
  }

  // Check if order has paid invoices
  if (order.invoices && order.invoices.length > 0) {
    throw new ApiError('Cannot delete order with paid invoices', 409);
  }

  await order.destroy();

  res.json({
    success: true,
    message: 'Order deleted successfully'
  });
});

module.exports = {
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
};
