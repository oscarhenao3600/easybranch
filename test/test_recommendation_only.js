const mongoose = require('mongoose');
const RecommendationService = require('../src/services/RecommendationService');

// Conectar a MongoDB
async function connectToMongoDB() {
    try {
        await mongoose.connect('mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');
        return true;
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error.message);
        return false;
    }
}

// Probar solo el sistema de recomendaciones
async function testRecommendationSystem() {
    console.log('🧪 ===== PRUEBA DEL SISTEMA DE RECOMENDACIONES =====');
    
    const recommendationService = new RecommendationService();
    
    try {
        // Crear sesión de recomendación
        const session = await recommendationService.createSession(
            '573113414361',
            '68c30abfe53cbd0d740e8c4e',
            '68c30abfe53cbd0d740e8c4a',
            1
        );
        
        console.log(`📱 Sesión creada: ${session.sessionId}`);
        console.log(`👥 Personas: ${session.peopleCount}`);
        console.log(`📊 Estado: ${session.status}`);
        console.log(`🔄 Paso actual: ${session.currentStep}/${session.maxSteps}`);
        
        // Obtener primera pregunta
        console.log('\n❓ Obteniendo primera pregunta...');
        const firstQuestion = await recommendationService.getNextQuestion(session.sessionId);
        
        console.log(`📝 Pregunta ${firstQuestion.step}/${firstQuestion.totalSteps}:`);
        console.log(`   ${firstQuestion.question}`);
        
        // Simular respuestas del usuario paso a paso
        const answers = [
            { answer: '4' }, // Presupuesto $40,000 - $60,000
            { answer: '1' }, // Desayuno
            { answer: '7' }, // Ninguna restricción
            { answer: '3' }, // Italiana
            { answer: '5' }  // Solo comer
        ];
        
        let currentSession = session;
        
        for (let i = 0; i < answers.length; i++) {
            const answer = answers[i].answer;
            console.log(`\n📝 Procesando respuesta ${i + 1}: "${answer}"`);
            
            try {
                currentSession = await recommendationService.processAnswer(currentSession.sessionId, answer);
                console.log(`✅ Respuesta procesada. Paso: ${currentSession.currentStep}/${currentSession.maxSteps}`);
                
                if (currentSession.currentStep < currentSession.maxSteps) {
                    const nextQuestion = await recommendationService.getNextQuestion(currentSession.sessionId);
                    console.log(`❓ Siguiente pregunta: ${nextQuestion.question}`);
                } else {
                    console.log('🎯 Todas las preguntas completadas, generando recomendaciones...');
                }
            } catch (error) {
                console.log(`❌ Error procesando respuesta: ${error.message}`);
                break;
            }
        }
        
        // Generar recomendaciones finales
        if (currentSession.currentStep >= currentSession.maxSteps) {
            console.log('\n🎯 Generando recomendaciones finales...');
            const recommendations = await recommendationService.generateRecommendations(currentSession);
            
            console.log('\n📊 RESULTADOS DE RECOMENDACIONES:');
            console.log(`🍽️ Recomendación principal: ${recommendations.mainRecommendation.productName}`);
            console.log(`💰 Precio unitario: $${recommendations.mainRecommendation.price.toLocaleString()}`);
            console.log(`👥 Para ${recommendations.mainRecommendation.quantity || 1} persona(s)`);
            console.log(`💵 Total: $${(recommendations.mainRecommendation.price * (recommendations.mainRecommendation.quantity || 1)).toLocaleString()}`);
            
            if (recommendations.alternatives && recommendations.alternatives.length > 0) {
                console.log('\n🔄 Alternativas:');
                recommendations.alternatives.forEach((alt, index) => {
                    console.log(`   ${index + 1}. ${alt.productName} - $${alt.price.toLocaleString()}`);
                });
            }
            
            console.log('\n✅ Sistema de recomendaciones funcionando correctamente');
        }
        
    } catch (error) {
        console.log(`❌ ERROR en sistema de recomendaciones: ${error.message}`);
        console.log('Stack trace:', error.stack);
    }
}

// Ejecutar prueba
async function runTest() {
    try {
        const connected = await connectToMongoDB();
        if (!connected) return;
        
        await testRecommendationSystem();
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

runTest();
