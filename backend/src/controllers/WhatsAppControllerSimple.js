const WhatsAppConnection = require('../models/WhatsAppConnection');
const Business = require('../models/Business');
const Branch = require('../models/Branch');
const LoggerService = require('../services/LoggerService');
const QRCode = require('qrcode');

class WhatsAppControllerSimple {
    constructor() {
        this.logger = new LoggerService('whatsapp');
    }

    // Get all WhatsApp connections
    async getConnections(req, res) {
        try {
            const connections = await WhatsAppConnection.find()
                .populate('businessId', 'name')
                .populate('branchId', 'name')
                .populate('createdBy', 'name email')
                .sort({ createdAt: -1 });

            this.logger.info('WhatsApp connections retrieved', { userId: req.user.id });

            res.json({
                success: true,
                data: connections
            });
        } catch (error) {
            this.logger.error('Error getting WhatsApp connections', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Error al obtener conexiones de WhatsApp'
            });
        }
    }

    // Get WhatsApp stats
    async getStats(req, res) {
        try {
            const stats = await WhatsAppConnection.aggregate([
                {
                    $group: {
                        _id: null,
                        totalConnections: { $sum: 1 },
                        connectedCount: {
                            $sum: { $cond: [{ $eq: ['$status', 'connected'] }, 1, 0] }
                        },
                        totalMessages: { $sum: '$totalMessages' },
                        messagesToday: { $sum: '$messagesToday' },
                        avgResponseRate: { $avg: '$responseRate' }
                    }
                }
            ]);

            const result = stats[0] || {
                totalConnections: 0,
                connectedCount: 0,
                totalMessages: 0,
                messagesToday: 0,
                avgResponseRate: 0
            };

            this.logger.info('WhatsApp stats retrieved', { userId: req.user.id });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            this.logger.error('Error getting WhatsApp stats', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Error al obtener estadísticas de WhatsApp'
            });
        }
    }

    // Create new WhatsApp connection
    async createConnection(req, res) {
        try {
            const {
                businessId,
                branchId,
                phoneNumber,
                connectionName,
                customerServiceNumber,
                autoReply,
                aiIntegration,
                businessHours,
                offHoursMessage
            } = req.body;

            // Validate required fields
            if (!businessId || !branchId || !phoneNumber || !connectionName || !customerServiceNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'Todos los campos son requeridos'
                });
            }

            // Check if phone number already exists
            const existingConnection = await WhatsAppConnection.findOne({ phoneNumber });
            if (existingConnection) {
                return res.status(400).json({
                    success: false,
                    error: 'Este número de WhatsApp ya está registrado'
                });
            }

            // Create new connection
            const connection = new WhatsAppConnection({
                businessId,
                branchId,
                phoneNumber,
                connectionName,
                customerServiceNumber,
                autoReply: autoReply !== undefined ? autoReply : true,
                aiIntegration: aiIntegration !== undefined ? aiIntegration : true,
                businessHours: businessHours || { start: '08:00', end: '22:00' },
                offHoursMessage: offHoursMessage || 'Gracias por contactarnos. Te responderemos pronto.',
                createdBy: req.user.id
            });

            await connection.save();

            // Get business and branch info for QR code
            const business = await Business.findById(businessId);
            const branch = await Branch.findById(branchId);

            // Generate QR code data
            const qrData = {
                connectionId: connection._id,
                businessName: business?.name || 'Business',
                branchName: branch?.name || 'Branch',
                phoneNumber,
                timestamp: Date.now()
            };

            // Generate QR code as data URL
            const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            // Update connection with QR code
            connection.qrCodeDataURL = qrCodeDataURL;
            connection.status = 'disconnected';
            await connection.save();

            // Populate references
            await connection.populate('businessId', 'name');
            await connection.populate('branchId', 'name');
            await connection.populate('createdBy', 'name email');

            this.logger.info('WhatsApp connection created', { 
                userId: req.user.id, 
                connectionId: connection._id 
            });

            res.status(201).json({
                success: true,
                data: connection,
                message: 'Conexión de WhatsApp creada exitosamente'
            });
        } catch (error) {
            this.logger.error('Error creating WhatsApp connection', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Error al crear conexión de WhatsApp'
            });
        }
    }

    // Update WhatsApp connection
    async updateConnection(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const connection = await WhatsAppConnection.findById(id);
            if (!connection) {
                return res.status(404).json({
                    success: false,
                    error: 'Conexión de WhatsApp no encontrada'
                });
            }

            // Update fields
            Object.keys(updateData).forEach(key => {
                if (key !== '_id' && key !== '__v') {
                    connection[key] = updateData[key];
                }
            });

            connection.updatedBy = req.user.id;
            await connection.save();

            // Populate references
            await connection.populate('businessId', 'name');
            await connection.populate('branchId', 'name');
            await connection.populate('createdBy', 'name email');

            this.logger.info('WhatsApp connection updated', { 
                userId: req.user.id, 
                connectionId: connection._id 
            });

            res.json({
                success: true,
                data: connection,
                message: 'Conexión de WhatsApp actualizada exitosamente'
            });
        } catch (error) {
            this.logger.error('Error updating WhatsApp connection', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Error al actualizar conexión de WhatsApp'
            });
        }
    }

    // Delete WhatsApp connection
    async deleteConnection(req, res) {
        try {
            const { id } = req.params;

            const connection = await WhatsAppConnection.findById(id);
            if (!connection) {
                return res.status(404).json({
                    success: false,
                    error: 'Conexión de WhatsApp no encontrada'
                });
            }

            await WhatsAppConnection.findByIdAndDelete(id);

            this.logger.info('WhatsApp connection deleted', { 
                userId: req.user.id, 
                connectionId: id 
            });

            res.json({
                success: true,
                message: 'Conexión de WhatsApp eliminada exitosamente'
            });
        } catch (error) {
            this.logger.error('Error deleting WhatsApp connection', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Error al eliminar conexión de WhatsApp'
            });
        }
    }

    // Toggle connection status (connect/disconnect)
    async toggleConnection(req, res) {
        try {
            const { id } = req.params;
            const { action } = req.body; // 'connect' or 'disconnect'

            const connection = await WhatsAppConnection.findById(id);
            if (!connection) {
                return res.status(404).json({
                    success: false,
                    error: 'Conexión de WhatsApp no encontrada'
                });
            }

            if (action === 'connect') {
                connection.status = 'connecting';
                await connection.save();

                // Simulate connection process
                setTimeout(async () => {
                    connection.status = 'connected';
                    connection.lastActivity = new Date();
                    await connection.save();
                }, 2000);

                this.logger.info('WhatsApp connection initiated', { 
                    userId: req.user.id, 
                    connectionId: connection._id 
                });

                res.json({
                    success: true,
                    message: 'Conectando WhatsApp...',
                    data: { status: 'connecting' }
                });
            } else if (action === 'disconnect') {
                connection.status = 'disconnected';
                await connection.save();

                this.logger.info('WhatsApp connection disconnected', { 
                    userId: req.user.id, 
                    connectionId: connection._id 
                });

                res.json({
                    success: true,
                    message: 'WhatsApp desconectado exitosamente',
                    data: { status: 'disconnected' }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: 'Acción no válida'
                });
            }
        } catch (error) {
            this.logger.error('Error toggling WhatsApp connection', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Error al cambiar estado de conexión'
            });
        }
    }

    // Handle incoming WhatsApp messages
    async handleWebhook(req, res) {
        try {
            const { message, from, connectionId } = req.body;
            
            this.logger.info('WhatsApp webhook received', { 
                from, 
                message: message?.substring(0, 50) + '...',
                connectionId 
            });

            // Find the connection
            const connection = await WhatsAppConnection.findById(connectionId);
            if (!connection) {
                return res.status(404).json({
                    success: false,
                    error: 'Conexión no encontrada'
                });
            }

            // Check if AI integration is enabled
            if (!connection.aiIntegration) {
                return res.json({
                    success: true,
                    message: 'AI integration disabled'
                });
            }

            // Check if message is "Hola" or similar greetings
            const greetings = ['hola', 'hello', 'buenos días', 'buenas tardes', 'buenas noches', 'hey', 'hi'];
            const isGreeting = greetings.some(greeting => 
                message.toLowerCase().includes(greeting.toLowerCase())
            );

            if (isGreeting) {
                // Send welcome message
                const welcomeMessage = connection.offHoursMessage || '¡Hola! 👋 Bienvenido a nuestro negocio. ¿En qué puedo ayudarte hoy?';
                
                // In a real implementation, you would send this via WhatsApp API
                this.logger.info('Sending welcome message', { 
                    to: from, 
                    message: welcomeMessage 
                });

                // Update connection stats
                connection.messagesToday = (connection.messagesToday || 0) + 1;
                connection.totalMessages = (connection.totalMessages || 0) + 1;
                await connection.save();

                return res.json({
                    success: true,
                    message: 'Welcome message sent',
                    response: welcomeMessage
                });
            }

            // For other messages, you could implement more AI logic here
            res.json({
                success: true,
                message: 'Message received'
            });

        } catch (error) {
            this.logger.error('Error handling webhook', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Error procesando mensaje'
            });
        }
    }

    // Send message via WhatsApp
    async sendMessage(req, res) {
        try {
            const { connectionId, to, message } = req.body;

            // Validate required fields
            if (!connectionId || !to || !message) {
                return res.status(400).json({
                    success: false,
                    error: 'Todos los campos son requeridos'
                });
            }

            // Find the connection
            const connection = await WhatsAppConnection.findById(connectionId);
            if (!connection) {
                return res.status(404).json({
                    success: false,
                    error: 'Conexión no encontrada'
                });
            }

            // In a real implementation, you would send this via WhatsApp API
            this.logger.info('Sending WhatsApp message', { 
                connectionId, 
                to, 
                message: message.substring(0, 50) + '...' 
            });

            // Update connection stats
            connection.messagesToday = (connection.messagesToday || 0) + 1;
            connection.totalMessages = (connection.totalMessages || 0) + 1;
            await connection.save();

            res.json({
                success: true,
                message: 'Mensaje enviado exitosamente'
            });

        } catch (error) {
            this.logger.error('Error sending message', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Error enviando mensaje'
            });
        }
    }
}

module.exports = WhatsAppControllerSimple;
