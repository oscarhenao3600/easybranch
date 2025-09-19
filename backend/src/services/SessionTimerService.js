const UserSession = require('../models/UserSession');
const WhatsAppConnection = require('../models/WhatsAppConnection');
const LoggerService = require('./LoggerService');
const WhatsAppServiceSimple = require('./WhatsAppServiceSimple');

class SessionTimerService {
  constructor() {
    this.logger = new LoggerService('SessionTimerService');
    this.intervalMs = 30 * 1000; // Verificar cada 30 segundos
    this.greetingTimerMs = 3 * 60 * 1000; // 3 minutos para saludo inicial
    this.reminderTimerMs = 5 * 60 * 1000; // 5 minutos para recordatorio
    this.timer = null;
    this.whatsapp = WhatsAppServiceSimple.getInstance();
    
    // Estados de sesión
    this.SESSION_STATES = {
      GREETING: 'greeting',           // Esperando respuesta al saludo (3 min)
      MENU_REQUESTED: 'menu_requested', // Menú solicitado, esperando respuesta (3 min)
      WAITING_REMINDER: 'waiting_reminder', // Enviado recordatorio, esperando respuesta (5 min)
      COMPLETED: 'completed',         // Pedido completado
      CANCELED: 'canceled'           // Sesión cancelada por inactividad
    };
  }

  start() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), this.intervalMs);
    this.logger.info('SessionTimerService iniciado con nueva lógica de timers');
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.logger.info('SessionTimerService detenido');
  }

  // Iniciar sesión cuando el cliente envía un saludo
  async startGreetingSession({ phoneNumber, branchId, connectionId, branchName }) {
    try {
      console.log('🕐 ===== INICIANDO SESIÓN DE SALUDO =====');
      console.log(`📞 Phone: ${phoneNumber}`);
      console.log(`🏪 Branch: ${branchName}`);
      console.log('⏰ Timer: 3 minutos para respuesta');
      console.log('==========================================');

      await UserSession.findOneAndUpdate(
        { phoneNumber, branchId },
        {
          connectionId,
          branchName,
          lastActivity: new Date(),
          status: this.SESSION_STATES.GREETING,
          hasActiveOrder: true,
          activeOrderId: null,
          reminderSent: false,
          reminderSentAt: null,
          greetingSent: false,
          menuRequested: false,
          reminderCount: 0
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      
      this.logger.info(`Sesión de saludo iniciada para ${phoneNumber} en ${branchName}`);
    } catch (e) {
      this.logger.error(`startGreetingSession error: ${e.message}`);
    }
  }

  // Reiniciar timer cuando el cliente solicita menú
  async onMenuRequest({ phoneNumber, branchId }) {
    try {
      console.log('📋 ===== MENÚ SOLICITADO - REINICIANDO TIMER =====');
      console.log(`📞 Phone: ${phoneNumber}`);
      console.log('⏰ Timer reiniciado: 3 minutos para respuesta');
      console.log('================================================');

      await UserSession.findOneAndUpdate(
        { phoneNumber, branchId },
        {
          lastActivity: new Date(),
          status: this.SESSION_STATES.MENU_REQUESTED,
          menuRequested: true,
          reminderSent: false,
          reminderSentAt: null,
          reminderCount: 0
        }
      );
      
      this.logger.info(`Timer reiniciado por solicitud de menú para ${phoneNumber}`);
    } catch (e) {
      this.logger.error(`onMenuRequest error: ${e.message}`);
    }
  }

  // Reiniciar timer cuando el cliente envía cualquier mensaje
  async onMessageReceived({ phoneNumber, branchId, message }) {
    try {
      console.log('💬 ===== MENSAJE RECIBIDO - REINICIANDO TIMER =====');
      console.log(`📞 Phone: ${phoneNumber}`);
      console.log(`💬 Message: ${message.substring(0, 50)}...`);
      console.log('⏰ Timer reiniciado: 3 minutos para respuesta');
      console.log('==================================================');

      await UserSession.findOneAndUpdate(
        { phoneNumber, branchId },
        {
          lastActivity: new Date(),
          status: this.SESSION_STATES.MENU_REQUESTED,
          reminderSent: false,
          reminderSentAt: null,
          reminderCount: 0
        }
      );
      
      this.logger.info(`Timer reiniciado por mensaje recibido para ${phoneNumber}`);
    } catch (e) {
      this.logger.error(`onMessageReceived error: ${e.message}`);
    }
  }

  // Completar sesión cuando el cliente acepta el pedido
  async completeSession({ phoneNumber, branchId }) {
    try {
      console.log('✅ ===== SESIÓN COMPLETADA =====');
      console.log(`📞 Phone: ${phoneNumber}`);
      console.log('🛑 Timers detenidos - No más mensajes');
      console.log('=====================================');

      await UserSession.findOneAndUpdate(
        { phoneNumber, branchId },
        {
          status: this.SESSION_STATES.COMPLETED,
          hasActiveOrder: false,
          activeOrderId: null,
          lastActivity: new Date(),
          reminderSent: false,
          reminderSentAt: null,
          reminderCount: 0
        }
      );
      
      this.logger.info(`Sesión completada para ${phoneNumber}`);
    } catch (e) {
      this.logger.error(`completeSession error: ${e.message}`);
    }
  }

  // Verificar timers y enviar mensajes apropiados
  async tick() {
    try {
      const now = Date.now();
      const sessions = await UserSession.find({ 
        hasActiveOrder: true, 
        status: { $in: [this.SESSION_STATES.GREETING, this.SESSION_STATES.MENU_REQUESTED, this.SESSION_STATES.WAITING_REMINDER] } 
      });
      
      for (const session of sessions) {
        const timeSinceLastActivity = now - (session.lastActivity ? session.lastActivity.getTime() : now);
        
        // Estado GREETING: Esperar 3 minutos, luego enviar recordatorio
        if (session.status === this.SESSION_STATES.GREETING && timeSinceLastActivity >= this.greetingTimerMs) {
          await this.sendFirstReminder(session);
          session.status = this.SESSION_STATES.WAITING_REMINDER;
          session.reminderSent = true;
          session.reminderSentAt = new Date();
          session.reminderCount = 1;
          await session.save();
        }
        
        // Estado MENU_REQUESTED: Esperar 3 minutos, luego enviar recordatorio
        else if (session.status === this.SESSION_STATES.MENU_REQUESTED && timeSinceLastActivity >= this.greetingTimerMs) {
          await this.sendFirstReminder(session);
          session.status = this.SESSION_STATES.WAITING_REMINDER;
          session.reminderSent = true;
          session.reminderSentAt = new Date();
          session.reminderCount = 1;
          await session.save();
        }
        
        // Estado WAITING_REMINDER: Esperar 5 minutos adicionales, luego cancelar
        else if (session.status === this.SESSION_STATES.WAITING_REMINDER && timeSinceLastActivity >= this.reminderTimerMs) {
          await this.sendCancellation(session);
          session.status = this.SESSION_STATES.CANCELED;
          session.hasActiveOrder = false;
          session.activeOrderId = null;
          await session.save();
        }
      }
    } catch (e) {
      this.logger.error(`tick error: ${e.message}`);
    }
  }

  // Enviar primer recordatorio (después de 3 minutos)
  async sendFirstReminder(session) {
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
      
      console.log('📤 ===== PRIMER RECORDATORIO ENVIADO =====');
      console.log(`📞 Phone: ${session.phoneNumber}`);
      console.log(`🏪 Branch: ${session.branchName}`);
      console.log('⏰ Timer: 5 minutos adicionales para respuesta');
      console.log('============================================');
      
      this.logger.info(`Primer recordatorio enviado a ${session.phoneNumber}`);
    } catch (e) {
      this.logger.error(`sendFirstReminder error: ${e.message}`);
    }
  }

  // Enviar cancelación (después de 5 minutos adicionales)
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
      
      console.log('❌ ===== SESIÓN CANCELADA =====');
      console.log(`📞 Phone: ${session.phoneNumber}`);
      console.log(`🏪 Branch: ${session.branchName}`);
      console.log('🛑 No más mensajes automáticos');
      console.log('===============================');
      
      this.logger.info(`Sesión cancelada para ${session.phoneNumber}`);
    } catch (e) {
      this.logger.error(`sendCancellation error: ${e.message}`);
    }
  }

  // Método legacy para compatibilidad (mantener por ahora)
  async upsertActivity({ phoneNumber, branchId, connectionId, branchName, hasActiveOrder = true, activeOrderId = null }) {
    // Si es un saludo, iniciar sesión de saludo
    if (hasActiveOrder && !activeOrderId) {
      await this.startGreetingSession({ phoneNumber, branchId, connectionId, branchName });
    } else {
      // Para otros casos, usar la lógica anterior
      await this.onMessageReceived({ phoneNumber, branchId, message: 'Activity update' });
    }
  }

  // Método legacy para compatibilidad
  async complete({ phoneNumber, branchId }) {
    await this.completeSession({ phoneNumber, branchId });
  }
}

module.exports = SessionTimerService;


