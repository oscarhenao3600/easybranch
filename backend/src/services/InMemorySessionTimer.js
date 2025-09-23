const LoggerService = require('./LoggerService');
const WhatsAppServiceSimple = require('./WhatsAppServiceSimple');

class InMemorySessionTimer {
  constructor() {
    this.logger = new LoggerService('InMemorySessionTimer');
    this.sessions = new Map(); // key: phoneNumber, value: { reminderTimer, cancelTimer, connectionId, branchName, fromPhone }
    this.reminderMs = 3 * 60 * 1000; // 3 minutes
    this.cancelMs = 8 * 60 * 1000; // 8 minutes total (3 + 5)
    this.whatsappService = new WhatsAppServiceSimple();
  }

  static getInstance() {
    if (!InMemorySessionTimer._instance) {
      InMemorySessionTimer._instance = new InMemorySessionTimer();
    }
    return InMemorySessionTimer._instance;
  }

  touchSession(connection, clientPhone, branchName = 'nuestra sucursal') {
    try {
      const key = clientPhone;
      // Clear previous timers
      this.clearSession(key);

      // Schedule reminder
      const reminderTimer = setTimeout(async () => {
        try {
          const message = `¡Hola! 😊 ¿Aún estás ahí? Tu pedido en ${branchName} está esperando. Si deseas continuar, solo respóndeme.`;
          await this.whatsappService.sendMessage(connection.phoneNumber, clientPhone, message);
          this.logger.info(`Reminder sent to ${clientPhone}`);
        } catch (err) {
          this.logger.error(`Failed to send reminder to ${clientPhone}: ${err.message}`);
        }
      }, this.reminderMs);

      // Schedule cancellation (total 8 minutes)
      const cancelTimer = setTimeout(async () => {
        try {
          const message = `Hemos cancelado tu pedido por inactividad. Cuando quieras, estamos atentos en ${branchName} para ayudarte nuevamente.`;
          await this.whatsappService.sendMessage(connection.phoneNumber, clientPhone, message);
          this.logger.info(`Cancellation notice sent to ${clientPhone}`);
          this.clearSession(key);
        } catch (err) {
          this.logger.error(`Failed to send cancellation to ${clientPhone}: ${err.message}`);
        }
      }, this.cancelMs);

      this.sessions.set(key, {
        reminderTimer,
        cancelTimer,
        connectionId: connection._id,
        fromPhone: connection.phoneNumber,
        branchName
      });

      this.logger.debug(`Timers set for ${clientPhone}`);
    } catch (error) {
      this.logger.error(`touchSession error: ${error.message}`);
    }
  }

  completeSession(clientPhone) {
    this.clearSession(clientPhone);
    this.logger.info(`Session completed for ${clientPhone}`);
  }

  clearSession(key) {
    const existing = this.sessions.get(key);
    if (existing) {
      if (existing.reminderTimer) clearTimeout(existing.reminderTimer);
      if (existing.cancelTimer) clearTimeout(existing.cancelTimer);
      this.sessions.delete(key);
    }
  }
}

module.exports = InMemorySessionTimer;


