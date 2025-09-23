const mongoose = require('mongoose');
const RecommendationService = require('../src/services/RecommendationService');
const AIService = require('../src/services/AIService');

async function simulateBotResponses() {
    try {
        console.log('🚀 Simulando respuestas del bot para diferentes casos...\n');
        
        // Conectar a MongoDB
        await mongoose.connect('mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB\n');
        
        // Instanciar servicios
        const recommendationService = new RecommendationService();
        const aiService = new AIService();
        
        const branchId = '68c30abfe53cbd0d740e8c4e'; // ID de la sucursal con menú disponible
        
        // === CASO 1: 3 PERSONAS - MERIENDA MEDIA MAÑANA ===
        console.log('📱 CASO 1: 3 personas - Merienda media mañana');
        console.log('='.repeat(60));
        
        const session1 = await recommendationService.createSession('573053397959', branchId, '68c30abfe53cbd0d740e8c4e', 3);
        
        console.log('🤖 Bot: ¡Hola! Me da mucho gusto ayudarte a encontrar algo delicioso para 3 personas.');
        console.log('🤖 Bot: Solo necesito hacerte 5 preguntas rápidas para recomendarte la opción perfecta según tu presupuesto y gustos.\n');
        
        // Simular las 5 preguntas
        let currentQuestion = await recommendationService.getNextQuestion(session1.sessionId);
        for (let i = 1; i <= 5; i++) {
            console.log(`📋 Pregunta ${i}/5: ${currentQuestion.question}`);
            console.log(`Opciones: ${currentQuestion.options.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n')}\n`);
            
            // Simular respuesta
            const answer = i === 1 ? '2' : i === 2 ? '4' : i === 3 ? '7' : i === 4 ? '1' : '1';
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
        console.log('🤖 Bot: Resumen del pedido: [Producto recomendado] x 3 personas\n');
        
        console.log('👤 Usuario: sí');
        console.log('🤖 Bot: ¡Excelente! Tu pedido ha sido confirmado y guardado en la base de datos.\n');
        
        // === CASO 2: 6 PERSONAS - ALMUERZO INFORMAL ===
        console.log('\n📱 CASO 2: 6 personas - Almuerzo informal');
        console.log('='.repeat(60));
        
        const session2 = await recommendationService.createSession('573053397959', branchId, '68c30abfe53cbd0d740e8c4e', 6);
        
        console.log('🤖 Bot: ¡Hola! Me da mucho gusto ayudarte a encontrar algo delicioso para 6 personas.');
        console.log('🤖 Bot: Solo necesito hacerte 5 preguntas rápidas para recomendarte la opción perfecta según tu presupuesto y gustos.\n');
        
        // Simular las 5 preguntas (diferentes para mostrar variación)
        currentQuestion = await recommendationService.getNextQuestion(session2.sessionId);
        for (let i = 1; i <= 5; i++) {
            console.log(`📋 Pregunta ${i}/5: ${currentQuestion.question}`);
            console.log(`Opciones: ${currentQuestion.options.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n')}\n`);
            
            // Simular respuesta diferente
            const answer = i === 1 ? '3' : i === 2 ? '2' : i === 3 ? '7' : i === 4 ? '2' : '1';
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
        console.log('🤖 Bot: Resumen del pedido: [Producto recomendado] x 6 personas\n');
        
        console.log('👤 Usuario: sí');
        console.log('🤖 Bot: ¡Excelente! Tu pedido ha sido confirmado y guardado en la base de datos.\n');
        
        console.log('✅ Simulación completada!');
        
    } catch (error) {
        console.error('❌ Error en la simulación:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

simulateBotResponses();
