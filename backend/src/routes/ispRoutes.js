const express = require('express');

const {
  getISPs,
  getISPById,
  createISP,
  updateISP,
  deleteISP,
} = require('../controllers/ispController');

const router = express.Router();

// GET all ISPs
router.get('/', getISPs);

// GET single ISP
router.get('/:id', getISPById);

// CREATE ISP
router.post('/', createISP);

// UPDATE ISP
router.put('/:id', updateISP);

// DELETE ISP
router.delete('/:id', deleteISP);

module.exports = router;