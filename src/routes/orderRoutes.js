const express = require('express');
const {
  getAllOrders,
  createOrder,
  updateOrderStatus,
  getActiveOrders
} = require('../controllers/orderController');

const router = express.Router();

router.get('/', getAllOrders);
router.post('/', createOrder);
router.get('/active', getActiveOrders);
router.put('/:id/status', updateOrderStatus);

module.exports = router;
