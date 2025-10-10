const mongoose = require('mongoose');

const branchPDFSchema = new mongoose.Schema({
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
    fileName: {
        type: String,
        required: true,
        trim: true
    },
    originalName: {
        type: String,
        required: true,
        trim: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['menu', 'promociones', 'horarios', 'servicios', 'politicas', 'otro'],
        default: 'menu'
    },
    extractedText: {
        type: String,
        default: ''
    },
    processedText: {
        type: String,
        default: ''
    },
    keywords: [{
        type: String,
        trim: true
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    metadata: {
        pages: {
            type: Number,
            default: 0
        },
        language: {
            type: String,
            default: 'es'
        },
        processingStatus: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending'
        },
        processingError: {
            type: String,
            default: null
        },
        lastProcessed: {
            type: Date,
            default: null
        }
    }
}, {
    timestamps: true,
    versionKey: false
});

// Índices para optimizar consultas
branchPDFSchema.index({ branchId: 1, category: 1 });
branchPDFSchema.index({ businessId: 1, isActive: 1 });
branchPDFSchema.index({ uploadedBy: 1 });
branchPDFSchema.index({ 'metadata.processingStatus': 1 });

// Métodos estáticos
branchPDFSchema.statics.findByBranch = function(branchId) {
    return this.find({ branchId, isActive: true })
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: -1 });
};

branchPDFSchema.statics.findByCategory = function(branchId, category) {
    return this.find({ branchId, category, isActive: true })
        .populate('uploadedBy', 'name email')
        .sort({ createdAt: -1 });
};

branchPDFSchema.statics.getContextForAI = function(branchId) {
    return this.find({ branchId, isActive: true, 'metadata.processingStatus': 'completed' })
        .select('category extractedText processedText keywords')
        .sort({ category: 1, createdAt: -1 });
};

// Métodos de instancia
branchPDFSchema.methods.updateProcessingStatus = function(status, error = null) {
    this.metadata.processingStatus = status;
    if (error) {
        this.metadata.processingError = error;
    }
    if (status === 'completed') {
        this.metadata.lastProcessed = new Date();
    }
    return this.save();
};

branchPDFSchema.methods.extractKeywords = function() {
    if (!this.extractedText) return [];
    
    // Extraer palabras clave simples (puede mejorarse con NLP)
    const words = this.extractedText.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !['para', 'con', 'del', 'las', 'los', 'una', 'uno', 'que', 'por', 'sus'].includes(word));
    
    // Contar frecuencia y tomar las más comunes
    const wordCount = {};
    words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    this.keywords = Object.entries(wordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([word]) => word);
    
    return this.keywords;
};

module.exports = mongoose.model('BranchPDF', branchPDFSchema);

