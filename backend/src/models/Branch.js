const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  branchId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  businessId: {
    type: String,
    required: true,
    ref: 'Business',
    index: true
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
    trim: true
  },
  manager: {
    type: String,
    trim: true
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
  contact: {
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: String,
    whatsapp: String
  },
  whatsapp: {
    provider: {
      type: String,
      enum: ['whatsapp-web.js', 'twilio', '360dialog'],
      default: 'whatsapp-web.js'
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true
    },
    isConnected: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['disconnected', 'connecting', 'connected', 'qr_ready', 'auth_failure'],
      default: 'disconnected'
    },
    qrCode: String,
    lastConnection: Date,
    sessionData: Object,
    webhookUrl: String,
    verifyToken: String
  },
  kitchen: {
    phoneNumber: String,
    email: String,
    autoForward: {
      type: Boolean,
      default: true
    }
  },
  settings: {
    autoReply: {
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
    },
    delivery: {
      enabled: {
        type: Boolean,
        default: true
      },
      radius: {
        type: Number,
        default: 5 // km
      },
      fee: {
        type: Number,
        default: 2.99
      }
    },
    pickup: {
      enabled: {
        type: Boolean,
        default: true
      },
      estimatedTime: {
        type: Number,
        default: 20 // minutos
      }
    }
  },
  catalog: {
    hasPdf: {
      type: Boolean,
      default: false
    },
    pdfUrl: String,
    content: String,
    lastUpdated: Date,
    sections: [{
      name: String,
      content: String,
      products: [{
        name: String,
        description: String,
        price: Number,
        available: {
          type: Boolean,
          default: true
        }
      }]
    }]
  },
  ai: {
    enabled: {
      type: Boolean,
      default: true
    },
    prompt: String,
    model: String,
    useBusinessSettings: {
      type: Boolean,
      default: true
    }
  },
  billingInfo: {
    nit: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      trim: true
    },
    commissionPerOrder: {
      type: Number,
      default: 500,
      min: 0
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
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
branchSchema.index({ branchId: 1 });
branchSchema.index({ businessId: 1 });
branchSchema.index({ 'whatsapp.phoneNumber': 1 });
branchSchema.index({ status: 1 });

// Métodos del modelo
branchSchema.methods.getServices = function() {
  return mongoose.model('Service').find({ 
    branchId: this.branchId, 
    isActive: true 
  });
};

branchSchema.methods.getOrders = function(status = null) {
  const query = { branchId: this.branchId };
  if (status) query.status = status;
  return mongoose.model('Order').find(query).sort({ createdAt: -1 });
};

branchSchema.methods.getTodayOrders = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return mongoose.model('Order').find({
    branchId: this.branchId,
    createdAt: {
      $gte: today,
      $lt: tomorrow
    }
  });
};

branchSchema.methods.updateWhatsAppStatus = function(status, data = {}) {
  this.whatsapp.status = status;
  this.whatsapp.isConnected = status === 'connected';
  
  if (data.qrCode) this.whatsapp.qrCode = data.qrCode;
  if (data.lastConnection) this.whatsapp.lastConnection = data.lastConnection;
  if (data.sessionData) this.whatsapp.sessionData = data.sessionData;
  
  return this.save();
};

module.exports = mongoose.model('Branch', branchSchema);
