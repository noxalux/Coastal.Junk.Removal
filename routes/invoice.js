// File: routes/invoice.js (extended for CRM data)
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const router = express.Router();
const crypto = require('crypto');

const INVOICE_DB = path.join(__dirname, '../data/invoices.json');
const UPLOAD_DIR = path.join(__dirname, '../public/uploads');
const SIGNATURE_DIR = path.join(__dirname, '../public/signatures');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(SIGNATURE_DIR)) fs.mkdirSync(SIGNATURE_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  }
});

const upload = multer({ storage });

function loadInvoices() {
  if (!fs.existsSync(INVOICE_DB)) return [];
  return JSON.parse(fs.readFileSync(INVOICE_DB));
}

function saveInvoices(data) {
  fs.writeFileSync(INVOICE_DB, JSON.stringify(data, null, 2));
}

router.post('/create-invoice', upload.array('photos', 3), (req, res) => {
  const invoices = loadInvoices();

  const {
    name, email, phone, address,
    service, load, loadQty, miles,
    landfillCount, cardFee,
    paymentTerms, signatureData,
    fuelCost, tolls, maintenance, notes,
    itemName = [], itemQty = [], itemRate = []
  } = req.body;

  const id = crypto.randomUUID().slice(0, 8);
  const date = new Date().toISOString();
  const photos = req.files.map(file => `/uploads/${file.filename}`);

  let signaturePath = null;
  if (signatureData && signatureData.startsWith('data:image')) {
    const base64Data = signatureData.replace(/^data:image\/png;base64,/, "");
    signaturePath = `/signatures/signature-${id}.png`;
    fs.writeFileSync(path.join(SIGNATURE_DIR, `signature-${id}.png`), base64Data, 'base64');
  }

  const pricing = { '1/4': 60, '1/2': 90, 'full': 150 };
  const base = (pricing[load] || 0) * (parseInt(loadQty) || 1);
  const travel = parseFloat(miles) * 2;
  const landfillTrips = parseInt(landfillCount) || 0;
  const landfillFee = landfillTrips * 125;

  const customCharges = Array.isArray(itemName) ? itemName.map((label, i) => {
    const qty = parseFloat(itemQty[i] || 1);
    const rate = parseFloat(itemRate[i] || 0);
    return { label, qty, rate, total: +(qty * rate).toFixed(2) };
  }) : [];

  const customTotal = customCharges.reduce((sum, c) => sum + c.total, 0);
  const subtotal = base + travel + landfillFee + customTotal;
  const cardFeeAmount = cardFee ? subtotal * 0.03 : 0;
  const total = +(subtotal + cardFeeAmount).toFixed(2);

  const invoice = {
    id, date,
    name, email, phone, address,
    service, load, loadQty, miles,
    landfillTrips, paymentTerms,
    cardFee: !!cardFee,
    total, photos, signature: signaturePath,
    tripExpenses: {
      fuelCost: parseFloat(fuelCost || 0),
      tolls: parseFloat(tolls || 0),
      maintenance: parseFloat(maintenance || 0),
      notes: notes || ''
    },
    breakdown: [
      { label: `${load} Load x${loadQty}`, amount: base },
      { label: `Travel (${miles} mi @ $2)`, amount: travel },
      ...(landfillTrips > 0 ? [{ label: `Landfill Fee x${landfillTrips}`, amount: landfillFee }] : []),
      ...customCharges.map(c => ({ label: `${c.label} x${c.qty} @ $${c.rate}`, amount: c.total })),
      ...(cardFee ? [{ label: 'Card Fee (3%)', amount: +cardFeeAmount.toFixed(2) }] : [])
    ]
  };

  invoices.push(invoice);
  saveInvoices(invoices);

  res.redirect(`/invoice.html?id=${id}`);
});

module.exports = router;
