const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, index: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppConnection', required: true },
  branchName: { type: String, required: true },
  lastActivity: { type: Date, default: Date.now, index: true },
  hasActiveOrder: { type: Boolean, default: false },
  activeOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  status: { type: String, enum: ['active', 'waiting_reminder', 'waiting_cancel', 'completed', 'canceled'], default: 'active', index: true },
  reminderSent: { type: Boolean, default: false },
  reminderSentAt: { type: Date, default: null }
}, { timestamps: true });

userSessionSchema.index({ phoneNumber: 1, branchId: 1 }, { unique: true });

module.exports = mongoose.model('UserSession', userSessionSchema);

