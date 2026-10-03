const express = require('express');
const router = express.Router();

const {
  getISPs,
  getISPById,
  createISP,
  updateISP,
  deleteISP,
} = require('../controllers/ispController');

// 1. Destructure 'protect' from the auth middleware object
const { protect } = require('../middleware/auth');

// 2. Put protect behind the router so req.tenantId gets populated
router.use(protect);

// 3. Route definitions
router.get('/', getISPs);
router.get('/:id', getISPById);
router.post('/', createISP);
router.put('/:id', updateISP);
router.delete('/:id', deleteISP);

module.exports = router;