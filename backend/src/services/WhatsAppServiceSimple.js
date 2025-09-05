const QRCode = require('qrcode');
const LoggerService = require('./LoggerService');

// Lazy load whatsapp-web.js to avoid initialization issues
let Client, LocalAuth, MessageMedia;

class WhatsAppServiceSimple {
    constructor() {
        this.logger = new LoggerService('whatsapp-service-simple');
        this.provider = process.env.WHATSAPP_PROVIDER || 'whatsapp-web';
        this.clients = new Map();
        this.eventHandlers = {};
        
        this.logger.info('WhatsApp Simple Service initialized', { provider: this.provider });
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
            }

            // Check if client already exists
            if (this.clients.has(connectionId)) {
                const existingClient = this.clients.get(connectionId);
                await existingClient.destroy();
                this.clients.delete(connectionId);
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
    async sendMessage(connectionId, to, message) {
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
        return this.clients.has(connectionId) ? 'connected' : 'disconnected';
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
