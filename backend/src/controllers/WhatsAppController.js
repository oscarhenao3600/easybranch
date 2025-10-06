const WhatsAppConnection = require('../models/WhatsAppConnection');
const Business = require('../models/Business');
const Branch = require('../models/Branch');
const User = require('../models/User');
const BranchAIConfig = require('../models/BranchAIConfig');
const ConversationMemory = require('../models/ConversationMemory');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const LoggerService = require('../services/LoggerService');
const WhatsAppServiceSimple = require('../services/WhatsAppServiceSimple');
const AIService = require('../services/AIService');
const WhatsAppConnectionMonitor = require('../services/WhatsAppConnectionMonitor');
const WhatsAppQRManager = require('../services/WhatsAppQRManager');
const RecommendationService = require('../services/RecommendationService');
const ConversationalMemoryService = require('../services/ConversationalMemoryService');
const QRCode = require('qrcode');
const mongoose = require('mongoose');

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
        
        // Sistema de cooldown para contactos que envían mensajes sin sentido
        this.cooldownContacts = new Map(); // { phoneNumber: { startTime, endTime, reason } }
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
            this.whatsappService = WhatsAppServiceSimple.getInstance();
            
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
            
            const { connectionId, from, message, timestamp, messageId, messageType, mediaType } = data;

            // Extraer número de teléfono para validación
            const phoneNumber = from.replace('@c.us', '');
            
            // Validar tipo de mensaje antes de procesar
            const messageValidation = this.validateMessageType(message, messageType, mediaType, phoneNumber);
            if (messageValidation.shouldIgnore) {
                console.log('🚫 Mensaje ignorado:', messageValidation.reason);
                return;
            }

            if (messageValidation.shouldCancel) {
                console.log('❌ Orden cancelada:', messageValidation.reason);
                await this.handleOrderCancellation(connectionId, from, messageValidation.reason, phoneNumber);
                return;
            }

            if (messageValidation.shouldRespond) {
                console.log('📱 Respondiendo a mensaje no-texto:', messageValidation.reason);
                await this.whatsappService.sendMessage(connectionId, phoneNumber, messageValidation.response);
                return;
            }

            // Find the connection
            const connection = await WhatsAppConnection.findById(connectionId);
            if (!connection) {
                console.log('❌ Conexión no encontrada en BD:', connectionId);
                this.logger.error('Connection not found for incoming message', { connectionId });
                return;
            }

            // Convert ObjectId to string for consistent handling
            const connectionIdStr = String(connectionId);

            console.log('✅ Conexión encontrada:', connection.phoneNumber);

            // Check if AI integration is enabled
            if (!connection.aiIntegration) {
                console.log('⚠️ IA deshabilitada para esta conexión:', connectionIdStr);
                return;
            }

            console.log('✅ IA habilitada para esta conexión');

            // phoneNumber ya fue extraído arriba

            // Save incoming message to database
            await this.saveIncomingMessage(connectionId, phoneNumber, message, messageId, timestamp, connection);

            // Normalizar alias de productos para facilitar la detección (sin alterar el contenido guardado)
            let effectiveMessageForAI = message;
            try {
                const normBasic = (t) => (t||'').toLowerCase()
                    .replace(/[áäàâ]/g,'a').replace(/[éëèê]/g,'e').replace(/[íïìî]/g,'i')
                    .replace(/[óöòô]/g,'o').replace(/[úüùû]/g,'u').replace(/ñ/g,'n');
                const nm = normBasic(message || '');
                // Mapear pluralizaciones y variaciones a nombres canónicos
                if (/\bemparejad[oa]s?\b/.test(nm)) {
                    effectiveMessageForAI = 'combo emparejado';
                } else {
                    const fam = nm.match(/\bfamiliar\s*(\d)\b/);
                    const combo = nm.match(/\bcombo\s*(\d)\b/);
                    const personal = nm.match(/\bpersonal\s*(\d)\b/);
                    if (fam) effectiveMessageForAI = `familiar ${fam[1]}`;
                    else if (combo) effectiveMessageForAI = `combo ${combo[1]}`;
                    else if (personal) effectiveMessageForAI = `combo ${personal[1]}`;
                }
            } catch (_) {}

            // Fuzzy detection for "menú" intent with typos; and affirmative replies when bot ofreció el menú
            try {
                const normalize = (txt) => {
                    return (txt || '')
                        .toLowerCase()
                        .replace(/[áäàâ]/g,'a').replace(/[éëèê]/g,'e').replace(/[íïìî]/g,'i')
                        .replace(/[óöòô]/g,'o').replace(/[úüùû]/g,'u').replace(/ñ/g,'n')
                        .replace(/[\.,!¡¿?\-_:;\(\)\[\]"]+/g, ' ')
                        .trim();
                };
                const dist = (a, b) => {
                    const m = a.length, n = b.length;
                    if (m === 0) return n; if (n === 0) return m;
                    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
                    for (let i = 0; i <= m; i++) dp[i][0] = i;
                    for (let j = 0; j <= n; j++) dp[0][j] = j;
                    for (let i = 1; i <= m; i++) {
                        for (let j = 1; j <= n; j++) {
                            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
                        }
                    }
                    return dp[m][n];
                };
                const nm = normalize(message);
                const tokens = nm.split(/\s+/).filter(Boolean);
                const directMenu = nm.includes('menu') || nm.includes('enviame el menu') || nm.includes('mandame el menu') || nm.includes('carta') || nm.includes('menu');
                let fuzzyMenu = false;
                for (const t of tokens) { if (dist(t, 'menu') <= 1) { fuzzyMenu = true; break; } }
                // Affirmative tokens to accept menu offer (amplio, coloquial y con typos comunes)
                const positives = new Set([
                    'si','sí','sii','siii','sip','sep','asimismo','asi es','así es','correcto','exacto',
                    'ok','okay','okey','oki','okis','okas','oki doki','ok doki','okidoki',
                    'dale','de una','hágale','hagale','hágale pues','hagale pues','hágale de una','hagale de una',
                    'listo','listoo','listico','listis','va','vamos','vale','va pues',
                    'genial','perfecto','super','súper','bueno','bien',
                    'claro','claro que si','claro que sí','obvio','obviamente',
                    'gracias','porfa','por favor','sí porfa','si porfa','si por favor','sí por favor',
                    'yes','yeah','yep','ya','okey dokey'
                ]);
                const isAffirmative = nm && (positives.has(nm) || tokens.some(t => positives.has(t)));
                // Check if last bot message offered the menu
                let lastBotAskedMenu = false;
                try {
                    const ch = await this.getConversationHistory(phoneNumber, connection.branchId, 10);
                    const lb = normalize(ch.lastBotMessage || '');
                    lastBotAskedMenu = lb.includes('enviarte el menu') || lb.includes('enviame el menu') || lb.includes('solo dime menu') || lb.includes('menu');
                } catch (_) {}
                // Si no se pudo determinar por memoria, revisar últimos mensajes salientes
                if (!lastBotAskedMenu) {
                    try {
                        const recentBotMsgs = await WhatsAppMessage.find({
                            phoneNumber,
                            direction: 'outgoing'
                        }).sort({ 'metadata.timestamp': -1 }).limit(5).select('content');
                        for (const m of recentBotMsgs) {
                            const txt = normalize(m?.content?.text || '');
                            if (txt.includes('enviarte el menu') || txt.includes('enviame el menu') || txt.includes('solo dime menu') || txt.includes('solo dime menu o enviame el menu')) {
                                lastBotAskedMenu = true; break;
                            }
                        }
                    } catch (_) {}
                }

                if (directMenu || fuzzyMenu || (isAffirmative && lastBotAskedMenu)) {
                    // Try to fetch configured menu content
                    let menuText = null;
                    try {
                        let cfg = await BranchAIConfig.findOne({ branchId: connection.branchId });
                        if (!cfg) cfg = await BranchAIConfig.findOne({ branchId: String(connection.branchId) });
                        if (cfg && cfg.menuContent) menuText = cfg.menuContent;
                    } catch (_) {}
                    if (!menuText && this.aiService && this.aiService.menuContent?.get) {
                        const cached = this.aiService.menuContent.get(connection.branchId);
                        if (cached && (cached.menu || typeof cached === 'string')) menuText = cached.menu || cached;
                    }
                    if (menuText) {
                        try {
                            if (!this._sessionTimerService) {
                                const SessionTimerService = require('../services/SessionTimerService');
                                this._sessionTimerService = new SessionTimerService();
                                this._sessionTimerService.start();
                            }
                            await this._sessionTimerService.onMenuRequest({ phoneNumber, branchId: connection.branchId });
                        } catch (_) {}
                        // Presentación más amigable del menú sin alterar el contenido
                        const formatMenuForWhatsApp = (raw) => {
                            if (!raw) return '';
                            // Mantener contenido pero mejorar legibilidad con saltos de línea y viñetas donde aplica
                            let txt = String(raw);
                            // Evitar colapsar saltos existentes, solo limpiar espacios excesivos entre palabras
                            txt = txt.replace(/[\t ]{2,}/g, ' ');
                            // Separar secciones conocidas
                            const sectionPattern = /(COMBOS?\s+PERSONALES|COMBOS?\s+FAMILIARES|COMBO\s+EMPAREJADO|ACOMPA[ÑN]ANTES|ADICIONES)/gi;
                            txt = txt.replace(sectionPattern, '\n\n$1\n');
                            // Añadir saltos antes de ítems típicos de menú
                            txt = txt.replace(/\b(Combo\s*\d+)\b/gi, '\n* $1');
                            txt = txt.replace(/\b(Familiar\s*\d+)\b/gi, '\n* $1');
                            txt = txt.replace(/\b(Emparejado)\b/gi, '\n* $1');
                            // Si hay listado de acompañantes/adiciones, asegurar viñetas por cada palabra-capitalizada seguida de precio opcional
                            // Ej: "Papas criollas - $9.000" -> forzar línea
                            txt = txt.replace(/\s(\*?\s?[A-ZÁÉÍÓÚÑ][^\n$]{2,}?\s?-\s?\$\d[\d\.\,]*)/g, '\n* $1');
                            // Insertar salto antes de cada precio pegado al nombre si falta
                            txt = txt.replace(/([^\n])\s*(\$\d[\d\.\,]+)/g, '$1 $2');
                            // Encabezado si no está presente
                            const firstLine = (txt.split(/\n/)[0] || '').trim();
                            const hasHeader = /\bmen[uú]|carta|secci[óo]n\s+1/i.test(firstLine);
                            const header = hasHeader ? '' : '🍗 MENÚ\n';
                            const cta = '\n\nPara ordenar, responde con el nombre del combo o producto.';
                            return (header + txt.trim() + cta).trim();
                        };
                        const chunkMessage = (text, limit = 3500) => {
                            const parts = [];
                            let remaining = text;
                            while (remaining.length > limit) {
                                // intentar cortar en salto de línea cercano
                                const slice = remaining.slice(0, limit);
                                const cutAt = slice.lastIndexOf('\n');
                                const take = cutAt > 200 ? cutAt : limit; // evita cortar demasiado pronto
                                parts.push(remaining.slice(0, take));
                                remaining = remaining.slice(take);
                            }
                            if (remaining) parts.push(remaining);
                            return parts;
                        };

                        const prettyMenu = formatMenuForWhatsApp(menuText);
                        const chunks = chunkMessage(prettyMenu);
                        for (const chunk of chunks) {
                            await this.whatsappService.sendMessage(connectionIdStr, phoneNumber, chunk);
                        }
                        // Guardar primer chunk como último mensaje del bot para contexto
                        try {
                            const saved = await this.saveOutgoingMessage(
                                connectionIdStr,
                                phoneNumber,
                                chunks[0] || prettyMenu,
                                { conversationStage: 'showing_menu', branchId: connection.branchId, businessId: connection.businessId },
                                { branchId: connection.branchId, businessId: connection.businessId }
                            );
                            await this.updateConversationMemory(phoneNumber, connection.branchId, connection.businessId, message, chunks[0] || prettyMenu, { conversationStage: 'showing_menu' });
                        } catch (_) {}
                        // Enviar botones rápidos para guiar al cliente (máx 3)
                        try {
                            const quickText = '¿Qué te gustaría hacer ahora?';
                            const quickButtons = ['Pedir', 'Ver combos', 'Ver acompañantes'];
                            if (this.whatsappService.sendQuickReplies) {
                                await this.whatsappService.sendQuickReplies(connectionIdStr, phoneNumber, quickText, quickButtons);
                            }
                        } catch (_) { /* opcional */ }
                        connection.messagesToday = (connection.messagesToday || 0) + 1;
                        connection.totalMessages = (connection.totalMessages || 0) + 1;
                        await connection.save();
                        return;
                    }
                    // If no configured menu, let normal AI flow continue
                }
            } catch (_) { /* ignore and continue normal flow */ }

            // Upsert persistent session for timers
            try {
                const SessionTimerService = require('../services/SessionTimerService');
                const UserSession = require('../models/UserSession');
                const branchDoc = await Branch.findById(connection.branchId);
                const branchName = branchDoc?.name || 'nuestra sucursal';
                if (!this._sessionTimerService) {
                    this._sessionTimerService = new SessionTimerService();
                    this._sessionTimerService.start();
                }

                // Analizar el tipo de mensaje para determinar la acción del timer
                const lowerMessage = message.toLowerCase();
                const isGreeting = ['hola', 'hello', 'buenos días', 'buenas tardes', 'buenas noches', 'hey', 'hi'].some(greeting => 
                    lowerMessage.includes(greeting.toLowerCase())
                );
                const isMenuRequest = ['menú', 'menu', 'envíame el menú', 'envíame el menu'].some(keyword => 
                    lowerMessage.includes(keyword.toLowerCase())
                );
                // Separar intención de confirmar vs iniciar pedido
                const isOrderRequest = ['pedir', 'ordenar', 'comprar'].some(keyword => 
                    lowerMessage.includes(keyword.toLowerCase())
                );
                // Usar IA para confirmar detección robusta, pero SOLO si el contexto indica confirmación
                let isOrderConfirmation = this.aiService.isOrderConfirmation ? this.aiService.isOrderConfirmation(message) : ['sí','si','acepto','confirmo','ok','listo','vale','yes'].some(k=>lowerMessage.includes(k));
                if (isOrderConfirmation) {
                    try {
                        // Verificar contexto reciente del bot pidiendo confirmación
                        let askedForConfirmation = false;
                        const recentBotMsgs = await WhatsAppMessage.find({
                            phoneNumber,
                            direction: 'outgoing'
                        }).sort({ 'metadata.timestamp': -1 }).limit(6).select('content');
                        const norm = (t) => (t||'').toLowerCase()
                            .replace(/[áäàâ]/g,'a').replace(/[éëèê]/g,'e').replace(/[íïìî]/g,'i')
                            .replace(/[óöòô]/g,'o').replace(/[úüùû]/g,'u').replace(/ñ/g,'n');
                        for (const m of recentBotMsgs) {
                            const txt = norm(m?.content?.text || '');
                            if (
                                txt.includes('confirmas este pedido') ||
                                txt.includes('quieres confirmar') ||
                                txt.includes('pedido confirmado') ||
                                txt.includes('confirmar pedido')
                            ) { askedForConfirmation = true; break; }
                        }
                        if (!askedForConfirmation) {
                            isOrderConfirmation = false;
                        }
                    } catch (_) {
                        // Si falla la verificación de contexto, ser conservadores y no confirmar
                        isOrderConfirmation = false;
                    }
                }

                if (isGreeting) {
                    // Iniciar sesión de saludo con timer de 3 minutos
                    await this._sessionTimerService.startGreetingSession({
                        phoneNumber,
                        branchId: connection.branchId,
                        connectionId: connectionIdStr,
                        branchName
                    });
                } else if (isMenuRequest) {
                    // Reiniciar timer por solicitud de menú
                    await this._sessionTimerService.onMenuRequest({
                        phoneNumber,
                        branchId: connection.branchId
                    });
                } else if (isOrderConfirmation) {
                    // Confirmación del cliente: finalizar pedido con IA, guardar y enviar a cocina
                    try {
                        const confirmText = await this.aiService.handleOrderConfirmation(phoneNumber, connection.branchId, message);
                        if (confirmText && confirmText.length > 0) {
                            await this.whatsappService.sendMessage(connectionIdStr, phoneNumber, confirmText);
                        }
                        // Completar sesión de timers
                        await this._sessionTimerService.completeSession({
                            phoneNumber,
                            branchId: connection.branchId
                        });
                        // Enviar resumen a sucursal SOLO si el texto confirma pedido
                        const looksConfirmed = /PEDIDO\s+CONFIRMADO/i.test(confirmText || '');
                        console.log('🔍 ===== VERIFICACIÓN DE ENVÍO DE COMANDA =====');
                        console.log('📝 Texto de confirmación:', confirmText?.substring(0, 100) + '...');
                        console.log('🎯 ¿Parece confirmado?:', looksConfirmed ? '✅ SÍ' : '❌ NO');
                        console.log('📱 Connection ID:', connection._id);
                        console.log('🏪 Customer Service Number:', connection.customerServiceNumber);
                        console.log('===============================================');
                        
                        if (looksConfirmed) {
                            console.log('🚀 Iniciando envío de comanda al restaurante...');
                            await this.sendOrderSummaryToBranch(connection, phoneNumber, message);
                        } else {
                            console.log('⚠️ No se enviará comanda - texto no parece confirmación');
                        }
                        return; // Ya se respondió y despachó
                    } catch (e) {
                        console.warn('⚠️ Error en confirmación de pedido:', e.message);
                    }
                } else if (isOrderRequest) {
                    // Solicitud de iniciar pedido: dejar que el flujo de IA construya/resuma y guarde pending order
                    await this._sessionTimerService.onMessageReceived({
                        phoneNumber,
                        branchId: connection.branchId,
                        message
                    });
                } else {
                    // Cualquier otro mensaje reinicia el timer
                    await this._sessionTimerService.onMessageReceived({
                        phoneNumber,
                        branchId: connection.branchId,
                        message
                    });
                }
            } catch (e) {
                console.warn('⚠️ No se pudo actualizar la sesión persistente:', e.message);
            }
            
            console.log('🤖 ===== PROCESANDO MENSAJE CON IA =====');
            console.log('📱 Connection ID:', connectionIdStr);
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
                    await this.handleRecommendationRequest(connectionIdStr, phoneNumber, message, connection);
                    return;
                }

                // Check if user is in an active recommendation session
                const activeSession = await this.recommendationService.getActiveSession(phoneNumber, connection.branchId);
                if (activeSession) {
                    console.log('🔄 ===== SESIÓN DE RECOMENDACIÓN ACTIVA =====');
                    await this.handleRecommendationResponse(connectionIdStr, phoneNumber, message, activeSession);
                    return;
                }

                // Get business and branch info for context
                const business = await Business.findById(connection.businessId);
                let branchInfo = await Branch.findById(connection.branchId);
                
                // If branch not found by ObjectId, try by string
                if (!branchInfo) {
                    branchInfo = await Branch.findOne({ branchId: String(connection.branchId) });
                }
                
                // Get AI configuration for this branch
                let branchAIConfig = await BranchAIConfig.findOne({ branchId: connection.branchId });
                
                // If not found by ObjectId, try by string
                if (!branchAIConfig) {
                    branchAIConfig = await BranchAIConfig.findOne({ branchId: String(connection.branchId) });
                }
                
                // Determine business type
                const businessType = business?.businessType || 'restaurant';
                
                console.log('🔍 ===== CONFIGURACIÓN DE IA ENCONTRADA =====');
                console.log('🏪 Branch:', branchInfo?.name || 'No encontrada');
                console.log('🏢 Business:', business?.name || 'No encontrada');
                console.log('🤖 AI Config:', branchAIConfig ? 'Disponible' : 'No disponible');
                console.log('📋 Menu Content:', branchAIConfig?.menuContent ? 'Disponible' : 'No disponible');
                console.log('🎯 Custom Prompt:', branchAIConfig?.customPrompt ? 'Disponible' : 'No disponible');
                console.log('============================================');
                
                // Generate AI response with branch-specific configuration
                let aiResponse;
                
                // Obtener historial de conversación para mejor contexto
                const conversationHistory = await this.getConversationHistory(phoneNumber, connection.branchId);
                
                // Use new hybrid AI system for better contextual understanding
                console.log('🤖 ===== USANDO SISTEMA IA HÍBRIDO MEJORADO =====');
                aiResponse = await this.aiService.generateFluidResponse(
                    message,
                    connection.branchId,
                    phoneNumber,
                    {
                        businessType,
                        branchAIConfig,
                        lastMessages: conversationHistory.messages || [],
                        currentState: 'active_conversation',
                        lastBotMessage: conversationHistory.lastBotMessage || null,
                        conversationHistory: conversationHistory.messages || []
                    }
                );
                console.log('✅ Respuesta IA híbrida generada:', aiResponse);

            console.log('🤖 ===== RESPUESTA IA GENERADA =====');
            console.log('📱 Connection ID:', connectionIdStr);
            console.log('📞 To:', phoneNumber);
            console.log('🤖 AI Response:', aiResponse);
            console.log('====================================');

                // Send AI response
                const messageTextRaw = typeof aiResponse === 'string' ? aiResponse : aiResponse.text;
                let messageText = messageTextRaw;
                
                // Solo agregar guía automática si la IA no generó una respuesta guiada específica
                const isGuidedResponse = /¡Perfecto!|¡Genial!|Entiendo que quieres hacer un pedido/i.test(messageTextRaw || '');
                const looksLikeAlitasMenu = /COMBOS\s+PERSONALES|COMBOS\s+FAMILIARES|COMBO\s+EMPAREJADO/i.test(messageTextRaw || '');
                const hasRecommendationHeader = /MI\s+RECOMENDACI[ÓO]N/i.test(messageTextRaw || '');
                
                // Deshabilitar prepend de guía rápida para no alterar el menú configurado
                if (false && looksLikeAlitasMenu && !hasRecommendationHeader && !isGuidedResponse) {
                    const quickGuide = `Hagámoslo simple: dime cuántas personas son y te doy la opción más básica adecuada.\n\n` +
`- 1 persona: Combo 1 (5 alitas + acompañante)\n` +
`- 2 personas: Combo Emparejado (16 alitas + 2 acompañantes)\n` +
`- 3 personas: Combo 2 (7 alitas + acompañante)\n` +
`- 4 personas: Combo 3 (9 alitas + acompañante)\n` +
`- 5–6 personas: Familiar 2 (30 alitas + acompañante + gaseosa 1.5 L)\n` +
`- 7–8 personas: Familiar 3 (40 alitas + acompañante + gaseosa 1.5 L)\n` +
`- 9–10 personas: Familiar 4 (50 alitas + 2 acompañantes + gaseosa 1.5 L)\n\n` +
`Escribe "pedir" para ordenar, "menu" para ver todo o "otra sugerencia" para ajustar.\n\n`;
                    messageText = quickGuide + messageTextRaw;
                }
                
                await this.whatsappService.sendMessage(connectionIdStr, phoneNumber, messageText);
                // Guardar respuesta del bot y actualizar memoria
                try {
                    const saved = await this.saveOutgoingMessage(
                        connectionIdStr,
                        phoneNumber,
                        messageText,
                        { conversationStage: 'active_conversation', branchId: connection.branchId, businessId: connection.businessId },
                        { branchId: connection.branchId, businessId: connection.businessId }
                    );
                    await this.updateConversationMemory(phoneNumber, connection.branchId, connection.businessId, message, messageText, { conversationStage: 'active_conversation' });
                } catch (_) {}

                // Update connection stats
                connection.messagesToday = (connection.messagesToday || 0) + 1;
                connection.totalMessages = (connection.totalMessages || 0) + 1;
                await connection.save();

                this.logger.info('AI response sent', { 
                    connectionId: connectionIdStr, 
                    to: phoneNumber, 
                    message: aiResponse.substring(0, 100) + '...' 
                });

            } catch (aiError) {
                console.error('❌ Error procesando con IA:', aiError);
                
                // Fallback to basic response
                const fallbackMessage = '¡Hola! 👋 Gracias por contactarnos. ¿En qué puedo ayudarte hoy?';
                await this.whatsappService.sendMessage(connectionIdStr, phoneNumber, fallbackMessage);
                
                this.logger.error('AI processing failed, sent fallback', { 
                    connectionId: connectionIdStr, 
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

            console.log('📱 ===== CREANDO CONEXIÓN WHATSAPP =====');
            console.log('📊 Datos recibidos:');
            console.log(`   🏢 Business ID: ${businessId} (${typeof businessId})`);
            console.log(`   🏪 Branch ID: ${branchId} (${typeof branchId})`);
            console.log(`   📞 Phone: ${phoneNumber}`);
            console.log(`   📝 Connection Name: ${connectionName}`);
            console.log('==========================================');

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

            // Buscar la sucursal específica por ID
            let targetBranch = null;
            
            // Primero intentar buscar por ObjectId
            if (mongoose.Types.ObjectId.isValid(branchId)) {
                targetBranch = await Branch.findById(branchId);
            }
            
            // Si no se encuentra por ObjectId, buscar por branchId string
            if (!targetBranch) {
                targetBranch = await Branch.findOne({ branchId: branchId });
            }
            
            // Si aún no se encuentra, buscar por nombre (para casos legacy)
            if (!targetBranch) {
                targetBranch = await Branch.findOne({ name: branchId });
            }
            
            if (targetBranch) {
                branchObjectId = targetBranch._id;
                console.log(`✅ Sucursal encontrada: ${targetBranch.name} (${targetBranch._id})`);
                console.log(`🏢 Business ID de la sucursal: ${targetBranch.businessId}`);
            } else {
                // Solo crear sucursal por defecto si realmente es 'branch1' o un ID específico de fallback
                if (branchId === 'branch1') {
                    console.log('⚠️ Creando sucursal por defecto para branch1');
                    targetBranch = await Branch.findOne({ name: 'Sucursal Centro' });
                    if (!targetBranch) {
                        targetBranch = new Branch({
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
                        await targetBranch.save();
                    }
                    branchObjectId = targetBranch._id;
                } else {
                    // Si no se encuentra la sucursal específica, devolver error
                    return res.status(400).json({
                        success: false,
                        error: `Sucursal con ID '${branchId}' no encontrada. Por favor, selecciona una sucursal válida.`
                    });
                }
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
            
            console.log('✅ ===== CONEXIÓN WHATSAPP CREADA =====');
            console.log(`🆔 Connection ID: ${connection._id}`);
            console.log(`🏢 Business ID: ${connection.businessId}`);
            console.log(`🏪 Branch ID: ${connection.branchId}`);
            console.log(`📞 Phone: ${connection.phoneNumber}`);
            console.log(`📝 Name: ${connection.connectionName}`);
            console.log(`🤖 AI Integration: ${connection.aiIntegration}`);
            console.log('=====================================');

            // Get business and branch info for QR code
            const business = await Business.findById(businessObjectId);
            const branchInfo = await Branch.findById(branchObjectId);

            // Generate real WhatsApp QR code
            let qrCodeDataURL = null;
            let qrExpiresAt = null;
            
            try {
                console.log('📱 ===== GENERANDO QR CODE REAL DE WHATSAPP =====');
                console.log('🔗 Connection ID:', connection._id);
                console.log('📞 Phone:', phoneNumber);
                console.log('🏪 Branch:', branchInfo?.name);
                console.log('===============================================');

                // Usar el servicio de WhatsApp para generar QR real
                if (this.whatsappService) {
                    console.log('🔄 Generando QR Code usando WhatsAppService...');
                    
                    qrCodeDataURL = await this.whatsappService.generateQRCode(connection._id, phoneNumber);
                    
                    if (qrCodeDataURL) {
                        connection.qrCodeDataURL = qrCodeDataURL;
                        connection.status = 'connecting';
                        qrExpiresAt = new Date(Date.now() + (5 * 60 * 1000)); // 5 minutos
                        connection.qrExpiresAt = qrExpiresAt;
                        await connection.save();
                        
                        console.log('✅ QR Code real generado exitosamente');
                        this.logger.info('Real WhatsApp QR code generated', { 
                            connectionId: connection._id,
                            phoneNumber 
                        });
                    } else {
                        throw new Error('No se pudo generar el QR code');
                    }
                } else {
                    throw new Error('WhatsApp service no está disponible');
                }
            } catch (error) {
                console.log('❌ Error generando QR real:', error.message);
                this.logger.error('Failed to generate real WhatsApp QR code', { 
                    connectionId: connection._id, 
                    error: error.message 
                });
                
                // Fallback: generar QR con información de conexión
                console.log('🔄 Generando QR de fallback...');
                const qrData = {
                    connectionId: connection._id,
                    businessName: business?.name || 'Business',
                    branchName: branchInfo?.name || 'Branch',
                    phoneNumber,
                    timestamp: Date.now(),
                    message: 'Escanea este código para vincular WhatsApp'
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
                
                console.log('✅ QR de fallback generado');
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

            console.log('🔄 ===== REFRESCANDO QR CODE REAL DE WHATSAPP =====');
            console.log('🔗 Connection ID:', id);
            console.log('📞 Phone:', connection.phoneNumber);
            console.log('===============================================');

            let qrCodeDataURL = null;
            let expiresAt = null;

            try {
                // Usar el servicio de WhatsApp para generar QR real
                if (this.whatsappService) {
                    console.log('🔄 Generando nuevo QR Code usando WhatsAppService...');
                    
                    qrCodeDataURL = await this.whatsappService.generateQRCode(id, connection.phoneNumber);
                    
                    if (qrCodeDataURL) {
                        expiresAt = new Date(Date.now() + (5 * 60 * 1000)); // 5 minutos
                        
                        // Actualizar conexión en BD
                        connection.qrCodeDataURL = qrCodeDataURL;
                        connection.qrExpiresAt = expiresAt;
                        connection.status = 'connecting';
                        await connection.save();
                        
                        console.log('✅ QR Code real refrescado exitosamente');
                        
                        res.json({
                            success: true,
                            data: {
                                qrCodeDataURL: qrCodeDataURL,
                                expiresAt: expiresAt
                            },
                            message: 'QR Code refrescado exitosamente'
                        });
                    } else {
                        throw new Error('No se pudo generar el QR code');
                    }
                } else {
                    throw new Error('WhatsApp service no está disponible');
                }
            } catch (error) {
                console.log('❌ Error refrescando QR real:', error.message);
                
                // Fallback: generar QR con información de conexión
                console.log('🔄 Generando QR de fallback...');
                const qrData = {
                    connectionId: id,
                    phoneNumber: connection.phoneNumber,
                    timestamp: Date.now(),
                    message: 'Escanea este código para vincular WhatsApp',
                    refresh: true
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

                expiresAt = new Date(Date.now() + (5 * 60 * 1000));
                connection.qrCodeDataURL = qrCodeDataURL;
                connection.qrExpiresAt = expiresAt;
                connection.status = 'disconnected';
                await connection.save();
                
                console.log('✅ QR de fallback refrescado');
                
                res.json({
                    success: true,
                    data: {
                        qrCodeDataURL: qrCodeDataURL,
                        expiresAt: expiresAt
                    },
                    message: 'QR Code refrescado exitosamente (modo fallback)'
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
                
                // Si es "pedir", procesar como pedido basado en la recomendación real
                if (message.toLowerCase().includes('pedir') || message.toLowerCase().includes('ordenar') || message.toLowerCase().includes('comprar')) {
                    try {
                        // Obtener última recomendación completa de la sesión antes de cancelarla
                        const finalData = await this.recommendationService.getNextQuestion(session.sessionId);
                        let recommendation = null;
                        if (finalData && finalData.type === 'recommendations') {
                            recommendation = finalData.mainRecommendation;
                        }

                        // Si no se pudo obtener por getNextQuestion, intentar leer la sesión directamente
                        if (!recommendation) {
                            const RecommendationSession = require('../models/RecommendationSession');
                            const sess = await RecommendationSession.findOne({ sessionId: session.sessionId });
                            recommendation = sess?.finalRecommendation || null;
                        }

                        // Preparar pedido pendiente a partir de la recomendación
                        if (recommendation) {
                            const peopleQty = recommendation.quantity || 1;
                            const products = [{
                                name: recommendation.productName.toLowerCase(),
                                quantity: peopleQty,
                                price: recommendation.price,
                                total: recommendation.price * peopleQty,
                                category: recommendation.category
                            }];

                            const subtotal = products.reduce((s, p) => s + p.total, 0);
                            const deliveryFee = subtotal < 20000 ? 3000 : 0;
                            const total = subtotal + deliveryFee;

                            // Guardar como pedido pendiente para confirmación con AIService
                            const connection = await WhatsAppConnection.findById(connectionId);
                            const branchId = connection.branchId;
                            await this.aiService.savePendingOrder(phoneNumber, branchId, {
                                products,
                                subtotal,
                                delivery: { type: 'pickup', fee: deliveryFee },
                                total,
                                hasProducts: true
                            });

                            const summary = this.aiService.generateOrderResponse({
                                products,
                                subtotal,
                                delivery: deliveryFee > 0,
                                deliveryFee,
                                total,
                                hasProducts: true
                            });

                            await this.whatsappService.sendMessage(connectionId, phoneNumber, summary);
                            return;
                        }
                    } catch (e) {
                        console.error('❌ Error preparando pedido desde recomendación:', e);
                    }

                    // Fallback si no se pudo armar desde recomendación
                    const fallback = `Claro, te ayudo con tu pedido. ¿Qué cantidad y presentación deseas de la recomendación?`;
                    await this.whatsappService.sendMessage(connectionId, phoneNumber, fallback);
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

    // Enviar resumen del pedido a la sucursal
    async sendOrderSummaryToBranch(connection, clientPhoneNumber, clientMessage) {
        try {
            console.log('📤 ===== ENVIANDO RESUMEN DE PEDIDO A SUCURSAL =====');
            console.log('📱 Connection ID:', connection._id);
            console.log('👤 Cliente:', clientPhoneNumber);
            console.log('🏪 Sucursal:', connection.customerServiceNumber);
            console.log('💬 Mensaje del cliente:', clientMessage);

            // Verificar que existe el número de servicio al cliente
            if (!connection.customerServiceNumber) {
                console.log('❌ No hay número de servicio al cliente configurado');
                console.log('   Connection ID:', connection._id);
                console.log('   Connection Name:', connection.connectionName);
                console.log('   Branch ID:', connection.branchId);
                console.log('   SOLUCIÓN: Configurar customerServiceNumber en la conexión WhatsApp');
                this.logger.warn('No customer service number configured for connection', { 
                    connectionId: connection._id 
                });
                return;
            }
            
            console.log('✅ Customer Service Number configurado:', connection.customerServiceNumber);

            // Obtener información de la sucursal
            const Branch = require('../models/Branch');
            const branch = await Branch.findById(connection.branchId);
            const branchName = branch?.name || 'Sucursal';
            
            // Si no hay customerServiceNumber pero hay teléfono en la sucursal, usarlo
            if (!connection.customerServiceNumber && branch?.whatsapp?.phoneNumber) {
                console.log('🔧 Auto-configurando customerServiceNumber desde sucursal...');
                connection.customerServiceNumber = branch.whatsapp.phoneNumber;
                await connection.save();
                console.log('✅ Customer Service Number auto-configurado:', connection.customerServiceNumber);
            }
            
            console.log('🏪 Información de sucursal:');
            console.log('   Nombre:', branchName);
            console.log('   Teléfono sucursal:', branch?.whatsapp?.phoneNumber);
            console.log('   Customer Service Number:', connection.customerServiceNumber);

            // Verificar que el customerServiceNumber coincida con el teléfono de la sucursal
            if (branch?.whatsapp?.phoneNumber) {
                const branchPhone = branch.whatsapp.phoneNumber.replace(/[^0-9]/g, '');
                const servicePhone = connection.customerServiceNumber.replace(/[^0-9]/g, '');
                
                console.log('🔍 Verificación de teléfonos:');
                console.log('   Teléfono sucursal limpio:', branchPhone);
                console.log('   Customer service limpio:', servicePhone);
                console.log('   ¿Coinciden?:', branchPhone === servicePhone ? 'SÍ' : 'NO');
                
                if (branchPhone !== servicePhone) {
                    console.log('⚠️ ADVERTENCIA: El customerServiceNumber no coincide con el teléfono de la sucursal');
                    console.log('   Continuando con el envío usando customerServiceNumber...');
                }
            } else {
                console.log('⚠️ ADVERTENCIA: No hay teléfono configurado en la sucursal');
            }

            // Obtener el último pedido del cliente para generar el resumen
            const Order = require('../models/Order');
            const lastOrder = await Order.findOne({
                'customer.phone': clientPhoneNumber,
                branchId: connection.branchId
            }).sort({ createdAt: -1 });

            if (!lastOrder) {
                console.log('❌ No se encontró pedido para el cliente');
                this.logger.warn('No order found for client', { 
                    clientPhoneNumber, 
                    branchId: connection.branchId 
                });
                return;
            }

            console.log('📦 Pedido encontrado:');
            console.log('   Order ID:', lastOrder.orderId);
            console.log('   Cliente:', lastOrder.customer.name);
            console.log('   Total:', lastOrder.total);
            console.log('   Estado:', lastOrder.status);

            // Generar resumen del pedido
            const orderSummary = this.generateOrderSummary(lastOrder, branchName, clientPhoneNumber);
            
            console.log('📋 Resumen generado (primeros 200 caracteres):');
            console.log(orderSummary.substring(0, 200) + '...');

            // Enviar mensaje a la sucursal
            const branchPhoneNumber = connection.customerServiceNumber.replace('@c.us', '');
            const connectionIdStr = String(connection._id);
            
            console.log('📤 Preparando envío:');
            console.log('   Connection ID:', connectionIdStr);
            console.log('   Teléfono destino:', branchPhoneNumber);
            console.log('   Longitud del mensaje:', orderSummary.length, 'caracteres');
            
            // Verificar que el cliente WhatsApp esté disponible
            const whatsappService = this.whatsappService;
            console.log('🔍 Verificando cliente WhatsApp...');
            console.log('   WhatsApp Service disponible:', !!whatsappService);
            console.log('   Clientes disponibles:', whatsappService.clients ? whatsappService.clients.size : 0);
            console.log('   Connection ID buscado:', connectionIdStr);
            console.log('   Claves de clientes:', whatsappService.clients ? Array.from(whatsappService.clients.keys()) : []);
            
            const client = whatsappService.clients.get(connectionIdStr);
            
            if (!client) {
                console.log('❌ Cliente WhatsApp no encontrado para la conexión');
                console.log('   Connection ID:', connectionIdStr);
                console.log('   Clientes disponibles:', whatsappService.clients ? whatsappService.clients.size : 0);
                this.logger.error('WhatsApp client not found for connection', { connectionId: connectionIdStr });
                return;
            }
            
            console.log('✅ Cliente WhatsApp encontrado');
            console.log('   Estado del cliente:', client.info ? 'Ready' : 'Not ready');
            console.log('   Info del cliente:', client.info ? JSON.stringify(client.info, null, 2) : 'No info available');
            
            // Enviar el mensaje
            console.log('🚀 Enviando mensaje a la sucursal...');
            const messageId = await whatsappService.sendMessage(connectionIdStr, branchPhoneNumber, orderSummary);
            
            console.log('✅ ===== RESUMEN ENVIADO EXITOSAMENTE =====');
            console.log('📱 Connection ID:', connectionIdStr);
            console.log('📞 Teléfono destino:', branchPhoneNumber);
            console.log('🆔 Message ID:', messageId);
            console.log('📦 Order ID:', lastOrder.orderId);
            console.log('👤 Cliente:', clientPhoneNumber);
            console.log('==========================================');
            
            this.logger.info('Order summary sent to branch successfully', {
                connectionId: connection._id,
                branchPhoneNumber,
                orderId: lastOrder.orderId,
                clientPhoneNumber,
                messageId
            });

        } catch (error) {
            console.error('❌ ===== ERROR ENVIANDO RESUMEN A SUCURSAL =====');
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
            console.error('===============================================');
            
            this.logger.error('Error sending order summary to branch', {
                error: error.message,
                stack: error.stack,
                connectionId: connection._id,
                clientPhoneNumber
            });
        }
    }

    // Generar resumen del pedido para enviar a la sucursal
    generateOrderSummary(order, branchName, clientPhoneNumber) {
        const orderDate = new Date(order.createdAt).toLocaleString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let summary = `🍽️ *NUEVO PEDIDO CONFIRMADO* 🍽️\n\n`;
        summary += `📋 *Pedido:* ${order.orderId}\n`;
        summary += `🏪 *Sucursal:* ${branchName}\n`;
        summary += `👤 *Cliente:* ${order.customer.name}\n`;
        summary += `📞 *Teléfono:* ${clientPhoneNumber}\n`;
        summary += `📅 *Fecha:* ${orderDate}\n\n`;

        // Agregar items del pedido
        if (order.items && order.items.length > 0) {
            summary += `🛒 *ITEMS DEL PEDIDO:*\n`;
            order.items.forEach((item, index) => {
                const price = item.price || 0;
                summary += `${index + 1}. ${item.name} - $${price.toLocaleString()}\n`;
                if (item.quantity > 1) {
                    summary += `   Cantidad: ${item.quantity}\n`;
                }
                if (item.notes) {
                    summary += `   Notas: ${item.notes}\n`;
                }
            });
            summary += `\n`;
        }

        // Agregar información de entrega
        if (order.delivery) {
            summary += `🚚 *INFORMACIÓN DE ENTREGA:*\n`;
            summary += `📍 *Dirección:* ${order.delivery.address}\n`;
            summary += `📞 *Teléfono:* ${order.delivery.phone}\n`;
            summary += `👤 *Contacto:* ${order.delivery.contactName}\n`;
            if (order.delivery.instructions) {
                summary += `📝 *Instrucciones:* ${order.delivery.instructions}\n`;
            }
            summary += `\n`;
        }

        // Agregar totales
        summary += `💰 *RESUMEN DE PAGOS:*\n`;
        summary += `Subtotal: $${order.subtotal.toLocaleString()}\n`;
        if (order.tax > 0) {
            summary += `Impuestos: $${order.tax.toLocaleString()}\n`;
        }
        if (order.serviceFee > 0) {
            summary += `Servicio: $${order.serviceFee.toLocaleString()}\n`;
        }
        summary += `*TOTAL: $${order.total.toLocaleString()}*\n\n`;

        // Agregar estado del pedido
        summary += `📊 *Estado:* ${order.status.toUpperCase()}\n`;
        summary += `💳 *Pago:* ${order.payment.method.toUpperCase()}\n\n`;

        summary += `✅ *El cliente ha confirmado este pedido*\n`;
        summary += `📱 *Fuente:* WhatsApp\n\n`;
        summary += `¡Gracias por usar nuestro servicio! 🎉`;

        return summary;
    }

    // ===== MÉTODOS DE CONVERSACIÓN =====

    /**
     * Guardar mensaje entrante en la base de datos
     */
    async saveIncomingMessage(connectionId, phoneNumber, message, messageId, timestamp, connection, extraContext = {}) {
        try {
            const whatsappMessage = new WhatsAppMessage({
                messageId: messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                connectionId: String(connectionId),
                phoneNumber,
                branchId: String(connection.branchId),
                businessId: String(connection.businessId),
                direction: 'incoming',
                content: {
                    text: message,
                    mediaType: 'text'
                },
                messageType: 'user_message',
                context: {
                    orderId: extraContext.orderId || null,
                    sessionId: extraContext.sessionId || null
                },
                metadata: {
                    whatsappMessageId: messageId,
                    timestamp: timestamp ? new Date(timestamp) : new Date(),
                    deliveryStatus: 'delivered'
                }
            });

            await whatsappMessage.save();
            console.log('✅ Mensaje entrante guardado:', whatsappMessage.messageId);
        } catch (error) {
            console.error('❌ Error guardando mensaje entrante:', error);
            this.logger.error('Error saving incoming message', { error: error.message });
        }
    }

    /**
     * Guardar respuesta del bot en la base de datos
     */
    async saveOutgoingMessage(connectionId, phoneNumber, message, processingData = {}, extraContext = {}) {
        try {
            // Asegurar branchId y businessId para cumplir validación del modelo
            let branchIdForMsg = extraContext.branchId || processingData.branchId || null;
            let businessIdForMsg = extraContext.businessId || processingData.businessId || null;
            if (!branchIdForMsg || !businessIdForMsg) {
                try {
                    const WhatsAppConnection = require('../models/WhatsAppConnection');
                    const connDoc = await WhatsAppConnection.findById(connectionId).select('branchId businessId');
                    branchIdForMsg = branchIdForMsg || (connDoc && String(connDoc.branchId));
                    businessIdForMsg = businessIdForMsg || (connDoc && String(connDoc.businessId));
                } catch (_) {}
            }
            const whatsappMessage = new WhatsAppMessage({
                messageId: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                connectionId: String(connectionId),
                phoneNumber,
                branchId: branchIdForMsg ? String(branchIdForMsg) : undefined,
                businessId: businessIdForMsg ? String(businessIdForMsg) : undefined,
                direction: 'outgoing',
                content: {
                    text: message,
                    mediaType: 'text'
                },
                messageType: 'bot_response',
                context: {
                    orderId: extraContext.orderId || processingData.orderId || null,
                    sessionId: extraContext.sessionId || processingData.sessionId || null
                },
                processing: {
                    intent: processingData.intent || null,
                    sentiment: processingData.sentiment || null,
                    confidence: processingData.confidence || null,
                    processingTime: processingData.processingTime || null,
                    aiModel: processingData.aiModel || 'default',
                    conversationStage: processingData.conversationStage || null
                },
                metadata: {
                    timestamp: new Date(),
                    deliveryStatus: 'sent'
                }
            });

            await whatsappMessage.save();
            console.log('✅ Respuesta del bot guardada:', whatsappMessage.messageId);
            return whatsappMessage;
        } catch (error) {
            console.error('❌ Error guardando respuesta del bot:', error);
            this.logger.error('Error saving outgoing message', { error: error.message });
            return null;
        }
    }

    /**
     * Actualizar memoria conversacional
     */
    async updateConversationMemory(phoneNumber, branchId, businessId, userMessage, botResponse, processingData = {}) {
        try {
            // Buscar o crear memoria conversacional
            let memory = await ConversationMemory.findOne({
                phoneNumber,
                branchId: String(branchId),
                businessId: String(businessId)
            });

            if (!memory) {
                memory = new ConversationMemory({
                    phoneNumber,
                    branchId: String(branchId),
                    businessId: String(businessId),
                    clientInfo: {
                        visitFrequency: 'first_time'
                    },
                    currentContext: {
                        conversationStage: 'greeting',
                        messageCount: 0
                    },
                    emotionalState: {
                        satisfaction: 5,
                        trust: 5,
                        engagement: 5
                    }
                });
            }

            // Actualizar contexto actual
            memory.currentContext.intent = processingData.intent || memory.currentContext.intent;
            memory.currentContext.mood = processingData.sentiment || memory.currentContext.mood;
            memory.currentContext.lastMessage = userMessage;
            memory.currentContext.messageCount += 1;
            memory.lastInteraction = new Date();

            // Determinar etapa de la conversación
            if (processingData.intent) {
                memory.currentContext.conversationStage = this.determineConversationStage(
                    processingData.intent, 
                    memory.currentContext.conversationStage
                );
            }

            // Actualizar estado emocional
            if (processingData.sentiment) {
                memory.updateEmotionalState(processingData.sentiment, processingData.intent);
            }

            // Agregar al historial
            memory.addToHistory(userMessage, botResponse, processingData.intent, processingData.sentiment, {
                messageId: `conv_${Date.now()}`,
                processingTime: processingData.processingTime || 0,
                confidence: processingData.confidence || 0
            });

            await memory.save();
            console.log('✅ Memoria conversacional actualizada para:', phoneNumber);
            return memory;
        } catch (error) {
            console.error('❌ Error actualizando memoria conversacional:', error);
            this.logger.error('Error updating conversation memory', { error: error.message });
            return null;
        }
    }

    /**
     * Determinar etapa de la conversación
     */
    determineConversationStage(intent, currentStage) {
        const stageFlow = {
            greeting: ['browsing', 'asking_info'],
            browsing: ['ordering', 'asking_info', 'recommendation'],
            ordering: ['customizing', 'confirming'],
            customizing: ['confirming'],
            confirming: ['greeting'],
            asking_info: ['browsing', 'ordering'],
            recommendation: ['ordering', 'browsing'],
            complaint: ['greeting'],
            cancellation: ['greeting']
        };

        const possibleStages = stageFlow[currentStage] || ['greeting'];
        
        if (possibleStages.includes(intent)) {
            return intent;
        }

        return currentStage;
    }

    /**
     * Obtener historial de conversación
     */
    async getConversationHistory(phoneNumber, branchId, limit = 50) {
        try {
            const messages = await WhatsAppMessage.getConversationHistory(phoneNumber, branchId, limit);
            const memory = await ConversationMemory.findOne({
                phoneNumber,
                branchId: String(branchId)
            });

            return {
                messages: messages.reverse(), // Mostrar en orden cronológico
                memory: memory ? {
                    clientInfo: memory.clientInfo,
                    currentContext: memory.currentContext,
                    emotionalState: memory.emotionalState,
                    preferences: memory.preferences
                } : null
            };
        } catch (error) {
            console.error('❌ Error obteniendo historial de conversación:', error);
            this.logger.error('Error getting conversation history', { error: error.message });
            return { messages: [], memory: null };
        }
    }

    /**
     * Obtener conversaciones activas
     */
    async getActiveConversations(branchId, limit = 50) {
        try {
            const conversations = await ConversationMemory.getActiveConversations(branchId, limit);
            return conversations;
        } catch (error) {
            console.error('❌ Error obteniendo conversaciones activas:', error);
            this.logger.error('Error getting active conversations', { error: error.message });
            return [];
        }
    }

    /**
     * Obtener estadísticas de conversaciones
     */
    async getConversationStats(branchId, startDate, endDate) {
        try {
            const [memoryStats, messageStats] = await Promise.all([
                ConversationMemory.getConversationStats(branchId, startDate, endDate),
                WhatsAppMessage.getConversationStats(branchId, startDate, endDate)
            ]);

            return {
                memory: memoryStats[0] || {},
                messages: messageStats[0] || {},
                popularIntents: await WhatsAppMessage.getPopularIntents(branchId, startDate, endDate, 10),
                sentimentAnalysis: await WhatsAppMessage.getSentimentAnalysis(branchId, startDate, endDate)
            };
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas de conversación:', error);
            this.logger.error('Error getting conversation stats', { error: error.message });
            return { memory: {}, messages: {}, popularIntents: [], sentimentAnalysis: [] };
        }
    }

    // Validar tipo de mensaje y determinar acción
    validateMessageType(message, messageType, mediaType, phoneNumber = null) {
        // Verificar si el contacto está en cooldown
        if (phoneNumber && this.isContactInCooldown(phoneNumber)) {
            const cooldownInfo = this.cooldownContacts.get(phoneNumber);
            const remainingTime = Math.ceil((cooldownInfo.endTime - Date.now()) / 1000 / 60);
            console.log(`🚫 Contacto ${phoneNumber} en cooldown por ${remainingTime} minutos más`);
            return {
                shouldIgnore: true,
                shouldCancel: false,
                reason: `Contacto en cooldown por ${remainingTime} minutos más`
            };
        }

        // Verificar si es un mensaje que no es texto
        if (messageType && messageType !== 'text' && messageType !== 'chat') {
            return {
                shouldIgnore: false,
                shouldCancel: false,
                shouldRespond: true,
                response: this.generateNonTextMessageResponse(messageType),
                reason: `Mensaje de tipo ${messageType} recibido`
            };
        }

        // Verificar si es un archivo multimedia
        if (mediaType && mediaType !== 'text') {
            return {
                shouldIgnore: false,
                shouldCancel: false,
                shouldRespond: true,
                response: this.generateNonTextMessageResponse(mediaType),
                reason: `Archivo multimedia de tipo ${mediaType} recibido`
            };
        }

        // Verificar si el mensaje está vacío o es solo espacios
        if (!message || message.trim().length === 0) {
            return {
                shouldIgnore: true,
                shouldCancel: false,
                reason: 'Mensaje vacío'
            };
        }

        // Verificar si es un mensaje sin sentido
        if (this.isNonsenseMessage(message)) {
            return {
                shouldIgnore: false,
                shouldCancel: true,
                reason: 'Mensaje sin sentido detectado'
            };
        }

        // Mensaje válido para procesar
        return {
            shouldIgnore: false,
            shouldCancel: false,
            shouldRespond: false
        };
    }

    // Generar respuesta para mensajes que no son texto
    generateNonTextMessageResponse(messageType) {
        const typeMessages = {
            'image': '📷',
            'audio': '🎵',
            'voice': '🎤',
            'video': '🎬',
            'document': '📄',
            'sticker': '😊',
            'gif': '🎞️',
            'location': '📍'
        };

        const emoji = typeMessages[messageType] || '📎';

        return `${emoji} Lo siento, pero este bot solo puede procesar mensajes de texto.

Por favor envía tu consulta o pedido escribiendo un mensaje de texto.

¿En qué te puedo ayudar? 😊`;
    }

    // Detectar mensajes sin sentido
    isNonsenseMessage(message) {
        const trimmedMessage = message.trim().toLowerCase();
        
        // Patrones de mensajes sin sentido
        const nonsensePatterns = [
            /^\.+$/, // Solo puntos: .....
            /^[.,;:!?\-_]+$/, // Solo signos de puntuación
            /^(.)\1{4,}$/, // Misma letra repetida 5+ veces: aaaaa
            /^[a-z]\s[a-z]\s[a-z]$/, // Letras separadas: a b c
            /^(.)\1{2,}$/, // Misma letra repetida 3+ veces: aaa
            /^[0-9]{1,2}$/, // Solo 1-2 dígitos: 1, 12
            /^[^a-zA-ZáéíóúñÁÉÍÓÚÑ0-9\s]+$/, // Solo símbolos especiales
        ];

        // Verificar patrones
        for (const pattern of nonsensePatterns) {
            if (pattern.test(trimmedMessage)) {
                return true;
            }
        }

        // Verificar si es muy corto y no tiene sentido
        if (trimmedMessage.length <= 2 && !this.isValidShortMessage(trimmedMessage)) {
            return true;
        }

        // Verificar si contiene solo caracteres especiales repetidos
        if (trimmedMessage.length <= 3 && /^[^a-zA-ZáéíóúñÁÉÍÓÚÑ0-9\s]+$/.test(trimmedMessage)) {
            return true;
        }

        return false;
    }

    // Verificar si un mensaje corto es válido
    isValidShortMessage(message) {
        const validShortMessages = [
            'si', 'sí', 'no', 'ok', 'okay', 'hola', 'hi', 'hey',
            'gracias', 'thanks', 'bye', 'adiós', 'chao', 'ciao'
        ];
        
        return validShortMessages.includes(message);
    }

    // Manejar cancelación de orden
    async handleOrderCancellation(connectionId, from, reason, phoneNumber = null) {
        try {
            console.log('🚫 ===== CANCELANDO ORDEN =====');
            console.log('📞 Cliente:', from);
            console.log('🏪 Conexión:', connectionId);
            console.log('💬 Razón:', reason);
            console.log('=====================================');

            // Extraer número de teléfono si no se proporcionó
            if (!phoneNumber) {
                phoneNumber = from.replace('@c.us', '');
            }

            // Mensaje de cancelación
            const cancellationMessage = `❌ **ORDEN CANCELADA**

Hemos cancelado tu pedido porque recibimos un mensaje que no pudimos procesar.

Si quieres hacer un nuevo pedido, solo escribe "hola" y te ayudo desde el principio.

¡Estamos aquí para ayudarte! 😊`;

            // Enviar mensaje de cancelación
            await this.whatsappService.sendMessage(connectionId, phoneNumber, cancellationMessage);

            // Log de cancelación
            this.logger.warn('Order cancelled due to nonsense message', {
                connectionId,
                phoneNumber,
                reason
            });

            console.log('✅ Mensaje de cancelación enviado');

            // Iniciar cooldown de 10 minutos para este contacto
            this.startCooldownForContact(phoneNumber, reason);

        } catch (error) {
            console.error('❌ Error manejando cancelación de orden:', error);
            this.logger.error('Error handling order cancellation', {
                connectionId,
                from,
                reason,
                error: error.message
            });
        }
    }

    // Iniciar cooldown para un contacto
    startCooldownForContact(phoneNumber, reason) {
        const cooldownMinutes = 10;
        const startTime = Date.now();
        const endTime = startTime + (cooldownMinutes * 60 * 1000);
        
        this.cooldownContacts.set(phoneNumber, {
            startTime: startTime,
            endTime: endTime,
            reason: reason,
            cooldownMinutes: cooldownMinutes
        });
        
        console.log(`⏰ Cooldown iniciado para ${phoneNumber}: ${cooldownMinutes} minutos`);
        
        // Limpiar el cooldown automáticamente después del tiempo
        setTimeout(() => {
            this.removeCooldownForContact(phoneNumber);
        }, cooldownMinutes * 60 * 1000);
        
        this.logger.warn('Contact placed in cooldown', {
            phoneNumber,
            reason,
            cooldownMinutes,
            endTime: new Date(endTime)
        });
    }

    // Verificar si un contacto está en cooldown
    isContactInCooldown(phoneNumber) {
        if (!this.cooldownContacts.has(phoneNumber)) {
            return false;
        }
        
        const cooldownInfo = this.cooldownContacts.get(phoneNumber);
        const now = Date.now();
        
        // Si el cooldown ha expirado, removerlo
        if (now >= cooldownInfo.endTime) {
            this.removeCooldownForContact(phoneNumber);
            return false;
        }
        
        return true;
    }

    // Remover cooldown de un contacto
    removeCooldownForContact(phoneNumber) {
        if (this.cooldownContacts.has(phoneNumber)) {
            const cooldownInfo = this.cooldownContacts.get(phoneNumber);
            this.cooldownContacts.delete(phoneNumber);
            
            console.log(`✅ Cooldown removido para ${phoneNumber}`);
            
            this.logger.info('Contact cooldown removed', {
                phoneNumber,
                duration: Math.ceil((Date.now() - cooldownInfo.startTime) / 1000 / 60),
                reason: cooldownInfo.reason
            });
        }
    }

    // Obtener información de cooldown para un contacto
    getCooldownInfo(phoneNumber) {
        if (!this.cooldownContacts.has(phoneNumber)) {
            return null;
        }
        
        const cooldownInfo = this.cooldownContacts.get(phoneNumber);
        const now = Date.now();
        
        if (now >= cooldownInfo.endTime) {
            this.removeCooldownForContact(phoneNumber);
            return null;
        }
        
        return {
            remainingMinutes: Math.ceil((cooldownInfo.endTime - now) / 1000 / 60),
            reason: cooldownInfo.reason,
            startTime: cooldownInfo.startTime,
            endTime: cooldownInfo.endTime
        };
    }
}

module.exports = WhatsAppController;


