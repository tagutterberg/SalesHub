const express = require('express');
const router = express.Router();

/**
 * Invoices Routes
 * @todo Implement full controller methods in Phase 2
 */

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Invoice endpoints - Coming in Phase 2' });
});

router.get('/:id', (req, res) => {
  res.json({ success: true, data: null, message: 'Invoice endpoints - Coming in Phase 2' });
});

router.post('/', (req, res) => {
  res.json({ success: true, message: 'Invoice endpoints - Coming in Phase 2' });
});

module.exports = router;
