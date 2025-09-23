const AIService = require('../src/services/AIService');

async function testOrderProcessing() {
    console.log('🧪 ===== PROBANDO PROCESAMIENTO DE PEDIDOS =====');
    
    const aiService = new AIService();
    const branchId = '68c30abfe53cbd0d740e8c4e';
    const phoneNumber = '573053397959';
    
    // Casos de prueba
    const testCases = [
        'pedir Frappé de Café',
        'quiero un Frappé de Café',
        'me das un Frappé de Café',
        'Frappé de Café por favor',
        'pedir hamburguesa con queso',
        'quiero una hamburguesa con queso',
        'me das una hamburguesa con queso'
    ];
    
    for (const testCase of testCases) {
        console.log(`\n📝 Probando: "${testCase}"`);
        
        try {
            const result = await aiService.processOrder(testCase);
            console.log('✅ Resultado:', result);
        } catch (error) {
            console.log('❌ Error:', error.message);
        }
    }
    
    console.log('\n🎯 ===== PRUEBA COMPLETADA =====');
}

testOrderProcessing();
