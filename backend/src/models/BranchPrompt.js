const mongoose = require('mongoose');

const branchPromptSchema = new mongoose.Schema({
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
    promptType: {
        type: String,
        enum: ['greeting', 'menu_inquiry', 'order_assistance', 'hours_inquiry', 'location_inquiry', 'complaint', 'thanks', 'fallback', 'custom'],
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    promptTemplate: {
        type: String,
        required: true
    },
    variables: [{
        name: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        defaultValue: {
            type: String,
            default: ''
        },
        isRequired: {
            type: Boolean,
            default: false
        }
    }],
    responseTemplate: {
        type: String,
        required: true
    },
    conditions: {
        keywords: [{
            type: String,
            trim: true
        }],
        sentiment: {
            type: String,
            enum: ['positive', 'neutral', 'negative', 'any'],
            default: 'any'
        },
        timeOfDay: {
            start: {
                type: String,
                default: '00:00'
            },
            end: {
                type: String,
                default: '23:59'
            }
        },
        dayOfWeek: [{
            type: String,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        }]
    },
    isActive: {
        type: Boolean,
        default: true
    },
    priority: {
        type: Number,
        default: 1,
        min: 1,
        max: 10
    },
    usageCount: {
        type: Number,
        default: 0
    },
    lastUsed: {
        type: Date,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    metadata: {
        language: {
            type: String,
            default: 'es'
        },
        tone: {
            type: String,
            enum: ['formal', 'casual', 'friendly', 'professional'],
            default: 'friendly'
        },
        maxLength: {
            type: Number,
            default: 500
        },
        aiModel: {
            type: String,
            default: 'microsoft/DialoGPT-medium'
        }
    }
}, {
    timestamps: true,
    versionKey: false
});

// Índices para optimizar consultas
branchPromptSchema.index({ branchId: 1, promptType: 1, isActive: 1 });
branchPromptSchema.index({ businessId: 1, isActive: 1 });
branchPromptSchema.index({ promptType: 1, priority: -1 });
branchPromptSchema.index({ 'conditions.keywords': 1 });

// Métodos estáticos
branchPromptSchema.statics.findByBranch = function(branchId) {
    return this.find({ branchId, isActive: true })
        .populate('createdBy', 'name email')
        .sort({ priority: -1, createdAt: -1 });
};

branchPromptSchema.statics.findByType = function(branchId, promptType) {
    return this.find({ branchId, promptType, isActive: true })
        .populate('createdBy', 'name email')
        .sort({ priority: -1, createdAt: -1 });
};

branchPromptSchema.statics.findMatchingPrompt = function(branchId, messageData) {
    const { message, sentiment, timeOfDay, dayOfWeek } = messageData;
    
    return this.find({ 
        branchId, 
        isActive: true,
        $or: [
            { 'conditions.keywords': { $in: message.toLowerCase().split(/\s+/) } },
            { 'conditions.keywords': { $size: 0 } }
        ]
    })
    .populate('createdBy', 'name email')
    .sort({ priority: -1, usageCount: 1 })
    .limit(1);
};

branchPromptSchema.statics.getPromptStats = function(branchId) {
    return this.aggregate([
        { $match: { branchId, isActive: true } },
        {
            $group: {
                _id: '$promptType',
                count: { $sum: 1 },
                totalUsage: { $sum: '$usageCount' },
                avgPriority: { $avg: '$priority' }
            }
        },
        { $sort: { count: -1 } }
    ]);
};

// Métodos de instancia
branchPromptSchema.methods.incrementUsage = function() {
    this.usageCount += 1;
    this.lastUsed = new Date();
    return this.save();
};

branchPromptSchema.methods.processPrompt = function(context = {}) {
    let processedPrompt = this.promptTemplate;
    let processedResponse = this.responseTemplate;
    
    // Reemplazar variables en el prompt
    this.variables.forEach(variable => {
        const value = context[variable.name] || variable.defaultValue || '';
        const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
        processedPrompt = processedPrompt.replace(regex, value);
        processedResponse = processedResponse.replace(regex, value);
    });
    
    return {
        prompt: processedPrompt,
        response: processedResponse,
        variables: this.variables
    };
};

branchPromptSchema.methods.checkConditions = function(messageData) {
    const { message, sentiment, timeOfDay, dayOfWeek } = messageData;
    
    // Verificar keywords
    if (this.conditions.keywords && this.conditions.keywords.length > 0) {
        const messageWords = message.toLowerCase().split(/\s+/);
        const hasKeyword = this.conditions.keywords.some(keyword => 
            messageWords.some(word => word.includes(keyword.toLowerCase()))
        );
        if (!hasKeyword) return false;
    }
    
    // Verificar sentimiento
    if (this.conditions.sentiment && this.conditions.sentiment !== 'any') {
        if (sentiment !== this.conditions.sentiment) return false;
    }
    
    // Verificar horario
    if (this.conditions.timeOfDay) {
        const currentTime = timeOfDay || new Date().toTimeString().substring(0, 5);
        if (currentTime < this.conditions.timeOfDay.start || currentTime > this.conditions.timeOfDay.end) {
            return false;
        }
    }
    
    // Verificar día de la semana
    if (this.conditions.dayOfWeek && this.conditions.dayOfWeek.length > 0) {
        const currentDay = dayOfWeek || new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        if (!this.conditions.dayOfWeek.includes(currentDay)) return false;
    }
    
    return true;
};

module.exports = mongoose.model('BranchPrompt', branchPromptSchema);

