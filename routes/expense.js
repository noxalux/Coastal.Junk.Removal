// File: routes/expense.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const EXPENSE_DB = path.join(__dirname, '../data/trip-expenses.json');

function loadExpenses() {
  if (!fs.existsSync(EXPENSE_DB)) return [];
  return JSON.parse(fs.readFileSync(EXPENSE_DB));
}

function saveExpenses(data) {
  fs.writeFileSync(EXPENSE_DB, JSON.stringify(data, null, 2));
}

router.post('/save-trip-expense', (req, res) => {
  const expenses = loadExpenses();

  const {
    date,
    miles,
    fuelCost,
    landfillTrips,
    maintenance,
    laborHours,
    notes
  } = req.body;

  const mileageCharge = (parseFloat(miles) || 0) * 2;
  const landfillCharge = (parseFloat(landfillTrips) || 0) * 125;
  const laborCharge = (parseFloat(laborHours) || 0) * 60;

  const totalCost = mileageCharge + landfillCharge + (parseFloat(fuelCost) || 0) + (parseFloat(maintenance) || 0) + laborCharge;

  const trip = {
    id: Date.now(),
    date,
    miles: parseFloat(miles) || 0,
    fuelCost: parseFloat(fuelCost) || 0,
    landfillTrips: parseInt(landfillTrips) || 0,
    maintenance: parseFloat(maintenance) || 0,
    laborHours: parseFloat(laborHours) || 0,
    mileageCharge: +mileageCharge.toFixed(2),
    landfillCharge: +landfillCharge.toFixed(2),
    laborCharge: +laborCharge.toFixed(2),
    totalCost: +totalCost.toFixed(2),
    notes: notes || ''
  };

  expenses.push(trip);
  saveExpenses(expenses);

  res.redirect('/trip-expenses.html');
});

module.exports = router;
