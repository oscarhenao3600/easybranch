const mongoose = require('mongoose');

const conversationMemorySchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        index: true
    },
    branchId: {
        type: String,
        required: true,
        index: true
    },
    businessId: {
        type: String,
        required: true,
        index: true
    },
    clientInfo: {
        visitFrequency: {
            type: String,
            enum: ['first_time', 'occasional', 'regular', 'vip'],
            default: 'first_time'
        },
        favoriteItems: [String],
        dietaryRestrictions: [String],
        lastOrder: {
            orderId: String,
            items: [String],
            total: Number,
            date: Date
        },
        totalOrders: {
            type: Number,
            default: 0
        },
        totalSpent: {
            type: Number,
            default: 0
        }
    },
    currentContext: {
        conversationStage: {
            type: String,
            enum: ['greeting', 'browsing', 'ordering', 'customizing', 'confirming', 'asking_info', 'recommendation', 'complaint', 'cancellation'],
            default: 'greeting'
        },
        intent: String,
        mood: String,
        lastMessage: String,
        messageCount: {
            type: Number,
            default: 0
        },
        isWaitingForResponse: {
            type: Boolean,
            default: false
        },
        waitingFor: {
            type: String,
            enum: ['delivery_choice', 'delivery_address', 'order_confirmation', 'payment_method', 'other']
        },
        pendingOrder: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        }
    },
    emotionalState: {
        satisfaction: {
            type: Number,
            min: 1,
            max: 10,
            default: 5
        },
        trust: {
            type: Number,
            min: 1,
            max: 10,
            default: 5
        },
        engagement: {
            type: Number,
            min: 1,
            max: 10,
            default: 5
        }
    },
    conversationHistory: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        userMessage: String,
        botResponse: String,
        intent: String,
        sentiment: String,
        resolved: {
            type: Boolean,
            default: true
        },
        metadata: {
            messageId: String,
            processingTime: Number,
            confidence: Number
        }
    }],
    preferences: {
        language: {
            type: String,
            default: 'es'
        },
        communicationStyle: {
            type: String,
            enum: ['formal', 'casual', 'friendly'],
            default: 'friendly'
        },
        responseSpeed: {
            type: String,
            enum: ['fast', 'normal', 'detailed'],
            default: 'normal'
        }
    },
    tags: [String], // Para etiquetar conversaciones especiales
    isActive: {
        type: Boolean,
        default: true
    },
    lastInteraction: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Índices para mejor rendimiento
conversationMemorySchema.index({ phoneNumber: 1, branchId: 1, businessId: 1 });
conversationMemorySchema.index({ lastInteraction: -1 });
conversationMemorySchema.index({ 'currentContext.conversationStage': 1 });
conversationMemorySchema.index({ isActive: 1 });

// Métodos estáticos
conversationMemorySchema.statics.getActiveConversations = function(branchId, limit = 50) {
    return this.find({
        branchId,
        isActive: true
    })
    .sort({ lastInteraction: -1 })
    .limit(limit)
    .select('phoneNumber clientInfo currentContext emotionalState lastInteraction');
};

conversationMemorySchema.statics.getConversationStats = function(branchId, startDate, endDate) {
    const matchStage = {
        branchId,
        isActive: true
    };

    if (startDate || endDate) {
        matchStage.lastInteraction = {};
        if (startDate) matchStage.lastInteraction.$gte = new Date(startDate);
        if (endDate) matchStage.lastInteraction.$lte = new Date(endDate);
    }

    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalConversations: { $sum: 1 },
                newClients: {
                    $sum: {
                        $cond: [{ $eq: ['$clientInfo.visitFrequency', 'first_time'] }, 1, 0]
                    }
                },
                regularClients: {
                    $sum: {
                        $cond: [{ $eq: ['$clientInfo.visitFrequency', 'regular'] }, 1, 0]
                    }
                },
                avgSatisfaction: { $avg: '$emotionalState.satisfaction' },
                avgTrust: { $avg: '$emotionalState.trust' },
                avgEngagement: { $avg: '$emotionalState.engagement' },
                totalMessages: { $sum: '$currentContext.messageCount' }
            }
        }
    ]);
};

// Métodos de instancia
conversationMemorySchema.methods.addToHistory = function(userMessage, botResponse, intent, sentiment, metadata = {}) {
    this.conversationHistory.push({
        userMessage,
        botResponse,
        intent,
        sentiment,
        metadata
    });

    // Mantener solo los últimos 100 mensajes para evitar que el documento crezca demasiado
    if (this.conversationHistory.length > 100) {
        this.conversationHistory = this.conversationHistory.slice(-100);
    }

    this.currentContext.messageCount += 1;
    this.lastInteraction = new Date();
};

conversationMemorySchema.methods.updateEmotionalState = function(sentiment, intent) {
    const emotionalImpact = {
        happy: { satisfaction: 1, trust: 1, engagement: 1 },
        neutral: { satisfaction: 0, trust: 0, engagement: 0 },
        confused: { satisfaction: -1, trust: 0, engagement: 1 },
        concerned: { satisfaction: -2, trust: -1, engagement: 1 },
        excited: { satisfaction: 2, trust: 1, engagement: 2 },
        frustrated: { satisfaction: -3, trust: -2, engagement: -1 }
    };

    const impact = emotionalImpact[sentiment] || emotionalImpact.neutral;

    // Aplicar impacto
    this.emotionalState.satisfaction = Math.max(1, Math.min(10, 
        this.emotionalState.satisfaction + impact.satisfaction));
    this.emotionalState.trust = Math.max(1, Math.min(10, 
        this.emotionalState.trust + impact.trust));
    this.emotionalState.engagement = Math.max(1, Math.min(10, 
        this.emotionalState.engagement + impact.engagement));

    // Bonificación por intenciones positivas
    if (['order', 'recommendation', 'confirmation'].includes(intent)) {
        this.emotionalState.satisfaction = Math.min(10, this.emotionalState.satisfaction + 1);
        this.emotionalState.trust = Math.min(10, this.emotionalState.trust + 1);
    }
};

conversationMemorySchema.methods.getRecentHistory = function(limit = 10) {
    return this.conversationHistory.slice(-limit);
};

conversationMemorySchema.methods.clearPendingOrder = function() {
    this.currentContext.pendingOrder = null;
    this.currentContext.isWaitingForResponse = false;
    this.currentContext.waitingFor = null;
};

module.exports = mongoose.model('ConversationMemory', conversationMemorySchema);