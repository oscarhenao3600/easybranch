const mongoose = require('mongoose');

// Esquema para base de conocimiento del negocio
const BusinessKnowledgeBaseSchema = new mongoose.Schema({
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Business'
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Branch'
    },
    // Información del negocio
    businessInfo: {
        name: { type: String },
        type: { type: String },
        description: { type: String },
        specialties: [{ type: String }],
        atmosphere: { type: String },
        targetAudience: [{ type: String }]
    },
    // Información de productos y servicios
    products: [{
        name: String,
        category: String,
        description: String,
        price: Number,
        ingredients: [String],
        allergens: [String],
        popularity: {
            type: Number,
            min: 1,
            max: 10,
            default: 5
        },
        seasonal: Boolean,
        availability: {
            type: String,
            enum: ['always', 'breakfast', 'lunch', 'dinner', 'weekends', 'limited'],
            default: 'always'
        }
    }],
    // Información de servicios
    services: [{
        name: String,
        description: String,
        availability: String,
        requirements: [String],
        pricing: String
    }],
    // Políticas y procedimientos
    policies: {
        delivery: {
            available: Boolean,
            minimumOrder: Number,
            deliveryFee: Number,
            deliveryTime: String,
            coverage: [String]
        },
        payment: {
            methods: [String],
            tips: String,
            discounts: [String]
        },
        specialRequests: {
            allowed: Boolean,
            limitations: [String],
            additionalFees: String
        }
    },
    // Información operativa
    operations: {
        hours: {
            monday: String,
            tuesday: String,
            wednesday: String,
            thursday: String,
            friday: String,
            saturday: String,
            sunday: String
        },
        contact: {
            phone: String,
            email: String,
            address: String,
            socialMedia: [String]
        },
        capacity: {
            indoor: Number,
            outdoor: Number,
            delivery: Boolean
        }
    },
    // Respuestas frecuentes
    faqs: [{
        question: String,
        answer: String,
        category: String,
        keywords: [String]
    }],
    // Escenarios de conversación
    conversationScenarios: [{
        trigger: String,
        context: String,
        response: String,
        followUp: [String]
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware para actualizar updatedAt
BusinessKnowledgeBaseSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Índices para optimizar consultas
BusinessKnowledgeBaseSchema.index({ businessId: 1, branchId: 1 });
BusinessKnowledgeBaseSchema.index({ 'products.category': 1 });
BusinessKnowledgeBaseSchema.index({ 'faqs.keywords': 1 });

module.exports = mongoose.model('BusinessKnowledgeBase', BusinessKnowledgeBaseSchema);
