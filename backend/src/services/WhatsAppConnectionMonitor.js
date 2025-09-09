const EventEmitter = require('events');
const LoggerService = require('./LoggerService');

class WhatsAppConnectionMonitor extends EventEmitter {
    constructor() {
        super();
        this.connections = new Map();
        this.monitoringInterval = null;
        this.isMonitoring = false;
        this.logger = new LoggerService('whatsapp-monitor');
    }

    // Iniciar monitoreo de conexiones
    startMonitoring(intervalMs = 30000) {
        if (this.isMonitoring) {
            this.logger.warn('El monitoreo ya está activo');
            return;
        }

        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.checkAllConnections();
        }, intervalMs);

        this.logger.info(`Monitoreo de conexiones iniciado (intervalo: ${intervalMs}ms)`);
        console.log('🔍 ===== MONITOREO DE CONEXIONES INICIADO =====');
    }

    // Detener monitoreo
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
        this.logger.info('Monitoreo de conexiones detenido');
        console.log('⏹️ Monitoreo de conexiones detenido');
    }

    // Registrar una conexión para monitoreo
    registerConnection(connectionId, connectionData) {
        this.connections.set(connectionId, {
            ...connectionData,
            lastChecked: new Date(),
            statusHistory: [],
            reconnectAttempts: 0,
            maxReconnectAttempts: 3
        });

        this.logger.info(`Conexión registrada para monitoreo: ${connectionId}`);
        console.log(`📱 Conexión registrada: ${connectionId}`);
    }

    // Desregistrar una conexión
    unregisterConnection(connectionId) {
        const removed = this.connections.delete(connectionId);
        if (removed) {
            this.logger.info(`Conexión desregistrada del monitoreo: ${connectionId}`);
            console.log(`📱 Conexión desregistrada: ${connectionId}`);
        }
    }

    // Verificar todas las conexiones
    async checkAllConnections() {
        try {
            console.log('🔍 Verificando estado de conexiones...');
            
            for (const [connectionId, connectionData] of this.connections) {
                await this.checkConnection(connectionId, connectionData);
            }

            this.emit('connectionsChecked', {
                totalConnections: this.connections.size,
                timestamp: new Date()
            });

        } catch (error) {
            this.logger.error('Error verificando conexiones:', error);
            console.error('❌ Error verificando conexiones:', error);
        }
    }

    // Verificar una conexión específica
    async checkConnection(connectionId, connectionData) {
        try {
            const WhatsAppConnection = require('../models/WhatsAppConnection');
            const connection = await WhatsAppConnection.findById(connectionId);

            if (!connection) {
                console.log(`⚠️ Conexión no encontrada en BD: ${connectionId}`);
                this.unregisterConnection(connectionId);
                return;
            }

            const previousStatus = connection.status;
            const previousIsConnected = connection.isConnected;

            // Verificar estado actual
            const currentStatus = await this.getConnectionStatus(connection);
            
            // Actualizar estado si cambió
            if (currentStatus.status !== previousStatus || currentStatus.isConnected !== previousIsConnected) {
                await this.updateConnectionStatus(connectionId, currentStatus);
                
                // Registrar cambio en historial
                this.recordStatusChange(connectionId, {
                    from: { status: previousStatus, isConnected: previousIsConnected },
                    to: { status: currentStatus.status, isConnected: currentStatus.isConnected },
                    timestamp: new Date()
                });

                // Emitir evento de cambio
                this.emit('connectionStatusChanged', {
                    connectionId,
                    previousStatus,
                    newStatus: currentStatus.status,
                    previousIsConnected,
                    newIsConnected: currentStatus.isConnected
                });

                console.log(`📊 Estado cambiado para ${connectionId}: ${previousStatus} → ${currentStatus.status}`);
            }

            // Actualizar datos de monitoreo
            connectionData.lastChecked = new Date();
            connectionData.lastStatus = currentStatus.status;

        } catch (error) {
            this.logger.error(`Error verificando conexión ${connectionId}:`, error);
            console.error(`❌ Error verificando conexión ${connectionId}:`, error);
        }
    }

    // Obtener estado actual de una conexión
    async getConnectionStatus(connection) {
        try {
            // Aquí implementarías la lógica para verificar el estado real
            // Por ahora, simularemos diferentes estados
            
            const now = new Date();
            const createdAt = new Date(connection.createdAt);
            const timeSinceCreation = now - createdAt;
            
            // Simular diferentes estados basados en el tiempo
            if (timeSinceCreation < 60000) { // Menos de 1 minuto
                return { status: 'connecting', isConnected: false };
            } else if (timeSinceCreation < 300000) { // Menos de 5 minutos
                return { status: 'connected', isConnected: true };
            } else {
                // Simular desconexión ocasional
                const random = Math.random();
                if (random < 0.1) { // 10% chance de desconexión
                    return { status: 'disconnected', isConnected: false };
                } else {
                    return { status: 'connected', isConnected: true };
                }
            }

        } catch (error) {
            return { status: 'error', isConnected: false };
        }
    }

    // Actualizar estado de conexión en la base de datos
    async updateConnectionStatus(connectionId, statusData) {
        try {
            const WhatsAppConnection = require('../models/WhatsAppConnection');
            
            await WhatsAppConnection.findByIdAndUpdate(connectionId, {
                status: statusData.status,
                isConnected: statusData.isConnected,
                lastStatusUpdate: new Date()
            });

            this.logger.info(`Estado actualizado para conexión ${connectionId}: ${statusData.status}`);
            
        } catch (error) {
            this.logger.error(`Error actualizando estado de conexión ${connectionId}:`, error);
        }
    }

    // Registrar cambio de estado en historial
    recordStatusChange(connectionId, changeData) {
        const connectionData = this.connections.get(connectionId);
        if (connectionData) {
            connectionData.statusHistory.push(changeData);
            
            // Mantener solo los últimos 10 cambios
            if (connectionData.statusHistory.length > 10) {
                connectionData.statusHistory.shift();
            }
        }
    }

    // Obtener estadísticas de monitoreo
    getMonitoringStats() {
        const stats = {
            totalConnections: this.connections.size,
            isMonitoring: this.isMonitoring,
            connections: {}
        };

        for (const [connectionId, connectionData] of this.connections) {
            stats.connections[connectionId] = {
                lastChecked: connectionData.lastChecked,
                lastStatus: connectionData.lastStatus,
                reconnectAttempts: connectionData.reconnectAttempts,
                statusHistoryLength: connectionData.statusHistory.length
            };
        }

        return stats;
    }

    // Obtener historial de una conexión
    getConnectionHistory(connectionId) {
        const connectionData = this.connections.get(connectionId);
        return connectionData ? connectionData.statusHistory : [];
    }

    // Forzar verificación de una conexión
    async forceCheckConnection(connectionId) {
        const connectionData = this.connections.get(connectionId);
        if (connectionData) {
            await this.checkConnection(connectionId, connectionData);
        }
    }
}

module.exports = WhatsAppConnectionMonitor;
