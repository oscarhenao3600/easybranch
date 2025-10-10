const mongoose = require('mongoose');

// Esquema para mensajes individuales
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  intent: {
    type: String,
    enum: ['saludo', 'pedido', 'horario', 'ubicacion', 'delivery', 'precio', 'menu', 'contacto', 'pregunta_general'],
    default: 'pregunta_general'
  },
  intentConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// Esquema para conversaciones
const conversationSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    index: true
  },
  branchId: {
    type: String,
    required: true,
    index: true
  },
  businessType: {
    type: String,
    default: 'restaurant'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'paused'],
    default: 'active'
  },
  messages: [messageSchema],
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  lastIntent: {
    type: String,
    enum: ['saludo', 'pedido', 'horario', 'ubicacion', 'delivery', 'precio', 'menu', 'contacto', 'pregunta_general'],
    default: 'pregunta_general'
  },
  context: {
    customerName: String,
    phoneNumber: String,
    deliveryAddress: String,
    paymentMethod: String,
    preferences: [String],
    notes: String
  },
  statistics: {
    messageCount: {
      type: Number,
      default: 0
    },
    orderCount: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    lastOrderDate: Date,
    averageOrderValue: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Esquema para pedidos
const orderSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  clientId: {
    type: String,
    required: true,
    index: true
  },
  branchId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending'
  },
  products: [{
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    subtotal: {
      type: Number,
      required: true
    },
    category: String,
    description: String
  }],
  pricing: {
    subtotal: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    },
    subtotalWithDiscount: {
      type: Number,
      required: true
    },
    tax: {
      type: Number,
      required: true
    },
    deliveryCost: {
      type: Number,
      required: true
    },
    serviceFee: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    }
  },
  delivery: {
    address: String,
    phoneNumber: String,
    estimatedTime: String,
    deliveryZone: String,
    specialInstructions: String
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
  timeline: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: String
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

// Esquema para estadísticas de cliente
const clientStatsSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  branchId: {
    type: String,
    required: true,
    index: true
  },
  firstContact: {
    type: Date,
    default: Date.now
  },
  lastContact: {
    type: Date,
    default: Date.now
  },
  totalConversations: {
    type: Number,
    default: 0
  },
  totalMessages: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  averageOrderValue: {
    type: Number,
    default: 0
  },
  favoriteProducts: [{
    productName: String,
    orderCount: Number,
    lastOrdered: Date
  }],
  preferredOrderTimes: [{
    hour: Number,
    count: Number
  }],
  customerTier: {
    type: String,
    enum: ['new', 'regular', 'vip', 'premium'],
    default: 'new'
  },
  preferences: {
    deliveryAddress: String,
    paymentMethod: String,
    specialInstructions: String,
    allergies: [String],
    dietaryRestrictions: [String]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para optimizar consultas
conversationSchema.index({ clientId: 1, branchId: 1 });
conversationSchema.index({ createdAt: -1 });
conversationSchema.index({ status: 1 });

orderSchema.index({ clientId: 1, branchId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

clientStatsSchema.index({ clientId: 1, branchId: 1 });
clientStatsSchema.index({ customerTier: 1 });
clientStatsSchema.index({ totalSpent: -1 });

// Middleware para actualizar timestamps
conversationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

orderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

clientStatsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Métodos del esquema de conversación
conversationSchema.methods.addMessage = function(role, content, intent = null, intentConfidence = null, metadata = {}) {
  const message = {
    role,
    content,
    timestamp: new Date(),
    intent,
    intentConfidence,
    metadata
  };
  
  this.messages.push(message);
  this.messageCount = this.messages.length;
  
  if (intent) {
    this.lastIntent = intent;
  }
  
  return message;
};

conversationSchema.methods.getLastMessages = function(count = 10) {
  return this.messages.slice(-count);
};

conversationSchema.methods.getMessagesByIntent = function(intent) {
  return this.messages.filter(msg => msg.intent === intent);
};

conversationSchema.methods.updateContext = function(contextData) {
  this.context = { ...this.context, ...contextData };
  return this.context;
};

conversationSchema.methods.completeOrder = function(orderId) {
  this.currentOrder = orderId;
  this.statistics.orderCount += 1;
  this.statistics.lastOrderDate = new Date();
  return this;
};

// Métodos del esquema de pedido
orderSchema.methods.addTimelineEvent = function(status, notes = '') {
  this.timeline.push({
    status,
    timestamp: new Date(),
    notes
  });
  return this.timeline;
};

orderSchema.methods.updateStatus = function(newStatus, notes = '') {
  this.status = newStatus;
  this.addTimelineEvent(newStatus, notes);
  return this;
};

orderSchema.methods.calculateTotal = function() {
  const subtotal = this.products.reduce((total, product) => total + product.subtotal, 0);
  const discount = this.pricing.discount || 0;
  const subtotalWithDiscount = subtotal - discount;
  const tax = subtotalWithDiscount * 0.19; // IVA 19%
  const deliveryCost = this.pricing.deliveryCost || 0;
  const serviceFee = this.pricing.serviceFee || 0;
  const total = subtotalWithDiscount + tax + deliveryCost + serviceFee;
  
  this.pricing = {
    subtotal,
    discount,
    subtotalWithDiscount,
    tax,
    deliveryCost,
    serviceFee,
    total
  };
  
  return this.pricing;
};

// Métodos del esquema de estadísticas de cliente
clientStatsSchema.methods.updateStats = function(orderData) {
  this.totalOrders += 1;
  this.totalSpent += orderData.total;
  this.averageOrderValue = this.totalSpent / this.totalOrders;
  this.lastContact = new Date();
  
  // Actualizar productos favoritos
  orderData.products.forEach(product => {
    const existingProduct = this.favoriteProducts.find(p => p.productName === product.name);
    if (existingProduct) {
      existingProduct.orderCount += product.quantity;
      existingProduct.lastOrdered = new Date();
    } else {
      this.favoriteProducts.push({
        productName: product.name,
        orderCount: product.quantity,
        lastOrdered: new Date()
      });
    }
  });
  
  // Actualizar tier de cliente
  if (this.totalSpent >= 100000) {
    this.customerTier = 'premium';
  } else if (this.totalSpent >= 50000) {
    this.customerTier = 'vip';
  } else if (this.totalOrders >= 5) {
    this.customerTier = 'regular';
  }
  
  return this;
};

clientStatsSchema.methods.getFavoriteProducts = function(limit = 5) {
  return this.favoriteProducts
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, limit);
};

// Métodos estáticos
conversationSchema.statics.findActiveConversation = function(clientId, branchId) {
  return this.findOne({
    clientId,
    branchId,
    status: 'active'
  }).sort({ updatedAt: -1 });
};

conversationSchema.statics.getConversationHistory = function(clientId, branchId, limit = 10) {
  return this.find({
    clientId,
    branchId
  }).sort({ updatedAt: -1 }).limit(limit);
};

orderSchema.statics.getClientOrders = function(clientId, branchId, limit = 10) {
  return this.find({
    clientId,
    branchId
  }).sort({ createdAt: -1 }).limit(limit);
};

orderSchema.statics.getOrdersByStatus = function(status, branchId) {
  return this.find({
    status,
    branchId
  }).sort({ createdAt: -1 });
};

clientStatsSchema.statics.getTopClients = function(branchId, limit = 10) {
  return this.find({
    branchId
  }).sort({ totalSpent: -1 }).limit(limit);
};

clientStatsSchema.statics.getClientTierStats = function(branchId) {
  return this.aggregate([
    { $match: { branchId } },
    { $group: {
      _id: '$customerTier',
      count: { $sum: 1 },
      totalSpent: { $sum: '$totalSpent' },
      averageOrderValue: { $avg: '$averageOrderValue' }
    }}
  ]);
};

// Crear modelos
const Conversation = mongoose.model('Conversation', conversationSchema);
const Order = mongoose.model('ConversationOrder', orderSchema);
const ClientStats = mongoose.model('ClientStats', clientStatsSchema);

module.exports = {
  Conversation,
  Order,
  ClientStats,
  messageSchema,
  conversationSchema,
  orderSchema,
  clientStatsSchema
};
