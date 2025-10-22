const express = require('express');
const router = express.Router();

/**
 * Dashboard Routes
 * @todo Implement full controller methods in Phase 2
 */

router.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      total_orders: 0,
      total_voyages: 0,
      total_invoices: 0,
      overdue_invoices: 0,
      recent_orders: [],
      revenue_stats: {}
    },
    message: 'Dashboard endpoints - Coming in Phase 2'
  });
});

module.exports = router;
