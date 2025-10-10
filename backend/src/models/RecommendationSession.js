const mongoose = require('mongoose');

const recommendationSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    branchId: {
        type: String,
        required: true
    },
    businessId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'abandoned'],
        default: 'active'
    },
    currentStep: {
        type: Number,
        default: 0
    },
    maxSteps: {
        type: Number,
        default: 10
    },
    peopleCount: {
        type: Number,
        default: 1,
        min: 1,
        max: 20
    },
    responses: [{
        questionId: String,
        question: String,
        answer: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    preferences: {
        budget: {
            min: Number,
            max: Number,
            currency: {
                type: String,
                default: 'COP'
            }
        },
        dietaryRestrictions: [String],
        mealType: String, // breakfast, lunch, dinner, snack
        cuisinePreferences: [String],
        spiceLevel: String, // mild, medium, hot
        portionSize: String, // small, medium, large
        specialOccasion: String,
        timeOfDay: String
    },
    recommendations: [{
        productId: String,
        productName: String,
        price: Number,
        category: String,
        reason: String,
        confidence: Number, // 0-100
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    finalRecommendation: {
        productId: String,
        productName: String,
        price: Number,
        category: String,
        reasoning: String,
        alternatives: [{
            productId: String,
            productName: String,
            price: Number,
            reason: String
        }]
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date
});

// Update the updatedAt field before saving
recommendationSessionSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model('RecommendationSession', recommendationSessionSchema);
