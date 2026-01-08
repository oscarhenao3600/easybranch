const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Importar servicios
const DatabaseService = require('./services/DatabaseService');
const LoggerService = require('./services/LoggerService');

// Importar rutas modulares
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const businessRoutes = require('./routes/business');
const branchRoutes = require('./routes/branch');
const whatsappRoutes = require('./routes/whatsapp');
const aiRoutes = require('./routes/ai');
const branchAIConfigRoutes = require('./routes/branchAIConfig');
const orderRoutes = require('./routes/order');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');
const billingRoutes = require('./routes/billing');
const conversationRoutes = require('./routes/conversations');

const app = express();

// Inicializar servicios
const logger = new LoggerService();
// databaseService se inicializa en server.js
let databaseService = null;

// Función para establecer la instancia del databaseService
function setDatabaseService(service) {
  databaseService = service;
}

// Configurar rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // límite por IP
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
  }
});

// Middlewares de seguridad
app.use(helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'", "https://cdn.jsdelivr.net", "https://code.jquery.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:4000","http://192.168.1.23:4000"],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            workerSrc: ["'self'"]
          }
        }
}));
app.use(limiter);
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Get allowed origins from environment variable or use defaults
    const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
    let allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://192.168.1.23:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:4000',
      'http://127.0.0.1:4000',
      'http://192.168.1.23:4000',
      'http://localhost:5173', // Vite default port
      'http://127.0.0.1:5173',
      'http://localhost:8080', // Common dev port
      'http://127.0.0.1:8080'
    ];
    
    // If ALLOWED_ORIGINS is set in environment, use it
    if (allowedOriginsEnv) {
      allowedOrigins = allowedOriginsEnv.split(',').map(origin => origin.trim());
    }
    
    // In development, allow any localhost origin or same IP origin
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      // Allow localhost on any port
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
      
      // Allow same IP address on any port (for network access)
      const serverIP = '192.168.1.23'; // Puedes hacerlo dinámico si es necesario
      if (origin.includes(serverIP)) {
        return callback(null, true);
      }
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      // En desarrollo, permitir de todas formas pero loguear
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        logger.warn(`⚠️ CORS: Permitiendo origen en desarrollo: ${origin}`);
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization']
}));

// Manejar preflight requests de CORS explícitamente
app.options('*', cors());

// Middlewares de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use('/frontend-admin', express.static(path.join(__dirname, '../../frontend-admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware de logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Rutas modulares
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/branch', branchRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/branch-ai-config', branchAIConfigRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/conversations', conversationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV,
    database: databaseService ? (databaseService.getConnectionStatus() ? 'connected' : 'disconnected') : 'not_initialized'
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'EasyBranch API v2.0',
    documentation: '/api/docs',
    health: '/api/health'
  });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  logger.error('Error no manejado:', err);
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
    timestamp: new Date().toISOString()
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
module.exports.setDatabaseService = setDatabaseService;
