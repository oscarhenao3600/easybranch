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

// Probar solo la función getNextQuestion
async function testGetNextQuestion() {
    console.log('🧪 ===== PRUEBA DE getNextQuestion =====');
    
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
        
        // Obtener primera pregunta
        console.log('\n❓ Obteniendo primera pregunta...');
        const firstQuestion = await recommendationService.getNextQuestion(session.sessionId);
        
        console.log('📊 Estructura de la pregunta:');
        console.log('   type:', firstQuestion.type);
        console.log('   question:', firstQuestion.question);
        console.log('   options:', firstQuestion.options);
        console.log('   step:', firstQuestion.step);
        console.log('   totalSteps:', firstQuestion.totalSteps);
        
        if (firstQuestion.options && Array.isArray(firstQuestion.options)) {
            console.log('\n✅ Las opciones están disponibles:');
            firstQuestion.options.forEach((option, index) => {
                console.log(`   ${index + 1}. ${option}`);
            });
        } else {
            console.log('\n❌ Las opciones no están disponibles o no son un array');
        }
        
    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        console.log('Stack trace:', error.stack);
    }
}

// Ejecutar prueba
async function runTest() {
    try {
        const connected = await connectToMongoDB();
        if (!connected) return;
        
        await testGetNextQuestion();
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

runTest();



