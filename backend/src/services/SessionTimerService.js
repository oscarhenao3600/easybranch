const UserSession = require('../models/UserSession');
const WhatsAppConnection = require('../models/WhatsAppConnection');
const LoggerService = require('./LoggerService');
const WhatsAppServiceSimple = require('./WhatsAppServiceSimple');

class SessionTimerService {
  constructor() {
    this.logger = new LoggerService('SessionTimerService');
    this.intervalMs = 30 * 1000; // 30s
    this.reminderMs = 3 * 60 * 1000; // 3 min
    this.cancelMs = 8 * 60 * 1000; // 8 min total
    this.timer = null;
    this.whatsapp = WhatsAppServiceSimple.getInstance();
  }

  start() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), this.intervalMs);
    this.logger.info('SessionTimerService iniciado');
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.logger.info('SessionTimerService detenido');
  }

  async upsertActivity({ phoneNumber, branchId, connectionId, branchName, hasActiveOrder = true, activeOrderId = null }) {
    try {
      await UserSession.findOneAndUpdate(
        { phoneNumber, branchId },
        {
          connectionId,
          branchName,
          lastActivity: new Date(),
          hasActiveOrder,
          activeOrderId,
          status: 'active',
          reminderSent: false,
          reminderSentAt: null
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (e) {
      this.logger.error(`upsertActivity error: ${e.message}`);
    }
  }

  async complete({ phoneNumber, branchId }) {
    try {
      await UserSession.findOneAndUpdate(
        { phoneNumber, branchId },
        { hasActiveOrder: false, activeOrderId: null, status: 'completed', lastActivity: new Date(), reminderSent: false, reminderSentAt: null }
      );
    } catch (e) {
      this.logger.error(`complete error: ${e.message}`);
    }
  }

  async tick() {
    try {
      const now = Date.now();
      const sessions = await UserSession.find({ hasActiveOrder: true, status: { $in: ['active', 'waiting_reminder'] } });
      for (const s of sessions) {
        const since = now - (s.lastActivity ? s.lastActivity.getTime() : now);
        if (s.status === 'active' && since >= this.reminderMs && !s.reminderSent) {
          await this.sendReminder(s);
          s.status = 'waiting_reminder';
          s.reminderSent = true;
          s.reminderSentAt = new Date();
          await s.save();
        } else if (s.status === 'waiting_reminder' && since >= this.cancelMs) {
          await this.sendCancellation(s);
          s.status = 'canceled';
          s.hasActiveOrder = false;
          s.activeOrderId = null;
          await s.save();
        }
      }
    } catch (e) {
      this.logger.error(`tick error: ${e.message}`);
    }
  }

  async sendReminder(session) {
    try {
      const connection = await WhatsAppConnection.findById(session.connectionId);
      if (!connection) return;
      
      // Ensure client is initialized
      if (!this.whatsapp.clients.has(String(connection._id))) {
        this.logger.info(`Initializing WhatsApp client for connection ${connection._id}`);
        await this.whatsapp.ensureClient(connection._id, connection.phoneNumber);
      }
      
      const msg = `¡Hola! 😊 ¿Aún estás ahí? Tu pedido en ${session.branchName} está esperando. Si deseas continuar, solo respóndeme.`;
      await this.whatsapp.sendMessage(connection._id, session.phoneNumber, msg);
      this.logger.info(`Reminder sent to ${session.phoneNumber}`);
    } catch (e) {
      this.logger.error(`sendReminder error: ${e.message}`);
    }
  }

  async sendCancellation(session) {
    try {
      const connection = await WhatsAppConnection.findById(session.connectionId);
      if (!connection) return;
      
      // Ensure client is initialized
      if (!this.whatsapp.clients.has(String(connection._id))) {
        this.logger.info(`Initializing WhatsApp client for connection ${connection._id}`);
        await this.whatsapp.ensureClient(connection._id, connection.phoneNumber);
      }
      
      const msg = `Hemos cancelado tu pedido por inactividad. Cuando quieras, estamos atentos en ${session.branchName} para ayudarte nuevamente.`;
      await this.whatsapp.sendMessage(connection._id, session.phoneNumber, msg);
      this.logger.info(`Cancellation sent to ${session.phoneNumber}`);
    } catch (e) {
      this.logger.error(`sendCancellation error: ${e.message}`);
    }
  }
}

module.exports = SessionTimerService;


