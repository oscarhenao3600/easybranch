const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const ConversationMemory = require('../models/ConversationMemory');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const Branch = require('../models/Branch');

// Obtener conversaciones activas
router.get('/active', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), async (req, res) => {
    try {
        const { branchId, limit = 50 } = req.query;
        
        if (!branchId) {
            return res.status(400).json({
                success: false,
                error: 'branchId es requerido'
            });
        }

        const conversations = await ConversationMemory.getActiveConversations(branchId, parseInt(limit));
        
        res.json({
            success: true,
            data: conversations,
            count: conversations.length
        });
    } catch (error) {
        console.error('Error getting active conversations:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener conversaciones activas'
        });
    }
});

// Obtener historial de conversación de un cliente específico
router.get('/history/:phoneNumber', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), async (req, res) => {
    try {
        const { phoneNumber } = req.params;
        const { branchId, limit = 50 } = req.query;
        
        if (!branchId) {
            return res.status(400).json({
                success: false,
                error: 'branchId es requerido'
            });
        }

        const messages = await WhatsAppMessage.getConversationHistory(phoneNumber, branchId, parseInt(limit));
        const memory = await ConversationMemory.findOne({
            phoneNumber,
            branchId: String(branchId)
        });

        res.json({
            success: true,
            data: {
                messages: messages.reverse(), // Mostrar en orden cronológico
                memory: memory ? {
                    clientInfo: memory.clientInfo,
                    currentContext: memory.currentContext,
                    emotionalState: memory.emotionalState,
                    preferences: memory.preferences,
                    tags: memory.tags,
                    lastInteraction: memory.lastInteraction
                } : null,
                phoneNumber,
                branchId
            }
        });
    } catch (error) {
        console.error('Error getting conversation history:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener historial de conversación'
        });
    }
});

// Obtener historial de conversación por pedido
router.get('/history-by-order/:orderId', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), async (req, res) => {
    try {
        const { orderId } = req.params;
        const { branchId, phoneNumber, limit = 100 } = req.query;

        if (!branchId || !orderId) {
            return res.status(400).json({
                success: false,
                error: 'orderId y branchId son requeridos'
            });
        }

        const messages = await WhatsAppMessage.getConversationHistoryByOrder(orderId, String(branchId), phoneNumber || null, parseInt(limit));

        res.json({
            success: true,
            data: {
                messages: messages.reverse(),
                orderId,
                branchId,
                phoneNumber: phoneNumber || null
            }
        });
    } catch (error) {
        console.error('Error getting conversation history by order:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener historial de conversación por pedido'
        });
    }
});

// Obtener estadísticas de conversaciones
router.get('/stats', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), async (req, res) => {
    try {
        const { branchId, startDate, endDate } = req.query;
        
        if (!branchId) {
            return res.status(400).json({
                success: false,
                error: 'branchId es requerido'
            });
        }

        const [memoryStats, messageStats] = await Promise.all([
            ConversationMemory.getConversationStats(branchId, startDate, endDate),
            WhatsAppMessage.getConversationStats(branchId, startDate, endDate)
        ]);

        const popularIntents = await WhatsAppMessage.getPopularIntents(branchId, startDate, endDate, 10);
        const sentimentAnalysis = await WhatsAppMessage.getSentimentAnalysis(branchId, startDate, endDate);

        res.json({
            success: true,
            data: {
                memory: memoryStats[0] || {},
                messages: messageStats[0] || {},
                popularIntents,
                sentimentAnalysis
            }
        });
    } catch (error) {
        console.error('Error getting conversation stats:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas de conversación'
        });
    }
});

// Obtener mensajes por intención
router.get('/messages/by-intent', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), async (req, res) => {
    try {
        const { intent, branchId, startDate, endDate, limit = 50 } = req.query;
        
        if (!intent || !branchId) {
            return res.status(400).json({
                success: false,
                error: 'intent y branchId son requeridos'
            });
        }

        const messages = await WhatsAppMessage.getMessagesByIntent(intent, branchId, startDate, endDate);
        const limitedMessages = messages.slice(0, parseInt(limit));

        res.json({
            success: true,
            data: {
                messages: limitedMessages,
                intent,
                totalCount: messages.length,
                returnedCount: limitedMessages.length
            }
        });
    } catch (error) {
        console.error('Error getting messages by intent:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener mensajes por intención'
        });
    }
});

// Obtener resumen de conversaciones por sucursal
router.get('/branch-summary', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), async (req, res) => {
    try {
        const { businessId, startDate, endDate } = req.query;
        
        if (!businessId) {
            return res.status(400).json({
                success: false,
                error: 'businessId es requerido'
            });
        }

        // Obtener todas las sucursales del negocio
        const branches = await Branch.find({ businessId }).select('branchId name');
        
        const branchSummaries = await Promise.all(
            branches.map(async (branch) => {
                const [memoryStats, messageStats] = await Promise.all([
                    ConversationMemory.getConversationStats(branch.branchId, startDate, endDate),
                    WhatsAppMessage.getConversationStats(branch.branchId, startDate, endDate)
                ]);

                return {
                    branchId: branch.branchId,
                    branchName: branch.name,
                    memory: memoryStats[0] || {},
                    messages: messageStats[0] || {}
                };
            })
        );

        res.json({
            success: true,
            data: {
                branches: branchSummaries,
                totalBranches: branches.length
            }
        });
    } catch (error) {
        console.error('Error getting branch conversation summary:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener resumen de conversaciones por sucursal'
        });
    }
});

// Actualizar etiquetas de una conversación
router.put('/memory/:phoneNumber/tags', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), async (req, res) => {
    try {
        const { phoneNumber } = req.params;
        const { branchId, tags } = req.body;
        
        if (!branchId) {
            return res.status(400).json({
                success: false,
                error: 'branchId es requerido'
            });
        }

        const memory = await ConversationMemory.findOne({
            phoneNumber,
            branchId: String(branchId)
        });

        if (!memory) {
            return res.status(404).json({
                success: false,
                error: 'Memoria de conversación no encontrada'
            });
        }

        memory.tags = tags || [];
        await memory.save();

        res.json({
            success: true,
            data: {
                phoneNumber,
                branchId,
                tags: memory.tags
            },
            message: 'Etiquetas actualizadas exitosamente'
        });
    } catch (error) {
        console.error('Error updating conversation tags:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar etiquetas de conversación'
        });
    }
});

// Actualizar preferencias de un cliente
router.put('/memory/:phoneNumber/preferences', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), async (req, res) => {
    try {
        const { phoneNumber } = req.params;
        const { branchId, preferences } = req.body;
        
        if (!branchId) {
            return res.status(400).json({
                success: false,
                error: 'branchId es requerido'
            });
        }

        const memory = await ConversationMemory.findOne({
            phoneNumber,
            branchId: String(branchId)
        });

        if (!memory) {
            return res.status(404).json({
                success: false,
                error: 'Memoria de conversación no encontrada'
            });
        }

        // Actualizar preferencias
        if (preferences.language) {
            memory.preferences.language = preferences.language;
        }
        if (preferences.communicationStyle) {
            memory.preferences.communicationStyle = preferences.communicationStyle;
        }
        if (preferences.responseSpeed) {
            memory.preferences.responseSpeed = preferences.responseSpeed;
        }

        await memory.save();

        res.json({
            success: true,
            data: {
                phoneNumber,
                branchId,
                preferences: memory.preferences
            },
            message: 'Preferencias actualizadas exitosamente'
        });
    } catch (error) {
        console.error('Error updating client preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar preferencias del cliente'
        });
    }
});

// Marcar conversación como inactiva
router.put('/memory/:phoneNumber/deactivate', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), async (req, res) => {
    try {
        const { phoneNumber } = req.params;
        const { branchId } = req.body;
        
        if (!branchId) {
            return res.status(400).json({
                success: false,
                error: 'branchId es requerido'
            });
        }

        const memory = await ConversationMemory.findOne({
            phoneNumber,
            branchId: String(branchId)
        });

        if (!memory) {
            return res.status(404).json({
                success: false,
                error: 'Memoria de conversación no encontrada'
            });
        }

        memory.isActive = false;
        await memory.save();

        res.json({
            success: true,
            message: 'Conversación marcada como inactiva'
        });
    } catch (error) {
        console.error('Error deactivating conversation:', error);
        res.status(500).json({
            success: false,
            error: 'Error al desactivar conversación'
        });
    }
});

module.exports = router;
