const QRCode = require('qrcode');
const EventEmitter = require('events');
const LoggerService = require('./LoggerService');

class WhatsAppQRManager extends EventEmitter {
    constructor(whatsappService = null) {
        super();
        this.whatsappService = whatsappService;
        this.qrCodes = new Map(); // connectionId -> qrData
        this.qrExpiryTimes = new Map(); // connectionId -> expiryTime
        this.refreshIntervals = new Map(); // connectionId -> intervalId
        this.qrExpiryDuration = 5 * 60 * 1000; // 5 minutos
        this.refreshInterval = 1 * 60 * 1000; // 1 minuto (refrescar cada minuto)
        this.logger = new LoggerService('whatsapp-qr-manager');
    }

    // Establecer el servicio de WhatsApp
    setWhatsAppService(whatsappService) {
        this.whatsappService = whatsappService;
        this.logger.info('WhatsApp service set in QR Manager');
    }

    // Generar nuevo QR code para una conexión
    async generateQRCode(connectionId, connectionData) {
        try {
            console.log('📱 ===== GENERANDO QR CODE REAL DE WHATSAPP =====');
            console.log('🔗 Connection ID:', connectionId);
            console.log('📞 Phone:', connectionData.phoneNumber);
            console.log('🏪 Branch:', connectionData.branchName);
            console.log('===============================================');

            let qrCodeDataURL = null;
            let expiresAt = new Date(Date.now() + this.qrExpiryDuration);

            // Si tenemos el servicio de WhatsApp, usar la API real
            if (this.whatsappService) {
                try {
                    console.log('🔄 Generando QR Code usando WhatsAppService...');
                    
                    // Usar el método generateQRCode del WhatsAppService
                    const qrCodeDataURL = await this.whatsappService.generateQRCode(connectionId, connectionData.phoneNumber);
                    
                    if (qrCodeDataURL) {
                        expiresAt = new Date(Date.now() + this.qrExpiryDuration);
                        
                        // Guardar QR code
                        this.qrCodes.set(connectionId, {
                            qrString: 'real-whatsapp-qr',
                            imageDataURL: qrCodeDataURL,
                            generatedAt: new Date(),
                            expiresAt: expiresAt,
                            isReal: true
                        });

                        // Programar expiración y refresh
                        this.scheduleQRExpiry(connectionId);
                        this.scheduleQRRefresh(connectionId);

                        console.log('✅ QR Code real generado exitosamente');
                        
                        // Emitir evento
                        this.emit('qrGenerated', {
                            connectionId,
                            qrCodeDataURL,
                            expiresAt: expiresAt,
                            connectionData,
                            isReal: true
                        });

                        return {
                            success: true,
                            qrCodeDataURL,
                            expiresAt,
                            connectionData,
                            isReal: true
                        };
                    }
                } catch (error) {
                    console.error('❌ Error generando QR code real:', error);
                }
            }

            // Fallback: generar QR code de prueba si no hay servicio real
            console.log('⚠️ Usando QR code de prueba (servicio WhatsApp no disponible)');
            const testQRData = {
                connectionId,
                phoneNumber: connectionData.phoneNumber,
                branchName: connectionData.branchName,
                businessName: connectionData.businessName,
                timestamp: new Date(),
                expiresAt: expiresAt,
                type: 'test'
            };

            qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(testQRData), {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            // Guardar QR code de prueba
            this.qrCodes.set(connectionId, {
                qrString: JSON.stringify(testQRData),
                imageDataURL: qrCodeDataURL,
                generatedAt: new Date(),
                expiresAt: expiresAt,
                isTest: true
            });

            // Programar expiración y refresh
            this.scheduleQRExpiry(connectionId);
            this.scheduleQRRefresh(connectionId);

            this.logger.info(`QR Code de prueba generado para conexión ${connectionId}`);
            console.log('✅ QR Code de prueba generado exitosamente');

            // Emitir evento
            this.emit('qrGenerated', {
                connectionId,
                qrCodeDataURL,
                expiresAt: expiresAt,
                connectionData,
                isTest: true
            });

            return {
                success: true,
                qrCodeDataURL,
                expiresAt,
                connectionData,
                isTest: true
            };

        } catch (error) {
            this.logger.error(`Error generando QR code para conexión ${connectionId}:`, error);
            console.error('❌ Error generando QR code:', error);
            
            this.emit('qrError', {
                connectionId,
                error: error.message
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    // Crear imagen QR code
    async createQRCodeImage(qrData) {
        try {
            // Crear string de datos para el QR
            const qrString = JSON.stringify({
                connectionId: qrData.connectionId,
                phone: qrData.phoneNumber,
                branch: qrData.branchName,
                timestamp: qrData.timestamp.getTime()
            });

            // Generar QR code como data URL
            const qrCodeDataURL = await QRCode.toDataURL(qrString, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                width: 256
            });

            return qrCodeDataURL;

        } catch (error) {
            this.logger.error('Error creando imagen QR:', error);
            throw error;
        }
    }

    // Programar expiración del QR
    scheduleQRExpiry(connectionId) {
        // Limpiar timeout anterior si existe
        if (this.qrExpiryTimes.has(connectionId)) {
            clearTimeout(this.qrExpiryTimes.get(connectionId));
        }

        const expiryTimeout = setTimeout(() => {
            this.expireQRCode(connectionId);
        }, this.qrExpiryDuration);

        this.qrExpiryTimes.set(connectionId, expiryTimeout);
    }

    // Programar refresh automático del QR
    scheduleQRRefresh(connectionId) {
        // Limpiar intervalo anterior si existe
        if (this.refreshIntervals.has(connectionId)) {
            clearInterval(this.refreshIntervals.get(connectionId));
        }

        const refreshInterval = setInterval(async () => {
            await this.refreshQRCode(connectionId);
        }, this.refreshInterval);

        this.refreshIntervals.set(connectionId, refreshInterval);
    }

    // Refrescar QR code
    async refreshQRCode(connectionId) {
        try {
            const qrData = this.qrCodes.get(connectionId);
            if (!qrData) {
                console.log(`⚠️ No hay QR data para refrescar: ${connectionId}`);
                return;
            }

            console.log(`🔄 Refrescando QR Code para conexión: ${connectionId}`);

            // Generar nuevo QR
            const newQRData = {
                ...qrData.data,
                timestamp: new Date(),
                expiresAt: new Date(Date.now() + this.qrExpiryDuration)
            };

            const newQRCodeDataURL = await this.createQRCodeImage(newQRData);

            // Actualizar datos
            this.qrCodes.set(connectionId, {
                data: newQRData,
                imageDataURL: newQRCodeDataURL,
                generatedAt: new Date(),
                expiresAt: newQRData.expiresAt
            });

            // Reprogramar expiración
            this.scheduleQRExpiry(connectionId);

            this.logger.info(`QR Code refrescado para conexión ${connectionId}`);
            console.log('✅ QR Code refrescado exitosamente');

            // Emitir evento
            this.emit('qrRefreshed', {
                connectionId,
                qrCodeDataURL: newQRCodeDataURL,
                expiresAt: newQRData.expiresAt
            });

        } catch (error) {
            this.logger.error(`Error refrescando QR Code ${connectionId}:`, error);
            console.error(`❌ Error refrescando QR Code: ${error.message}`);
        }
    }

    // Expirar QR code
    expireQRCode(connectionId) {
        try {
            console.log(`⏰ QR Code expirado para conexión: ${connectionId}`);

            // Limpiar datos
            this.qrCodes.delete(connectionId);
            this.qrExpiryTimes.delete(connectionId);
            
            // Limpiar intervalo de refresh
            if (this.refreshIntervals.has(connectionId)) {
                clearInterval(this.refreshIntervals.get(connectionId));
                this.refreshIntervals.delete(connectionId);
            }

            this.logger.info(`QR Code expirado para conexión ${connectionId}`);

            // Emitir evento
            this.emit('qrExpired', {
                connectionId,
                timestamp: new Date()
            });

        } catch (error) {
            this.logger.error(`Error expirando QR Code ${connectionId}:`, error);
        }
    }

    // Obtener QR code actual
    getQRCode(connectionId) {
        const qrData = this.qrCodes.get(connectionId);
        if (!qrData) {
            return null;
        }

        return {
            qrCodeDataURL: qrData.imageDataURL,
            expiresAt: qrData.expiresAt,
            generatedAt: qrData.generatedAt,
            isExpired: new Date() > qrData.expiresAt
        };
    }

    // Verificar si QR code está expirado
    isQRCodeExpired(connectionId) {
        const qrData = this.qrCodes.get(connectionId);
        if (!qrData) {
            return true;
        }

        return new Date() > qrData.expiresAt;
    }

    // Limpiar QR code manualmente
    clearQRCode(connectionId) {
        try {
            console.log(`🗑️ Limpiando QR Code para conexión: ${connectionId}`);

            // Limpiar timeout de expiración
            if (this.qrExpiryTimes.has(connectionId)) {
                clearTimeout(this.qrExpiryTimes.get(connectionId));
                this.qrExpiryTimes.delete(connectionId);
            }

            // Limpiar intervalo de refresh
            if (this.refreshIntervals.has(connectionId)) {
                clearInterval(this.refreshIntervals.get(connectionId));
                this.refreshIntervals.delete(connectionId);
            }

            // Limpiar datos
            this.qrCodes.delete(connectionId);

            this.logger.info(`QR Code limpiado para conexión ${connectionId}`);
            console.log('✅ QR Code limpiado exitosamente');

        } catch (error) {
            this.logger.error(`Error limpiando QR Code ${connectionId}:`, error);
        }
    }

    // Limpiar todos los QR codes
    clearAllQRCodes() {
        try {
            console.log('🗑️ Limpiando todos los QR Codes...');

            // Limpiar todos los timeouts
            for (const timeout of this.qrExpiryTimes.values()) {
                clearTimeout(timeout);
            }

            // Limpiar todos los intervalos
            for (const interval of this.refreshIntervals.values()) {
                clearInterval(interval);
            }

            // Limpiar todos los datos
            this.qrCodes.clear();
            this.qrExpiryTimes.clear();
            this.refreshIntervals.clear();

            this.logger.info('Todos los QR Codes limpiados');
            console.log('✅ Todos los QR Codes limpiados exitosamente');

        } catch (error) {
            this.logger.error('Error limpiando todos los QR Codes:', error);
        }
    }

    // Obtener estadísticas de QR codes
    getQRStats() {
        const stats = {
            totalQRCodes: this.qrCodes.size,
            activeRefreshIntervals: this.refreshIntervals.size,
            activeExpiryTimers: this.qrExpiryTimes.size,
            qrCodes: {}
        };

        for (const [connectionId, qrData] of this.qrCodes) {
            stats.qrCodes[connectionId] = {
                generatedAt: qrData.generatedAt,
                expiresAt: qrData.expiresAt,
                isExpired: new Date() > qrData.expiresAt,
                timeUntilExpiry: qrData.expiresAt - new Date()
            };
        }

        return stats;
    }

    // Obtener QR codes próximos a expirar
    getExpiringQRCodes(minutesThreshold = 2) {
        const expiringQRCodes = [];
        const threshold = minutesThreshold * 60 * 1000; // Convertir a milisegundos

        for (const [connectionId, qrData] of this.qrCodes) {
            const timeUntilExpiry = qrData.expiresAt - new Date();
            if (timeUntilExpiry <= threshold && timeUntilExpiry > 0) {
                expiringQRCodes.push({
                    connectionId,
                    expiresAt: qrData.expiresAt,
                    timeUntilExpiry
                });
            }
        }

        return expiringQRCodes;
    }
}

module.exports = WhatsAppQRManager;
