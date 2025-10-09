const QRCode = require('qrcode');
const LoggerService = require('./LoggerService');
const EventEmitter = require('events');

// Lazy load whatsapp-web.js to avoid initialization issues
let Client, LocalAuth, MessageMedia, Buttons, List;

class WhatsAppServiceSimple extends EventEmitter {
    static getInstance() {
        if (!global.__waServiceSimpleInstance) {
            global.__waServiceSimpleInstance = new WhatsAppServiceSimple();
        }
        return global.__waServiceSimpleInstance;
    }

    constructor() {
        super();
        this.logger = new LoggerService('whatsapp-service-simple');
        this.provider = process.env.WHATSAPP_PROVIDER || 'whatsapp-web';
        this.clients = new Map();
        this.eventHandlers = {};
        
        this.logger.info('WhatsApp Simple Service initialized', { provider: this.provider });
        
        // Auto-reconnect existing sessions after a short delay
        setTimeout(() => {
            this.autoReconnectConnections();
        }, 5000); // Wait 5 seconds for the app to fully initialize
    }

    // Normalize map key usage
    normalizeId(id) {
        // Handle both ObjectId and string IDs
        return id ? String(id) : id;
    }

    async ensureClient(connectionId, phoneNumber) {
        const key = this.normalizeId(connectionId);
        if (!this.clients.has(key)) {
            this.logger.info('Ensuring WhatsApp client for connection', { connectionId: key, phoneNumber });
            await this.createWhatsAppWebClient(key, phoneNumber);
        }
        return this.clients.get(key);
    }

    // Auto-reconnect existing WhatsApp connections
    async autoReconnectConnections() {
        try {
            console.log('🔄 ===== INICIANDO AUTO-RECONEXIÓN =====');
            
            const WhatsAppConnection = require('../models/WhatsAppConnection');
            const connections = await WhatsAppConnection.find({ 
                status: { $in: ['connected', 'connecting'] } 
            });
            
            console.log('📊 Conexiones encontradas para reconectar:', connections.length);
            
            for (const connection of connections) {
                try {
                    console.log(`🔄 Reconectando conexión: ${connection._id}`);
                    console.log(`📞 Teléfono: ${connection.phoneNumber}`);
                    console.log(`📊 Estado actual: ${connection.status}`);
                    
                    // Create WhatsApp client for this connection
                    await this.createWhatsAppWebClient(connection._id, connection.phoneNumber);
                    
                    console.log(`✅ Cliente creado para conexión: ${connection._id}`);
                } catch (error) {
                    console.error(`❌ Error reconectando conexión ${connection._id}:`, error.message);
                    this.logger.error('Error in auto-reconnection process', { 
                        connectionId: connection._id, 
                        error: error.message 
                    });
                }
            }
            
            console.log('==========================================');
        } catch (error) {
            console.error('❌ Error en proceso de auto-reconexión:', error);
            this.logger.error('Error in auto-reconnection process', { error: error.message });
        }
    }

    // Create WhatsApp Web client
    async createWhatsAppWebClient(connectionId, phoneNumber) {
        try {
            const key = this.normalizeId(connectionId);
            console.log('📱 ===== CREANDO CLIENTE WHATSAPP =====');
            console.log('📱 Connection ID:', key);
            console.log('📞 Phone Number:', phoneNumber);
            
            // Load whatsapp-web.js if not already loaded
            if (!Client || !LocalAuth) {
                const whatsappWeb = require('whatsapp-web.js');
                Client = whatsappWeb.Client;
                LocalAuth = whatsappWeb.LocalAuth;
                MessageMedia = whatsappWeb.MessageMedia;
                Buttons = whatsappWeb.Buttons;
                List = whatsappWeb.List;
            }

            // Solo en Raspberry Pi (producción) usar executablePath
            if (process.env.PLATFORM === 'raspberry') {
            puppeteerConfig.executablePath = '/usr/bin/chromium';
            }
            
            const client = new Client({
                authStrategy: new LocalAuth({ 
                    clientId: `whatsapp_${connectionId}`,
                    dataPath: `./sessions/${connectionId}`
                }),
                puppeteer: {
                    headless: true,
                    args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-extensions',
                    '--disable-gpu',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                    ]
                }
            });

            // Store client reference
            const normalizedId = this.normalizeId(connectionId);
            this.clients.set(normalizedId, client);

            // Set up event handlers
            client.on('qr', async (qr) => {
                console.log('📱 QR Code generado para conexión:', key);
                this.logger.info('QR Code generated for connection', { connectionId: key, phoneNumber });
            });

            client.on('ready', () => {
                console.log('✅ ===== WHATSAPP CLIENT READY =====');
                console.log('📱 Connection ID:', key);
                console.log('📞 Phone Number:', phoneNumber);
                console.log('🎯 Client Info:', client.info);
                console.log('💾 Session Path:', `./sessions/${key}`);
                console.log('====================================');
                this.logger.info('WhatsApp Web client ready', { connectionId: key, phoneNumber });
            });

            client.on('authenticated', () => {
                console.log('🔐 ===== WHATSAPP CLIENT AUTHENTICATED =====');
                console.log('📱 Connection ID:', key);
                console.log('📞 Phone Number:', phoneNumber);
                console.log('💾 Session saved to:', `./sessions/${key}`);
                console.log('==========================================');
                this.logger.info('WhatsApp Web client authenticated', { connectionId: key, phoneNumber });
            });

            client.on('auth_failure', (msg) => {
                console.error('❌ WhatsApp authentication failed:', msg);
                this.logger.error('WhatsApp Web authentication failed', { connectionId: key, phoneNumber, error: msg });
            });

            client.on('disconnected', (reason) => {
                console.warn('⚠️ WhatsApp client disconnected:', reason);
                this.logger.warn('WhatsApp Web client disconnected', { connectionId: key, phoneNumber, reason });
            });

            client.on('message', async (message) => {
                console.log('📨 Mensaje recibido en cliente:', key);
                await this.handleIncomingMessage(message, key);
            });

            // Initialize the client
            console.log('🚀 Inicializando cliente WhatsApp...');
            await client.initialize();
            
            console.log('✅ Cliente WhatsApp inicializado exitosamente');
            return client;

        } catch (error) {
            console.error('❌ Error creando cliente WhatsApp:', error);
            this.logger.error('Error creating WhatsApp Web client', { 
                connectionId, 
                phoneNumber, 
                error: error.message 
            });
            throw error;
        }
    }

    // Generate QR code for WhatsApp Web connection
    async generateQRCode(connectionId, phoneNumber) {
        try {
            this.logger.info('Generating QR code for WhatsApp connection', { connectionId, phoneNumber });
            
            // Load whatsapp-web.js if not already loaded
            if (!Client || !LocalAuth) {
                const whatsappWeb = require('whatsapp-web.js');
                Client = whatsappWeb.Client;
                LocalAuth = whatsappWeb.LocalAuth;
                MessageMedia = whatsappWeb.MessageMedia;
                Buttons = whatsappWeb.Buttons;
                List = whatsappWeb.List;
            }

            // Check if client already exists
            if (this.clients.has(connectionId)) {
                const existingClient = this.clients.get(connectionId);
                await existingClient.destroy();
                this.clients.delete(connectionId);
            }

            // Solo en Raspberry Pi (producción) usar executablePath
            if (process.env.PLATFORM === 'raspberry') {
            puppeteerConfig.executablePath = '/usr/bin/chromium';
            }

            // Create new WhatsApp Web client
            const client = new Client({
                authStrategy: new LocalAuth({ 
                    clientId: `whatsapp_${connectionId}`,
                    dataPath: `./sessions/${connectionId}`
                }),
                puppeteer: {
                    headless: true,
                    args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-extensions',
                    '--disable-gpu',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                    ]
                }
            });

            // Store client reference
            const normalizedId = this.normalizeId(connectionId);
            this.clients.set(normalizedId, client);

            // Set up event handlers
            client.on('qr', async (qr) => {
                this.logger.info('Real WhatsApp QR Code generated', { connectionId, phoneNumber });
                
                // Generate QR code as data URL
                const qrCodeDataURL = await QRCode.toDataURL(qr, {
                    errorCorrectionLevel: 'M',
                    type: 'image/png',
                    quality: 0.92,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    },
                    width: 256
                });

                // Emit event for frontend to display QR
                this.emit('qrGenerated', {
                    connectionId,
                    qrCodeDataURL,
                    phoneNumber,
                    expiresAt: Date.now() + (60 * 1000)
                });
            });

            client.on('ready', () => {
                this.logger.info('WhatsApp Web client ready', { connectionId, phoneNumber });
                this.emit('clientReady', { connectionId, phoneNumber });
            });

            client.on('authenticated', () => {
                this.logger.info('WhatsApp Web client authenticated', { connectionId, phoneNumber });
            });

            client.on('auth_failure', (msg) => {
                this.logger.error('WhatsApp Web authentication failed', { connectionId, phoneNumber, error: msg });
                this.emit('authFailure', { connectionId, phoneNumber, error: msg });
            });

            client.on('disconnected', (reason) => {
                this.logger.warn('WhatsApp Web client disconnected', { connectionId, phoneNumber, reason });
                this.emit('clientDisconnected', { connectionId, phoneNumber, reason });
            });

            client.on('message', async (message) => {
                await this.handleIncomingMessage(message, connectionId);
            });

            // Initialize the client
            await client.initialize();

            // Return a promise that resolves when QR is generated
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('QR code generation timeout'));
                }, 30000); // 30 seconds timeout

                client.on('qr', async (qr) => {
                    clearTimeout(timeout);
                    try {
                        const qrCodeDataURL = await QRCode.toDataURL(qr, {
                            errorCorrectionLevel: 'M',
                            type: 'image/png',
                            quality: 0.92,
                            margin: 1,
                            color: {
                                dark: '#000000',
                                light: '#FFFFFF'
                            },
                            width: 256
                        });
                        resolve(qrCodeDataURL);
                    } catch (error) {
                        reject(error);
                    }
                });

                client.on('auth_failure', (msg) => {
                    clearTimeout(timeout);
                    reject(new Error(`Authentication failed: ${msg}`));
                });
            });

        } catch (error) {
            this.logger.error('Failed to generate QR code', { 
                connectionId, 
                phoneNumber, 
                error: error.message 
            });
            throw error;
        }
    }

    // Setup automatic QR code refresh
    setupQRCodeRefresh(connectionId, phoneNumber) {
        // Clear any existing refresh timer
        if (this.refreshTimers && this.refreshTimers[connectionId]) {
            clearInterval(this.refreshTimers[connectionId]);
        }

        // Initialize refresh timers object if it doesn't exist
        if (!this.refreshTimers) {
            this.refreshTimers = {};
        }

        // Set up refresh every 50 seconds (before the 60-second expiry)
        this.refreshTimers[connectionId] = setInterval(async () => {
            try {
                this.logger.info('Refreshing QR code', { connectionId, phoneNumber });
                
                // Generate new QR code
                const newQRCodeDataURL = await this.generateQRCode(connectionId, phoneNumber);
                
                // Emit refresh event
                this.emit('qrRefreshed', {
                    connectionId,
                    qrCodeDataURL: newQRCodeDataURL,
                    phoneNumber,
                    expiresAt: Date.now() + (60 * 1000)
                });
                
            } catch (error) {
                this.logger.error('Failed to refresh QR code', { 
                    connectionId, 
                    phoneNumber, 
                    error: error.message 
                });
            }
        }, 50000); // 50 seconds
    }

    // Stop QR code refresh for a connection
    stopQRCodeRefresh(connectionId) {
        if (this.refreshTimers && this.refreshTimers[connectionId]) {
            clearInterval(this.refreshTimers[connectionId]);
            delete this.refreshTimers[connectionId];
            this.logger.info('QR code refresh stopped', { connectionId });
        }
    }

    // Handle incoming messages
    async handleIncomingMessage(message, connectionId) {
        try {
            const { from, body, timestamp } = message;
            
            // Detailed console logs for debugging
            console.log('📨 ===== MENSAJE WHATSAPP ENTRANTE =====');
            console.log('📱 Connection ID:', connectionId);
            console.log('📞 From:', from);
            console.log('💬 Message:', body);
            console.log('⏰ Timestamp:', timestamp);
            console.log('🆔 Message ID:', message.id._serialized);
            console.log('📊 Full Message Object:', JSON.stringify(message, null, 2));
            console.log('========================================');
            
            this.logger.info('Incoming WhatsApp message', { 
                connectionId, 
                from, 
                message: body?.substring(0, 50) + '...',
                timestamp 
            });

            // Emit event for controller to handle
            this.emit('messageReceived', {
                connectionId,
                from,
                message: body,
                timestamp,
                messageId: message.id._serialized
            });

        } catch (error) {
            console.error('❌ Error handling incoming message:', error);
            this.logger.error('Error handling incoming message', { 
                connectionId, 
                error: error.message 
            });
        }
    }

    // Send message via WhatsApp Web
    async sendMessage(connectionId, to, message) {
        try {
            const key = this.normalizeId(connectionId);
            console.log('🔍 ===== VERIFICANDO CLIENTE WHATSAPP =====');
            console.log('📱 Connection ID:', key);
            console.log('📊 Total clients:', this.clients.size);
            console.log('🔑 Client keys:', Array.from(this.clients.keys()));
            
            const client = this.clients.get(key);
            if (!client) {
                console.error('❌ Cliente no encontrado para connection:', key);
                throw new Error(`WhatsApp client not found for connection ${key}`);
            }
            
            console.log('✅ Cliente encontrado:', !!client);
            console.log('📱 Client info:', client.info ? 'Disponible' : 'No disponible');
            console.log('==========================================');

            // Format phone number properly
            let formattedNumber = to;
            
            // Remove + if present
            if (formattedNumber.startsWith('+')) {
                formattedNumber = formattedNumber.substring(1);
            }
            
            // Remove @c.us if already present to avoid double formatting
            if (formattedNumber.includes('@c.us')) {
                formattedNumber = formattedNumber.replace('@c.us', '');
            }
            
            // Add @c.us suffix
            formattedNumber = formattedNumber + '@c.us';
            
            console.log('📤 ===== ENVIANDO MENSAJE WHATSAPP =====');
            console.log('📱 Connection ID:', key);
            console.log('📞 To:', to);
            console.log('💬 Message:', message);
            console.log('🔢 Formatted Number:', formattedNumber);
            console.log('📱 Client State:', client.info ? 'Ready' : 'Not Ready');
            console.log('========================================');
            
            // Check if client is ready
            if (!client.info) {
                console.log('⏳ Cliente WhatsApp no está listo aún para connection:', key);
                console.log('📊 Estado del cliente:', {
                    hasClient: !!client,
                    hasInfo: !!client.info,
                    isReady: client.info ? 'Sí' : 'No'
                });
                throw new Error('WhatsApp client is not ready yet');
            }
            
            const result = await client.sendMessage(formattedNumber, message);
            
            console.log('✅ ===== MENSAJE ENVIADO EXITOSAMENTE =====');
            console.log('📱 Connection ID:', key);
            console.log('📞 To:', to);
            console.log('🆔 Message ID:', result.id._serialized);
            console.log('==========================================');
            
            this.logger.info('Message sent via WhatsApp Web', { 
                connectionId: key, 
                to, 
                messageId: result.id._serialized 
            });

            return {
                success: true,
                messageId: result.id._serialized,
                provider: 'whatsapp-web'
            };
        } catch (error) {
            this.logger.error('Failed to send message via WhatsApp Web', { 
                connectionId, 
                to, 
                error: error.message 
            });
            throw error;
        }
    }

    // Send quick reply buttons (WhatsApp interactive Buttons)
    async sendQuickReplies(connectionId, to, text, buttons) {
        try {
            const key = this.normalizeId(connectionId);
            const client = this.clients.get(key);
            if (!client) {
                throw new Error(`WhatsApp client not found for connection ${key}`);
            }
            if (!client.info) {
                throw new Error('WhatsApp client is not ready yet');
            }
            // Format number
            let formattedNumber = to;
            if (formattedNumber.startsWith('+')) formattedNumber = formattedNumber.substring(1);
            if (formattedNumber.includes('@c.us')) formattedNumber = formattedNumber.replace('@c.us', '');
            formattedNumber = formattedNumber + '@c.us';

            // Build Buttons payload
            const btns = (buttons || []).map(label => ({ body: String(label).slice(0, 20) }));
            // Ensure at least 1 and at most 3 buttons per WhatsApp constraints
            const btnSlice = btns.slice(0, 3);
            if (!Buttons) {
                const whatsappWeb = require('whatsapp-web.js');
                Buttons = whatsappWeb.Buttons;
            }
            const payload = new Buttons(text, btnSlice, '', '');
            const result = await client.sendMessage(formattedNumber, payload);
            this.logger.info('Quick replies sent via WhatsApp Web', { connectionId: key, to, messageId: result.id._serialized });
            return { success: true, messageId: result.id._serialized, provider: 'whatsapp-web' };
        } catch (error) {
            this.logger.error('Failed to send quick replies via WhatsApp Web', { connectionId, to, error: error.message });
            throw error;
        }
    }

    // Disconnect client
    async disconnectClient(connectionId) {
        try {
            this.logger.info('Disconnecting WhatsApp client', { connectionId });
            
            // Stop QR code refresh
            this.stopQRCodeRefresh(connectionId);
            
            // Disconnect WhatsApp Web client
            if (this.clients.has(connectionId)) {
                const client = this.clients.get(connectionId);
                await client.destroy();
                this.clients.delete(connectionId);
            }
            
            this.logger.info('WhatsApp client disconnected', { connectionId });
        } catch (error) {
            this.logger.error('Error disconnecting client', { 
                connectionId, 
                error: error.message 
            });
        }
    }

    // Get client status
    getClientStatus(connectionId) {
        const normalizedId = this.normalizeId(connectionId);
        return this.clients.has(normalizedId) ? 'connected' : 'disconnected';
    }

    // Get client instance
    getClient(connectionId) {
        const normalizedId = this.normalizeId(connectionId);
        return this.clients.get(normalizedId);
    }

    // Event emitter functionality
    emit(event, data) {
        if (this.eventHandlers && this.eventHandlers[event]) {
            this.eventHandlers[event](data);
        }
    }

    // Set event handlers
    setEventHandlers(handlers) {
        this.eventHandlers = handlers;
    }
}

module.exports = WhatsAppServiceSimple;
