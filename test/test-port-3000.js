const express = require('express');
const cors = require('cors');
const app = express();

// Configurar CORS
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Servidor funcionando correctamente en puerto 3000',
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor en puerto 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor de prueba ejecutándose en puerto ${PORT}`);
    console.log(`📊 Test endpoint: http://localhost:${PORT}/api/test`);
});

// Manejar cierre graceful
process.on('SIGINT', () => {
    console.log('\n👋 Cerrando servidor...');
    process.exit(0);
});


