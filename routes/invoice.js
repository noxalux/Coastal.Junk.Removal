// File: routes/invoice.js
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');

const router = express.Router();

const INVOICE_DB = path.join(__dirname, '../data/invoices.json');
const UPLOAD_DIR = path.join(__dirname, '../public/uploads');
const SIGNATURE_DIR = path.join(__dirname, '../public/signatures');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(SIGNATURE_DIR)) fs.mkdirSync(SIGNATURE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

function loadInvoices() {
  if (!fs.existsSync(INVOICE_DB)) return [];
  try {
    const raw = fs.readFileSync(INVOICE_DB, 'utf-8');
    return raw.trim().length ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Failed to read invoice DB:', err);
    return [];
  }
}

function saveInvoices(data) {
  fs.writeFileSync(INVOICE_DB, JSON.stringify(data, null, 2));
}

router.post('/create-invoice', upload.array('photos', 3), (req, res) => {
  try {
    const invoices = loadInvoices();
    const {
      name = '', email = '', phone = '', address = '',
      load = '', loadQty = 1, miles = 0,
      landfillCount = 0, cardFee, paymentTerms = 'due',
      fuelCost = 0, tolls = 0, maintenance = 0, notes = '',
      signatureData = '', itemName = [], itemQty = [], itemRate = []
    } = req.body;

    const id = crypto.randomUUID().slice(0, 8);
    const date = new Date().toISOString();
    const photos = req.files.map(file => `/uploads/${file.filename}`);

    let signaturePath = null;
    if (typeof signatureData === 'string' && signatureData.startsWith('data:image')) {
      const base64 = signatureData.split(',')[1];
      signaturePath = `/signatures/signature-${id}.png`;
      fs.writeFileSync(path.join(SIGNATURE_DIR, `signature-${id}.png`), base64, 'base64');
    }

    const PRICES = {
      '1/4': 85, '1/2': 160, 'full': 275,
      'studio-move': 250, '1br-move': 375, '2br-move': 550,
      '3br-move': 725, 'office-move': 650, 'storage-move': 325,
      'estate-cleanout': 900, 'long-distance': 1500
    };

    const qty = parseInt(loadQty) || 1;
    const base = (PRICES[load] || 0) * qty;
    const travel = parseFloat(miles) * 2;
    const landfillTrips = parseInt(landfillCount) || 0;
    const landfillFee = landfillTrips * 125;

    const extras = Array.isArray(itemName) ? itemName.map((label, i) => {
      const q = parseFloat(itemQty[i] || 1);
      const r = parseFloat(itemRate[i] || 0);
      return { label, qty: q, rate: r, total: +(q * r).toFixed(2) };
    }) : [];

    const extraTotal = extras.reduce((sum, i) => sum + i.total, 0);
    const subtotal = base + travel + landfillFee + extraTotal;
    const fee = (cardFee === 'on' || cardFee === true) ? +(subtotal * 0.03).toFixed(2) : 0;
    const total = +(subtotal + fee).toFixed(2);

    const invoice = {
      id, date, name, email, phone, address,
      service: load, loadQty: qty, miles,
      landfillTrips, paymentTerms,
      cardFee: !!cardFee, total, photos, signature: signaturePath,
      tripExpenses: {
        fuelCost: parseFloat(fuelCost) || 0,
        tolls: parseFloat(tolls) || 0,
        maintenance: parseFloat(maintenance) || 0,
        notes
      },
      breakdown: [
        { label: `${load} x${qty}`, amount: base },
        { label: `Travel (${miles} mi @ $2)`, amount: travel },
        ...(landfillTrips > 0 ? [{ label: `Landfill Fee x${landfillTrips}`, amount: landfillFee }] : []),
        ...extras.map(i => ({ label: `${i.label} x${i.qty} @ $${i.rate}`, amount: i.total })),
        ...(fee > 0 ? [{ label: 'Card Fee (3%)', amount: fee }] : [])
      ]
    };

    invoices.push(invoice);
    saveInvoices(invoices);
    res.redirect(`/invoice.html?id=${id}`);
  } catch (err) {
    console.error('Invoice creation failed:', err);
    res.status(500).send('Failed to create invoice');
  }
});

module.exports = router;
