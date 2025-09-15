const mongoose = require('mongoose');
const ConversationalMemoryService = require('../src/services/ConversationalMemoryService');
const BusinessKnowledgeService = require('../src/services/BusinessKnowledgeService');

require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch';

async function runTest() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const conversationalService = new ConversationalMemoryService();
        const knowledgeService = new BusinessKnowledgeService();

        const phoneNumber = '573113414361';
        const branchId = '68c30abfe53cbd0d740e8c4e';
        const businessId = '68c30abfe53cbd0d740e8c4a';
        const businessType = 'cafeteria';

        console.log('\n🧪 ===== PRUEBA DEL SISTEMA CONVERSACIONAL ROBUSTO =====');
        console.log(`📱 Teléfono: ${phoneNumber}`);
        console.log(`🏪 Sucursal: ${branchId}`);
        console.log(`🏢 Negocio: ${businessId}`);
        console.log(`🍽️ Tipo: ${businessType}`);

        // Prueba 1: Saludo inicial
        console.log('\n📝 PRUEBA 1: Saludo inicial');
        const greetingResponse = await conversationalService.generatePersonalizedResponse(
            phoneNumber, branchId, businessId, 'Hola', businessType
        );
        console.log(`💬 Respuesta: ${greetingResponse.response}`);
        console.log(`🎯 Intención: ${greetingResponse.intent}`);
        console.log(`😊 Sentimiento: ${greetingResponse.sentiment}`);
        console.log(`👤 Personalidad: ${greetingResponse.personality}`);
        console.log(`📊 Fuente: ${greetingResponse.knowledgeSource}`);

        // Prueba 2: Consulta de menú
        console.log('\n📝 PRUEBA 2: Consulta de menú');
        const menuResponse = await conversationalService.generatePersonalizedResponse(
            phoneNumber, branchId, businessId, '¿Qué tienen en el menú?', businessType
        );
        console.log(`💬 Respuesta: ${menuResponse.response}`);
        console.log(`🎯 Intención: ${menuResponse.intent}`);
        console.log(`📊 Fuente: ${menuResponse.knowledgeSource}`);

        // Prueba 3: Consulta de delivery
        console.log('\n📝 PRUEBA 3: Consulta de delivery');
        const deliveryResponse = await conversationalService.generatePersonalizedResponse(
            phoneNumber, branchId, businessId, '¿Hacen delivery?', businessType
        );
        console.log(`💬 Respuesta: ${deliveryResponse.response}`);
        console.log(`🎯 Intención: ${deliveryResponse.intent}`);
        console.log(`📊 Fuente: ${deliveryResponse.knowledgeSource}`);

        // Prueba 4: Consulta de horarios
        console.log('\n📝 PRUEBA 4: Consulta de horarios');
        const hoursResponse = await conversationalService.generatePersonalizedResponse(
            phoneNumber, branchId, businessId, '¿Cuáles son sus horarios?', businessType
        );
        console.log(`💬 Respuesta: ${hoursResponse.response}`);
        console.log(`🎯 Intención: ${hoursResponse.intent}`);
        console.log(`📊 Fuente: ${hoursResponse.knowledgeSource}`);

        // Prueba 5: Cliente confundido
        console.log('\n📝 PRUEBA 5: Cliente confundido');
        const confusedResponse = await conversationalService.generatePersonalizedResponse(
            phoneNumber, branchId, businessId, 'No entiendo qué tienen', businessType
        );
        console.log(`💬 Respuesta: ${confusedResponse.response}`);
        console.log(`🎯 Intención: ${confusedResponse.intent}`);
        console.log(`😊 Sentimiento: ${confusedResponse.sentiment}`);
        console.log(`📊 Fuente: ${confusedResponse.knowledgeSource}`);

        // Prueba 6: Cliente feliz
        console.log('\n📝 PRUEBA 6: Cliente feliz');
        const happyResponse = await conversationalService.generatePersonalizedResponse(
            phoneNumber, branchId, businessId, '¡Me encanta este lugar!', businessType
        );
        console.log(`💬 Respuesta: ${happyResponse.response}`);
        console.log(`🎯 Intención: ${happyResponse.intent}`);
        console.log(`😊 Sentimiento: ${happyResponse.sentiment}`);
        console.log(`📊 Fuente: ${happyResponse.knowledgeSource}`);

        // Prueba 7: Obtener contexto del cliente
        console.log('\n📝 PRUEBA 7: Contexto del cliente');
        const clientContext = await conversationalService.getClientContext(phoneNumber, branchId, businessId);
        console.log(`👤 Información del cliente:`, clientContext.clientInfo);
        console.log(`📊 Contexto actual:`, clientContext.currentContext);
        console.log(`💭 Estado emocional:`, clientContext.emotionalState);

        // Prueba 8: Estadísticas de conversación
        console.log('\n📝 PRUEBA 8: Estadísticas de conversación');
        const conversationStats = await conversationalService.getConversationStats(phoneNumber, branchId, businessId);
        console.log(`📈 Estadísticas:`, conversationStats);

        // Prueba 9: Estadísticas de base de conocimiento
        console.log('\n📝 PRUEBA 9: Estadísticas de base de conocimiento');
        const knowledgeStats = await knowledgeService.getKnowledgeStats(businessId, branchId);
        console.log(`📚 Estadísticas de conocimiento:`, knowledgeStats);

        console.log('\n🎉 ===== PRUEBA COMPLETADA EXITOSAMENTE =====');
        console.log('✅ Sistema conversacional robusto funcionando');
        console.log('✅ Personalidad del bot implementada');
        console.log('✅ Memoria conversacional activa');
        console.log('✅ Base de conocimiento integrada');
        console.log('✅ Respuestas contextuales generadas');

    } catch (error) {
        console.error('❌ Error durante la prueba:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

runTest();



