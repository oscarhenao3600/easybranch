const app = require('./app');
const DatabaseService = require('./services/DatabaseService');
const LoggerService = require('./services/LoggerService');

const PORT = process.env.PORT || 4000;
const logger = new LoggerService();
const databaseService = new DatabaseService();

async function startServer() {
  try {
    // Conectar a la base de datos
    logger.info('🔄 Conectando a la base de datos...');
    await databaseService.connect();
    logger.info('✅ Base de datos conectada');

    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`🚀 Servidor EasyBranch ejecutándose en puerto ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/api/health`);
      logger.info(`📁 Frontend: http://localhost:${PORT}/frontend-admin`);
      logger.info(`📄 Uploads: http://localhost:${PORT}/uploads`);
      logger.info(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    logger.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Manejo de señales de terminación
process.on('SIGTERM', async () => {
  logger.info('🛑 Recibida señal SIGTERM, cerrando servidor...');
  await databaseService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('🛑 Recibida señal SIGINT, cerrando servidor...');
  await databaseService.disconnect();
  process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('❌ Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Promesa rechazada no manejada:', reason);
  process.exit(1);
});

// Iniciar servidor
startServer();
