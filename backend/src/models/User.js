const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'business_admin', 'branch_admin', 'staff'],
    default: 'staff'
  },
  businessId: {
    type: String,
    ref: 'Business',
    index: true
  },
  branchId: {
    type: String,
    ref: 'Branch',
    index: true
  },
  permissions: [{
    type: String,
    enum: [
      'manage_business',
      'manage_branches',
      'manage_services',
      'manage_orders',
      'manage_users',
      'view_reports',
      'manage_whatsapp',
      'manage_ai',
      'manage_billing'
    ]
  }],
  profile: {
    phone: String,
    avatar: String,
    timezone: {
      type: String,
      default: 'America/Bogota'
    },
    language: {
      type: String,
      default: 'es'
    }
  },
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para mejor rendimiento
userSchema.index({ userId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ businessId: 1 });
userSchema.index({ branchId: 1 });
userSchema.index({ role: 1 });

// Middleware para encriptar contraseña antes de guardar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Método para verificar permisos
userSchema.methods.hasPermission = function(permission) {
  if (this.role === 'super_admin') return true;
  return this.permissions.includes(permission);
};

// Método para obtener datos seguros (sin contraseña)
userSchema.methods.toSafeObject = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Método estático para crear super admin
userSchema.statics.createSuperAdmin = async function(data) {
  const superAdmin = new this({
    userId: 'super-admin',
    email: data.email,
    password: data.password,
    name: data.name,
    role: 'super_admin',
    permissions: [
      'manage_business',
      'manage_branches',
      'manage_services',
      'manage_orders',
      'manage_users',
      'view_reports',
      'manage_whatsapp',
      'manage_ai',
      'manage_billing'
    ]
  });
  
  return await superAdmin.save();
};

module.exports = mongoose.model('User', userSchema);
