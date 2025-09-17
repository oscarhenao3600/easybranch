const mongoose = require('mongoose');
const WhatsAppController = require('../src/controllers/WhatsAppController');
const RecommendationService = require('../src/services/RecommendationService');
const AIService = require('../src/services/AIService');

async function testRealFlow() {
    try {
        console.log('🚀 Iniciando prueba de flujo real de WhatsApp...\n');
        
        // Conectar a MongoDB
        await mongoose.connect('mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB\n');
        
        // Instanciar servicios
        const whatsappController = new WhatsAppController();
        const recommendationService = new RecommendationService();
        const aiService = new AIService();
        
        const connectionId = '573053397959';
        const phoneNumber = '573053397959';
        const branchId = '507f1f77bcf86cd799439011'; // ID de la sucursal de prueba
        
        console.log('📱 Simulando conversación para 3 personas (merienda media mañana)...\n');
        
        // === CASO 1: 3 PERSONAS - MERIENDA MEDIA MAÑANA ===
        console.log('👤 Usuario: hola');
        await whatsappController.handleMessage(connectionId, phoneNumber, 'hola', branchId);
        
        console.log('\n👤 Usuario: sugerencia para 3 personas merienda de media mañana');
        await whatsappController.handleMessage(connectionId, phoneNumber, 'sugerencia para 3 personas merienda de media mañana', branchId);
        
        // Simular respuestas a las 5 preguntas
        const responses = [
            '2', // Presupuesto $15,000 - $25,000
            '4', // Snack/Merienda
            '7', // Ninguna restricción
            '1', // Colombiana
            '1'  // Comida casual
        ];
        
        for (let i = 0; i < responses.length; i++) {
            console.log(`\n👤 Usuario: ${responses[i]}`);
            await whatsappController.handleMessage(connectionId, phoneNumber, responses[i], branchId);
        }
        
        console.log('\n👤 Usuario: pedir');
        await whatsappController.handleMessage(connectionId, phoneNumber, 'pedir', branchId);
        
        console.log('\n👤 Usuario: sí');
        await whatsappController.handleMessage(connectionId, phoneNumber, 'sí', branchId);
        
        console.log('\n' + '='.repeat(80));
        console.log('📱 Simulando conversación para 6 personas (almuerzo informal)...\n');
        
        // === CASO 2: 6 PERSONAS - ALMUERZO INFORMAL ===
        console.log('👤 Usuario: hola');
        await whatsappController.handleMessage(connectionId, phoneNumber, 'hola', branchId);
        
        console.log('\n👤 Usuario: sugerencia para 6 personas almuerzo informal');
        await whatsappController.handleMessage(connectionId, phoneNumber, 'sugerencia para 6 personas almuerzo informal', branchId);
        
        // Simular respuestas diferentes para variar
        const responses2 = [
            '3', // Presupuesto $25,000 - $40,000
            '2', // Almuerzo
            '7', // Ninguna restricción
            '2', // Internacional
            '1'  // Comida casual
        ];
        
        for (let i = 0; i < responses2.length; i++) {
            console.log(`\n👤 Usuario: ${responses2[i]}`);
            await whatsappController.handleMessage(connectionId, phoneNumber, responses2[i], branchId);
        }
        
        console.log('\n👤 Usuario: pedir');
        await whatsappController.handleMessage(connectionId, phoneNumber, 'pedir', branchId);
        
        console.log('\n👤 Usuario: sí');
        await whatsappController.handleMessage(connectionId, phoneNumber, 'sí', branchId);
        
        console.log('\n✅ Prueba completada!');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

testRealFlow();


