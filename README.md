# Bunker Order Management System

A complete enterprise-grade bunker order management system with document generation, email automation, and comprehensive reporting.

## 🚀 Features

### Core Functionality
- **Vessel Management**: Track vessels with IMO numbers, call signs, and contact information
- **Tanker Management**: Manage tanker fleet with voyage assignments
- **Voyage Tracking**: Monitor voyages with cargo details and purchase prices
- **Order Management**: Create and manage bunker orders with lock/unlock functionality
- **Sales Order Confirmations**: Generate and send professional SOCs
- **Invoice Management**: Create invoices with automatic calculations, payment tracking, and overdue detection
- **Document Templates**: Customizable PDF templates for invoices and SOCs
- **Email Automation**: Automated email sending with templates and retry mechanism
- **Reporting**: Generate Excel and PDF reports for orders, invoices, revenue, and voyages
- **Scheduled Tasks**: 5 automated cron jobs for reminders, status updates, and maintenance

### Business Logic
- **Sequential Numbering**: Automatic generation of unique invoice and SOC numbers
- **Order Locking**: Prevent modifications to orders once invoices are generated
- **Payment Tracking**: Track partial and full payments with automatic status updates
- **Overdue Detection**: Automatic detection and notification of overdue invoices
- **Tax Calculation**: Automatic tax and discount calculations
- **Email Retry**: Exponential backoff retry mechanism for failed emails
- **Duplicate Prevention**: Prevent duplicate email sends within 5-minute window

### Technology Stack

**Backend:**
- Node.js 18+ with Express.js
- PostgreSQL 14+ with Sequelize ORM
- Puppeteer for PDF generation
- Nodemailer for email delivery
- SendGrid support
- node-cron for scheduled tasks
- express-validator for input validation
- Multer for file uploads

**Frontend:**
- React 18 with TypeScript
- Vite build tool
- Tailwind CSS for styling
- React Router for navigation
- Axios for API requests
- Recharts for data visualization
- React Hook Form for forms

## 📋 Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn package manager

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd SalesHub
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

**Required environment variables:**

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bunker_management
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=5000
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:3000

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Email (SendGrid - Optional)
USE_SENDGRID=false
SENDGRID_API_KEY=

# Cron Jobs
ENABLE_CRON=true
```

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb bunker_management

# Run migrations (models will auto-sync in development)
npm run dev
```

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 🚀 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Production Mode

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## 📡 API Endpoints

The system provides 111+ API endpoints across 13 resource types:

### Core Resources
- **Vessels**: `/api/vessels` - 6 endpoints
- **Tankers**: `/api/tankers` - 5 endpoints
- **Voyages**: `/api/voyages` - 7 endpoints
- **Orders**: `/api/orders` - 10 endpoints
- **Invoices**: `/api/invoices` - 14 endpoints
- **Sales Order Confirmations**: `/api/socs` - 10 endpoints

### Configuration
- **Company Settings**: `/api/company-settings` - 4 endpoints
- **Document Templates**: `/api/document-templates` - 8 endpoints
- **Email Templates**: `/api/email-templates` - 8 endpoints
- **Email Settings**: `/api/email-settings` - 3 endpoints

### Operations
- **Email Logs**: `/api/emails` - 8 endpoints
- **Dashboard**: `/api/dashboard` - 2 endpoints
- **Reports**: `/api/reports` - 4 endpoints
- **Cron Jobs**: `/api/cron` - 2 endpoints

Full API documentation available in `COMPLETE_SYSTEM_SUMMARY.md`

## 🤖 Automated Tasks

The system runs 5 automated cron jobs:

1. **Overdue Invoice Reminders** (Daily at 9 AM)
   - Sends reminder emails for overdue invoices
   - Prevents duplicate reminders within 7 days

2. **Invoice Status Updates** (Daily at 1 AM)
   - Automatically updates invoice status to "overdue"

3. **Daily Summary Email** (Daily at 8 AM)
   - Sends comprehensive daily summary to company email
   - Includes new orders, invoices, revenue, and alerts

4. **Email Queue Processor** (Every 5 minutes)
   - Retries failed email sends
   - Marks old pending emails as failed

5. **Email Log Cleanup** (Weekly Sunday at 2 AM)
   - Removes email logs older than 90 days

## 📊 Frontend Pages

The React frontend includes 11 comprehensive pages:

1. **Dashboard**: Overview with statistics, charts, and recent activity
2. **Vessels**: Full CRUD operations with search and pagination
3. **Tankers**: Tanker fleet management
4. **Voyages**: Voyage tracking with status monitoring
5. **Orders**: Order management with lock/unlock functionality
6. **Sales Order Confirmations**: SOC generation and tracking
7. **Invoices**: Payment tracking and PDF generation
8. **Reports**: Generate Excel/PDF reports
9. **Email Templates**: Template management
10. **Email Logs**: Email delivery history
11. **Settings**: System configuration

## 🔒 Security Features

- Input validation with express-validator
- SQL injection prevention via Sequelize ORM
- XSS protection with Helmet.js
- CORS configuration
- Rate limiting (100 requests per 15 minutes)
- File upload restrictions
- Environment variable protection
- Prepared for JWT authentication

## 📁 Project Structure

```
SalesHub/
├── backend/
│   ├── src/
│   │   ├── config/           # Database configuration
│   │   ├── models/           # Sequelize models (11 files)
│   │   ├── controllers/      # API controllers (13 files)
│   │   ├── routes/           # Express routes (13 files)
│   │   ├── middleware/       # Validation, error handling, file upload
│   │   ├── services/         # PDF, email, cron services
│   │   └── index.js          # Express server entry point
│   ├── uploads/              # File storage (logos, documents, PDFs)
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── Layout/       # Layout components
│   │   │   └── ui/           # UI component library (8 components)
│   │   ├── pages/            # Page components (11 pages)
│   │   ├── services/         # API client
│   │   ├── types/            # TypeScript interfaces
│   │   ├── App.tsx           # Main app component
│   │   ├── main.tsx          # Entry point
│   │   └── index.css         # Global styles
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
└── Documentation/
    ├── README.md (this file)
    ├── COMPLETE_SYSTEM_SUMMARY.md
    ├── PHASE_2_COMPLETE.md
    └── PHASE_3_COMPLETE.md
```

## 🧪 Testing

```bash
# Backend tests (when implemented)
cd backend
npm test

# Frontend tests (when implemented)
cd frontend
npm test
```

## 🚢 Deployment

### Backend Deployment

1. Set `NODE_ENV=production` in environment
2. Configure production database
3. Set up SMTP/SendGrid for emails
4. Configure reverse proxy (nginx)
5. Use process manager (PM2)

```bash
# Using PM2
npm install -g pm2
cd backend
pm2 start src/index.js --name bunker-api
pm2 save
pm2 startup
```

### Frontend Deployment

1. Build production assets
2. Deploy to static hosting (Netlify, Vercel, S3)

```bash
cd frontend
npm run build
# Upload dist/ folder to hosting provider
```

### Docker Deployment (Optional)

```bash
# Create Dockerfile for backend
# Create Dockerfile for frontend
# Use docker-compose for orchestration
docker-compose up -d
```

## 📝 Sample Data

To populate the system with sample data:

```bash
cd backend
npm run seed  # If seed script is created
```

Or use the API endpoints to create:
1. Company settings
2. Vessels and tankers
3. Voyages
4. Orders
5. Email templates

## 🔧 Configuration

### Email Setup

**Gmail:**
1. Enable 2-factor authentication
2. Generate app password
3. Use app password in SMTP_PASS

**SendGrid:**
1. Create SendGrid account
2. Generate API key
3. Set USE_SENDGRID=true
4. Add SENDGRID_API_KEY

### PDF Generation

Puppeteer requires Chrome/Chromium. On production servers:

```bash
# Install dependencies
apt-get install -y chromium chromium-sandbox
```

## 📈 Performance Optimization

- Database indexes on frequently queried fields
- Connection pooling (max 10 connections)
- Pagination on all list endpoints (default 10 items)
- Lazy loading in frontend
- Static asset caching
- API response caching (when needed)

## 🐛 Troubleshooting

**Database Connection Issues:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U postgres -d bunker_management
```

**Email Not Sending:**
- Check SMTP credentials
- Verify firewall allows port 587
- Check email logs: `/api/emails?status=failed`

**PDF Generation Fails:**
- Install Chromium dependencies
- Check disk space for temp files
- Verify write permissions on uploads/

**Frontend Not Loading:**
- Check backend is running on port 5000
- Verify CORS_ORIGIN matches frontend URL
- Check browser console for errors

## 📞 Support

For issues and questions:
1. Check documentation files
2. Review API error messages
3. Check email logs for delivery issues
4. Review cron job status: `/api/cron/status`

## 📄 License

[Your License Here]

## 👥 Contributors

Built with Claude Code

---

**Version**: 1.0.0
**Last Updated**: 2025-10-24
**Node.js**: 18+
**PostgreSQL**: 14+
