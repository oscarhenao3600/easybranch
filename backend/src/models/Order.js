const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
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
  branchId: {
    type: String,
    required: true,
    ref: 'Branch',
    index: true
  },
  customer: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    }
  },
  items: [{
    serviceId: {
      type: String,
      ref: 'Service',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    options: [{
      name: String,
      choice: String,
      price: {
        type: Number,
        default: 0
      }
    }],
    notes: String
  }],
  delivery: {
    type: {
      type: String,
      enum: ['pickup', 'delivery'],
      required: true
    },
    fee: {
      type: Number,
      default: 0
    },
    estimatedTime: {
      type: Number, // minutos
      default: 20
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    }
  },
  payment: {
    method: {
      type: String,
      enum: ['cash', 'card', 'transfer', 'pending'],
      default: 'pending'
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending'
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  serviceFee: {
    type: Number,
    default: 0
  },
  notes: String,
  source: {
    type: String,
    enum: ['whatsapp', 'web', 'phone', 'walk-in'],
    default: 'whatsapp'
  },
  whatsappMessageId: String,
  assignedTo: {
    type: String,
    ref: 'User'
  },
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: String,
      ref: 'User'
    }
  }],
  billingInfo: {
    invoiceNumber: String,
    generatedAt: Date,
    sentAt: Date,
    status: {
      type: String,
      enum: ['pending', 'sent', 'paid', 'cancelled'],
      default: 'pending'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para mejor rendimiento
orderSchema.index({ orderId: 1 });
orderSchema.index({ businessId: 1 });
orderSchema.index({ branchId: 1 });
orderSchema.index({ 'customer.phone': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

// Middleware para actualizar historial de estado
orderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date()
    });
  }
  next();
});

// Método para calcular totales
orderSchema.methods.calculateTotals = function() {
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  this.total = this.subtotal + this.delivery.fee + this.tax + this.serviceFee;
  return this;
};

// Método para actualizar estado
orderSchema.methods.updateStatus = function(newStatus, note = '', updatedBy = null) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note,
    updatedBy
  });
  return this.save();
};

// Método para verificar si se puede cancelar
orderSchema.methods.canCancel = function() {
  return ['pending', 'confirmed'].includes(this.status);
};

// Método para obtener tiempo estimado total
orderSchema.methods.getEstimatedTime = function() {
  const maxPrepTime = Math.max(...this.items.map(item => 
    item.service?.availability?.preparationTime || 15
  ));
  return maxPrepTime + this.delivery.estimatedTime;
};

module.exports = mongoose.model('Order', orderSchema);
