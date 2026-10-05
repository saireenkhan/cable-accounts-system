// routes/promiseRoutes.js
const express = require('express');
const router = express.Router();
const {
  getPromises,
  getPromise,
  createPromise,
  updatePromise,
  updatePromiseStatus,
  deletePromise,
} = require('../controllers/promiseController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getPromises).post(createPromise);

router
  .route('/:id')
  .get(getPromise)
  .put(updatePromise)
  .delete(deletePromise);

router.patch('/:id/status', updatePromiseStatus);

module.exports = router;