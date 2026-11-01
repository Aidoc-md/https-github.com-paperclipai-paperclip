require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const Razorpay = require('razorpay');
const { products, categories } = require('./data/products');

const app = express();
const PORT = process.env.PORT || 3000;
const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_ENABLED = Boolean(KEY_ID && KEY_SECRET);

const razorpay = RAZORPAY_ENABLED ? new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET }) : null;

const FREE_SHIPPING_THRESHOLD = 2999;
const SHIPPING_FEE = 149;

// Simple in-memory order store. Swap for a database in production.
const orders = new Map();

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

/* ---------- Catalogue API ---------- */

app.get('/api/categories', (_req, res) => res.json(categories));

app.get('/api/products', (req, res) => {
  const { category, q, bestseller, isNew } = req.query;
  let list = products;
  if (category) list = list.filter((p) => p.category === category);
  if (bestseller === 'true') list = list.filter((p) => p.bestseller);
  if (isNew === 'true') list = list.filter((p) => p.isNew);
  if (q) {
    const term = String(q).toLowerCase().trim();
    list = list.filter((p) =>
      [p.name, p.category, p.description, ...p.colors].join(' ').toLowerCase().includes(term)
    );
  }
  res.json(list);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  res.json({ product, related });
});

/* ---------- Checkout API ---------- */

// Prices always come from the server catalogue, never from the browser.
function priceCart(items) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('Your cart is empty');
  const lines = items.map((item) => {
    const product = products.find((p) => p.id === item.id);
    const qty = Number.parseInt(item.qty, 10);
    if (!product) throw new Error('A product in your cart is no longer available');
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new Error('Invalid quantity');
    return {
      id: product.id,
      name: product.name,
      size: String(item.size || '').slice(0, 20),
      color: String(item.color || '').slice(0, 20),
      qty,
      price: product.price,
      lineTotal: product.price * qty,
    };
  });
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  return { lines, subtotal, shipping, total: subtotal + shipping };
}

function validateCustomer(c = {}) {
  const required = ['name', 'email', 'phone', 'address', 'city', 'state', 'pincode'];
  for (const field of required) {
    if (!c[field] || !String(c[field]).trim()) throw new Error(`Please fill in your ${field}`);
  }
  if (!/^\S+@\S+\.\S+$/.test(c.email)) throw new Error('Please enter a valid email');
  if (!/^[6-9]\d{9}$/.test(String(c.phone).replace(/\D/g, '').slice(-10))) throw new Error('Please enter a valid 10-digit mobile number');
  if (!/^\d{6}$/.test(String(c.pincode).trim())) throw new Error('Please enter a valid 6-digit PIN code');
  return Object.fromEntries(required.map((f) => [f, String(c[f]).trim().slice(0, 200)]));
}

app.get('/api/checkout/config', (_req, res) => {
  res.json({
    razorpayEnabled: RAZORPAY_ENABLED,
    keyId: RAZORPAY_ENABLED ? KEY_ID : null,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    shippingFee: SHIPPING_FEE,
  });
});

app.post('/api/checkout/quote', (req, res) => {
  try {
    res.json(priceCart(req.body.items));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/checkout/create-order', async (req, res) => {
  let summary;
  let customer;
  try {
    summary = priceCart(req.body.items);
    customer = validateCustomer(req.body.customer);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const receipt = `TLH-${Date.now().toString(36).toUpperCase()}`;

  try {
    let razorpayOrder;
    if (RAZORPAY_ENABLED) {
      razorpayOrder = await razorpay.orders.create({
        amount: summary.total * 100, // paise
        currency: 'INR',
        receipt,
        notes: { customer_email: customer.email, customer_phone: customer.phone },
      });
    } else {
      // Demo mode: no keys configured, so simulate an order id.
      razorpayOrder = { id: `order_demo_${crypto.randomBytes(6).toString('hex')}`, amount: summary.total * 100, currency: 'INR' };
    }

    orders.set(razorpayOrder.id, { receipt, customer, ...summary, status: 'created', createdAt: new Date().toISOString() });

    res.json({
      demo: !RAZORPAY_ENABLED,
      keyId: RAZORPAY_ENABLED ? KEY_ID : null,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      receipt,
      customer,
    });
  } catch (err) {
    console.error('Razorpay order creation failed:', err);
    res.status(502).json({ error: 'Could not start payment. Please try again.' });
  }
});

app.post('/api/checkout/verify', (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  const order = orders.get(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  if (RAZORPAY_ENABLED) {
    if (!paymentId || !signature) return res.status(400).json({ error: 'Missing payment details' });
    const expected = crypto.createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
    const valid =
      expected.length === String(signature).length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)));
    if (!valid) {
      order.status = 'failed';
      return res.status(400).json({ error: 'Payment verification failed' });
    }
  } else if (!orderId.startsWith('order_demo_')) {
    return res.status(400).json({ error: 'Invalid demo order' });
  }

  order.status = 'paid';
  order.paymentId = paymentId || `pay_demo_${crypto.randomBytes(6).toString('hex')}`;
  order.paidAt = new Date().toISOString();

  res.json({ ok: true, receipt: order.receipt, paymentId: order.paymentId, total: order.total, demo: !RAZORPAY_ENABLED });
});

// Product page: /product/:id serves the shared template
app.get('/product/:id', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'product.html')));

app.use((_req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

app.listen(PORT, () => {
  console.log(`The Linen House is running at http://localhost:${PORT}`);
  console.log(RAZORPAY_ENABLED ? 'Razorpay: live keys loaded' : 'Razorpay: DEMO MODE (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env)');
});
