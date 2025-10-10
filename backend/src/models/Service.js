const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  serviceId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Business',
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Branch',
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'COP'
  },
  images: [{
    url: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  options: [{
    name: String,
    choices: [{
      name: String,
      price: {
        type: Number,
        default: 0
      }
    }],
    required: {
      type: Boolean,
      default: false
    },
    multiple: {
      type: Boolean,
      default: false
    }
  }],
  availability: {
    isAvailable: {
      type: Boolean,
      default: true
    },
    stock: {
      type: Number,
      default: -1 // -1 = sin límite
    },
    preparationTime: {
      type: Number,
      default: 15 // minutos
    }
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para mejor rendimiento
serviceSchema.index({ serviceId: 1 });
serviceSchema.index({ businessId: 1 });
serviceSchema.index({ branchId: 1 });
serviceSchema.index({ category: 1 });
serviceSchema.index({ isActive: 1 });

// Métodos del modelo
serviceSchema.methods.isInStock = function() {
  if (this.availability.stock === -1) return true;
  return this.availability.stock > 0;
};

serviceSchema.methods.decreaseStock = function(quantity = 1) {
  if (this.availability.stock === -1) return true;
  if (this.availability.stock >= quantity) {
    this.availability.stock -= quantity;
    return this.save();
  }
  return false;
};

serviceSchema.methods.increaseStock = function(quantity = 1) {
  if (this.availability.stock === -1) return true;
  this.availability.stock += quantity;
  return this.save();
};

module.exports = mongoose.model('Service', serviceSchema);
