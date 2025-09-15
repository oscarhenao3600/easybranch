const WhatsAppConnection = require('../models/WhatsAppConnection');
const Business = require('../models/Business');
const Branch = require('../models/Branch');
const User = require('../models/User');
const BranchAIConfig = require('../models/BranchAIConfig');
const LoggerService = require('../services/LoggerService');
const WhatsAppServiceSimple = require('../services/WhatsAppServiceSimple');
const AIService = require('../services/AIService');
const WhatsAppConnectionMonitor = require('../services/WhatsAppConnectionMonitor');
const WhatsAppQRManager = require('../services/WhatsAppQRManager');
const RecommendationService = require('../services/RecommendationService');
const ConversationalMemoryService = require('../services/ConversationalMemoryService');
const QRCode = require('qrcode');

class WhatsAppController {
    constructor() {
        this.logger = new LoggerService('whatsapp');
        this.whatsappService = null;
        this.aiService = WhatsAppController.getSharedAIService();
        this.connectionMonitor = new WhatsAppConnectionMonitor();
        this.qrManager = new WhatsAppQRManager(this.whatsappService);
        this.recommendationService = new RecommendationService();
        this.conversationalMemoryService = new ConversationalMemoryService();
        this.initializeService();
        this.initializeAI();
        
        // Cargar configuraciones de IA después de que la base de datos esté lista
        this.loadAIConfigsAfterDBReady();
    }

    // Singleton para el servicio de IA
    static getSharedAIService() {
        if (!WhatsAppController.sharedAIService) {
            WhatsAppController.sharedAIService = new AIService();
        }
        return WhatsAppController.sharedAIService;
    }

    // Cargar configuraciones de IA después de que la base de datos esté lista
    async loadAIConfigsAfterDBReady() {
        // Esperar a que MongoDB esté conectado
        const mongoose = require('mongoose');
        
        const checkConnection = () => {
            return new Promise((resolve) => {
                if (mongoose.connection.readyState === 1) {
                    resolve();
                } else {
                    mongoose.connection.once('connected', resolve);
                }
            });
        };
        
        try {
            await checkConnection();
            console.log('✅ MongoDB conectado, cargando configuraciones de IA...');
            await this.loadExistingAIConfigs();
        } catch (error) {
            console.error('❌ Error cargando configuraciones de IA después de conectar DB:', error.message);
            this.logger.error('Error loading AI configs after DB connection', { error: error.message });
        }
    }

    // Configurar manejadores de eventos
    setupEventHandlers() {
        // Eventos del monitor de conexiones
        this.connectionMonitor.on('connectionStatusChanged', (data) => {
            console.log('📊 Estado de conexión cambiado:', data);
            this.logger.info('Connection status changed', data);
        });

        this.connectionMonitor.on('connectionsChecked', (data) => {
            console.log('🔍 Conexiones verificadas:', data.totalConnections);
        });

        // Eventos del gestor de QR codes
        this.qrManager.on('qrGenerated', (data) => {
            console.log('📱 QR Code generado:', data.connectionId);
            this.logger.info('QR Code generated', { connectionId: data.connectionId });
        });

        this.qrManager.on('qrRefreshed', (data) => {
            console.log('🔄 QR Code refrescado:', data.connectionId);
            this.logger.info('QR Code refreshed', { connectionId: data.connectionId });
        });

        this.qrManager.on('qrExpired', (data) => {
            console.log('⏰ QR Code expirado:', data.connectionId);
            this.logger.info('QR Code expired', { connectionId: data.connectionId });
        });

        // Eventos del servicio de WhatsApp
        if (this.whatsappService) {
            console.log('🔧 Configurando event handlers para WhatsAppService...');
            
            this.whatsappService.on('messageReceived', (data) => {
                console.log('📨 ===== EVENTO MESSAGE RECEIVED CAPTURADO =====');
                console.log('📱 Connection ID:', data.connectionId);
                console.log('📞 From:', data.from);
                console.log('💬 Message:', data.message);
                console.log('===============================================');
                this.handleMessageReceived(data);
            });

            this.whatsappService.on('clientReady', (data) => {
                console.log('✅ Cliente WhatsApp listo:', data.connectionId);
                this.handleClientReady(data);
            });

            this.whatsappService.on('clientDisconnected', (data) => {
                console.log('❌ Cliente WhatsApp desconectado:', data.connectionId);
                this.handleClientDisconnected(data);
            });
            
            console.log('✅ Event handlers configurados correctamente');
        } else {
            console.log('❌ WhatsAppService no disponible para configurar event handlers');
        }
    }

    async initializeService() {
        try {
            this.whatsappService = new WhatsAppServiceSimple();
            
            // Actualizar el QRManager con el servicio de WhatsApp
            this.qrManager.setWhatsAppService(this.whatsappService);
            
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

            // Iniciar monitoreo de conexiones
            this.connectionMonitor.startMonitoring(30000); // Verificar cada 30 segundos

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
            console.log('🤖 ===== HANDLE MESSAGE RECEIVED INICIADO =====');
            console.log('📊 Data recibida:', JSON.stringify(data, null, 2));
            
            const { connectionId, from, message, timestamp, messageId } = data;

            // Find the connection
            const connection = await WhatsAppConnection.findById(connectionId);
            if (!connection) {
                console.log('❌ Conexión no encontrada en BD:', connectionId);
                this.logger.error('Connection not found for incoming message', { connectionId });
                return;
            }

            console.log('✅ Conexión encontrada:', connection.phoneNumber);

            // Check if AI integration is enabled
            if (!connection.aiIntegration) {
                console.log('⚠️ IA deshabilitada para esta conexión:', connectionId);
                return;
            }

            console.log('✅ IA habilitada para esta conexión');

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
                // Check if message contains recommendation keywords
                const recommendationKeywords = ['sugerencia', 'recomendar', 'sugerir', 'ayudar', 'recomendación', 'qué me recomiendas', 'qué me sugieres'];
                const isRecommendationRequest = recommendationKeywords.some(keyword => 
                    message.toLowerCase().includes(keyword.toLowerCase())
                );

                if (isRecommendationRequest) {
                    console.log('🎯 ===== SOLICITUD DE RECOMENDACIÓN DETECTADA =====');
                    await this.handleRecommendationRequest(connectionId, phoneNumber, message, connection);
                    return;
                }

                // Check if user is in an active recommendation session
                const activeSession = await this.recommendationService.getActiveSession(phoneNumber, connection.branchId);
                if (activeSession) {
                    console.log('🔄 ===== SESIÓN DE RECOMENDACIÓN ACTIVA =====');
                    await this.handleRecommendationResponse(connectionId, phoneNumber, message, activeSession);
                    return;
                }

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
                let aiResponse;
                
                // Use traditional AI for other messages
                console.log('🤖 ===== USANDO SISTEMA IA TRADICIONAL =====');
                aiResponse = await this.aiService.generateResponse(
                    connection.branchId,
                    message,
                    phoneNumber,
                    businessType,
                    branchAIConfig
                );
                console.log('✅ Respuesta IA generada:', aiResponse);

                console.log('🤖 ===== RESPUESTA IA GENERADA =====');
                console.log('📱 Connection ID:', connectionId);
                console.log('📞 To:', phoneNumber);
                console.log('🤖 AI Response:', aiResponse);
                console.log('====================================');

                // Send AI response
                const messageText = typeof aiResponse === 'string' ? aiResponse : aiResponse.text;
                await this.whatsappService.sendMessage(connectionId, phoneNumber, messageText);

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

    // Get available branches for WhatsApp connection
    async getAvailableBranches(req, res) {
        try {
            // Get all active branches with full information
            const availableBranches = await Branch.find({ 
                isActive: true,
                status: 'active'
            }).select('_id branchId name businessId address city department').populate('businessId', 'name');

            if (availableBranches.length === 0) {
                return res.json({
                    success: true,
                    data: {
                        branches: [],
                        canCreateConnection: false,
                        message: 'No existen sucursales creadas para vincular. Por favor, crea una sucursal antes de configurar WhatsApp.'
                    }
                });
            }

            // Get existing WhatsApp connections
            const existingConnections = await WhatsAppConnection.find({});
            const connectedBranchIds = existingConnections.map(conn => conn.branchId.toString());
            
            // Filter out branches that already have WhatsApp connections
            const unconnectedBranches = availableBranches.filter(branch => 
                !connectedBranchIds.includes(branch._id.toString())
            );

            const canCreateConnection = unconnectedBranches.length > 0;
            const message = canCreateConnection 
                ? `${unconnectedBranches.length} sucursal(es) disponible(s) para vincular WhatsApp`
                : 'Todas las sucursales ya tienen conexiones de WhatsApp vinculadas. No hay sucursales disponibles para crear nuevas conexiones.';

            this.logger.info('Available branches retrieved', { 
                userId: req.user.id,
                totalBranches: availableBranches.length,
                unconnectedBranches: unconnectedBranches.length
            });

            res.json({
                success: true,
                data: {
                    branches: unconnectedBranches,
                    canCreateConnection,
                    message,
                    stats: {
                        totalBranches: availableBranches.length,
                        connectedBranches: connectedBranchIds.length,
                        availableBranches: unconnectedBranches.length
                    }
                }
            });
        } catch (error) {
            this.logger.error('Error getting available branches', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Error al obtener sucursales disponibles'
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

            // Check if there are any branches available for WhatsApp connection
            const availableBranches = await Branch.find({ 
                isActive: true,
                status: 'active'
            });

            if (availableBranches.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No existen sucursales creadas para vincular. Por favor, crea una sucursal antes de configurar WhatsApp.'
                });
            }

            // Check which branches already have WhatsApp connections
            const existingConnections = await WhatsAppConnection.find({});
            const connectedBranchIds = existingConnections.map(conn => conn.branchId.toString());
            
            // Filter out branches that already have WhatsApp connections
            const unconnectedBranches = availableBranches.filter(branch => 
                !connectedBranchIds.includes(branch._id.toString())
            );

            if (unconnectedBranches.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Todas las sucursales ya tienen conexiones de WhatsApp vinculadas. No hay sucursales disponibles para crear nuevas conexiones.'
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
                        razonSocial: 'Sucursal Centro',
                        nit: '900123456-1',
                        phone: '+573001234567',
                        address: 'Calle 123 #45-67',
                        city: 'Bogotá',
                        department: 'Cundinamarca',
                        country: 'Colombia',
                        description: 'Sucursal principal en el centro de la ciudad',
                        manager: 'Gerente Centro',
                        email: 'centro@elsabor.com',
                        contact: {
                            phone: '+573001234567',
                            email: 'centro@elsabor.com'
                        },
                        whatsapp: {
                            provider: 'whatsapp-web.js',
                            phoneNumber: phoneNumber,
                            connectionStatus: 'disconnected',
                            qrCode: null,
                            sessionData: null
                        },
                        settings: {
                            autoReply: true,
                            delivery: {
                                enabled: true,
                                radius: 5,
                                fee: 0
                            },
                            businessHours: {
                                monday: { open: '08:00', close: '22:00' },
                                tuesday: { open: '08:00', close: '22:00' },
                                wednesday: { open: '08:00', close: '22:00' },
                                thursday: { open: '08:00', close: '22:00' },
                                friday: { open: '08:00', close: '23:00' },
                                saturday: { open: '09:00', close: '23:00' },
                                sunday: { open: '10:00', close: '21:00' }
                            }
                        },
                        status: 'active',
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
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

            // Generate QR code using the new QR manager
            let qrCodeDataURL = null;
            let qrExpiresAt = null;
            
            try {
                const qrResult = await this.qrManager.generateQRCode(connection._id, {
                    phoneNumber,
                    branchName: branch.name,
                    businessName: business.name
                });
                
                if (qrResult.success) {
                    qrCodeDataURL = qrResult.qrCodeDataURL;
                    qrExpiresAt = qrResult.expiresAt;
                    connection.status = 'connecting';
                    
                    // Update connection with QR code
                    connection.qrCodeDataURL = qrCodeDataURL;
                    connection.qrExpiresAt = qrExpiresAt;
                    await connection.save();
                    
                    // Registrar conexión para monitoreo
                    this.connectionMonitor.registerConnection(connection._id, {
                        phoneNumber,
                        branchName: branch.name,
                        businessName: business.name,
                        status: 'connecting'
                    });
                    
                    this.logger.info('QR code generated successfully', { connectionId: connection._id });
                }
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

    // Cargar configuraciones de IA existentes al iniciar el servidor
    async loadExistingAIConfigs() {
        try {
            console.log('🤖 ===== CARGANDO CONFIGURACIONES DE IA EXISTENTES =====');
            
            const configs = await BranchAIConfig.find({ isActive: true });
            console.log(`📊 Configuraciones encontradas: ${configs.length}`);
            
            for (const config of configs) {
                const branchId = config.branchId.toString();
                
                // Cargar contenido del menú
                if (config.menuContent) {
                    this.aiService.setMenuContent(branchId, config.menuContent);
                    console.log(`✅ Menú cargado para sucursal: ${branchId}`);
                }
                
                // Cargar prompt personalizado
                if (config.customPrompt) {
                    this.aiService.setAIPrompt(branchId, config.customPrompt);
                    console.log(`✅ Prompt cargado para sucursal: ${branchId}`);
                }
            }
            
            console.log('✅ Configuraciones de IA cargadas exitosamente');
            console.log('===============================================');
            
        } catch (error) {
            console.error('❌ Error cargando configuraciones de IA:', error);
            this.logger.error('Error loading existing AI configs', { error: error.message });
        }
    }

    // Recargar configuraciones de IA manualmente
    async reloadAIConfigs(req, res) {
        try {
            console.log('🔄 ===== RECARGANDO CONFIGURACIONES DE IA MANUALMENTE =====');
            
            await this.loadExistingAIConfigs();
            
            res.json({
                success: true,
                message: 'Configuraciones de IA recargadas exitosamente',
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('❌ Error recargando configuraciones de IA:', error);
            this.logger.error('Error reloading AI configs', { error: error.message });
            
            res.status(500).json({
                success: false,
                error: 'Error al recargar las configuraciones de IA'
            });
        }
    }

    // Obtener estadísticas del sistema de WhatsApp
    async getSystemStats(req, res) {
        try {
            const connections = await WhatsAppConnection.find({});
            const monitorStats = this.connectionMonitor.getMonitoringStats();
            const qrStats = this.qrManager.getQRStats();

            const stats = {
                connections: {
                    total: connections.length,
                    connected: connections.filter(c => c.isConnected).length,
                    connecting: connections.filter(c => c.status === 'connecting').length,
                    disconnected: connections.filter(c => c.status === 'disconnected').length,
                    error: connections.filter(c => c.status === 'error').length
                },
                monitoring: monitorStats,
                qrCodes: qrStats,
                aiService: this.aiService.getStats()
            };

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            this.logger.error('Error getting system stats', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Error obteniendo estadísticas del sistema'
            });
        }
    }

    // Refrescar QR code manualmente
    async refreshQRCode(req, res) {
        try {
            const { id } = req.params;
            
            const connection = await WhatsAppConnection.findById(id);
            if (!connection) {
                return res.status(404).json({
                    success: false,
                    error: 'Conexión no encontrada'
                });
            }

            const qrResult = await this.qrManager.refreshQRCode(id);
            
            if (qrResult) {
                // Actualizar conexión en BD
                connection.qrCodeDataURL = qrResult.qrCodeDataURL;
                connection.qrExpiresAt = qrResult.expiresAt;
                await connection.save();

                res.json({
                    success: true,
                    data: {
                        qrCodeDataURL: qrResult.qrCodeDataURL,
                        expiresAt: qrResult.expiresAt
                    },
                    message: 'QR Code refrescado exitosamente'
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: 'No se pudo refrescar el QR Code'
                });
            }

        } catch (error) {
            this.logger.error('Error refreshing QR code', { 
                connectionId: req.params.id, 
                error: error.message 
            });
            res.status(500).json({
                success: false,
                error: 'Error refrescando QR Code'
            });
        }
    }

    // Forzar verificación de conexión
    async forceCheckConnection(req, res) {
        try {
            const { id } = req.params;
            
            await this.connectionMonitor.forceCheckConnection(id);
            
            const connection = await WhatsAppConnection.findById(id);
            
            res.json({
                success: true,
                data: {
                    status: connection.status,
                    isConnected: connection.isConnected,
                    lastStatusUpdate: connection.lastStatusUpdate
                },
                message: 'Verificación de conexión completada'
            });

        } catch (error) {
            this.logger.error('Error forcing connection check', { 
                connectionId: req.params.id, 
                error: error.message 
            });
            res.status(500).json({
                success: false,
                error: 'Error verificando conexión'
            });
        }
    }

    // Limpiar QR code
    async clearQRCode(req, res) {
        try {
            const { id } = req.params;
            
            this.qrManager.clearQRCode(id);
            
            const connection = await WhatsAppConnection.findById(id);
            if (connection) {
                connection.qrCodeDataURL = null;
                connection.qrExpiresAt = null;
                await connection.save();
            }

            res.json({
                success: true,
                message: 'QR Code limpiado exitosamente'
            });

        } catch (error) {
            this.logger.error('Error clearing QR code', { 
                connectionId: req.params.id, 
                error: error.message 
            });
            res.status(500).json({
                success: false,
                error: 'Error limpiando QR Code'
            });
        }
    }

    // Detectar cantidad de personas en el mensaje
    detectPeopleCount(message) {
        const lowerMessage = message.toLowerCase();
        
        // Patrones para detectar cantidad de personas
        const patterns = [
            /(\d+)\s*personas?/,
            /para\s*(\d+)\s*personas?/,
            /desayuno\s*de\s*(\d+)\s*personas?/,
            /almuerzo\s*de\s*(\d+)\s*personas?/,
            /cena\s*de\s*(\d+)\s*personas?/,
            /comida\s*de\s*(\d+)\s*personas?/,
            /(\d+)\s*comensales?/,
            /(\d+)\s*invitados?/
        ];
        
        for (const pattern of patterns) {
            const match = lowerMessage.match(pattern);
            if (match) {
                const count = parseInt(match[1]);
                if (count > 0 && count <= 20) { // Límite razonable
                    return count;
                }
            }
        }
        
        return 1; // Por defecto, 1 persona
    }

    // Manejar solicitud de recomendación
    async handleRecommendationRequest(connectionId, phoneNumber, message, connection) {
        try {
            console.log('🎯 ===== INICIANDO SESIÓN DE RECOMENDACIÓN =====');
            
            // Detectar cantidad de personas en el mensaje
            const peopleCount = this.detectPeopleCount(message);
            console.log('👥 Cantidad de personas detectada:', peopleCount);
            
            // Crear nueva sesión de recomendación
            const session = await this.recommendationService.createSession(
                phoneNumber, 
                connection.branchId, 
                connection.businessId,
                peopleCount
            );

            console.log('✅ Sesión creada:', session.sessionId);

            // Obtener primera pregunta
            const questionData = await this.recommendationService.getNextQuestion(session.sessionId);
            
            if (questionData.type === 'question') {
                const welcomeMessage = `¡Hola! 😊 Me da mucho gusto ayudarte a encontrar algo delicioso.

Solo necesito hacerte 5 preguntas rápidas para recomendarte la opción perfecta según tu presupuesto y gustos.

📋 *Pregunta ${questionData.step}/${questionData.totalSteps}:*
${questionData.question}

${questionData.options.map((option, index) => `${index + 1}. ${option}`).join('\n')}

Solo responde con el número de tu opción 😊`;

                await this.whatsappService.sendMessage(connectionId, phoneNumber, welcomeMessage);
                
                console.log('✅ Primera pregunta enviada');
            }

        } catch (error) {
            console.error('❌ Error iniciando recomendación:', error);
            
            const errorMessage = `¡Ups! 😅 Parece que hubo un pequeño problema técnico.

¿Podrías intentar de nuevo escribiendo "sugerencia" o si prefieres puedes escribir "menu" para ver nuestro menú completo?`;
            
            await this.whatsappService.sendMessage(connectionId, phoneNumber, errorMessage);
        }
    }

    // Manejar respuesta del usuario en sesión de recomendación
    async handleRecommendationResponse(connectionId, phoneNumber, message, session) {
        try {
            console.log('🔄 ===== PROCESANDO RESPUESTA DE RECOMENDACIÓN =====');
            console.log('📱 Session ID:', session.sessionId);
            console.log('💬 Respuesta:', message);

            // Verificar comandos especiales primero
            const specialCommands = ['menu', 'horarios', 'ubicación', 'ayudar', 'help', 'pedir', 'ordenar', 'comprar'];
            if (specialCommands.some(cmd => message.toLowerCase().includes(cmd))) {
                // Cancelar sesión de recomendación y procesar comando normal
                await this.recommendationService.cancelSession(session.sessionId);
                
                // Si es "pedir", procesar como pedido basado en la recomendación
                if (message.toLowerCase().includes('pedir') || message.toLowerCase().includes('ordenar') || message.toLowerCase().includes('comprar')) {
                    const orderMessage = `¡Perfecto! 🛒 Vamos a procesar tu pedido.

Basándome en tu recomendación anterior, ¿quieres pedir la *Hamburguesa con Queso* por $16.500?

O si prefieres algo diferente, puedes escribir:
• "sí" para confirmar la Hamburguesa con Queso
• "otra cosa" para elegir algo diferente del menú
• "menu" para ver todas las opciones disponibles

¿Qué prefieres? 😊`;

                    await this.whatsappService.sendMessage(connectionId, phoneNumber, orderMessage);
                    return;
                }
                
                // Procesar otros comandos como mensaje normal
                const connection = await WhatsAppConnection.findById(connectionId);
                if (connection) {
                    await this.handleMessageReceived({
                        connectionId,
                        from: phoneNumber + '@c.us',
                        message,
                        timestamp: new Date(),
                        messageId: 'special_cmd_' + Date.now()
                    });
                }
                return;
            }

            // Verificar si el usuario quiere cancelar
            const cancelKeywords = ['cancelar', 'salir', 'parar', 'stop', 'no', 'nunca'];
            if (cancelKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
                await this.recommendationService.cancelSession(session.sessionId);
                
                const cancelMessage = `¡No hay problema! 😊 

Puedes escribir:
• "menu" para ver nuestro menú completo
• "horarios" para conocer nuestros horarios
• "ubicación" para saber dónde estamos
• O simplemente pregúntame lo que necesites 😊`;

                await this.whatsappService.sendMessage(connectionId, phoneNumber, cancelMessage);
                return;
            }

            // Obtener la pregunta actual
            const currentQuestion = await this.recommendationService.getNextQuestion(session.sessionId);
            
            if (currentQuestion.type === 'question') {
                // Procesar respuesta numérica
                const answerNumber = parseInt(message.trim());
                const question = currentQuestion.question;
                const options = currentQuestion.options;
                
                if (isNaN(answerNumber) || answerNumber < 1 || answerNumber > options.length) {
                    const errorMessage = `¡Ups! 😅 Ese número no está en las opciones.

Por favor responde con un número del 1 al ${options.length}

${question}

${options.map((option, index) => `${index + 1}. ${option}`).join('\n')}

¡Es súper fácil! 😊`;

                    await this.whatsappService.sendMessage(connectionId, phoneNumber, errorMessage);
                    return;
                }

                // Procesar respuesta válida
                const selectedAnswer = options[answerNumber - 1];
                await this.recommendationService.processAnswer(session.sessionId, selectedAnswer);

                console.log('✅ Respuesta procesada:', selectedAnswer);

                // Obtener siguiente pregunta o recomendaciones
                const nextData = await this.recommendationService.getNextQuestion(session.sessionId);
                
                if (nextData.type === 'question') {
                    const nextMessage = `¡Perfecto! 😊 

📋 *Pregunta ${nextData.step}/${nextData.totalSteps}:*
${nextData.question}

${nextData.options.map((option, index) => `${index + 1}. ${option}`).join('\n')}

Solo responde con el número 😊`;

                    await this.whatsappService.sendMessage(connectionId, phoneNumber, nextMessage);
                } else if (nextData.type === 'recommendations') {
                    await this.sendRecommendations(connectionId, phoneNumber, nextData);
                }

            } else if (currentQuestion.type === 'recommendations') {
                await this.sendRecommendations(connectionId, phoneNumber, currentQuestion);
            }

        } catch (error) {
            console.error('❌ Error procesando respuesta:', error);
            
            // Determinar el tipo de error y enviar mensaje apropiado
            let errorMessage;
            
            if (error.message.includes('Sesión no encontrada')) {
                errorMessage = `¡Ups! 😅 Parece que la sesión expiró.

¿Quieres empezar de nuevo? Solo escribe "sugerencia" o si prefieres puedes escribir "menu" para ver nuestro menú completo 😊`;
            } else if (error.message.includes('Menú no disponible')) {
                errorMessage = `¡Ay! 😔 No puedo acceder al menú en este momento.

Puedes escribir "menu" para ver nuestro menú completo o preguntarme cualquier cosa que necesites 😊`;
            } else if (error.message.includes('No se encontraron productos')) {
                errorMessage = `¡Hmm! 🤔 Con las preferencias que me diste, no encontré algo específico.

¿Qué te parece si:
• Escribes "menu" para ver todo nuestro menú
• Escribes "sugerencia" para intentar con diferentes gustos
• O simplemente me preguntas lo que necesites 😊`;
            } else {
                errorMessage = `¡Ups! 😅 Hubo un pequeño problema técnico.

¿Qué te parece si:
• Escribes "menu" para ver nuestro menú completo
• Escribes "sugerencia" para intentar las recomendaciones de nuevo
• O me preguntas cualquier cosa que necesites 😊`;
            }
            
            await this.whatsappService.sendMessage(connectionId, phoneNumber, errorMessage);
        }
    }

    // Enviar recomendaciones finales
    async sendRecommendations(connectionId, phoneNumber, recommendationData) {
        try {
            const { mainRecommendation, alternatives } = recommendationData;
            
            // Determinar cantidad de personas
            const peopleCount = mainRecommendation.quantity || 1;
            const peopleText = peopleCount === 1 ? 'para ti' : `para ${peopleCount} personas`;
            
            let message = `¡Perfecto! 🎉 Creo que encontré algo que te va a encantar ${peopleText}:

🍽️ *MI RECOMENDACIÓN ${peopleCount > 1 ? `PARA ${peopleCount} PERSONAS` : 'PARA TI'}:*
*${mainRecommendation.productName}* 
💰 *Precio unitario:* $${mainRecommendation.price.toLocaleString()}
${peopleCount > 1 ? `👥 *Cantidad:* ${peopleCount} unidades\n💰 *Total:* $${mainRecommendation.totalPrice.toLocaleString()}` : ''}
📋 *Categoría:* ${mainRecommendation.category}
💡 *¿Por qué te lo recomiendo?* ${mainRecommendation.reasoning}

`;

            if (alternatives && alternatives.length > 0) {
                message += `🔄 *También podrías considerar:*
`;
                alternatives.forEach((alt, index) => {
                    message += `${index + 1}. *${alt.productName}* 
   💰 *Precio:* $${alt.price.toLocaleString()}${peopleCount > 1 ? ` (Total: $${alt.totalPrice.toLocaleString()})` : ''}
   💡 ${alt.reason}
`;
                });
            }

            message += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
¿Te gusta esta recomendación? 😊

Puedes:
• Escribir "pedir" para hacer tu pedido
• Escribir "menu" para ver todo el menú
• Escribir "otra sugerencia" para buscar algo diferente
• O preguntarme cualquier cosa que necesites 😊`;

            await this.whatsappService.sendMessage(connectionId, phoneNumber, message);
            
            console.log('✅ Recomendaciones enviadas exitosamente');

        } catch (error) {
            console.error('❌ Error enviando recomendaciones:', error);
            
            const fallbackMessage = `¡Listo! 🎉 Aunque hubo un pequeño problema mostrando los detalles, puedo ayudarte con:

• Escribir "menu" para ver nuestro menú completo
• Escribir "pedir" para hacer tu pedido
• O preguntarme cualquier cosa que necesites 😊`;

            await this.whatsappService.sendMessage(connectionId, phoneNumber, fallbackMessage);
        }
    }
}

module.exports = WhatsAppController;


