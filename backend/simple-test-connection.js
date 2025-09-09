// Script simple para probar la creación de conexión WhatsApp
const http = require('http');

function testConnection() {
    console.log('🧪 Probando creación de conexión WhatsApp...');
    
    const postData = JSON.stringify({
        phoneNumber: '+573001234567',
        connectionName: 'Conexión de Prueba',
        businessId: 'business1',
        branchId: 'branch1',
        customerServiceNumber: '+573001234567',
        autoReply: true,
        aiIntegration: true,
        businessHours: {
            start: '08:00',
            end: '22:00'
        },
        offHoursMessage: 'Gracias por contactarnos. Te responderemos pronto.'
    });

    const options = {
        hostname: 'localhost',
        port: 4000,
        path: '/api/whatsapp/connections',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Authorization': 'Bearer test-token'
        }
    };

    const req = http.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('Response:', data);
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.write(postData);
    req.end();
}

testConnection();

