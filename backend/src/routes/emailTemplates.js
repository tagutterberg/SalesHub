const express = require('express');
const router = express.Router();

/**
 * Email Templates Routes
 * @todo Implement full controller methods in Phase 2
 */

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Email template endpoints - Coming in Phase 2' });
});

router.post('/', (req, res) => {
  res.json({ success: true, message: 'Email template endpoints - Coming in Phase 2' });
});

module.exports = router;
