const mongoose = require('mongoose');

const deviceLinkingSchema = new mongoose.Schema({
  branchId: {
    type: String,
    required: true,
    ref: 'Branch',
    index: true
  },
  businessId: {
    type: String,
    required: true,
    ref: 'Business',
    index: true
  },
  deviceInfo: {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    deviceName: {
      type: String,
      required: true,
      trim: true
    },
    deviceType: {
      type: String,
      enum: ['phone', 'tablet', 'computer', 'pos', 'kitchen_display'],
      required: true
    },
    platform: {
      type: String,
      enum: ['android', 'ios', 'windows', 'macos', 'linux', 'web'],
      required: true
    },
    version: String,
    manufacturer: String,
    model: String
  },
  whatsapp: {
    phoneNumber: {
      type: String,
      required: true,
      trim: true
    },
    connectionId: {
      type: String,
      unique: true,
      sparse: true
    },
    status: {
      type: String,
      enum: ['disconnected', 'connecting', 'connected', 'qr_ready', 'auth_failure', 'error'],
      default: 'disconnected'
    },
    qrCode: String,
    qrCodeDataURL: String,
    qrExpiresAt: Date,
    lastConnection: Date,
    sessionData: Object,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  permissions: {
    canReceiveOrders: {
      type: Boolean,
      default: true
    },
    canSendMessages: {
      type: Boolean,
      default: true
    },
    canManageInventory: {
      type: Boolean,
      default: false
    },
    canViewAnalytics: {
      type: Boolean,
      default: false
    },
    canManageUsers: {
      type: Boolean,
      default: false
    }
  },
  settings: {
    autoReply: {
      type: Boolean,
      default: true
    },
    businessHours: {
      type: Boolean,
      default: true
    },
    deliveryNotifications: {
      type: Boolean,
      default: true
    },
    orderNotifications: {
      type: Boolean,
      default: true
    },
    soundEnabled: {
      type: Boolean,
      default: true
    },
    vibrationEnabled: {
      type: Boolean,
      default: true
    }
  },
  location: {
    coordinates: {
      lat: Number,
      lng: Number
    },
    address: String,
    isAtBranch: {
      type: Boolean,
      default: true
    }
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'error'],
    default: 'active'
  },
  metadata: {
    installedAt: {
      type: Date,
      default: Date.now
    },
    lastUpdate: Date,
    updateVersion: String,
    notes: String
  }
}, {
  timestamps: true
});

// Índices para mejor rendimiento
deviceLinkingSchema.index({ branchId: 1 });
deviceLinkingSchema.index({ businessId: 1 });
deviceLinkingSchema.index({ 'deviceInfo.deviceId': 1 });
deviceLinkingSchema.index({ 'whatsapp.phoneNumber': 1 });
deviceLinkingSchema.index({ 'whatsapp.connectionId': 1 });
deviceLinkingSchema.index({ status: 1 });
deviceLinkingSchema.index({ isOnline: 1 });

// Métodos del modelo
deviceLinkingSchema.methods.updateWhatsAppStatus = function(status, data = {}) {
  this.whatsapp.status = status;
  this.whatsapp.isActive = status === 'connected';
  
  if (data.qrCode) this.whatsapp.qrCode = data.qrCode;
  if (data.qrCodeDataURL) this.whatsapp.qrCodeDataURL = data.qrCodeDataURL;
  if (data.qrExpiresAt) this.whatsapp.qrExpiresAt = data.qrExpiresAt;
  if (data.lastConnection) this.whatsapp.lastConnection = data.lastConnection;
  if (data.sessionData) this.whatsapp.sessionData = data.sessionData;
  if (data.connectionId) this.whatsapp.connectionId = data.connectionId;
  
  return this.save();
};

deviceLinkingSchema.methods.updateOnlineStatus = function(isOnline) {
  this.isOnline = isOnline;
  this.lastSeen = new Date();
  return this.save();
};

deviceLinkingSchema.methods.updateLocation = function(coordinates, address) {
  this.location.coordinates = coordinates;
  this.location.address = address;
  this.location.isAtBranch = true; // Asumimos que está en la sucursal
  return this.save();
};

deviceLinkingSchema.methods.getBranch = function() {
  return mongoose.model('Branch').findOne({ branchId: this.branchId });
};

deviceLinkingSchema.methods.getBusiness = function() {
  return mongoose.model('Business').findOne({ businessId: this.businessId });
};

// Métodos estáticos
deviceLinkingSchema.statics.findByBranch = function(branchId) {
  return this.find({ branchId, status: 'active' }).sort({ createdAt: -1 });
};

deviceLinkingSchema.statics.findByBusiness = function(businessId) {
  return this.find({ businessId, status: 'active' }).sort({ createdAt: -1 });
};

deviceLinkingSchema.statics.findOnlineDevices = function(branchId = null) {
  const query = { isOnline: true, status: 'active' };
  if (branchId) query.branchId = branchId;
  return this.find(query).sort({ lastSeen: -1 });
};

deviceLinkingSchema.statics.findByDeviceType = function(deviceType, branchId = null) {
  const query = { 'deviceInfo.deviceType': deviceType, status: 'active' };
  if (branchId) query.branchId = branchId;
  return this.find(query).sort({ createdAt: -1 });
};

// Middleware pre-save
deviceLinkingSchema.pre('save', function(next) {
  // Actualizar lastUpdate en metadata
  this.metadata.lastUpdate = new Date();
  
  // Validar que el deviceId sea único
  if (this.isNew) {
    this.constructor.findOne({ 'deviceInfo.deviceId': this.deviceInfo.deviceId })
      .then(existingDevice => {
        if (existingDevice) {
          const error = new Error('Device ID already exists');
          error.code = 11000;
          return next(error);
        }
        next();
      })
      .catch(next);
  } else {
    next();
  }
});

module.exports = mongoose.model('DeviceLinking', deviceLinkingSchema);
