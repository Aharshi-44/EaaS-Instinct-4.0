import PDFDocument from 'pdfkit';
import { IInvoice, IInvoiceLineItem } from '../models/Invoice';

export const generateInvoicePDF = (invoice: IInvoice): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(24).text('EnergiX', 50, 50);
      doc.fontSize(16).text('INVOICE', 400, 50, { align: 'right' });

      // Invoice details
      doc.fontSize(10);
      doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 400, 80, { align: 'right' });
      doc.text(`Date: ${invoice.createdAt.toLocaleDateString()}`, 400, 95, { align: 'right' });
      doc.text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`, 400, 110, { align: 'right' });

      // Period
      doc.text(
        `Billing Period: ${invoice.periodStart.toLocaleDateString()} - ${invoice.periodEnd.toLocaleDateString()}`,
        50,
        130
      );

      // Line items table
      doc.moveDown(2);
      doc.fontSize(12).text('Description', 50, 180);
      doc.text('Qty', 300, 180);
      doc.text('Unit Price', 360, 180);
      doc.text('Amount', 450, 180);

      doc.moveTo(50, 200).lineTo(550, 200).stroke();

      let y = 220;
      invoice.lineItems.forEach((item: IInvoiceLineItem) => {
        doc.fontSize(10).text(item.description, 50, y);
        doc.text(item.quantity.toString(), 300, y);
        doc.text(`₹${item.unitPrice.toFixed(2)}`, 360, y);
        doc.text(`₹${item.amount.toFixed(2)}`, 450, y);
        y += 20;
      });

      doc.moveTo(50, y + 10).lineTo(550, y + 10).stroke();

      // Totals
      y += 30;
      doc.text('Subtotal:', 350, y);
      doc.text(`₹${invoice.subtotal.toFixed(2)}`, 450, y);

      y += 20;
      doc.text('Tax:', 350, y);
      doc.text(`₹${invoice.taxAmount.toFixed(2)}`, 450, y);

      y += 20;
      doc.fontSize(12).text('Total:', 350, y);
      doc.text(`₹${invoice.totalAmount.toFixed(2)}`, 450, y);

      y += 30;
      doc.fontSize(10).text('Amount Paid:', 350, y);
      doc.text(`₹${invoice.amountPaid.toFixed(2)}`, 450, y);

      y += 20;
      doc.fontSize(12).text('Amount Due:', 350, y);
      doc.text(`₹${invoice.amountDue.toFixed(2)}`, 450, y);

      // Footer
      doc.fontSize(10).text('Thank you for choosing EnergiX!', 50, 700);
      doc.text('For any queries, please contact support@energix.com', 50, 715);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
