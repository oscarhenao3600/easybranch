const http = require('http');

function testServer() {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/health',
        method: 'GET',
        timeout: 5000
    };

    const req = http.request(options, (res) => {
        console.log(`✅ Servidor respondiendo - Status: ${res.statusCode}`);
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log('📊 Respuesta del servidor:', data);
        });
    });

    req.on('error', (error) => {
        console.log('❌ Error conectando al servidor:', error.message);
        console.log('💡 El servidor no está ejecutándose en el puerto 3000');
    });

    req.on('timeout', () => {
        console.log('⏰ Timeout - El servidor no responde');
        req.destroy();
    });

    req.end();
}

console.log('🔍 Probando conectividad con el servidor...');
testServer();
