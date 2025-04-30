// File: routes/save-invoice.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Storage for photos
const upload = multer({ dest: path.join(__dirname, '../public/uploads/') });

router.post('/save-invoice', upload.array('photos', 3), (req, res) => {
  try {
    const {
      name = '', email = '', phone = '', address = '', load = '', loadQty = 1,
      miles = 0, landfillCount = 0, cardFee, paymentTerms = 'due',
      mattressCount = 0, laborCount = 0, fuelCost = 0, tolls = 0,
      maintenance = 0, notes = '', signatureData = ''
    } = req.body;

    const itemNames = req.body['itemName[]'] || [];
    const itemQtys = req.body['itemQty[]'] || [];
    const itemRates = req.body['itemRate[]'] || [];

    const breakdown = [];
    let total = 0;

    const PRICES = {
      '1/4': 85, '1/2': 160, 'full': 275,
      'studio-move': 250, '1br-move': 375, '2br-move': 550,
      '3br-move': 725, 'office-move': 650, 'storage-move': 325,
      'estate-cleanout': 900, 'long-distance': 1500
    };

    const invoiceId = uuidv4();
    const date = new Date().toISOString();

    const parsedLoadQty = parseInt(loadQty) || 1;
    const loadRate = PRICES[load] || 0;
    const loadTotal = loadRate * parsedLoadQty;
    breakdown.push({ label: `${load} x${parsedLoadQty}`, amount: loadTotal });
    total += loadTotal;

    const landfillTotal = 125 * (parseInt(landfillCount) || 0);
    if (landfillTotal > 0) breakdown.push({ label: 'Landfill Trips', amount: landfillTotal });
    total += landfillTotal;

    const mattressTotal = 90 * (parseInt(mattressCount) || 0);
    if (mattressTotal > 0) breakdown.push({ label: 'Mattress Fee', amount: mattressTotal });
    total += mattressTotal;

    const laborTotal = 60 * (parseInt(laborCount) || 0);
    if (laborTotal > 0) breakdown.push({ label: 'Labor Charges', amount: laborTotal });
    total += laborTotal;

    const safeNames = Array.isArray(itemNames) ? itemNames : [itemNames];
    const safeQtys = Array.isArray(itemQtys) ? itemQtys : [itemQtys];
    const safeRates = Array.isArray(itemRates) ? itemRates : [itemRates];

    for (let i = 0; i < safeNames.length; i++) {
      const label = safeNames[i];
      const qty = parseInt(safeQtys[i]) || 1;
      const rate = parseFloat(safeRates[i]) || 0;
      const amt = qty * rate;
      if (label && amt > 0) {
        breakdown.push({ label: `${label} x${qty}`, amount: amt });
        total += amt;
      }
    }

    if (cardFee) {
      const fee = total * 0.03;
      breakdown.push({ label: 'Card Processing Fee', amount: fee });
      total += fee;
    }

    let signaturePath = null;
    if (signatureData && signatureData.startsWith('data:image')) {
      const base64Data = signatureData.replace(/^data:image\/png;base64,/, '');
      signaturePath = `/uploads/signature-${invoiceId}.png`;
      fs.writeFileSync(path.join(__dirname, '../public', signaturePath), base64Data, 'base64');
    }

    const photos = req.files.map(file => '/uploads/' + file.filename);

    const invoicePath = path.join(__dirname, '../data/invoices.json');
    let invoices = [];
    if (fs.existsSync(invoicePath)) {
      try {
        const raw = fs.readFileSync(invoicePath);
        invoices = raw.length ? JSON.parse(raw) : [];
      } catch (jsonErr) {
        console.warn('Corrupt invoice.json, resetting...');
        invoices = [];
      }
    }

    const newInvoice = {
      id: invoiceId,
      date,
      name,
      email,
      phone,
      address,
      service: load,
      paymentTerms,
      breakdown,
      total: parseFloat(total.toFixed(2)),
      signature: signaturePath,
      photos,
      tripExpenses: {
        fuelCost: parseFloat(fuelCost) || 0,
        tolls: parseFloat(tolls) || 0,
        maintenance: parseFloat(maintenance) || 0,
        notes: notes || ''
      }
    };

    invoices.push(newInvoice);
    fs.writeFileSync(invoicePath, JSON.stringify(invoices, null, 2));

    res.redirect(`/invoice.html?id=${invoiceId}`);
  } catch (err) {
    console.error('Invoice save failed:', err);
    res.status(500).send('Failed to save invoice.');
  }
});

module.exports = router;
