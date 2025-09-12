const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/DashboardController');
const auth = require('../middleware/auth');

// Aplicar middleware de autenticación a todas las rutas
router.use(auth.verifyToken);

// Rutas del dashboard
router.get('/stats', dashboardController.getDashboardStats.bind(dashboardController));

module.exports = router;

