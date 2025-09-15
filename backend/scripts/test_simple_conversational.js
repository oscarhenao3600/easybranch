const mongoose = require('mongoose');
const ConversationalMemoryService = require('../src/services/ConversationalMemoryService');

require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch';

async function testSimple() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const conversationalService = new ConversationalMemoryService();

        const phoneNumber = '573113414361';
        const branchId = '68c30abfe53cbd0d740e8c4e';
        const businessId = '68c30abfe53cbd0d740e8c4a';
        const businessType = 'cafeteria';

        console.log('\n🧪 ===== PRUEBA SIMPLE DEL SISTEMA =====');

        // Prueba simple
        const response = await conversationalService.generatePersonalizedResponse(
            phoneNumber, branchId, businessId, 'hola', businessType
        );
        
        console.log(`💬 Respuesta: ${response.response}`);
        console.log(`🎯 Intención: ${response.intent}`);
        console.log(`😊 Sentimiento: ${response.sentiment}`);
        console.log(`👤 Personalidad: ${response.personality}`);

        console.log('\n✅ Sistema funcionando correctamente');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

testSimple();



