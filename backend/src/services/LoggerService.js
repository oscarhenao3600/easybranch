const winston = require('winston');
const path = require('path');

class LoggerService {
  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { 
        service: 'easybranch',
        version: '2.0.0'
      },
      transports: [
        // Logs de error
        new winston.transports.File({ 
          filename: path.join(__dirname, '../logs/error.log'), 
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        // Logs de aplicación
        new winston.transports.File({ 
          filename: path.join(__dirname, '../logs/app.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ]
    });

    // Agregar transporte de consola en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  // Método para logs específicos de WhatsApp
  whatsapp(branchId, message, meta = {}) {
    this.logger.info(`[WhatsApp:${branchId}] ${message}`, {
      ...meta,
      component: 'whatsapp',
      branchId
    });
  }

  // Método para logs específicos de IA
  ai(branchId, message, meta = {}) {
    this.logger.info(`[AI:${branchId}] ${message}`, {
      ...meta,
      component: 'ai',
      branchId
    });
  }

  // Método para logs de autenticación
  auth(userId, action, meta = {}) {
    this.logger.info(`[Auth] ${action}`, {
      ...meta,
      component: 'auth',
      userId
    });
  }

  // Método para logs de base de datos
  database(operation, meta = {}) {
    this.logger.info(`[Database] ${operation}`, {
      ...meta,
      component: 'database'
    });
  }
}

module.exports = LoggerService;
