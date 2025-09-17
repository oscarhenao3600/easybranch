const mongoose = require('mongoose');
const RecommendationService = require('../src/services/RecommendationService');
const AIService = require('../src/services/AIService');

async function testWingsMasterFlow() {
    try {
        console.log('🍗 Probando sistema de recomendaciones para Wings Master...\n');
        
        // Conectar a MongoDB
        await mongoose.connect('mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB\n');
        
        // Instanciar servicios
        const recommendationService = new RecommendationService();
        const aiService = new AIService();
        
        const branchId = '68c98462727208bbd6a8becd'; // Wings Master Centro
        const businessId = 'WINGS001';
        
        // === CASO 1: 4 PERSONAS - ALMUERZO INFORMAL ===
        console.log('📱 CASO 1: 4 personas - Almuerzo informal');
        console.log('='.repeat(60));
        
        const session1 = await recommendationService.createSession('573053397959', branchId, businessId, 4);
        
        console.log('🤖 Bot: ¡Hola! Me da mucho gusto ayudarte a encontrar algo delicioso para 4 personas.');
        console.log('🤖 Bot: Solo necesito hacerte 5 preguntas rápidas para recomendarte la opción perfecta según tu presupuesto y gustos.\n');
        
        // Simular las 5 preguntas
        let currentQuestion = await recommendationService.getNextQuestion(session1.sessionId);
        for (let i = 1; i <= 5; i++) {
            console.log(`📋 Pregunta ${i}/5: ${currentQuestion.question}`);
            console.log(`Opciones: ${currentQuestion.options.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n')}\n`);
            
            // Simular respuesta
            const answer = i === 1 ? '3' : i === 2 ? '2' : i === 3 ? '7' : i === 4 ? '6' : '1';
            console.log(`👤 Usuario: ${answer}`);
            
            const session = await recommendationService.processAnswer(session1.sessionId, answer);
            if (session.currentStep >= 5) {
                console.log('🎉 ¡Recomendación completada!');
                const recommendations = await recommendationService.generateRecommendations(session);
                if (recommendations.length > 0) {
                    const rec = recommendations[0];
                    console.log(`🤖 Bot: ${rec.productName} - $${rec.price} x ${rec.quantity} = $${rec.totalPrice}\n`);
                }
                break;
            }
            currentQuestion = await recommendationService.getNextQuestion(session1.sessionId);
        }
        
        console.log('👤 Usuario: pedir');
        console.log('🤖 Bot: ¡Perfecto! 🛒 Vamos a procesar tu pedido...');
        console.log('🤖 Bot: Resumen del pedido: [Producto recomendado] x 4 personas\n');
        
        console.log('👤 Usuario: sí');
        console.log('🤖 Bot: ¡Excelente! Tu pedido ha sido confirmado y guardado en la base de datos.\n');
        
        // === CASO 2: 8 PERSONAS - CENA DE CELEBRACIÓN ===
        console.log('\n📱 CASO 2: 8 personas - Cena de celebración');
        console.log('='.repeat(60));
        
        const session2 = await recommendationService.createSession('573053397959', branchId, businessId, 8);
        
        console.log('🤖 Bot: ¡Hola! Me da mucho gusto ayudarte a encontrar algo delicioso para 8 personas.');
        console.log('🤖 Bot: Solo necesito hacerte 5 preguntas rápidas para recomendarte la opción perfecta según tu presupuesto y gustos.\n');
        
        // Simular las 5 preguntas (diferentes para mostrar variación)
        currentQuestion = await recommendationService.getNextQuestion(session2.sessionId);
        for (let i = 1; i <= 5; i++) {
            console.log(`📋 Pregunta ${i}/5: ${currentQuestion.question}`);
            console.log(`Opciones: ${currentQuestion.options.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n')}\n`);
            
            // Simular respuesta diferente
            const answer = i === 1 ? '4' : i === 2 ? '3' : i === 3 ? '7' : i === 4 ? '1' : '3';
            console.log(`👤 Usuario: ${answer}`);
            
            const session = await recommendationService.processAnswer(session2.sessionId, answer);
            if (session.currentStep >= 5) {
                console.log('🎉 ¡Recomendación completada!');
                const recommendations = await recommendationService.generateRecommendations(session);
                if (recommendations.length > 0) {
                    const rec = recommendations[0];
                    console.log(`🤖 Bot: ${rec.productName} - $${rec.price} x ${rec.quantity} = $${rec.totalPrice}\n`);
                }
                break;
            }
            currentQuestion = await recommendationService.getNextQuestion(session2.sessionId);
        }
        
        console.log('👤 Usuario: pedir');
        console.log('🤖 Bot: ¡Perfecto! 🛒 Vamos a procesar tu pedido...');
        console.log('🤖 Bot: Resumen del pedido: [Producto recomendado] x 8 personas\n');
        
        console.log('👤 Usuario: sí');
        console.log('🤖 Bot: ¡Excelente! Tu pedido ha sido confirmado y guardado en la base de datos.\n');
        
        console.log('✅ Prueba de Wings Master completada!');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

testWingsMasterFlow();


