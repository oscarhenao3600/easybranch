const express = require('express');
const router = express.Router();
const WhatsAppController = require('../controllers/WhatsAppController');
const authMiddleware = require('../middleware/auth');

// Create controller instance
const whatsappController = new WhatsAppController();

// Apply authentication middleware to all routes
router.use(authMiddleware.verifyToken);

// Get all WhatsApp connections
router.get('/connections', whatsappController.getConnections.bind(whatsappController));

// Get WhatsApp statistics
router.get('/stats', whatsappController.getStats.bind(whatsappController));

// Create new WhatsApp connection
router.post('/connections', whatsappController.createConnection.bind(whatsappController));

// Update WhatsApp connection
router.put('/connections/:id', whatsappController.updateConnection.bind(whatsappController));

// Delete WhatsApp connection
router.delete('/connections/:id', whatsappController.deleteConnection.bind(whatsappController));

// Toggle connection status (connect/disconnect)
router.post('/connections/:id/toggle', whatsappController.toggleConnection.bind(whatsappController));

// Handle incoming WhatsApp messages
router.post('/webhook', whatsappController.handleWebhook.bind(whatsappController));

// Send message via WhatsApp
router.post('/send-message', whatsappController.sendMessage.bind(whatsappController));

// Get QR code for a specific connection
router.get('/connections/:id/qr', whatsappController.getQRCode.bind(whatsappController));

module.exports = router;
