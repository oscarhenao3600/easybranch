const express = require('express');
const router = express.Router();
const orderController = require('../controllers/OrderController');
const auth = require('../middleware/auth');

// Aplicar middleware de autenticación a todas las rutas
router.use(auth.verifyToken);

// Rutas de pedidos
router.get('/', orderController.getOrders.bind(orderController));
router.get('/stats', orderController.getOrderStats.bind(orderController));
router.get('/branch/:branchId', orderController.getOrdersByBranch.bind(orderController));
router.get('/:id', orderController.getOrderById.bind(orderController));
router.put('/:id/status', orderController.updateOrderStatus.bind(orderController));
router.put('/:id/cancel', orderController.cancelOrder.bind(orderController));

module.exports = router;
