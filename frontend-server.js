const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend
app.use('/', express.static(path.join(__dirname, '../frontend-admin')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    message: 'Frontend servidor funcionando'
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend-admin/index.html'));
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 Frontend servidor ejecutándose en puerto ${PORT}`);
  console.log(`📱 Frontend disponible en: http://localhost:${PORT}/`);
  console.log(`🔍 Health check en: http://localhost:${PORT}/api/health`);
});
