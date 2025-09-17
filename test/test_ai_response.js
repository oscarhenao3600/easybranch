const AIService = require('../src/services/AIService');

async function testAIResponse() {
    console.log('🧪 ===== PROBANDO RESPUESTA DE IA =====');
    
    const aiService = new AIService();
    const branchId = '68c30abfe53cbd0d740e8c4e';
    const phoneNumber = '573113414361';
    
    try {
        console.log('📝 Probando mensaje: "que me recomiendas para desayunar"');
        
        const response = await aiService.generateResponse(
            branchId, 
            'que me recomiendas para desayunar', 
            phoneNumber, 
            'restaurant'
        );
        
        console.log('✅ Respuesta recibida:', response);
        console.log('📊 Tipo de respuesta:', typeof response);
        
        if (response && response.text) {
            console.log('📝 Texto de la respuesta:', response.text);
        } else {
            console.log('❌ La respuesta no tiene propiedad "text"');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    console.log('\n🎯 ===== PRUEBA COMPLETADA =====');
}

testAIResponse();
