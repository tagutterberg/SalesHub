const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { CompanySettings, DocumentTemplate } = require('../models');

/**
 * PDF Generation Service using Puppeteer
 * Generates professional PDF documents for invoices and sales order confirmations
 */

/**
 * Generate Sales Order Confirmation PDF
 * @param {Object} socData - Sales Order Confirmation data with order, vessel, and voyage details
 * @param {Number} templateId - Optional template ID to use
 * @returns {String} - Path to generated PDF
 */
const generateSOCPDF = async (socData, templateId = null) => {
  try {
    // Get company settings
    const companySettings = await CompanySettings.findOne();
    if (!companySettings) {
      throw new Error('Company settings not configured');
    }

    // Get template (default or specified)
    let template;
    if (templateId) {
      template = await DocumentTemplate.findByPk(templateId);
    } else {
      template = await DocumentTemplate.findOne({
        where: { template_type: 'sales_order_confirmation', is_default: true }
      });
    }

    // Use default values if no template found
    const templateConfig = template || {
      primary_color: '#2563EB',
      secondary_color: '#64748B',
      font_family: 'Arial, sans-serif',
      logo_position: 'left',
      logo_width: 150,
      show_logo: true,
      margin_top: 20,
      margin_bottom: 20,
      margin_left: 20,
      margin_right: 20
    };

    // Generate HTML content
    const html = generateSOCHTML(socData, companySettings, templateConfig);

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '../../uploads/documents/soc');
    await fs.mkdir(outputDir, { recursive: true });

    // Generate PDF filename
    const filename = `SOC-${socData.soc_number.replace(/\//g, '-')}-${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, filename);

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: {
        top: `${templateConfig.margin_top}mm`,
        bottom: `${templateConfig.margin_bottom}mm`,
        left: `${templateConfig.margin_left}mm`,
        right: `${templateConfig.margin_right}mm`
      },
      printBackground: true
    });

    await browser.close();

    // Return relative path for database storage
    return `/uploads/documents/soc/${filename}`;
  } catch (error) {
    console.error('Error generating SOC PDF:', error);
    throw error;
  }
};

/**
 * Generate Invoice PDF
 * @param {Object} invoiceData - Invoice data with order, vessel, and payment details
 * @param {Number} templateId - Optional template ID to use
 * @returns {String} - Path to generated PDF
 */
const generateInvoicePDF = async (invoiceData, templateId = null) => {
  try {
    // Get company settings
    const companySettings = await CompanySettings.findOne();
    if (!companySettings) {
      throw new Error('Company settings not configured');
    }

    // Get template (default or specified)
    let template;
    if (templateId) {
      template = await DocumentTemplate.findByPk(templateId);
    } else {
      template = await DocumentTemplate.findOne({
        where: { template_type: 'invoice', is_default: true }
      });
    }

    // Use default values if no template found
    const templateConfig = template || {
      primary_color: '#2563EB',
      secondary_color: '#64748B',
      font_family: 'Arial, sans-serif',
      logo_position: 'left',
      logo_width: 150,
      show_logo: true,
      margin_top: 20,
      margin_bottom: 20,
      margin_left: 20,
      margin_right: 20
    };

    // Generate HTML content
    const html = generateInvoiceHTML(invoiceData, companySettings, templateConfig);

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '../../uploads/documents/invoices');
    await fs.mkdir(outputDir, { recursive: true });

    // Generate PDF filename
    const filename = `INV-${invoiceData.invoice_number.replace(/\//g, '-')}-${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, filename);

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: outputPath,
      format: 'A4',
      margin: {
        top: `${templateConfig.margin_top}mm`,
        bottom: `${templateConfig.margin_bottom}mm`,
        left: `${templateConfig.margin_left}mm`,
        right: `${templateConfig.margin_right}mm`
      },
      printBackground: true
    });

    await browser.close();

    // Return relative path for database storage
    return `/uploads/documents/invoices/${filename}`;
  } catch (error) {
    console.error('Error generating Invoice PDF:', error);
    throw error;
  }
};

/**
 * Generate HTML for Sales Order Confirmation
 */
const generateSOCHTML = (socData, companySettings, templateConfig) => {
  const { order, vessel, voyage } = socData;

  const logoHTML = templateConfig.show_logo && companySettings.logo_url
    ? `<img src="file://${path.join(__dirname, '../..')${companySettings.logo_url}"
         style="width: ${templateConfig.logo_width}px; height: auto;" />`
    : '';

  const logoAlign = templateConfig.logo_position === 'center' ? 'center' :
                   templateConfig.logo_position === 'right' ? 'flex-end' : 'flex-start';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: ${templateConfig.font_family};
          font-size: 11pt;
          line-height: 1.6;
          color: #1f2937;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid ${templateConfig.primary_color};
        }
        .logo-section {
          display: flex;
          align-items: ${logoAlign};
          flex-direction: column;
        }
        .company-info {
          margin-top: 10px;
          font-size: 9pt;
          color: ${templateConfig.secondary_color};
        }
        .doc-title {
          text-align: right;
        }
        .doc-title h1 {
          color: ${templateConfig.primary_color};
          font-size: 24pt;
          margin-bottom: 5px;
        }
        .doc-number {
          font-size: 16pt;
          font-weight: bold;
          color: ${templateConfig.secondary_color};
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        .details-section h3 {
          color: ${templateConfig.primary_color};
          font-size: 12pt;
          margin-bottom: 10px;
          border-bottom: 2px solid ${templateConfig.primary_color};
          padding-bottom: 5px;
        }
        .details-row {
          display: flex;
          margin-bottom: 5px;
        }
        .details-label {
          font-weight: bold;
          width: 140px;
          color: ${templateConfig.secondary_color};
        }
        .details-value {
          flex: 1;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background-color: ${templateConfig.primary_color};
          color: white;
          padding: 12px;
          text-align: left;
          font-size: 10pt;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        .text-right { text-align: right; }
        .voyage-info {
          background-color: #f3f4f6;
          padding: 15px;
          margin-bottom: 20px;
          border-left: 4px solid ${templateConfig.primary_color};
        }
        .terms {
          font-size: 9pt;
          color: ${templateConfig.secondary_color};
          margin-top: 30px;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          font-size: 9pt;
          text-align: center;
          color: ${templateConfig.secondary_color};
        }
        .signature-line {
          margin-top: 60px;
          border-top: 1px solid #000;
          width: 300px;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-section">
          ${logoHTML}
          <div class="company-info">
            <strong>${companySettings.company_name}</strong><br/>
            ${companySettings.company_address || ''}<br/>
            ${companySettings.company_phone || ''} | ${companySettings.company_email || ''}
          </div>
        </div>
        <div class="doc-title">
          <h1>SALES ORDER CONFIRMATION</h1>
          <div class="doc-number">${socData.soc_number}</div>
          <div style="margin-top: 10px; font-size: 10pt;">
            Issue Date: ${formatDate(socData.issue_date)}<br/>
            ${socData.confirmation_date ? `Confirmation Date: ${formatDate(socData.confirmation_date)}` : ''}
          </div>
        </div>
      </div>

      <div class="details-grid">
        <div class="details-section">
          <h3>Vessel Information</h3>
          <div class="details-row">
            <span class="details-label">Vessel Name:</span>
            <span class="details-value">${vessel.name}</span>
          </div>
          <div class="details-row">
            <span class="details-label">IMO Number:</span>
            <span class="details-value">${vessel.imo_number}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Call Sign:</span>
            <span class="details-value">${vessel.call_sign || 'N/A'}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Owner:</span>
            <span class="details-value">${vessel.owner || 'N/A'}</span>
          </div>
        </div>

        <div class="details-section">
          <h3>Customer & Delivery</h3>
          <div class="details-row">
            <span class="details-label">Company:</span>
            <span class="details-value">${order.customer_company}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Email:</span>
            <span class="details-value">${vessel.email || 'N/A'}</span>
          </div>
          <div class="details-row">
            <span class="details-label">Delivery Date:</span>
            <span class="details-value">${formatDate(order.delivery_date)}</span>
          </div>
        </div>
      </div>

      ${voyage ? `
        <div class="voyage-info">
          <strong>Voyage Information:</strong> ${voyage.voyage_number} - ${voyage.tanker?.name || 'N/A'}
          ${voyage.cargoes ? `<br/><strong>Cargoes:</strong> ${voyage.cargoes}` : ''}
        </div>
      ` : ''}

      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th class="text-right">Qty (MT)</th>
            <th class="text-right">Qty (CBM)</th>
            <th class="text-right">Unit Price</th>
            <th>Currency</th>
            <th>Unit</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${order.product}</td>
            <td class="text-right">${order.quantity_mt || '-'}</td>
            <td class="text-right">${order.quantity_cbm || '-'}</td>
            <td class="text-right">${formatNumber(order.unit_price)}</td>
            <td>${order.currency}</td>
            <td>${order.price_unit}</td>
            <td class="text-right">
              ${order.currency} ${formatNumber(calculateTotal(order))}
            </td>
          </tr>
        </tbody>
      </table>

      ${socData.notes ? `
        <div style="margin-bottom: 20px;">
          <strong>Notes:</strong><br/>
          <div style="margin-top: 5px;">${socData.notes}</div>
        </div>
      ` : ''}

      ${socData.terms_conditions ? `
        <div class="terms">
          <strong>Terms & Conditions:</strong><br/>
          ${socData.terms_conditions}
        </div>
      ` : ''}

      <div class="signature-line">
        <div>Authorized Signature</div>
      </div>

      <div class="footer">
        ${companySettings.company_name} | ${companySettings.company_email || ''} | ${companySettings.company_phone || ''}<br/>
        ${companySettings.company_website || ''}
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate HTML for Invoice
 */
const generateInvoiceHTML = (invoiceData, companySettings, templateConfig) => {
  const { order, vessel } = invoiceData;

  const logoHTML = templateConfig.show_logo && companySettings.logo_url
    ? `<img src="file://${path.join(__dirname, '../..')${companySettings.logo_url}"
         style="width: ${templateConfig.logo_width}px; height: auto;" />`
    : '';

  const paymentStatusColor = {
    'unpaid': '#ef4444',
    'partially_paid': '#f59e0b',
    'paid': '#10b981',
    'overdue': '#dc2626'
  };

  const statusBadgeColor = paymentStatusColor[invoiceData.payment_status] || '#6b7280';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: ${templateConfig.font_family};
          font-size: 11pt;
          line-height: 1.6;
          color: #1f2937;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid ${templateConfig.primary_color};
        }
        .logo-section {
          flex: 1;
        }
        .company-info {
          margin-top: 10px;
          font-size: 9pt;
          color: ${templateConfig.secondary_color};
        }
        .doc-title {
          text-align: right;
          flex: 1;
        }
        .doc-title h1 {
          color: ${templateConfig.primary_color};
          font-size: 28pt;
          margin-bottom: 5px;
        }
        .doc-number {
          font-size: 18pt;
          font-weight: bold;
          color: ${templateConfig.secondary_color};
          margin-bottom: 10px;
        }
        .status-badge {
          display: inline-block;
          padding: 5px 15px;
          background-color: ${statusBadgeColor};
          color: white;
          border-radius: 4px;
          font-size: 10pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        .invoice-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        .section h3 {
          color: ${templateConfig.primary_color};
          font-size: 12pt;
          margin-bottom: 10px;
          border-bottom: 2px solid ${templateConfig.primary_color};
          padding-bottom: 5px;
        }
        .detail-row {
          display: flex;
          margin-bottom: 5px;
        }
        .detail-label {
          font-weight: bold;
          width: 120px;
          color: ${templateConfig.secondary_color};
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background-color: ${templateConfig.primary_color};
          color: white;
          padding: 12px;
          text-align: left;
          font-size: 10pt;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        .text-right { text-align: right; }
        .summary-box {
          margin-left: auto;
          width: 350px;
          background-color: #f9fafb;
          padding: 20px;
          border-radius: 8px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 11pt;
        }
        .summary-row.total {
          border-top: 2px solid ${templateConfig.primary_color};
          margin-top: 10px;
          padding-top: 15px;
          font-size: 14pt;
          font-weight: bold;
          color: ${templateConfig.primary_color};
        }
        .payment-info {
          background-color: #f3f4f6;
          padding: 20px;
          margin: 30px 0;
          border-left: 4px solid ${templateConfig.primary_color};
        }
        .payment-info h4 {
          color: ${templateConfig.primary_color};
          margin-bottom: 10px;
        }
        .terms {
          font-size: 9pt;
          color: ${templateConfig.secondary_color};
          margin-top: 30px;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
          font-size: 9pt;
          text-align: center;
          color: ${templateConfig.secondary_color};
        }
        .thank-you {
          text-align: center;
          font-size: 14pt;
          color: ${templateConfig.primary_color};
          margin: 40px 0 20px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-section">
          ${logoHTML}
          <div class="company-info">
            <strong>${companySettings.company_name}</strong><br/>
            ${companySettings.company_address || ''}<br/>
            Tax ID: ${companySettings.tax_id || 'N/A'}<br/>
            ${companySettings.company_phone || ''} | ${companySettings.company_email || ''}
          </div>
        </div>
        <div class="doc-title">
          <h1>INVOICE</h1>
          <div class="doc-number">${invoiceData.invoice_number}</div>
          <div class="status-badge">${invoiceData.payment_status.replace('_', ' ')}</div>
        </div>
      </div>

      <div class="invoice-details">
        <div class="section">
          <h3>Bill To</h3>
          <div class="detail-row">
            <span class="detail-label">Company:</span>
            <span>${order.customer_company}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Vessel:</span>
            <span>${vessel.name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">IMO:</span>
            <span>${vessel.imo_number}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Email:</span>
            <span>${vessel.email || 'N/A'}</span>
          </div>
        </div>

        <div class="section">
          <h3>Invoice Details</h3>
          <div class="detail-row">
            <span class="detail-label">Issue Date:</span>
            <span>${formatDate(invoiceData.issue_date)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Due Date:</span>
            <span>${formatDate(invoiceData.due_date)}</span>
          </div>
          ${invoiceData.soc_number ? `
          <div class="detail-row">
            <span class="detail-label">SOC Number:</span>
            <span>${invoiceData.soc_number}</span>
          </div>
          ` : ''}
          ${invoiceData.voyage_number ? `
          <div class="detail-row">
            <span class="detail-label">Voyage:</span>
            <span>${invoiceData.voyage_number}</span>
          </div>
          ` : ''}
          <div class="detail-row">
            <span class="detail-label">Payment Terms:</span>
            <span>${companySettings.payment_terms || 'N/A'}</span>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Product</th>
            <th class="text-right">Quantity</th>
            <th>Unit</th>
            <th class="text-right">Unit Price</th>
            <th>Currency</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Bunker delivery for ${vessel.name}</td>
            <td>${order.product}</td>
            <td class="text-right">${order.price_unit === 'MT' ? order.quantity_mt : order.quantity_cbm}</td>
            <td>${order.price_unit}</td>
            <td class="text-right">${formatNumber(order.unit_price)}</td>
            <td>${order.currency}</td>
            <td class="text-right">${invoiceData.currency} ${formatNumber(invoiceData.subtotal)}</td>
          </tr>
        </tbody>
      </table>

      <div class="summary-box">
        <div class="summary-row">
          <span>Subtotal:</span>
          <span>${invoiceData.currency} ${formatNumber(invoiceData.subtotal)}</span>
        </div>
        ${invoiceData.discount_amount > 0 ? `
        <div class="summary-row">
          <span>Discount:</span>
          <span>-${invoiceData.currency} ${formatNumber(invoiceData.discount_amount)}</span>
        </div>
        ` : ''}
        ${invoiceData.tax_amount > 0 ? `
        <div class="summary-row">
          <span>Tax (${invoiceData.tax_rate}%):</span>
          <span>${invoiceData.currency} ${formatNumber(invoiceData.tax_amount)}</span>
        </div>
        ` : ''}
        <div class="summary-row total">
          <span>TOTAL DUE:</span>
          <span>${invoiceData.currency} ${formatNumber(invoiceData.total_amount)}</span>
        </div>
      </div>

      <div class="payment-info">
        <h4>Payment Information</h4>
        <div class="detail-row">
          <span class="detail-label">Bank Name:</span>
          <span>${companySettings.bank_name || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Account:</span>
          <span>${companySettings.bank_account || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">SWIFT:</span>
          <span>${companySettings.bank_swift || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">IBAN:</span>
          <span>${companySettings.bank_iban || 'N/A'}</span>
        </div>
        <div style="margin-top: 10px; font-size: 10pt;">
          <strong>Payment Terms:</strong> ${companySettings.payment_terms || 'N/A'}
        </div>
      </div>

      ${invoiceData.notes ? `
        <div style="margin: 20px 0;">
          <strong>Notes:</strong><br/>
          <div style="margin-top: 5px; font-size: 10pt;">${invoiceData.notes}</div>
        </div>
      ` : ''}

      ${invoiceData.terms_conditions ? `
        <div class="terms">
          <strong>Terms & Conditions:</strong><br/>
          ${invoiceData.terms_conditions}
        </div>
      ` : ''}

      <div class="thank-you">
        Thank you for your business!
      </div>

      <div class="footer">
        ${companySettings.company_name} | ${companySettings.company_email || ''} | ${companySettings.company_phone || ''}<br/>
        ${companySettings.company_website || ''}
      </div>
    </body>
    </html>
  `;
};

/**
 * Helper functions
 */
const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatNumber = (num) => {
  if (!num) return '0.00';
  return parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const calculateTotal = (order) => {
  const quantity = order.price_unit === 'MT' ? order.quantity_mt : order.quantity_cbm;
  return quantity * order.unit_price;
};

module.exports = {
  generateSOCPDF,
  generateInvoicePDF
};
