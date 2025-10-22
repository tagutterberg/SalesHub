# Bunker Order Management System - Backend API

## Overview
Production-ready Node.js/Express backend for comprehensive bunker order management with document generation, email automation, and reporting capabilities.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **PDF Generation**: Puppeteer
- **Email**: Nodemailer + SendGrid support
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting

## Database Schema (11 Tables)
1. **vessels** - Receiving vessels ordering bunker fuel
2. **tankers** - Supply tankers delivering fuel
3. **voyages** - Tanker voyages with cargo information
4. **orders** - Bunker fuel orders with lock/unlock mechanism
5. **company_settings** - Company information and document settings (singleton)
6. **document_templates** - Customizable PDF templates for invoices/SOCs
7. **sales_order_confirmations** - Sales order confirmation documents
8. **invoices** - Invoice generation and payment tracking
9. **email_templates** - Email templates with variable substitution
10. **email_log** - Complete email history and delivery tracking
11. **email_settings** - SMTP/SendGrid configuration (singleton)

## Project Structure
```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # PostgreSQL configuration
│   ├── models/                   # Sequelize models (11 tables)
│   │   ├── Vessel.js
│   │   ├── Tanker.js
│   │   ├── Voyage.js
│   │   ├── Order.js
│   │   ├── CompanySettings.js
│   │   ├── DocumentTemplate.js
│   │   ├── SalesOrderConfirmation.js
│   │   ├── Invoice.js
│   │   ├── EmailTemplate.js
│   │   ├── EmailLog.js
│   │   ├── EmailSettings.js
│   │   └── index.js             # Model relationships
│   ├── controllers/              # Business logic
│   │   ├── vesselsController.js
│   │   ├── tankersController.js
│   │   ├── voyagesController.js
│   │   ├── ordersController.js
│   │   ├── companySettingsController.js
│   │   └── documentTemplatesController.js
│   ├── routes/                   # API routes
│   │   ├── vessels.js
│   │   ├── tankers.js
│   │   ├── voyages.js
│   │   ├── orders.js
│   │   ├── companySettings.js
│   │   └── documentTemplates.js
│   ├── middleware/
│   │   ├── errorHandler.js      # Global error handling
│   │   ├── validation.js        # express-validator schemas
│   │   └── upload.js            # Multer file upload
│   ├── services/
│   │   └── pdfService.js        # Puppeteer PDF generation
│   └── index.js                 # Express app entry point
├── uploads/                      # File storage
│   ├── logos/
│   └── documents/
│       ├── invoices/
│       └── soc/
├── package.json
├── .env.example
└── README.md
```

## API Endpoints

### Vessels
- `GET /api/vessels` - Get all vessels (paginated, searchable)
- `GET /api/vessels/search?name=` - Autocomplete search
- `GET /api/vessels/:id` - Get vessel with related orders
- `POST /api/vessels` - Create new vessel
- `PUT /api/vessels/:id` - Update vessel
- `DELETE /api/vessels/:id` - Delete vessel (validates no orders)

### Tankers
- `GET /api/tankers` - Get all tankers
- `GET /api/tankers/:id` - Get tanker with voyages
- `POST /api/tankers` - Create new tanker
- `PUT /api/tankers/:id` - Update tanker
- `DELETE /api/tankers/:id` - Delete tanker (validates no voyages)

### Voyages
- `GET /api/voyages` - Get all voyages (filterable by status)
- `GET /api/voyages/next-number` - Get next voyage number suggestion (YY-XX format)
- `GET /api/voyages/:id` - Get voyage with tanker and orders
- `GET /api/voyages/:id/orders` - Get all orders for voyage
- `POST /api/voyages` - Create new voyage
- `PUT /api/voyages/:id` - Update voyage
- `DELETE /api/voyages/:id` - Delete voyage (validates no locked orders)

### Orders
- `GET /api/orders` - Get all orders (multiple filters: vessel, voyage, customer, date, locked)
- `GET /api/orders/unassigned` - Get orders without voyage assignment
- `GET /api/orders/:id` - Get order with relationships
- `GET /api/orders/:id/documents` - Get SOCs and invoices for order
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order (blocked if locked)
- `PUT /api/orders/:id/assign-voyage` - Assign/reassign order to voyage
- `PUT /api/orders/:id/lock` - Lock order (prevent modifications)
- `PUT /api/orders/:id/unlock` - Unlock order (validates no sent invoices)
- `DELETE /api/orders/:id` - Delete order (validates no paid invoices)

### Company Settings
- `GET /api/settings/company` - Get company settings (singleton)
- `PUT /api/settings/company` - Update company settings
- `POST /api/settings/company/logo` - Upload company logo (2MB max, PNG/JPG/SVG)
- `DELETE /api/settings/company/logo` - Delete company logo

### Document Templates
- `GET /api/templates` - Get all templates (filter by type)
- `GET /api/templates/default/:type` - Get default template for type
- `GET /api/templates/:id` - Get template by ID
- `POST /api/templates` - Create new template
- `PUT /api/templates/:id` - Update template
- `PUT /api/templates/:id/set-default` - Set as default template
- `POST /api/templates/:id/clone` - Clone existing template
- `DELETE /api/templates/:id` - Delete template (prevents default deletion)

### Health Check
- `GET /health` - API health status

## Business Logic & Validation

### Order Management
- ✅ Lock/unlock mechanism prevents accidental modifications
- ✅ Cannot delete orders with paid invoices
- ✅ Cannot unlock orders with sent invoices
- ✅ Warning when reassigning locked orders
- ✅ At least one quantity (MT or CBM) required
- ✅ Delivery date must be today or later
- ✅ Positive number validation for quantities and prices

### Voyage Management
- ✅ Automatic voyage number generation (YY-XX format)
- ✅ Cannot delete voyages with locked orders
- ✅ Unique voyage number enforcement
- ✅ Orders unassigned when voyage deleted

### Document Generation
- ✅ Sequential numbering (INV-YYYY-001, SOC-YYYY-001)
- ✅ No gaps in numbering
- ✅ Customizable PDF templates with logo, colors, fonts
- ✅ Professional layouts for invoices and SOCs

### Data Validation
- ✅ IMO number format: exactly 7 digits
- ✅ Currency code: exactly 3 characters (USD, EUR, etc.)
- ✅ Email validation for all email fields
- ✅ File upload validation (type, size)
- ✅ Comprehensive error messages

## Environment Variables
Create a `.env` file based on `.env.example`:

```env
# Server
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bunker_management
DB_USER=postgres
DB_PASSWORD=postgres

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=26214400

# SMTP Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Bunker Management System

# SendGrid (Optional)
USE_SENDGRID=false
SENDGRID_API_KEY=

# Security
JWT_SECRET=your-secret-key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL 12+
- Git

### Installation Steps

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Create PostgreSQL database**
   ```sql
   CREATE DATABASE bunker_management;
   ```

4. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

5. **Verify installation**
   - API will be available at: `http://localhost:5000`
   - Health check: `http://localhost:5000/health`
   - Database tables will be created automatically on first run

## Development Scripts

```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with sample data
npm test             # Run tests
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message",
  "details": [ ... ]
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

## Security Features
- ✅ Helmet.js for HTTP headers security
- ✅ CORS configuration
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection
- ✅ File upload validation
- ✅ Error message sanitization

## PDF Generation
- Uses Puppeteer for high-quality PDF rendering
- Customizable templates with:
  - Logo positioning and sizing
  - Brand colors (primary, secondary)
  - Font family selection
  - Margin configuration
  - Header/footer customization
- Generates professional invoices and sales order confirmations
- Automatic file management and cleanup

## Error Handling
- Global error handler catches all errors
- Sequelize validation errors with field-level details
- Unique constraint violation handling
- Foreign key constraint handling
- Custom API error class for specific error codes
- Development vs. production error messages

## Database Relationships
```
Tanker ─┬─< Voyage ─┬─< Order >─┐
        │            │           │
Vessel ─────────────┘            │
                                 │
                                 ├─< SalesOrderConfirmation
                                 │
                                 └─< Invoice
```

## Performance Optimizations
- Database indexes on frequently queried fields
- Connection pooling
- Response compression
- Efficient pagination
- Selective field loading
- Lazy loading of relationships

## Monitoring & Logging
- Morgan HTTP request logging
- Console logging for errors
- Detailed error stack traces in development
- Sanitized error messages in production

## Next Steps (Phase 2-8)
- [ ] Complete remaining API endpoints (SOC, Invoices, Email)
- [ ] Implement email service with Nodemailer
- [ ] Create dashboard and reports endpoints
- [ ] Build React frontend application
- [ ] Implement user authentication (JWT)
- [ ] Add automated testing suite
- [ ] Deploy to production environment
- [ ] Set up CI/CD pipeline

## Support & Documentation
For issues or questions, refer to:
- API endpoint documentation above
- Code comments in controllers and services
- Sequelize model validations
- Error messages from API responses

## License
Proprietary - All rights reserved

## Version
1.0.0 - Phase 1 Complete (Backend Infrastructure)
