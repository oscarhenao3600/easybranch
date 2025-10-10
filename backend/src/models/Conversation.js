const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    connectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WhatsAppConnection',
        required: true,
        index: true
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        required: true,
        index: true
    },
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true,
        index: true
    },
    customerPhone: {
        type: String,
        required: true,
        index: true
    },
    customerName: {
        type: String,
        default: null
    },
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'abandoned', 'escalated'],
        default: 'active',
        index: true
    },
    conversationType: {
        type: String,
        enum: ['inquiry', 'order', 'complaint', 'support', 'general'],
        default: 'general',
        index: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium',
        index: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    messages: [{
        messageId: {
            type: String,
            required: true
        },
        sender: {
            type: String,
            enum: ['customer', 'bot', 'agent'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        messageType: {
            type: String,
            enum: ['text', 'image', 'document', 'audio', 'video', 'location', 'contact'],
            default: 'text'
        },
        timestamp: {
            type: Date,
            required: true
        },
        aiProcessing: {
            processed: {
                type: Boolean,
                default: false
            },
            intent: {
                type: String,
                default: null
            },
            sentiment: {
                type: String,
                enum: ['positive', 'neutral', 'negative'],
                default: null
            },
            confidence: {
                type: Number,
                min: 0,
                max: 1,
                default: null
            },
            promptUsed: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'BranchPrompt',
                default: null
            },
            responseGenerated: {
                type: Boolean,
                default: false
            },
            processingTime: {
                type: Number,
                default: null
            }
        },
        metadata: {
            originalMessage: {
                type: mongoose.Schema.Types.Mixed,
                default: null
            },
            attachments: [{
                type: String,
                url: String,
                filename: String,
                mimeType: String,
                size: Number
            }],
            location: {
                latitude: Number,
                longitude: Number,
                address: String
            }
        }
    }],
    summary: {
        totalMessages: {
            type: Number,
            default: 0
        },
        customerMessages: {
            type: Number,
            default: 0
        },
        botMessages: {
            type: Number,
            default: 0
        },
        agentMessages: {
            type: Number,
            default: 0
        },
        averageResponseTime: {
            type: Number,
            default: null
        },
        resolutionTime: {
            type: Number,
            default: null
        },
        satisfactionScore: {
            type: Number,
            min: 1,
            max: 5,
            default: null
        }
    },
    escalation: {
        escalated: {
            type: Boolean,
            default: false
        },
        escalatedAt: {
            type: Date,
            default: null
        },
        escalatedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        escalationReason: {
            type: String,
            default: null
        },
        resolution: {
            type: String,
            default: null
        }
    },
    orderInfo: {
        hasOrder: {
            type: Boolean,
            default: false
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null
        },
        orderStatus: {
            type: String,
            default: null
        },
        orderValue: {
            type: Number,
            default: null
        }
    },
    security: {
        ipAddress: {
            type: String,
            default: null
        },
        userAgent: {
            type: String,
            default: null
        },
        deviceInfo: {
            type: String,
            default: null
        },
        riskScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        flagged: {
            type: Boolean,
            default: false
        },
        flagReason: {
            type: String,
            default: null
        }
    },
    analytics: {
        keywords: [{
            word: String,
            count: Number
        }],
        topics: [{
            topic: String,
            confidence: Number
        }],
        emotions: [{
            emotion: String,
            intensity: Number,
            timestamp: Date
        }],
        patterns: [{
            pattern: String,
            frequency: Number
        }]
    },
    compliance: {
        gdprCompliant: {
            type: Boolean,
            default: true
        },
        dataRetention: {
            type: Date,
            default: function() {
                return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 año por defecto
            }
        },
        consentGiven: {
            type: Boolean,
            default: false
        },
        consentTimestamp: {
            type: Date,
            default: null
        }
    },
    lastActivity: {
        type: Date,
        default: Date.now,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    versionKey: false
});

// Índices compuestos para optimizar consultas
conversationSchema.index({ branchId: 1, status: 1 });
conversationSchema.index({ customerPhone: 1, createdAt: -1 });
conversationSchema.index({ sessionId: 1, createdAt: -1 });
conversationSchema.index({ 'messages.timestamp': -1 });
conversationSchema.index({ lastActivity: -1 });
conversationSchema.index({ 'security.flagged': 1, createdAt: -1 });

// Métodos estáticos
conversationSchema.statics.findByBranch = function(branchId, options = {}) {
    const query = { branchId };
    if (options.status) query.status = options.status;
    if (options.dateFrom) query.createdAt = { $gte: options.dateFrom };
    if (options.dateTo) query.createdAt = { ...query.createdAt, $lte: options.dateTo };
    
    return this.find(query)
        .populate('connectionId', 'phoneNumber connectionName')
        .populate('branchId', 'name')
        .populate('businessId', 'name')
        .sort({ createdAt: -1 })
        .limit(options.limit || 50);
};

conversationSchema.statics.findByCustomer = function(customerPhone, branchId = null) {
    const query = { customerPhone };
    if (branchId) query.branchId = branchId;
    
    return this.find(query)
        .populate('connectionId', 'phoneNumber connectionName')
        .populate('branchId', 'name')
        .sort({ createdAt: -1 });
};

conversationSchema.statics.findActiveConversations = function(branchId = null) {
    const query = { status: 'active' };
    if (branchId) query.branchId = branchId;
    
    return this.find(query)
        .populate('connectionId', 'phoneNumber connectionName')
        .populate('branchId', 'name')
        .sort({ lastActivity: -1 });
};

conversationSchema.statics.getConversationStats = function(branchId, dateFrom, dateTo) {
    const matchStage = { branchId };
    if (dateFrom || dateTo) {
        matchStage.createdAt = {};
        if (dateFrom) matchStage.createdAt.$gte = dateFrom;
        if (dateTo) matchStage.createdAt.$lte = dateTo;
    }

    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalConversations: { $sum: 1 },
                activeConversations: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                completedConversations: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                escalatedConversations: {
                    $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] }
                },
                totalMessages: { $sum: '$summary.totalMessages' },
                avgResponseTime: { $avg: '$summary.averageResponseTime' },
                avgSatisfaction: { $avg: '$summary.satisfactionScore' }
            }
        }
    ]);
};

// Métodos de instancia
conversationSchema.methods.addMessage = function(messageData) {
    const message = {
        messageId: messageData.messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sender: messageData.sender,
        content: messageData.content,
        messageType: messageData.messageType || 'text',
        timestamp: messageData.timestamp || new Date(),
        aiProcessing: messageData.aiProcessing || {},
        metadata: messageData.metadata || {}
    };

    this.messages.push(message);
    this.lastActivity = new Date();
    this.updatedAt = new Date();

    // Actualizar resumen
    this.summary.totalMessages += 1;
    if (messageData.sender === 'customer') {
        this.summary.customerMessages += 1;
    } else if (messageData.sender === 'bot') {
        this.summary.botMessages += 1;
    } else if (messageData.sender === 'agent') {
        this.summary.agentMessages += 1;
    }

    return this.save();
};

conversationSchema.methods.updateStatus = function(newStatus, reason = null) {
    this.status = newStatus;
    this.lastActivity = new Date();
    this.updatedAt = new Date();

    if (newStatus === 'escalated') {
        this.escalation.escalated = true;
        this.escalation.escalatedAt = new Date();
        this.escalation.escalationReason = reason;
    }

    return this.save();
};

conversationSchema.methods.addTag = function(tag) {
    if (!this.tags.includes(tag)) {
        this.tags.push(tag);
        this.updatedAt = new Date();
    }
    return this.save();
};

conversationSchema.methods.removeTag = function(tag) {
    this.tags = this.tags.filter(t => t !== tag);
    this.updatedAt = new Date();
    return this.save();
};

conversationSchema.methods.calculateRiskScore = function() {
    let riskScore = 0;

    // Factores de riesgo
    if (this.messages.length > 50) riskScore += 10; // Muchos mensajes
    if (this.status === 'escalated') riskScore += 20; // Escalado
    if (this.security.flagged) riskScore += 30; // Marcado manualmente
    if (this.summary.satisfactionScore && this.summary.satisfactionScore <= 2) riskScore += 15; // Baja satisfacción
    
    // Palabras de riesgo en mensajes
    const riskKeywords = ['fraude', 'estafa', 'robo', 'hack', 'virus', 'malware'];
    const allContent = this.messages.map(m => m.content.toLowerCase()).join(' ');
    riskKeywords.forEach(keyword => {
        if (allContent.includes(keyword)) riskScore += 5;
    });

    this.security.riskScore = Math.min(riskScore, 100);
    this.updatedAt = new Date();
    return this.save();
};

conversationSchema.methods.generateAnalytics = function() {
    // Extraer palabras clave
    const wordCount = {};
    this.messages.forEach(message => {
        if (message.sender === 'customer') {
            const words = message.content.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 3);
            
            words.forEach(word => {
                wordCount[word] = (wordCount[word] || 0) + 1;
            });
        }
    });

    this.analytics.keywords = Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([word, count]) => ({ word, count }));

    // Detectar emociones básicas
    const emotions = [];
    this.messages.forEach(message => {
        if (message.aiProcessing.sentiment) {
            emotions.push({
                emotion: message.aiProcessing.sentiment,
                intensity: message.aiProcessing.confidence || 0.5,
                timestamp: message.timestamp
            });
        }
    });

    this.analytics.emotions = emotions;
    this.updatedAt = new Date();
    return this.save();
};

module.exports = mongoose.model('Conversation', conversationSchema);

