import Razorpay from 'razorpay';
import logger from '../utils/logger';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

export const createOrder = async (
  amount: number,
  currency: string,
  receipt: string,
  notes?: Record<string, string>
) => {
  try {
    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency,
      receipt,
      notes,
    };

    const order = await razorpay.orders.create(options);
    logger.info(`Razorpay order created: ${order.id}`);
    return order;
  } catch (error) {
    logger.error('Razorpay create order error:', error);
    throw error;
  }
};

export const verifyPayment = async (paymentId: string) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    logger.error('Razorpay verify payment error:', error);
    throw error;
  }
};

export const capturePayment = async (paymentId: string, amount: number, currency: string = 'INR') => {
  try {
    const payment = await razorpay.payments.capture(paymentId, Math.round(amount * 100), currency);
    return payment;
  } catch (error) {
    logger.error('Razorpay capture payment error:', error);
    throw error;
  }
};

export const refundPayment = async (paymentId: string, amount?: number) => {
  try {
    const options: any = {};
    if (amount) {
      options.amount = Math.round(amount * 100);
    }
    const refund = await razorpay.payments.refund(paymentId, options);
    return refund;
  } catch (error) {
    logger.error('Razorpay refund error:', error);
    throw error;
  }
};

export { razorpay };
