// File: routes/update-note.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Note: This is a ROUTE file. It goes in your routes/ folder, NOT in /data/
const INVOICE_DB = path.join(__dirname, '../data/invoices.json');

function loadInvoices() {
  if (!fs.existsSync(INVOICE_DB)) return [];
  return JSON.parse(fs.readFileSync(INVOICE_DB));
}

function saveInvoices(data) {
  fs.writeFileSync(INVOICE_DB, JSON.stringify(data, null, 2));
}

router.post('/update-note', (req, res) => {
  const { id, note } = req.body;
  const invoices = loadInvoices();
  const index = invoices.findIndex(i => i.id == id);

  if (index >= 0) {
    invoices[index].adminNote = note;
    saveInvoices(invoices);
    res.sendStatus(200);
  } else {
    res.status(404).send('Invoice not found');
  }
});

module.exports = router;
