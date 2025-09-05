const mongoose = require('mongoose');
const LoggerService = require('./LoggerService');

class DatabaseService {
  constructor() {
    this.logger = new LoggerService();
    this.isConnected = false;
    this.connection = null;
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch';
      
      this.logger.database('Conectando a MongoDB...', { uri: mongoUri });
      
      this.connection = await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false
      });

      this.isConnected = true;
      
      this.logger.database('Conexión exitosa a MongoDB');

      // Configurar eventos de conexión
      mongoose.connection.on('connected', () => {
        this.logger.database('MongoDB conectado');
        this.isConnected = true;
      });

      mongoose.connection.on('error', (err) => {
        this.logger.error('Error de conexión MongoDB:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        this.logger.warn('MongoDB desconectado');
        this.isConnected = false;
      });

      return this.connection;

    } catch (error) {
      this.logger.error('Error conectando a MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.isConnected = false;
        this.logger.database('Desconexión exitosa de MongoDB');
      }
    } catch (error) {
      this.logger.error('Error desconectando de MongoDB:', error);
      throw error;
    }
  }

  getConnection() {
    return this.connection;
  }

  getConnectionStatus() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  // Método para verificar salud de la base de datos
  async healthCheck() {
    try {
      if (!this.getConnectionStatus()) {
        return {
          status: 'disconnected',
          message: 'Base de datos no conectada'
        };
      }

      // Ejecutar ping a la base de datos
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        message: 'Base de datos funcionando correctamente',
        collections: Object.keys(mongoose.connection.collections)
      };

    } catch (error) {
      this.logger.error('Error en health check de BD:', error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  // Método para obtener estadísticas de la base de datos
  async getStats() {
    try {
      if (!this.getConnectionStatus()) {
        return null;
      }

      const stats = await mongoose.connection.db.stats();
      
      return {
        database: stats.db,
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize
      };

    } catch (error) {
      this.logger.error('Error obteniendo estadísticas de BD:', error);
      return null;
    }
  }
}

module.exports = DatabaseService;
