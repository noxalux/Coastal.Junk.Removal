// File: routes/save-invoice.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '../public/uploads');
const SIGNATURE_DIR = path.join(__dirname, '../public/signatures');
const DB_PATH = path.join(__dirname, '../data/invoices.json');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(SIGNATURE_DIR)) fs.mkdirSync(SIGNATURE_DIR, { recursive: true });

const upload = multer({ dest: UPLOADS_DIR });

router.post('/save-invoice', upload.array('photos', 3), (req, res) => {
  try {
    const {
      name, email, phone, address,
      load = '', loadQty = 1, miles = 0,
      landfillCount = 0, cardFee, paymentTerms = 'due',
      mattressCount = 0, laborCount = 0,
      fuelCost = 0, tolls = 0, maintenance = 0,
      notes = '', signatureData = '',
      ['itemName[]']: itemNames = [],
      ['itemQty[]']: itemQtys = [],
      ['itemRate[]']: itemRates = []
    } = req.body;

    const PRICES = {
      '1/4': 85, '1/2': 160, 'full': 275,
      'studio-move': 250, '1br-move': 375, '2br-move': 550,
      '3br-move': 725, 'office-move': 650, 'storage-move': 325,
      'estate-cleanout': 900, 'long-distance': 1500
    };

    const invoiceId = uuidv4();
    const date = new Date().toISOString();
    const breakdown = [];
    let total = 0;

    const qty = parseInt(loadQty) || 1;
    const rate = PRICES[load] || 0;
    const loadTotal = qty * rate;
    breakdown.push({ label: `${load} x${qty}`, amount: loadTotal });
    total += loadTotal;

    const travel = parseFloat(miles) * 2;
    if (travel > 0) {
      breakdown.push({ label: `Travel (${miles} mi @ $2)`, amount: travel });
      total += travel;
    }

    const landfill = 125 * (parseInt(landfillCount) || 0);
    if (landfill) {
      breakdown.push({ label: `Landfill Fee x${landfillCount}`, amount: landfill });
      total += landfill;
    }

    const mattress = 90 * (parseInt(mattressCount) || 0);
    if (mattress) {
      breakdown.push({ label: `Mattress Fee x${mattressCount}`, amount: mattress });
      total += mattress;
    }

    const labor = 60 * (parseInt(laborCount) || 0);
    if (labor) {
      breakdown.push({ label: `Labor Charges x${laborCount}`, amount: labor });
      total += labor;
    }

    const safeNames = Array.isArray(itemNames) ? itemNames : [itemNames];
    const safeQtys = Array.isArray(itemQtys) ? itemQtys : [itemQtys];
    const safeRates = Array.isArray(itemRates) ? itemRates : [itemRates];

    for (let i = 0; i < safeNames.length; i++) {
      const label = safeNames[i];
      const q = parseFloat(safeQtys[i]) || 1;
      const r = parseFloat(safeRates[i]) || 0;
      const amt = q * r;
      if (label && amt > 0) {
        breakdown.push({ label: `${label} x${q} @ $${r}`, amount: amt });
        total += amt;
      }
    }

    const includeCardFee = cardFee === 'on' || cardFee === true;
    if (includeCardFee) {
      const fee = +(total * 0.03).toFixed(2);
      breakdown.push({ label: 'Card Fee (3%)', amount: fee });
      total += fee;
    }

    let signaturePath = null;
    if (signatureData && typeof signatureData === 'string' && signatureData.startsWith('data:image')) {
      const base64 = signatureData.replace(/^data:image\/png;base64,/, '');
      signaturePath = `/signatures/signature-${invoiceId}.png`;
      fs.writeFileSync(path.join(SIGNATURE_DIR, `signature-${invoiceId}.png`), base64, 'base64');
    }

    const photos = req.files.map(file => `/uploads/${file.filename}`);

    const newInvoice = {
      id: invoiceId,
      date,
      name,
      email,
      phone,
      address,
      service: load,
      loadQty: qty,
      miles: parseFloat(miles) || 0,
      paymentTerms,
      cardFee: includeCardFee,
      total: parseFloat(total.toFixed(2)),
      photos,
      signature: signaturePath,
      tripExpenses: {
        fuelCost: parseFloat(fuelCost) || 0,
        tolls: parseFloat(tolls) || 0,
        maintenance: parseFloat(maintenance) || 0,
        notes: notes || ''
      },
      breakdown
    };

    let invoices = [];
    if (fs.existsSync(DB_PATH)) {
      try {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        invoices = raw.trim().length ? JSON.parse(raw) : [];
      } catch {
        invoices = [];
      }
    }

    invoices.push(newInvoice);
    fs.writeFileSync(DB_PATH, JSON.stringify(invoices, null, 2));
    res.redirect(`/invoice.html?id=${invoiceId}`);
  } catch (err) {
    console.error('Invoice save failed:', err);
    res.status(500).send('Failed to save invoice.');
  }
});

module.exports = router;
