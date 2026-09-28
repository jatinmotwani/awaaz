import crypto from 'node:crypto';
import { safeEqual } from './pin.js';

const hmacHex = (secret, payload) => crypto.createHmac('sha256', secret).update(payload).digest('hex');

const sameHex = (expected, given) =>
  typeof given === 'string' && /^[0-9a-f]+$/i.test(given) && safeEqual(Buffer.from(expected), Buffer.from(given.toLowerCase()));

// Just the three Razorpay calls we need, over plain fetch.
export function createRazorpay({ keyId, keySecret, webhookSecret }, { fetchImpl = fetch } = {}) {
  return {
    enabled: Boolean(keyId && keySecret),
    keyId,

    async createOrder({ amountPaise, receipt, notes }) {
      const res = await fetchImpl('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        },
        body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes }),
      });
      if (!res.ok) throw new Error(`Razorpay order failed (${res.status}): ${await res.text()}`);
      return res.json();
    },

    // Checkout's success handler returns this signature for the order we created.
    verifyPayment({ orderId, paymentId, signature }) {
      if (!keySecret || !orderId || !paymentId) return false;
      return sameHex(hmacHex(keySecret, `${orderId}|${paymentId}`), signature);
    },

    verifyWebhook(rawBody, signature) {
      if (!webhookSecret || !rawBody) return false;
      return sameHex(hmacHex(webhookSecret, rawBody), signature);
    },
  };
}
