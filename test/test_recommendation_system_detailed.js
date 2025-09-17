const RecommendationService = require('../src/services/RecommendationService');
const mongoose = require('mongoose');

require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch';

async function testRecommendationSystem() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const recommendationService = new RecommendationService();
        const phoneNumber = '573113414361';
        const branchId = '68c30abfe53cbd0d740e8c4e';
        const businessId = '68c30abfe53cbd0d740e8c4a';
        const peopleCount = 1;

        console.log('🧪 ===== PROBANDO SISTEMA DE RECOMENDACIONES =====');

        // Crear sesión
        console.log('\n1️⃣ Creando sesión...');
        const session = await recommendationService.createSession(phoneNumber, branchId, businessId, peopleCount);
        console.log('✅ Sesión creada:', session.sessionId);

        // Obtener primera pregunta
        console.log('\n2️⃣ Obteniendo primera pregunta...');
        const question1 = await recommendationService.getNextQuestion(session.sessionId);
        console.log('✅ Primera pregunta:', question1.question);

        // Procesar respuesta 1
        console.log('\n3️⃣ Procesando respuesta 1 (presupuesto)...');
        await recommendationService.processAnswer(session.sessionId, '4'); // Más de $60,000
        console.log('✅ Respuesta 1 procesada');

        // Obtener segunda pregunta
        console.log('\n4️⃣ Obteniendo segunda pregunta...');
        const question2 = await recommendationService.getNextQuestion(session.sessionId);
        console.log('✅ Segunda pregunta:', question2.question);

        // Procesar respuesta 2
        console.log('\n5️⃣ Procesando respuesta 2 (tipo de comida)...');
        await recommendationService.processAnswer(session.sessionId, '1'); // Desayuno
        console.log('✅ Respuesta 2 procesada');

        // Procesar respuestas restantes
        console.log('\n6️⃣ Procesando respuestas restantes...');
        await recommendationService.processAnswer(session.sessionId, '5'); // Ninguna restricción
        await recommendationService.processAnswer(session.sessionId, '1'); // Colombiana
        await recommendationService.processAnswer(session.sessionId, '1'); // Comida casual

        // Generar recomendaciones
        console.log('\n7️⃣ Generando recomendaciones...');
        const recommendations = await recommendationService.generateRecommendations(session);
        console.log('✅ Recomendaciones generadas:', recommendations);

        if (recommendations && recommendations.mainRecommendation) {
            console.log('\n🍽️ RECOMENDACIÓN PRINCIPAL:');
            console.log('   Producto:', recommendations.mainRecommendation.productName);
            console.log('   Precio:', recommendations.mainRecommendation.price);
            console.log('   Total:', recommendations.mainRecommendation.totalPrice);
            console.log('   Razón:', recommendations.mainRecommendation.reasoning);
        }

        if (recommendations && recommendations.alternatives) {
            console.log('\n🔄 ALTERNATIVAS:');
            recommendations.alternatives.forEach((alt, index) => {
                console.log(`   ${index + 1}. ${alt.productName} - $${alt.price}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Desconectado de MongoDB');
    }
}

testRecommendationSystem();
