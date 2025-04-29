// File: /routes/signature.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.post('/save-signature', express.json({ limit: '5mb' }), (req, res) => {
  const { invoiceId, signatureData } = req.body;

  if (!invoiceId || !signatureData) {
    return res.status(400).json({ error: 'Missing invoiceId or signatureData' });
  }

  const base64Data = signatureData.replace(/^data:image\/png;base64,/, '');
  const signaturePath = path.join(__dirname, '../public/signatures', `${invoiceId}.png`);

  fs.writeFile(signaturePath, base64Data, 'base64', (err) => {
    if (err) {
      console.error('Error saving signature:', err);
      return res.status(500).json({ error: 'Failed to save signature' });
    }
    res.json({ message: 'Signature saved successfully' });
  });
});

module.exports = router;
