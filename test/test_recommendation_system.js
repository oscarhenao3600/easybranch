const mongoose = require('mongoose');
const RecommendationService = require('../src/services/RecommendationService');

// Conectar a MongoDB
async function connectDB() {
    try {
        await mongoose.connect('mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error);
        process.exit(1);
    }
}

// Función para probar el sistema de recomendaciones
async function testRecommendationSystem() {
    console.log('🧪 ===== PROBANDO SISTEMA DE RECOMENDACIONES =====');
    
    const recommendationService = new RecommendationService();
    
    // Datos de prueba
    const phoneNumber = '573113414361';
    const branchId = '68c30abfe53cbd0d740e8c4e';
    const businessId = '68c30abfe53cbd0d740e8c4a';
    const peopleCount = 2; // Para 2 personas
    
    try {
        // Crear sesión
        console.log(`\n1️⃣ Creando sesión para ${peopleCount} personas...`);
        const session = await recommendationService.createSession(phoneNumber, branchId, businessId, peopleCount);
        console.log('✅ Sesión creada:', session.sessionId);
        
        // Simular respuestas del usuario
        const responses = [
            { questionId: 'budget', answer: '4' }, // No importa
            { questionId: 'meal_type', answer: '1' }, // Desayuno
            { questionId: 'dietary_restrictions', answer: '7' }, // Ninguna
            { questionId: 'cuisine_preference', answer: '6' }, // Cualquiera
            { questionId: 'special_occasion', answer: '1' } // Comida casual
        ];
        
        console.log(`\n2️⃣ Procesando ${responses.length} respuestas...`);
        for (const response of responses) {
            await recommendationService.processAnswer(session.sessionId, response.questionId, response.answer);
            console.log(`✅ Respuesta procesada: ${response.questionId} = ${response.answer}`);
        }
        
        // Generar recomendaciones
        console.log(`\n3️⃣ Generando recomendaciones...`);
        const recommendations = await recommendationService.generateRecommendations(session);
        
        console.log(`\n📊 RESULTADOS:`);
        console.log(`🎯 Tipo: ${recommendations.type}`);
        console.log(`👥 Personas: ${peopleCount}`);
        console.log(`🍽️ Recomendación principal:`);
        console.log(`   - Producto: ${recommendations.mainRecommendation.productName}`);
        console.log(`   - Precio unitario: $${recommendations.mainRecommendation.price.toLocaleString()}`);
        console.log(`   - Total para ${peopleCount} personas: $${(recommendations.mainRecommendation.price * peopleCount).toLocaleString()}`);
        console.log(`   - Categoría: ${recommendations.mainRecommendation.category}`);
        console.log(`   - Razón: ${recommendations.mainRecommendation.reasoning}`);
        
        if (recommendations.alternatives && recommendations.alternatives.length > 0) {
            console.log(`\n🔄 Alternativas:`);
            recommendations.alternatives.forEach((alt, index) => {
                console.log(`   ${index + 1}. ${alt.productName} - $${alt.price.toLocaleString()} (Total: $${(alt.price * peopleCount).toLocaleString()})`);
            });
        }
        
        console.log(`\n✅ Prueba completada exitosamente!`);
        return true;
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
        console.error('Stack:', error.stack);
        return false;
    }
}

// Función principal
async function runTest() {
    try {
        await connectDB();
        
        const testPassed = await testRecommendationSystem();
        
        console.log('\n🏁 ===== RESULTADO FINAL =====');
        if (testPassed) {
            console.log('🎉 ¡EL SISTEMA DE RECOMENDACIONES ESTÁ FUNCIONANDO!');
            console.log('✅ Ahora puedes probar en WhatsApp con "recomendación"');
        } else {
            console.log('⚠️ El sistema necesita más ajustes.');
        }
        
    } catch (error) {
        console.error('❌ Error ejecutando prueba:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
        process.exit(0);
    }
}

// Ejecutar prueba
runTest();
