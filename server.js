// File: server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const invoiceRoutes = require('./routes/invoice');
const checkoutRoutes = require('./routes/checkout');
const expenseRoutes = require('./routes/expense');
const updateNoteRoute = require('./routes/update-note');
const saveInvoiceRoute = require('./routes/save-invoice');
const deleteInvoiceRoute = require('./routes/delete-invoice');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

// Admin credentials
const ADMIN_USER = 'noxalux';
const ADMIN_PASS = 'GmaFeenz95!';

// Login route
app.post('/login', (req, res) => {
  const username = req.body.username.toLowerCase();
  const password = req.body.password;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.authenticated = true;
    return res.redirect('/admin.html');
  } else {
    return res.send('<script>alert("Invalid credentials"); window.location.href = "/login.html";</script>');
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

// Protect admin pages
app.use(['/admin.html', '/create-invoice.html'], (req, res, next) => {
  if (req.session.authenticated) return next();
  return res.redirect('/login.html');
});

// Routes
app.use('/', invoiceRoutes);
app.use('/', saveInvoiceRoute);
app.use('/', checkoutRoutes);
app.use('/', expenseRoutes);
app.use('/', updateNoteRoute);
app.use('/', deleteInvoiceRoute);

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 fallback
app.get('*', (req, res) => {
  res.status(404).send('Page not found');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
