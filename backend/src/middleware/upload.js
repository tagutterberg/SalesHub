const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ApiError } = require('./errorHandler');

/**
 * Create upload directories if they don't exist
 */
const createUploadDirs = () => {
  const dirs = [
    './uploads',
    './uploads/logos',
    './uploads/documents',
    './uploads/documents/invoices',
    './uploads/documents/soc'
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Initialize upload directories
createUploadDirs();

/**
 * Storage configuration for company logos
 */
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/logos');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  }
});

/**
 * File filter for logos (images only)
 */
const logoFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new ApiError('Only image files (JPEG, PNG, SVG) are allowed for logos', 400));
  }
};

/**
 * Multer upload configuration for logos
 */
const uploadLogo = multer({
  storage: logoStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: logoFileFilter
}).single('logo');

/**
 * Storage configuration for document attachments
 */
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/documents');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

/**
 * File filter for document attachments
 */
const documentFileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|xls|xlsx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (extname) {
    return cb(null, true);
  } else {
    cb(new ApiError('Only document files (PDF, DOC, DOCX, XLS, XLSX, TXT) are allowed', 400));
  }
};

/**
 * Multer upload configuration for documents (multiple files)
 */
const uploadDocuments = multer({
  storage: documentStorage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit per file
    files: 5 // Maximum 5 files
  },
  fileFilter: documentFileFilter
}).array('attachments', 5);

/**
 * Delete file helper function
 */
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * Middleware to handle logo upload errors
 */
const handleLogoUpload = (req, res, next) => {
  uploadLogo(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File Too Large',
          message: 'Logo file size must not exceed 2MB'
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Upload Error',
        message: err.message
      });
    } else if (err) {
      return next(err);
    }
    next();
  });
};

/**
 * Middleware to handle document upload errors
 */
const handleDocumentUpload = (req, res, next) => {
  uploadDocuments(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File Too Large',
          message: 'Each attachment must not exceed 25MB'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          error: 'Too Many Files',
          message: 'Maximum 5 attachments allowed'
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Upload Error',
        message: err.message
      });
    } else if (err) {
      return next(err);
    }
    next();
  });
};

module.exports = {
  uploadLogo,
  uploadDocuments,
  handleLogoUpload,
  handleDocumentUpload,
  deleteFile,
  createUploadDirs
};
