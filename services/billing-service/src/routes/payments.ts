import { Router, Request, Response } from 'express';
import Payment from '../models/Payment';
import Invoice from '../models/Invoice';
import { createOrder, verifyPayment } from '../services/razorpay';
import logger from '../utils/logger';
import { authenticate } from '../middleware/auth';
import { ApiResponse } from '@energix/shared-types';

const router = Router();

// POST /payments/create-order - Create Razorpay order
router.post('/create-order', authenticate, async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.body;

    const invoice = await Invoice.findOne({ _id: invoiceId, userId: req.user!.userId });
    if (!invoice) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ success: false, error: { code: 'ALREADY_PAID', message: 'Invoice is already paid' } });
    }

    // Create Razorpay order
    const order = await createOrder(
      invoice.amountDue,
      invoice.currency,
      invoice.invoiceNumber,
      { invoiceId: invoice._id.toString(), userId: req.user!.userId }
    );

    // Create payment record
    const payment = new Payment({
      userId: req.user!.userId,
      invoiceId: invoice._id,
      razorpayOrderId: order.id,
      amount: invoice.amountDue,
      currency: invoice.currency,
      status: 'pending',
    });

    await payment.save();

    const response: ApiResponse<{ order: typeof order; payment: typeof payment; keyId: string }> = {
      success: true,
      data: {
        order,
        payment,
        keyId: process.env.RAZORPAY_KEY_ID || '',
      },
    };
    res.json(response);
  } catch (error) {
    logger.error('Create order error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// POST /payments/verify - Verify Razorpay payment
router.post('/verify', authenticate, async (req: Request, res: Response) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const payment = await Payment.findOne({ razorpayOrderId, userId: req.user!.userId });
    if (!payment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' } });
    }

    // Verify payment with Razorpay
    const razorpayPayment = await verifyPayment(razorpayPaymentId);

    if (razorpayPayment.status === 'captured') {
      payment.status = 'completed';
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.paymentMethod = razorpayPayment.method;
      payment.paidAt = new Date();
      await payment.save();

      // Update invoice
      const invoice = await Invoice.findById(payment.invoiceId);
      if (invoice) {
        invoice.status = 'paid';
        invoice.amountPaid = payment.amount;
        invoice.amountDue = 0;
        await invoice.save();
      }

      const response: ApiResponse<typeof payment> = { success: true, data: payment };
      res.json(response);
    } else {
      payment.status = 'failed';
      payment.failureReason = razorpayPayment.error_description || 'Payment failed';
      await payment.save();

      const response: ApiResponse<typeof payment> = { success: false, data: payment };
      res.status(400).json(response);
    }
  } catch (error) {
    logger.error('Verify payment error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /payments/my - Get current user's payments
router.get('/my', authenticate, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find({ userId: req.user!.userId })
        .populate('invoiceId')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Payment.countDocuments({ userId: req.user!.userId }),
    ]);

    const response: ApiResponse<typeof payments> = {
      success: true,
      data: payments,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
    res.json(response);
  } catch (error) {
    logger.error('List payments error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// Webhook handler for Razorpay
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    // Verify webhook signature here if needed

    const event = req.body;
    logger.info('Razorpay webhook received:', event.event);

    if (event.event === 'payment.captured') {
      const paymentId = event.payload.payment.entity.id;
      const orderId = event.payload.payment.entity.order_id;

      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (payment && payment.status !== 'completed') {
        payment.status = 'completed';
        payment.razorpayPaymentId = paymentId;
        payment.paidAt = new Date();
        await payment.save();

        // Update invoice
        const invoice = await Invoice.findById(payment.invoiceId);
        if (invoice) {
          invoice.status = 'paid';
          invoice.amountPaid = payment.amount;
          invoice.amountDue = 0;
          await invoice.save();
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
