
// File: routes/delete-invoice.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const invoicePath = path.join(__dirname, '../data/invoices.json');

router.delete('/delete-invoice/:id', (req, res) => {
  try {
    const invoices = JSON.parse(fs.readFileSync(invoicePath));
    const updatedInvoices = invoices.filter(inv => inv.id !== req.params.id);

    if (invoices.length === updatedInvoices.length) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    fs.writeFileSync(invoicePath, JSON.stringify(updatedInvoices, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('Delete Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
