// File: routes/checkout.js

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs');
const path = require('path');

// POST /create-checkout-session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) {
      return res.status(400).json({ error: 'Invoice ID is required.' });
    }

    const invoicesPath = path.join(__dirname, '..', 'data', 'invoices.json');
    const invoicesData = JSON.parse(fs.readFileSync(invoicesPath));
    const invoice = invoicesData.find(inv => inv.id === invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const subtotal = invoice.total;
    const salesTax = subtotal * 0.06;
    const grandTotal = subtotal + salesTax;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Service Invoice #${invoice.id} - ${invoice.service}`,
          },
          unit_amount: Math.round(grandTotal * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.origin}/thank-you.html`,
      cancel_url: `${req.headers.origin}/invoice.html?id=${invoice.id}`,
      metadata: {
        invoiceId: invoice.id,
      },
    });

    res.json({ id: session.id });

  } catch (err) {
    console.error('Checkout session error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
