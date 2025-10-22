const express = require('express');
const router = express.Router();
const {
  getCompanySettings,
  updateCompanySettings,
  uploadCompanyLogo,
  deleteCompanyLogo
} = require('../controllers/companySettingsController');
const { validateCompanySettings } = require('../middleware/validation');
const { handleLogoUpload } = require('../middleware/upload');

/**
 * @route   GET /api/settings/company
 * @desc    Get company settings
 * @access  Public
 */
router.get('/', getCompanySettings);

/**
 * @route   PUT /api/settings/company
 * @desc    Update company settings
 * @access  Public
 */
router.put('/', validateCompanySettings, updateCompanySettings);

/**
 * @route   POST /api/settings/company/logo
 * @desc    Upload company logo
 * @access  Public
 */
router.post('/logo', handleLogoUpload, uploadCompanyLogo);

/**
 * @route   DELETE /api/settings/company/logo
 * @desc    Delete company logo
 * @access  Public
 */
router.delete('/logo', deleteCompanyLogo);

module.exports = router;
