const WhatsAppConnection = require('../models/WhatsAppConnection');
const Business = require('../models/Business');
const Branch = require('../models/Branch');
const User = require('../models/User');
const BranchAIConfig = require('../models/BranchAIConfig');
const LoggerService = require('../services/LoggerService');
const WhatsAppServiceSimple = require('../services/WhatsAppServiceSimple');
const AIService = require('../services/AIService');
const QRCode = require('qrcode');

class WhatsAppController {
    constructor() {
        this.logger = new LoggerService('whatsapp');
        this.whatsappService = null;
        this.aiService = new AIService();
        this.initializeService();
        this.initializeAI();
    }

    async initializeService() {
        try {
            this.whatsappService = new WhatsAppServiceSimple();
            this.setupEventHandlers();
            this.logger.info('WhatsApp service initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize WhatsApp service', { error: error.message });
            // Continue without WhatsApp service for now
        }
    }

    async initializeAI() {
        try {
            // Configure HuggingFace if API key is available
            const huggingFaceKey = process.env.HUGGINGFACE_API_KEY;
            const huggingFaceModel = process.env.HUGGINGFACE_MODEL || 'microsoft/DialoGPT-medium';
            const useHuggingFace = process.env.USE_HUGGINGFACE === 'true';

            if (huggingFaceKey && useHuggingFace) {
                this.aiService.configureHuggingFace(huggingFaceKey, huggingFaceModel);
                console.log('🤖 ===== IA CONFIGURADA CON HUGGINGFACE =====');
                console.log('🔑 API Key:', huggingFaceKey ? 'Configurada' : 'No configurada');
                console.log('🤖 Modelo:', huggingFaceModel);
                console.log('==========================================');
            } else {
                console.log('🤖 ===== IA CONFIGURADA EN MODO SIMULACIÓN =====');
                console.log('⚠️ HuggingFace deshabilitado - usando respuestas inteligentes');
                console.log('================================================');
            }

            this.logger.info('AI service initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize AI service', { error: error.message });
        }
    }

    setupEventHandlers() {
        if (this.whatsappService) {
            this.whatsappService.setEventHandlers({
                qrGenerated: (data) => this.handleQRGenerated(data),
                qrRefreshed: (data) => this.handleQRRefreshed(data),
                clientReady: (data) => this.handleClientReady(data),
                authFailure: (data) => this.handleAuthFailure(data),
                clientDisconnected: (data) => this.handleClientDisconnected(data),
                messageReceived: (data) => this.handleMessageReceived(data)
            });
        }
    }

    async handleQRGenerated(data) {
        try {
            const { connectionId, qrCodeDataURL, phoneNumber, expiresAt } = data;
            
            // Update connection with QR code
            await WhatsAppConnection.findByIdAndUpdate(connectionId, {
                qrCodeDataURL,
                status: 'connecting',
                qrExpiresAt: expiresAt
            });

            this.logger.info('QR code generated and saved', { connectionId, phoneNumber, expiresAt });
        } catch (error) {
            this.logger.error('Error handling QR generation', { error: error.message });
        }
    }

    async handleQRRefreshed(data) {
        try {
            const { connectionId, qrCodeDataURL, phoneNumber, expiresAt } = data;
            
            // Update connection with new QR code
            await WhatsAppConnection.findByIdAndUpdate(connectionId, {
                qrCodeDataURL,
                qrExpiresAt: expiresAt
            });

            this.logger.info('QR code refreshed and saved', { connectionId, phoneNumber, expiresAt });
        } catch (error) {
            this.logger.error('Error handling QR refresh', { error: error.message });
        }
    }

    async handleClientReady(data) {
        try {
            const { connectionId, phoneNumber } = data;
            
            // Update connection status
            await WhatsAppConnection.findByIdAndUpdate(connectionId, {
                status: 'connected',
                lastActivity: new Date()
            });

            this.logger.info('WhatsApp client ready', { connectionId, phoneNumber });
        } catch (error) {
            this.logger.error('Error handling client ready', { error: error.message });
        }
    }

    async handleAuthFailure(data) {
        try {
            const { connectionId, phoneNumber, error } = data;
            
            // Update connection status
            await WhatsAppConnection.findByIdAndUpdate(connectionId, {
                status: 'error',
                lastError: error
            });

            this.logger.error('WhatsApp authentication failed', { connectionId, phoneNumber, error });
        } catch (err) {
            this.logger.error('Error handling auth failure', { error: err.message });
        }
    }

    async handleClientDisconnected(data) {
        try {
            const { connectionId, phoneNumber, reason } = data;
            
            // Stop QR code refresh
            if (this.whatsappService) {
                this.whatsappService.stopQRCodeRefresh(connectionId);
            }
            
            // Update connection status
            await WhatsAppConnection.findByIdAndUpdate(connectionId, {
                status: 'disconnected',
                lastDisconnect: new Date(),
                disconnectReason: reason,
                qrCodeDataURL: null,
                qrExpiresAt: null
            });

            this.logger.warn('WhatsApp client disconnected', { connectionId, phoneNumber, reason });
        } catch (error) {
            this.logger.error('Error handling client disconnect', { error: error.message });
        }
    }

    async handleMessageReceived(data) {
        try {
            const { connectionId, from, message, timestamp, messageId } = data;

            // Find the connection
            const connection = await WhatsAppConnection.findById(connectionId);
            if (!connection) {
                this.logger.error('Connection not found for incoming message', { connectionId });
                return;
            }

            // Check if AI integration is enabled
            if (!connection.aiIntegration) {
                console.log('⚠️ IA deshabilitada para esta conexión:', connectionId);
                return;
            }

            // Extract phone number from WhatsApp format (remove @c.us)
            const phoneNumber = from.replace('@c.us', '');
            
            console.log('🤖 ===== PROCESANDO MENSAJE CON IA =====');
            console.log('📱 Connection ID:', connectionId);
            console.log('📞 From:', phoneNumber);
            console.log('💬 Message:', message);
            console.log('🏢 Business ID:', connection.businessId);
            console.log('🏪 Branch ID:', connection.branchId);
            console.log('========================================');

            try {
                // Get business and branch info for context
                const business = await Business.findById(connection.businessId);
                const branch = await Branch.findById(connection.branchId);
                
                // Get AI configuration for this branch
                const branchAIConfig = await BranchAIConfig.findOne({ branchId: connection.branchId });
                
                // Determine business type
                const businessType = business?.type || 'restaurant';
                
                console.log('🔍 ===== CONFIGURACIÓN DE IA ENCONTRADA =====');
                console.log('🏪 Branch:', branch?.name || 'No encontrada');
                console.log('🏢 Business:', business?.name || 'No encontrada');
                console.log('🤖 AI Config:', branchAIConfig ? 'Disponible' : 'No disponible');
                console.log('📋 Menu Content:', branchAIConfig?.menuContent ? 'Disponible' : 'No disponible');
                console.log('🎯 Custom Prompt:', branchAIConfig?.customPrompt ? 'Disponible' : 'No disponible');
                console.log('============================================');
                
                // Generate AI response with branch-specific configuration
                const aiResponse = await this.aiService.generateResponse(
                    connection.branchId,
                    message,
                    phoneNumber, // Use phone number as client ID
                    businessType,
                    branchAIConfig // Pass branch-specific configuration
                );

                console.log('🤖 ===== RESPUESTA IA GENERADA =====');
                console.log('📱 Connection ID:', connectionId);
                console.log('📞 To:', phoneNumber);
                console.log('🤖 AI Response:', aiResponse);
                console.log('====================================');

                // Send AI response
                await this.whatsappService.sendMessage(connectionId, phoneNumber, aiResponse);

                // Update connection stats
                connection.messagesToday = (connection.messagesToday || 0) + 1;
                connection.totalMessages = (connection.totalMessages || 0) + 1;
                await connection.save();

                this.logger.info('AI response sent', { 
                    connectionId, 
                    to: phoneNumber, 
                    message: aiResponse.substring(0, 100) + '...' 
                });

            } catch (aiError) {
                console.error('❌ Error procesando con IA:', aiError);
                
                // Fallback to basic response
                const fallbackMessage = '¡Hola! 👋 Gracias por contactarnos. ¿En qué puedo ayudarte hoy?';
                await this.whatsappService.sendMessage(connectionId, phoneNumber, fallbackMessage);
                
                this.logger.error('AI processing failed, sent fallback', { 
                    connectionId, 
                    error: aiError.message 
                });
            }

        } catch (error) {
            this.logger.error('Error handling incoming message', { error: error.message });
        }
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

            // Handle string IDs by creating default business and branch if needed
            let businessObjectId, branchObjectId;
            
            if (businessId === 'business1' || typeof businessId === 'string') {
                // Create or find default business
                const Business = require('../models/Business');
                let business = await Business.findOne({ name: 'Restaurante El Sabor' });
                if (!business) {
                    business = new Business({
                        name: 'Restaurante El Sabor',
                        businessType: 'restaurant',
                        contact: {
                            email: 'info@elsabor.com',
                            phone: '+573001234567'
                        },
                        address: {
                            street: 'Calle 123 #45-67',
                            city: 'Bogotá',
                            state: 'Cundinamarca',
                            country: 'Colombia',
                            zipCode: '110111'
                        },
                        settings: {
                            timezone: 'America/Bogota',
                            currency: 'COP',
                            language: 'es',
                            autoReply: true,
                            delivery: true
                        }
                    });
                    await business.save();
                }
                businessObjectId = business._id;
            } else {
                businessObjectId = businessId;
            }

            if (branchId === 'branch1' || typeof branchId === 'string') {
                // Create or find default branch
                const Branch = require('../models/Branch');
                let branch = await Branch.findOne({ name: 'Sucursal Centro' });
                if (!branch) {
                    branch = new Branch({
                        branchId: `BR${Date.now()}`,
                        businessId: businessObjectId,
                        name: 'Sucursal Centro',
                        description: 'Sucursal principal en el centro de la ciudad',
                        address: {
                            street: 'Calle 123 #45-67',
                            city: 'Bogotá',
                            state: 'Cundinamarca',
                            zipCode: '110111',
                            country: 'Colombia'
                        },
                        contact: {
                            phone: '+573001234567',
                            email: 'centro@elsabor.com'
                        },
                        whatsapp: {
                            provider: 'whatsapp-web.js',
                            phoneNumber: phoneNumber,
                            isConnected: false,
                            status: 'disconnected'
                        },
                        settings: {
                            autoReply: true,
                            delivery: true,
                            businessHours: {
                                monday: { open: '08:00', close: '22:00' },
                                tuesday: { open: '08:00', close: '22:00' },
                                wednesday: { open: '08:00', close: '22:00' },
                                thursday: { open: '08:00', close: '22:00' },
                                friday: { open: '08:00', close: '23:00' },
                                saturday: { open: '09:00', close: '23:00' },
                                sunday: { open: '10:00', close: '21:00' }
                            }
                        }
                    });
                    await branch.save();
                }
                branchObjectId = branch._id;
            } else {
                branchObjectId = branchId;
            }

            // Check if phone number already exists
            const existingConnection = await WhatsAppConnection.findOne({ phoneNumber });
            if (existingConnection) {
                return res.status(400).json({
                    success: false,
                    error: 'Este número de WhatsApp ya está registrado'
                });
            }

            // Get or create a default user for createdBy
            let createdByUser = null;
            
            if (req.user && req.user.userId) {
                createdByUser = await User.findOne({ userId: req.user.userId });
            }
            
            if (!createdByUser) {
                // Create or find default admin user
                createdByUser = await User.findOne({ email: 'admin@easybranch.com' });
                if (!createdByUser) {
                    createdByUser = new User({
                        email: 'admin@easybranch.com',
                        password: 'admin123',
                        name: 'Super Administrador',
                        role: 'super_admin',
                        userId: 'USR' + Date.now(),
                        isActive: true,
                        profile: {
                            phone: '+573001234567',
                            timezone: 'America/Bogota',
                            language: 'es'
                        }
                    });
                    await createdByUser.save();
                }
            }

            // Create new connection
            const connection = new WhatsAppConnection({
                businessId: businessObjectId,
                branchId: branchObjectId,
                phoneNumber,
                connectionName,
                customerServiceNumber,
                autoReply: autoReply !== undefined ? autoReply : true,
                aiIntegration: aiIntegration !== undefined ? aiIntegration : true,
                businessHours: businessHours || { start: '08:00', end: '22:00' },
                offHoursMessage: offHoursMessage || 'Gracias por contactarnos. Te responderemos pronto.',
                createdBy: createdByUser._id
            });

            await connection.save();

            // Get business and branch info for QR code
            const business = await Business.findById(businessObjectId);
            const branch = await Branch.findById(branchObjectId);

            // Generate QR code using WhatsApp service or fallback
            let qrCodeDataURL = null;
            try {
                if (this.whatsappService) {
                    qrCodeDataURL = await this.whatsappService.generateQRCode(connection._id, phoneNumber);
                    connection.status = 'connecting';
                } else {
                    throw new Error('WhatsApp service not available');
                }
                
                // Update connection with QR code
                connection.qrCodeDataURL = qrCodeDataURL;
                await connection.save();
                
                this.logger.info('QR code generated successfully', { connectionId: connection._id });
            } catch (error) {
                this.logger.error('Failed to generate QR code', { 
                    connectionId: connection._id, 
                    error: error.message 
                });
                
                // Fallback: generate a simple QR code with connection info
                const qrData = {
                    connectionId: connection._id,
                    businessName: business?.name || 'Business',
                    branchName: branch?.name || 'Branch',
                    phoneNumber,
                    timestamp: Date.now()
                };

                qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
                    errorCorrectionLevel: 'M',
                    type: 'image/png',
                    quality: 0.92,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });

                connection.qrCodeDataURL = qrCodeDataURL;
                connection.status = 'disconnected';
                await connection.save();
            }

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

    // Connect/Disconnect WhatsApp
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
                try {
                    // Generate QR code for WhatsApp Web
                    const qrCodeDataURL = await this.whatsappService.generateQRCode(connection._id, connection.phoneNumber);
                    
                    connection.status = 'connecting';
                    connection.qrCodeDataURL = qrCodeDataURL;
                    await connection.save();

                    this.logger.info('WhatsApp connection initiated', { 
                        userId: req.user.id, 
                        connectionId: connection._id 
                    });

                    res.json({
                        success: true,
                        message: 'Conectando WhatsApp... Escanea el QR code',
                        data: { 
                            status: 'connecting',
                            qrCodeDataURL 
                        }
                    });
                } catch (error) {
                    this.logger.error('Failed to initiate WhatsApp connection', { 
                        connectionId: connection._id, 
                        error: error.message 
                    });
                    
                    res.status(500).json({
                        success: false,
                        error: 'Error iniciando conexión de WhatsApp'
                    });
                }
            } else if (action === 'disconnect') {
                try {
                    // Disconnect WhatsApp Web client
                    await this.whatsappService.disconnectClient(connection._id);
                    
                    connection.status = 'disconnected';
                    connection.lastDisconnect = new Date();
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
                } catch (error) {
                    this.logger.error('Failed to disconnect WhatsApp', { 
                        connectionId: connection._id, 
                        error: error.message 
                    });
                    
                    res.status(500).json({
                        success: false,
                        error: 'Error desconectando WhatsApp'
                    });
                }
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

            // Send message via WhatsApp service
            const result = await this.whatsappService.sendMessage(connectionId, to, message);
            
            this.logger.info('WhatsApp message sent', { 
                connectionId, 
                to, 
                messageId: result.messageId,
                provider: result.provider
            });

            // Update connection stats
            connection.messagesToday = (connection.messagesToday || 0) + 1;
            connection.totalMessages = (connection.totalMessages || 0) + 1;
            await connection.save();

            res.json({
                success: true,
                message: 'Mensaje enviado exitosamente',
                data: {
                    messageId: result.messageId,
                    provider: result.provider
                }
            });

        } catch (error) {
            this.logger.error('Error sending message', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Error enviando mensaje'
            });
        }
    }

    // Get QR code for a specific connection
    async getQRCode(req, res) {
        try {
            const { id } = req.params;

            const connection = await WhatsAppConnection.findById(id);
            if (!connection) {
                return res.status(404).json({
                    success: false,
                    error: 'Conexión de WhatsApp no encontrada'
                });
            }

            // Check if QR code is expired
            const now = Date.now();
            const isExpired = connection.qrExpiresAt && connection.qrExpiresAt < now;

            if (isExpired || !connection.qrCodeDataURL) {
                // Generate new QR code by creating/restarting the client
                if (this.whatsappService) {
                    console.log('🔄 Generando nuevo QR para conexión:', connection._id);
                    
                    // First, try to get existing client
                    let client = this.whatsappService.getClient(connection._id);
                    
                    if (!client) {
                        console.log('📱 Cliente no existe, creando nuevo...');
                        client = await this.whatsappService.createWhatsAppWebClient(connection._id, connection.phoneNumber);
                    } else {
                        console.log('🔄 Reiniciando cliente existente...');
                        await client.destroy();
                        client = await this.whatsappService.createWhatsAppWebClient(connection._id, connection.phoneNumber);
                    }
                    
                    // Wait for QR generation
                    const qrCodeDataURL = await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('QR generation timeout'));
                        }, 30000);
                        
                        client.on('qr', async (qr) => {
                            clearTimeout(timeout);
                            try {
                                const QRCode = require('qrcode');
                                const qrDataURL = await QRCode.toDataURL(qr, {
                                    errorCorrectionLevel: 'M',
                                    type: 'image/png',
                                    quality: 0.92,
                                    margin: 1,
                                    color: {
                                        dark: '#000000',
                                        light: '#FFFFFF'
                                    }
                                });
                                resolve(qrDataURL);
                            } catch (error) {
                                reject(error);
                            }
                        });
                        
                        client.on('ready', () => {
                            clearTimeout(timeout);
                            reject(new Error('Client ready - no QR needed'));
                        });
                    });
                    
                    // Update connection with new QR
                    await WhatsAppConnection.findByIdAndUpdate(id, {
                        qrCodeDataURL,
                        qrExpiresAt: Date.now() + (60 * 1000),
                        status: 'connecting'
                    });

                    console.log('✅ QR generado exitosamente para conexión:', connection._id);

                    res.json({
                        success: true,
                        data: {
                            qrCodeDataURL,
                            expiresAt: Date.now() + (60 * 1000),
                            isExpired: false,
                            connectionId: connection._id
                        }
                    });
                } else {
                    res.status(503).json({
                        success: false,
                        error: 'Servicio de WhatsApp no disponible'
                    });
                }
            } else {
                res.json({
                    success: true,
                    data: {
                        qrCodeDataURL: connection.qrCodeDataURL,
                        expiresAt: connection.qrExpiresAt,
                        isExpired: false
                    }
                });
            }

        } catch (error) {
            this.logger.error('Error getting QR code', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Error obteniendo QR code'
            });
        }
    }
}

module.exports = WhatsAppController;


