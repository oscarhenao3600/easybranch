const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    database: 'test'
  });
});

// Test WhatsApp endpoint
app.get('/api/whatsapp/connections', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        _id: 'test1',
        connectionName: 'Test Connection',
        phoneNumber: '+573001234567',
        customerServiceNumber: '+573001112233',
        status: 'connected',
        messagesToday: 5,
        responseRate: 95,
        qrCodeDataURL: null
      }
    ]
  });
});

// Test POST endpoint
app.post('/api/whatsapp/connections', (req, res) => {
  console.log('Received connection data:', req.body);
  res.json({
    success: true,
    data: {
      _id: 'new_connection_id',
      ...req.body,
      status: 'disconnected',
      qrCodeDataURL: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    },
    message: 'Conexión de WhatsApp creada exitosamente'
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;