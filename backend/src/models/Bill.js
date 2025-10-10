const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  billId: {
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
  billNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  period: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true,
      min: 2020
    }
  },
  orders: [{
    orderId: {
      type: String,
      required: true,
      ref: 'Order'
    },
    customerName: String,
    total: {
      type: Number,
      required: true,
      min: 0
    },
    serviceFee: {
      type: Number,
      required: true,
      min: 0
    },
    orderDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['confirmed', 'delivered', 'completed'],
      required: true
    }
  }],
  summary: {
    totalOrders: {
      type: Number,
      default: 0,
      min: 0
    },
    totalServiceFee: {
      type: Number,
      default: 0,
      min: 0
    },
    totalOrdersValue: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  billingInfo: {
    nit: String,
    businessName: String,
    branchName: String,
    address: String,
    city: String,
    department: String,
    phone: String,
    email: String
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  payment: {
    dueDate: Date,
    paidDate: Date,
    paymentMethod: {
      type: String,
      enum: ['transfer', 'cash', 'card', 'other']
    },
    paymentReference: String,
    notes: String
  },
  generatedBy: {
    type: String,
    ref: 'User'
  },
  sentAt: Date,
  paidAt: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para mejor rendimiento
billSchema.index({ billId: 1 });
billSchema.index({ businessId: 1 });
billSchema.index({ branchId: 1 });
billSchema.index({ 'period.year': 1, 'period.month': 1 });
billSchema.index({ status: 1 });
billSchema.index({ createdAt: -1 });

// Middleware para generar billId automáticamente
billSchema.pre('save', function(next) {
  if (!this.billId) {
    this.billId = `BILL${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }
  next();
});

// Middleware para generar billNumber automáticamente
billSchema.pre('save', function(next) {
  if (!this.billNumber) {
    const year = this.period.year;
    const month = String(this.period.month).padStart(2, '0');
    this.billNumber = `FACT-${year}${month}-${this.branchId.substring(0, 8).toUpperCase()}`;
  }
  next();
});

// Método para calcular totales
billSchema.methods.calculateTotals = function() {
  this.summary.totalOrders = this.orders.length;
  this.summary.totalServiceFee = this.orders.reduce((sum, order) => sum + order.serviceFee, 0);
  this.summary.totalOrdersValue = this.orders.reduce((sum, order) => sum + order.total, 0);
  return this;
};

// Método para marcar como pagado
billSchema.methods.markAsPaid = function(paymentMethod, reference, notes) {
  this.status = 'paid';
  this.payment.paidDate = new Date();
  this.payment.paymentMethod = paymentMethod;
  this.payment.paymentReference = reference;
  this.payment.notes = notes;
  this.paidAt = new Date();
  return this.save();
};

// Método para verificar si está vencido
billSchema.methods.isOverdue = function() {
  if (this.status === 'paid' || this.status === 'cancelled') {
    return false;
  }
  return this.payment.dueDate && new Date() > this.payment.dueDate;
};

// Método estático para generar factura mensual
billSchema.statics.generateMonthlyBill = async function(branchId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  // Buscar órdenes del período
  const orders = await mongoose.model('Order').find({
    branchId: branchId,
    status: { $in: ['confirmed', 'completed'] },
    createdAt: {
      $gte: startDate,
      $lte: endDate
    },
    isActive: true
  }).sort({ createdAt: 1 });

  if (orders.length === 0) {
    return null; // No hay órdenes para facturar
  }

        // Obtener información de la sucursal
        const branch = await mongoose.model('Branch').findById(branchId);
        if (!branch) {
            throw new Error('Sucursal no encontrada');
        }

        // Obtener la comisión por orden de la sucursal (default 500)
        const commissionPerOrder = branch.billingInfo?.commissionPerOrder || 500;

        // Generar IDs únicos
        const billId = `BILL${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const billNumber = `FACT-${year}-${month.toString().padStart(2, '0')}-${branch.branchId}`;

        // Crear la factura
        const bill = new this({
            billId: billId,
            billNumber: billNumber,
            branchId: branchId,
            businessId: branch.businessId,
            period: {
                startDate,
                endDate,
                month,
                year
            },
            orders: orders.map(order => ({
                orderId: order.orderId,
                customerName: order.customer.name,
                total: order.total,
                serviceFee: commissionPerOrder,
                orderDate: order.createdAt,
                status: order.status
            })),
            billingInfo: {
                nit: branch.billingInfo?.nit || branch.nit,
                businessName: branch.name,
                branchName: branch.name,
                address: branch.billingInfo?.address || branch.address,
                city: branch.billingInfo?.city || branch.city,
                department: branch.billingInfo?.department || branch.department,
                phone: branch.billingInfo?.phone || branch.contact?.phone,
                email: branch.billingInfo?.email || branch.contact?.email,
                commissionPerOrder: commissionPerOrder
            },
    payment: {
      dueDate: new Date(endDate.getTime() + (30 * 24 * 60 * 60 * 1000)) // 30 días después del período
    }
  });

  // Calcular totales
  bill.calculateTotals();
  
  return bill;
};

module.exports = mongoose.model('Bill', billSchema);
