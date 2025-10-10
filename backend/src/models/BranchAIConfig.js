const mongoose = require('mongoose');

const branchAIConfigSchema = new mongoose.Schema({
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        required: true,
        unique: true
    },
    
    // Configuración del prompt personalizado
    customPrompt: {
        type: String,
        default: ''
    },
    
    // Información del menú extraída del PDF
    menuContent: {
        type: String,
        default: ''
    },
    
    // Configuración específica del negocio
    businessSettings: {
        businessType: {
            type: String,
            enum: ['restaurant', 'cafe', 'pharmacy', 'grocery', 'retail', 'service'],
            default: 'restaurant'
        },
        
        // Horarios de atención
        businessHours: {
            type: Map,
            of: {
                open: { type: String, default: '08:00' },
                close: { type: String, default: '22:00' },
                isOpen: { type: Boolean, default: true }
            },
            default: new Map([
                ['monday', { open: '08:00', close: '22:00', isOpen: true }],
                ['tuesday', { open: '08:00', close: '22:00', isOpen: true }],
                ['wednesday', { open: '08:00', close: '22:00', isOpen: true }],
                ['thursday', { open: '08:00', close: '22:00', isOpen: true }],
                ['friday', { open: '08:00', close: '22:00', isOpen: true }],
                ['saturday', { open: '09:00', close: '21:00', isOpen: true }],
                ['sunday', { open: '10:00', close: '20:00', isOpen: true }]
            ])
        },
        
        // Mensajes personalizados
        messages: {
            welcome: {
                type: String,
                default: '¡Hola! Bienvenido a nuestra sucursal. ¿En qué puedo ayudarte hoy?'
            },
            offHours: {
                type: String,
                default: 'Gracias por contactarnos. Estamos cerrados en este momento, pero te responderemos pronto.'
            },
            orderConfirmation: {
                type: String,
                default: '¡Perfecto! He recibido tu pedido. Te confirmaremos los detalles pronto.'
            },
            deliveryInfo: {
                type: String,
                default: 'Ofrecemos servicio a domicilio. ¿Te gustaría conocer nuestros tiempos de entrega?'
            }
        },
        
        // Configuración de productos/servicios
        productCategories: [{
            name: String,
            description: String,
            items: [{
                name: String,
                description: String,
                price: Number,
                available: { type: Boolean, default: true }
            }]
        }],
        
        // Configuración de delivery
        deliverySettings: {
            enabled: { type: Boolean, default: true },
            minimumOrder: { type: Number, default: 0 },
            deliveryFee: { type: Number, default: 0 },
            deliveryTime: { type: String, default: '30-45 minutos' },
            deliveryRadius: { type: Number, default: 5 } // km
        }
    },
    
    // Configuración de IA específica
    aiSettings: {
        // Nivel de personalización
        personalizationLevel: {
            type: String,
            enum: ['basic', 'standard', 'premium'],
            default: 'standard'
        },
        
        // Respuestas automáticas específicas
        autoResponses: {
            greetings: [String],
            menuRequests: [String],
            orderRequests: [String],
            priceInquiries: [String],
            hoursInquiries: [String]
        },
        
        // Palabras clave específicas del negocio
        keywords: {
            products: [String],
            services: [String],
            specialties: [String]
        }
    },
    
    // Archivos relacionados
    files: {
        menuPDF: {
            filename: String,
            path: String,
            uploadedAt: Date,
            processed: { type: Boolean, default: false }
        },
        logo: {
            filename: String,
            path: String,
            uploadedAt: Date
        }
    },
    
    // Metadatos
    isActive: {
        type: Boolean,
        default: true
    },
    
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Índices para optimizar consultas
branchAIConfigSchema.index({ branchId: 1 });
branchAIConfigSchema.index({ 'businessSettings.businessType': 1 });
branchAIConfigSchema.index({ isActive: 1 });

// Middleware para actualizar lastUpdated
branchAIConfigSchema.pre('save', function(next) {
    this.lastUpdated = new Date();
    next();
});

module.exports = mongoose.model('BranchAIConfig', branchAIConfigSchema);
