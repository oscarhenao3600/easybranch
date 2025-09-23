const http = require('http');

function testWhatsAppEndpoint() {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/whatsapp/connections',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Origin': 'http://localhost:4000'
        },
        timeout: 5000
    };

    const req = http.request(options, (res) => {
        console.log(`✅ Endpoint WhatsApp respondiendo - Status: ${res.statusCode}`);
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log('📊 Respuesta del endpoint WhatsApp:', data);
        });
    });

    req.on('error', (error) => {
        console.log('❌ Error en endpoint WhatsApp:', error.message);
    });

    req.on('timeout', () => {
        console.log('⏰ Timeout en endpoint WhatsApp');
        req.destroy();
    });

    req.end();
}

console.log('🔍 Probando endpoint de WhatsApp...');
testWhatsAppEndpoint();
