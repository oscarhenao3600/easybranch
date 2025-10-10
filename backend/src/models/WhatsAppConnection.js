const mongoose = require('mongoose');

const whatsAppConnectionSchema = new mongoose.Schema({
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        required: true
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        required: true
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },
    connectionName: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['connected', 'disconnected', 'connecting', 'error'],
        default: 'disconnected'
    },
    autoReply: {
        type: Boolean,
        default: true
    },
    aiIntegration: {
        type: Boolean,
        default: true
    },
    businessHours: {
        start: {
            type: String,
            default: '08:00'
        },
        end: {
            type: String,
            default: '22:00'
        }
    },
    offHoursMessage: {
        type: String,
        default: 'Gracias por contactarnos. Nuestro horario de atención es de 8:00 AM a 10:00 PM. Te responderemos en la mañana.'
    },
    customerServiceNumber: {
        type: String,
        required: true
    },
    qrCodeDataURL: {
        type: String
    },
    qrExpiresAt: {
        type: Date
    },
    isLinked: {
        type: Boolean,
        default: false
    },
    linkedAt: {
        type: Date
    },
    lastQRGenerated: {
        type: Date
    },
    connectionId: {
        type: String,
        unique: true
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    messagesToday: {
        type: Number,
        default: 0
    },
    totalMessages: {
        type: Number,
        default: 0
    },
    responseRate: {
        type: Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Index for better query performance
whatsAppConnectionSchema.index({ businessId: 1, branchId: 1 });
whatsAppConnectionSchema.index({ status: 1 });
whatsAppConnectionSchema.index({ phoneNumber: 1 });

module.exports = mongoose.model('WhatsAppConnection', whatsAppConnectionSchema);

