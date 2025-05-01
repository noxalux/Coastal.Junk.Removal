// File: server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const multer = require('multer');

const invoiceRoutes = require('./routes/invoice');
const checkoutRoutes = require('./routes/checkout');
const expenseRoutes = require('./routes/expense');
const updateNoteRoute = require('./routes/update-note');
const deleteInvoiceRoute = require('./routes/delete-invoice');
const saveInvoiceRoute = require('./routes/save-invoice');
app.use('/', saveInvoiceRoute);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));

// 🔒 Protect admin.html
app.use('/admin.html', (req, res, next) => {
  if (req.session.authenticated) return next();
  return res.redirect('/login.html');
});

// 🔒 Protect create-invoice.html
app.use('/create-invoice.html', (req, res, next) => {
  if (req.session.authenticated) return next();
  return res.redirect('/login.html');
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// 🟢 Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'noxalux' && password === 'GmaFeenz95!') {
    req.session.authenticated = true;
    return res.redirect('/admin.html');
  }
  res.send('<script>alert("Invalid login"); window.location.href="/login.html";</script>');
});

// 🔴 Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

// Routes
app.use('/', invoiceRoutes);
app.use('/', checkoutRoutes);
app.use('/', expenseRoutes);
app.use('/', updateNoteRoute);
app.use('/', deleteInvoiceRoute);

// Default homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all 404
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
