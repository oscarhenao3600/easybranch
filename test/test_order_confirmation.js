const AIService = require('../src/services/AIService');

// Crear instancia del servicio
const aiService = new AIService();

console.log('🧪 ===== PROBANDO SISTEMA DE CONFIRMACIÓN DE PEDIDOS =====\n');

async function testOrderConfirmation() {
    try {
        const clientId = '573113414361';
        const branchId = '68c30abfe53cbd0d740e8c4e';
        
        // 1. Hacer un pedido
        console.log('1️⃣ Haciendo pedido...');
        const orderMessage = 'quiero 1 café americano';
        const orderResponse = await aiService.generateResponse(branchId, orderMessage, clientId, 'restaurant', null);
        console.log('📝 Respuesta del pedido:');
        console.log(orderResponse);
        console.log('\n---\n');
        
        // 2. Confirmar el pedido
        console.log('2️⃣ Confirmando pedido...');
        const confirmationMessage = 'sí';
        const confirmationResponse = await aiService.generateResponse(branchId, confirmationMessage, clientId, 'restaurant', null);
        console.log('✅ Respuesta de confirmación:');
        console.log(confirmationResponse);
        console.log('\n---\n');
        
        // 3. Probar otras formas de confirmación
        const confirmations = ['confirmo', 'ok', 'perfecto', 'dale'];
        
        for (const confirmation of confirmations) {
            console.log(`3️⃣ Probando confirmación: "${confirmation}"`);
            const response = await aiService.generateResponse(branchId, confirmation, clientId, 'restaurant', null);
            console.log(`✅ Respuesta: ${response.substring(0, 100)}...`);
            console.log('---');
        }
        
    } catch (error) {
        console.error('❌ Error en prueba:', error);
    }
}

testOrderConfirmation();
