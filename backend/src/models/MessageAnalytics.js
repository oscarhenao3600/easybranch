const mongoose = require('mongoose');

const messageAnalyticsSchema = new mongoose.Schema({
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
    deviceId: {
        type: String,
        index: true
    },
    branchId: {
        type: String,
        index: true
    },
    businessId: {
        type: String,
        index: true
    },
    sender: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        required: true,
        index: true
    },
    aiProcessing: {
        processed: {
            type: Boolean,
            default: false
        },
        intent: {
            type: String,
            enum: ['greeting', 'order', 'inquiry', 'complaint', 'thanks', 'goodbye', 'general']
        },
        sentiment: {
            type: String,
            enum: ['positive', 'neutral', 'negative']
        },
        confidence: {
            type: Number,
            min: 0,
            max: 1
        },
        response: String,
        suggestions: [String],
        processingTime: Number,
        model: String
    },
    response: {
        sent: {
            type: Boolean,
            default: false
        },
        message: String,
        timestamp: Date,
        automatic: {
            type: Boolean,
            default: false
        }
    },
    metadata: {
        userAgent: String,
        ip: String,
        deviceInfo: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Índices para mejor rendimiento
messageAnalyticsSchema.index({ connectionId: 1, timestamp: -1 });
messageAnalyticsSchema.index({ branchId: 1, timestamp: -1 });
messageAnalyticsSchema.index({ businessId: 1, timestamp: -1 });
messageAnalyticsSchema.index({ sender: 1, timestamp: -1 });
messageAnalyticsSchema.index({ 'aiProcessing.intent': 1 });
messageAnalyticsSchema.index({ 'aiProcessing.sentiment': 1 });

// Método estático para obtener estadísticas
messageAnalyticsSchema.statics.getStats = async function(filters = {}) {
    const pipeline = [
        { $match: filters },
        {
            $group: {
                _id: null,
                totalMessages: { $sum: 1 },
                processedMessages: {
                    $sum: { $cond: ['$aiProcessing.processed', 1, 0] }
                },
                avgConfidence: {
                    $avg: '$aiProcessing.confidence'
                },
                avgProcessingTime: {
                    $avg: '$aiProcessing.processingTime'
                },
                intentDistribution: {
                    $push: '$aiProcessing.intent'
                },
                sentimentDistribution: {
                    $push: '$aiProcessing.sentiment'
                }
            }
        }
    ];

    const result = await this.aggregate(pipeline);
    
    if (result.length === 0) {
        return {
            totalMessages: 0,
            processedMessages: 0,
            successRate: 0,
            avgConfidence: 0,
            avgProcessingTime: 0,
            intentDistribution: {},
            sentimentDistribution: {}
        };
    }

    const stats = result[0];
    
    // Calcular distribución de intenciones
    const intentCounts = {};
    stats.intentDistribution.forEach(intent => {
        if (intent) {
            intentCounts[intent] = (intentCounts[intent] || 0) + 1;
        }
    });

    // Calcular distribución de sentimientos
    const sentimentCounts = {};
    stats.sentimentDistribution.forEach(sentiment => {
        if (sentiment) {
            sentimentCounts[sentiment] = (sentimentCounts[sentiment] || 0) + 1;
        }
    });

    return {
        totalMessages: stats.totalMessages,
        processedMessages: stats.processedMessages,
        successRate: stats.totalMessages > 0 ? (stats.processedMessages / stats.totalMessages) * 100 : 0,
        avgConfidence: stats.avgConfidence || 0,
        avgProcessingTime: stats.avgProcessingTime || 0,
        intentDistribution: intentCounts,
        sentimentDistribution: sentimentCounts
    };
};

// Método para obtener mensajes recientes
messageAnalyticsSchema.statics.getRecentMessages = async function(connectionId, limit = 50) {
    return this.find({ connectionId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .select('sender message timestamp aiProcessing response')
        .lean();
};

module.exports = mongoose.model('MessageAnalytics', messageAnalyticsSchema);
