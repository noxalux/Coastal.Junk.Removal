const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/create-checkout-session', async (req, res) => {
  const invoiceId = req.body.invoiceId;
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [ /* pulled from stored invoice */ ],
    mode: 'payment',
    success_url: 'https://yoursite.com/thank-you.html',
    cancel_url: 'https://yoursite.com/invoice.html?id=' + invoiceId,
  });

  res.redirect(303, session.url);
});
