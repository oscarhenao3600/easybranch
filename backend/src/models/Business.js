const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  businessId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: function() {
      return !this.razonSocial;
    },
    trim: true
  },
  razonSocial: {
    type: String,
    required: function() {
      return !this.name;
    },
    trim: true
  },
  nit: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  businessType: {
    type: String,
    enum: ['restaurant', 'cafe', 'pharmacy', 'grocery', 'fastfood', 'salon', 'gym', 'other'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  logo: {
    type: String,
    default: null
  },
  contact: {
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    }
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    default: 'Colombia',
    trim: true
  },
  coordinates: {
    lat: Number,
    lng: Number
  },
  settings: {
    timezone: {
      type: String,
      default: 'America/Bogota'
    },
    currency: {
      type: String,
      default: 'COP'
    },
    language: {
      type: String,
      default: 'es'
    },
    autoReply: {
      type: Boolean,
      default: true
    },
    delivery: {
      type: Boolean,
      default: true
    },
    businessHours: {
      monday: { open: String, close: String, closed: { type: Boolean, default: false } },
      tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
      friday: { open: String, close: String, closed: { type: Boolean, default: false } },
      saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
      sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
    }
  },
  billing: {
    serviceFee: {
      type: Number,
      default: 0.05, // 5%
      min: 0,
      max: 10 // Permitir hasta 10%
    },
    billingActive: {
      type: Boolean,
      default: true
    },
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    nextBillingDate: Date
  },
  ai: {
    enabled: {
      type: Boolean,
      default: true
    },
    provider: {
      type: String,
      enum: ['huggingface', 'openai', 'deepseek', 'simulation'],
      default: 'simulation'
    },
    model: {
      type: String,
      default: 'microsoft/DialoGPT-medium'
    },
    prompt: {
      type: String,
      default: null
    },
    maxTokens: {
      type: Number,
      default: 150
    },
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para mejor rendimiento
businessSchema.index({ businessId: 1 });
businessSchema.index({ businessType: 1 });
businessSchema.index({ status: 1 });
businessSchema.index({ 'contact.email': 1 });

// Métodos del modelo
businessSchema.methods.getActiveBranches = function() {
  return mongoose.model('Branch').find({ 
    businessId: this.businessId, 
    isActive: true 
  });
};

businessSchema.methods.getTotalRevenue = async function() {
  const Order = mongoose.model('Order');
  const result = await Order.aggregate([
    { $match: { businessId: this.businessId } },
    { $group: { _id: null, total: { $sum: '$total' } } }
  ]);
  return result.length > 0 ? result[0].total : 0;
};

businessSchema.methods.getOrderStats = async function() {
  const Order = mongoose.model('Order');
  return await Order.aggregate([
    { $match: { businessId: this.businessId } },
    { $group: { 
      _id: '$status', 
      count: { $sum: 1 },
      total: { $sum: '$total' }
    }}
  ]);
};

module.exports = mongoose.model('Business', businessSchema);
