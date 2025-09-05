// Lazy loading para evitar problemas de inicialización
let Client, LocalAuth, MessageMedia;
let twilio;
const QRCode = require('qrcode');
const LoggerService = require('./LoggerService');

class WhatsAppService {
    constructor() {
        this.logger = new LoggerService('whatsapp-service');
        this.provider = process.env.WHATSAPP_PROVIDER || 'whatsapp-web'; // 'whatsapp-web' or 'twilio'
        this.clients = new Map(); // Store multiple WhatsApp clients
        this.twilioClient = null;
        this.initialized = false;
        
        // Initialize provider asynchronously to avoid blocking server startup
        this.initializeProvider().catch(error => {
            this.logger.error('Failed to initialize WhatsApp provider', { error: error.message });
        });
    }

    async initializeProvider() {
        try {
            if (this.provider === 'twilio') {
                await this.initializeTwilio();
            } else {
                await this.initializeWhatsAppWeb();
            }
            this.initialized = true;
            this.logger.info('WhatsApp provider initialized successfully', { provider: this.provider });
        } catch (error) {
            this.logger.error('Failed to initialize WhatsApp provider', { error: error.message });
            throw error;
        }
    }

    // Initialize WhatsApp Web.js for development
    async initializeWhatsAppWeb() {
        try {
            this.logger.info('Initializing WhatsApp Web.js for development');
            
            // Lazy load whatsapp-web.js
            const whatsappWeb = require('whatsapp-web.js');
            Client = whatsappWeb.Client;
            LocalAuth = whatsappWeb.LocalAuth;
            MessageMedia = whatsappWeb.MessageMedia;
            
            this.logger.info('WhatsApp Web.js loaded successfully');
        } catch (error) {
            this.logger.error('Failed to load WhatsApp Web.js', { error: error.message });
            throw error;
        }
    }

    // Initialize Twilio for production
    async initializeTwilio() {
        try {
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            
            if (!accountSid || !authToken) {
                throw new Error('Twilio credentials not found in environment variables');
            }

            // Lazy load Twilio
            twilio = require('twilio');
            this.twilioClient = twilio(accountSid, authToken);
            this.logger.info('Twilio WhatsApp client initialized for production');
        } catch (error) {
            this.logger.error('Failed to initialize Twilio', { error: error.message });
            throw error;
        }
    }

    // Create a new WhatsApp Web client for a specific connection
    async createWhatsAppWebClient(connectionId, phoneNumber) {
        try {
            // Ensure WhatsApp Web.js is loaded
            if (!Client || !LocalAuth) {
                await this.initializeWhatsAppWeb();
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
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu'
                    ]
                }
            });

            // Store client reference
            this.clients.set(connectionId, client);

            // Set up event handlers
            client.on('qr', async (qr) => {
                this.logger.info('QR Code generated for connection', { connectionId, phoneNumber });
                
                // Generate QR code as data URL
                const qrCodeDataURL = await QRCode.toDataURL(qr, {
                    errorCorrectionLevel: 'M',
                    type: 'image/png',
                    quality: 0.92,
                    margin: 1,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });

                // Emit event for frontend to display QR
                this.emit('qrGenerated', { connectionId, qrCodeDataURL, phoneNumber });
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

            return client;
        } catch (error) {
            this.logger.error('Failed to create WhatsApp Web client', { 
                connectionId, 
                phoneNumber, 
                error: error.message 
            });
            throw error;
        }
    }

    // Handle incoming messages
    async handleIncomingMessage(message, connectionId) {
        try {
            const { from, body, timestamp } = message;
            
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
            this.logger.error('Error handling incoming message', { 
                connectionId, 
                error: error.message 
            });
        }
    }

    // Send message via WhatsApp Web
    async sendMessageWhatsAppWeb(connectionId, to, message) {
        try {
            const client = this.clients.get(connectionId);
            if (!client) {
                throw new Error(`WhatsApp client not found for connection ${connectionId}`);
            }

            // Format phone number (remove + and add @c.us)
            const formattedNumber = to.replace('+', '') + '@c.us';
            
            const result = await client.sendMessage(formattedNumber, message);
            
            this.logger.info('Message sent via WhatsApp Web', { 
                connectionId, 
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

    // Send message via Twilio
    async sendMessageTwilio(to, message, mediaUrl = null) {
        try {
            if (!this.twilioClient) {
                throw new Error('Twilio client not initialized');
            }

            const messageData = {
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
                to: `whatsapp:${to}`,
                body: message
            };

            if (mediaUrl) {
                messageData.mediaUrl = [mediaUrl];
            }

            const result = await this.twilioClient.messages.create(messageData);
            
            this.logger.info('Message sent via Twilio', { 
                to, 
                messageId: result.sid,
                provider: 'twilio'
            });

            return {
                success: true,
                messageId: result.sid,
                provider: 'twilio'
            };
        } catch (error) {
            this.logger.error('Failed to send message via Twilio', { 
                to, 
                error: error.message 
            });
            throw error;
        }
    }

    // Main send message method (routes to appropriate provider)
    async sendMessage(connectionId, to, message, mediaUrl = null) {
        try {
            if (this.provider === 'twilio') {
                return await this.sendMessageTwilio(to, message, mediaUrl);
            } else {
                return await this.sendMessageWhatsAppWeb(connectionId, to, message);
            }
        } catch (error) {
            this.logger.error('Failed to send message', { 
                connectionId, 
                to, 
                provider: this.provider,
                error: error.message 
            });
            throw error;
        }
    }

    // Generate QR code for WhatsApp Web connection
    async generateQRCode(connectionId, phoneNumber) {
        try {
            if (this.provider !== 'whatsapp-web') {
                throw new Error('QR code generation only available for WhatsApp Web provider');
            }

            const client = await this.createWhatsAppWebClient(connectionId, phoneNumber);
            
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
                            }
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

    // Disconnect WhatsApp Web client
    async disconnectClient(connectionId) {
        try {
            const client = this.clients.get(connectionId);
            if (client) {
                await client.destroy();
                this.clients.delete(connectionId);
                this.logger.info('WhatsApp Web client disconnected', { connectionId });
            }
        } catch (error) {
            this.logger.error('Error disconnecting client', { 
                connectionId, 
                error: error.message 
            });
        }
    }

    // Get client status
    getClientStatus(connectionId) {
        const client = this.clients.get(connectionId);
        if (!client) {
            return 'not_initialized';
        }
        
        return client.info ? 'ready' : 'initializing';
    }

    // Event emitter functionality
    emit(event, data) {
        // This will be handled by the controller
        if (this.eventHandlers && this.eventHandlers[event]) {
            this.eventHandlers[event](data);
        }
    }

    // Set event handlers
    setEventHandlers(handlers) {
        this.eventHandlers = handlers;
    }
}

module.exports = WhatsAppService;