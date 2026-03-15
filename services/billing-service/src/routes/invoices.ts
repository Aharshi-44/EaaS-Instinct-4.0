import { Router, Request, Response } from 'express';
import Invoice from '../models/Invoice';
import { generateInvoicePDF } from '../services/pdfGenerator';
import { uploadFile, getSignedUrl } from '../services/s3';
import logger from '../utils/logger';
import { authenticate, requireRole } from '../middleware/auth';
import { ApiResponse } from '@energix/shared-types';

const router = Router();

// GET /invoices/my - Get current user's invoices
router.get('/my', authenticate, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      Invoice.find({ userId: req.user!.userId })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Invoice.countDocuments({ userId: req.user!.userId }),
    ]);

    const response: ApiResponse<typeof invoices> = {
      success: true,
      data: invoices,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
    res.json(response);
  } catch (error) {
    logger.error('List invoices error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /invoices/:id - Get invoice by ID
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user!.userId });
    if (!invoice) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    }
    const response: ApiResponse<typeof invoice> = { success: true, data: invoice };
    res.json(response);
  } catch (error) {
    logger.error('Get invoice error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /invoices/:id/download - Download invoice PDF
router.get('/:id/download', authenticate, async (req: Request, res: Response) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user!.userId });
    if (!invoice) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    }

    if (invoice.s3Key) {
      const signedUrl = await getSignedUrl(invoice.s3Key, 300);
      res.redirect(signedUrl);
    } else {
      // Generate PDF on the fly
      const pdfBuffer = await generateInvoicePDF(invoice);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
    }
  } catch (error) {
    logger.error('Download invoice error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// POST /invoices - Create invoice (admin/internal)
router.post('/', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const invoiceData = req.body;

    // Generate invoice number
    const date = new Date();
    const invoiceNumber = `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${Date.now()
      .toString(36)
      .toUpperCase()}`;

    const invoice = new Invoice({
      ...invoiceData,
      invoiceNumber,
      status: 'pending',
    });

    await invoice.save();

    // Generate and upload PDF
    try {
      const pdfBuffer = await generateInvoicePDF(invoice);
      const s3Key = `invoices/${invoice.userId}/${invoice.invoiceNumber}.pdf`;
      const pdfUrl = await uploadFile(s3Key, pdfBuffer, 'application/pdf');
      invoice.pdfUrl = pdfUrl;
      invoice.s3Key = s3Key;
      await invoice.save();
    } catch (pdfError) {
      logger.error('PDF generation/upload error:', pdfError);
    }

    const response: ApiResponse<typeof invoice> = { success: true, data: invoice };
    res.status(201).json(response);
  } catch (error) {
    logger.error('Create invoice error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /invoices - List all invoices (admin)
router.get('/', authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.userId) filter.userId = req.query.userId;

    const [invoices, total] = await Promise.all([
      Invoice.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Invoice.countDocuments(filter),
    ]);

    const response: ApiResponse<typeof invoices> = {
      success: true,
      data: invoices,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
    res.json(response);
  } catch (error) {
    logger.error('List all invoices error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
