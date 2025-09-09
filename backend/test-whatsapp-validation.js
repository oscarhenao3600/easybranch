const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test script to verify WhatsApp validation
async function testWhatsAppValidation() {
    console.log('🧪 ===== PROBANDO VALIDACIÓN DE WHATSAPP =====');
    
    try {
        // Test 1: Get available branches
        console.log('\n📋 Test 1: Obteniendo sucursales disponibles...');
        const availableResponse = await axios.get(`${BASE_URL}/whatsapp/available-branches`);
        console.log('✅ Respuesta:', JSON.stringify(availableResponse.data, null, 2));
        
        // Test 2: Try to create connection without branches
        console.log('\n📋 Test 2: Intentando crear conexión...');
        try {
            const createResponse = await axios.post(`${BASE_URL}/whatsapp/connections`, {
                businessId: 'test-business',
                branchId: 'test-branch',
                phoneNumber: '+573001234567',
                connectionName: 'Test Connection',
                customerServiceNumber: '+573001234567'
            });
            console.log('⚠️ Conexión creada (no debería pasar):', createResponse.data);
        } catch (error) {
            console.log('✅ Validación funcionando:', error.response?.data?.error || error.message);
        }
        
        console.log('\n🎉 ===== PRUEBAS COMPLETADAS =====');
        
    } catch (error) {
        console.error('❌ Error en las pruebas:', error.message);
        if (error.response) {
            console.error('Respuesta del servidor:', error.response.data);
        }
    }
}

// Run tests
testWhatsAppValidation();
