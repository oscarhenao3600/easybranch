const mongoose = require('mongoose');

const whatsAppMessageSchema = new mongoose.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true
    },
    connectionId: {
        type: String,
        required: true,
        index: true
    },
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
    direction: {
        type: String,
        enum: ['incoming', 'outgoing'],
        required: true
    },
    content: {
        text: String,
        mediaType: {
            type: String,
            enum: ['text', 'image', 'audio', 'video', 'document', 'sticker', 'location']
        },
        mediaUrl: String,
        caption: String
    },
    messageType: {
        type: String,
        enum: ['user_message', 'bot_response', 'system_notification', 'order_confirmation', 'recommendation', 'menu_sent', 'status_update'],
        default: 'user_message'
    },
    processing: {
        intent: String,
        sentiment: String,
        confidence: Number,
        processingTime: Number,
        aiModel: String,
        conversationStage: String
    },
    context: {
        isWaitingForResponse: Boolean,
        waitingFor: String,
        sessionId: String,
        orderId: String,
        recommendationId: String
    },
    metadata: {
        whatsappMessageId: String,
        timestamp: Date,
        deliveryStatus: {
            type: String,
            enum: ['sent', 'delivered', 'read', 'failed'],
            default: 'sent'
        },
        readAt: Date,
        userAgent: String,
        location: {
            lat: Number,
            lng: Number,
            address: String
        }
    },
    tags: [String],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Índices para mejor rendimiento
whatsAppMessageSchema.index({ messageId: 1 });
whatsAppMessageSchema.index({ phoneNumber: 1, createdAt: -1 });
whatsAppMessageSchema.index({ connectionId: 1, createdAt: -1 });
whatsAppMessageSchema.index({ branchId: 1, createdAt: -1 });
whatsAppMessageSchema.index({ 'processing.intent': 1 });
whatsAppMessageSchema.index({ 'processing.sentiment': 1 });
whatsAppMessageSchema.index({ direction: 1 });
whatsAppMessageSchema.index({ 'context.orderId': 1 });
whatsAppMessageSchema.index({ 'context.sessionId': 1 });

// Métodos estáticos
whatsAppMessageSchema.statics.getConversationHistory = function(phoneNumber, branchId, limit = 50) {
    return this.find({
        phoneNumber,
        branchId,
        isActive: true
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('direction content messageType processing context metadata createdAt');
};

// Historial por pedido
whatsAppMessageSchema.statics.getConversationHistoryByOrder = function(orderId, branchId, phoneNumber = null, limit = 100) {
    const query = {
        branchId,
        isActive: true,
        'context.orderId': orderId
    };
    if (phoneNumber) {
        query.phoneNumber = phoneNumber;
    }
    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('direction content messageType processing context metadata createdAt');
};

whatsAppMessageSchema.statics.getMessagesByIntent = function(intent, branchId, startDate, endDate) {
    const matchStage = {
        'processing.intent': intent,
        branchId,
        isActive: true
    };

    if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    return this.find(matchStage)
        .sort({ createdAt: -1 })
        .select('phoneNumber content processing metadata createdAt');
};

whatsAppMessageSchema.statics.getConversationStats = function(branchId, startDate, endDate) {
    const matchStage = {
        branchId,
        isActive: true
    };

    if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalMessages: { $sum: 1 },
                incomingMessages: {
                    $sum: { $cond: [{ $eq: ['$direction', 'incoming'] }, 1, 0] }
                },
                outgoingMessages: {
                    $sum: { $cond: [{ $eq: ['$direction', 'outgoing'] }, 1, 0] }
                },
                uniqueUsers: { $addToSet: '$phoneNumber' },
                avgProcessingTime: { $avg: '$processing.processingTime' },
                avgConfidence: { $avg: '$processing.confidence' }
            }
        },
        {
            $addFields: {
                uniqueUsersCount: { $size: '$uniqueUsers' }
            }
        }
    ]);
};

whatsAppMessageSchema.statics.getPopularIntents = function(branchId, startDate, endDate, limit = 10) {
    const matchStage = {
        branchId,
        isActive: true,
        'processing.intent': { $exists: true, $ne: null }
    };

    if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$processing.intent',
                count: { $sum: 1 },
                avgConfidence: { $avg: '$processing.confidence' },
                uniqueUsers: { $addToSet: '$phoneNumber' }
            }
        },
        {
            $addFields: {
                uniqueUsersCount: { $size: '$uniqueUsers' }
            }
        },
        { $sort: { count: -1 } },
        { $limit: limit }
    ]);
};

whatsAppMessageSchema.statics.getSentimentAnalysis = function(branchId, startDate, endDate) {
    const matchStage = {
        branchId,
        isActive: true,
        'processing.sentiment': { $exists: true, $ne: null }
    };

    if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$processing.sentiment',
                count: { $sum: 1 },
                uniqueUsers: { $addToSet: '$phoneNumber' }
            }
        },
        {
            $addFields: {
                uniqueUsersCount: { $size: '$uniqueUsers' }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// Métodos de instancia
whatsAppMessageSchema.methods.markAsRead = function() {
    this.metadata.deliveryStatus = 'read';
    this.metadata.readAt = new Date();
    return this.save();
};

whatsAppMessageSchema.methods.addTag = function(tag) {
    if (!this.tags.includes(tag)) {
        this.tags.push(tag);
    }
    return this.save();
};

whatsAppMessageSchema.methods.removeTag = function(tag) {
    this.tags = this.tags.filter(t => t !== tag);
    return this.save();
};

module.exports = mongoose.model('WhatsAppMessage', whatsAppMessageSchema);

