const express = require('express');
const {
  getAllOrders,
  createOrder,
  updateOrderStatus,
  getActiveOrders,
  getOrderStatusHistory,
  getOrderById
} = require('../controllers/orderController');

const router = express.Router();

router.get('/', getAllOrders);
router.post('/', createOrder);
router.get('/active', getActiveOrders);
router.put('/:id/status', updateOrderStatus);
router.get('/:id/status-history', getOrderStatusHistory);
router.get('/:id', getOrderById);


module.exports = router;
