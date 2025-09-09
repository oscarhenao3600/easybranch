const fetch = require('node-fetch');

async function testWhatsAppConnectionCreation() {
    try {
        console.log('🧪 ===== PROBANDO CREACIÓN DE CONEXIÓN WHATSAPP =====');
        
        const baseURL = 'http://localhost:4000/api';
        
        // Primero hacer login para obtener token
        console.log('\n🔑 Obteniendo token de autenticación...');
        const loginResponse = await fetch(`${baseURL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@easybranch.com',
                password: 'admin123'
            })
        });
        
        if (!loginResponse.ok) {
            console.log('❌ Error en login:', loginResponse.status);
            return;
        }
        
        const loginData = await loginResponse.json();
        const token = loginData.data.token;
        console.log('✅ Token obtenido exitosamente');
        
        // Probar creación de conexión WhatsApp
        console.log('\n📱 Probando creación de conexión WhatsApp...');
        const connectionData = {
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
        };
        
        const connectionResponse = await fetch(`${baseURL}/whatsapp/connections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(connectionData)
        });
        
        if (connectionResponse.ok) {
            const connectionResult = await connectionResponse.json();
            console.log('✅ Conexión creada exitosamente:', connectionResult.data);
        } else {
            const errorData = await connectionResponse.json();
            console.log('❌ Error creando conexión:', errorData);
        }
        
        console.log('\n🎉 Prueba completada');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

// Ejecutar prueba
testWhatsAppConnectionCreation();

