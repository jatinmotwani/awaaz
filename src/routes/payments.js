import express from 'express';
import { cleanLine, dedicationProblem } from '../lib/text.js';
import { rateLimit } from '../lib/rate-limit.js';
import { townBySlug } from '../content/towns.js';

// Dedications: fully self-serve. Razorpay Checkout collects the payment, and either the
// browser callback or the webhook (whichever arrives first) publishes the line.
export function paymentsRouter({ config, repo, razorpay }) {
  const router = express.Router();
  const json = express.json({ limit: '10kb' });
  const limit = rateLimit({ windowMs: 60 * 60 * 1000, max: 30 });
  const { days, tiers } = config.dedications;

  router.post('/api/dedications', limit, json, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!razorpay.enabled) return res.status(503).json({ error: 'Dedications aren’t open yet.' });

    const body = req.body || {};
    const town = townBySlug.get(body.townSlug);
    const tier = Object.hasOwn(tiers, body.tier) ? body.tier : null;
    const inMemoryOf = cleanLine(body.inMemoryOf, 60);
    const fromLine = cleanLine(body.fromLine, 60) || null;

    if (!town) return res.status(400).json({ error: 'Unknown town.' });
    if (!tier) return res.status(400).json({ error: 'Choose where the dedication appears.' });
    if (inMemoryOf.length < 2) return res.status(400).json({ error: 'Please add the name you’re remembering.' });
    const problem = dedicationProblem(`${inMemoryOf} ${fromLine || ''}`);
    if (problem) return res.status(400).json({ error: problem });

    const { amountPaise } = tiers[tier];
    const dedication = await repo.dedications.create({ townSlug: town.slug, tier, inMemoryOf, fromLine, amountPaise });
    const order = await razorpay.createOrder({
      amountPaise,
      receipt: `dedication-${dedication.id}`,
      notes: { dedication_id: String(dedication.id), town: town.slug, tier },
    });
    await repo.dedications.attachOrder(dedication.id, order.id);

    return res.status(201).json({
      keyId: razorpay.keyId,
      orderId: order.id,
      amountPaise,
      name: config.appName,
      description: `In loving memory · ${town.name} · ${days} days`,
    });
  });

  router.post('/api/dedications/verify', limit, json, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const { orderId, paymentId, signature } = req.body || {};
    if (!razorpay.verifyPayment({ orderId, paymentId, signature })) {
      return res.status(400).json({ error: 'We couldn’t confirm that payment. If money was taken, it will show up within a few minutes.' });
    }
    const dedication = await repo.dedications.publish(orderId, paymentId, days);
    if (!dedication) return res.status(404).json({ error: 'Unknown order.' });
    return res.json({ ok: true, townSlug: dedication.town_slug });
  });

  // Configure in Razorpay Dashboard → Webhooks with the "order.paid" event.
  router.post('/api/razorpay/webhook', express.raw({ type: () => true, limit: '1mb' }), async (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!razorpay.verifyWebhook(raw, req.get('x-razorpay-signature'))) return res.status(400).json({ error: 'bad signature' });

    let event;
    try {
      event = JSON.parse(raw.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'bad json' });
    }
    if (event.event === 'order.paid' || event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      const orderId = event.payload?.order?.entity?.id || payment?.order_id;
      if (orderId && payment?.id) await repo.dedications.publish(orderId, payment.id, days);
    }
    return res.json({ ok: true });
  });

  return router;
}
