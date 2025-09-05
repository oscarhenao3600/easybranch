const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());

// Servir archivos estáticos
app.use('/frontend-admin', express.static(path.join(__dirname, '../frontend-admin')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    message: 'Servidor de prueba funcionando'
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'EasyBranch API v2.0 - Servidor de Prueba',
    health: '/api/health',
    frontend: '/frontend-admin/'
  });
});

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log(`🚀 Servidor de prueba ejecutándose en puerto ${PORT}`);
  console.log(`📱 Frontend disponible en: http://localhost:${PORT}/frontend-admin/`);
  console.log(`🔍 Health check en: http://localhost:${PORT}/api/health`);
});
