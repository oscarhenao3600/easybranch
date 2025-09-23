const mongoose = require('mongoose');
const WhatsAppConnection = require('./src/models/WhatsAppConnection');
const Business = require('./src/models/Business');
const Branch = require('./src/models/Branch');
const AIService = require('./src/services/AIService');

async function testAlitasMenu() {
    try {
        console.log('🔗 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');

        // Buscar la conexión de WhatsApp de alitas
        const connection = await WhatsAppConnection.findOne({ phoneNumber: '573053397959' })
            .populate('businessId', 'name businessType')
            .populate('branchId', 'name');

        if (!connection) {
            console.log('❌ No se encontró la conexión de WhatsApp');
            return;
        }

        console.log('📱 Probando con conexión:');
        console.log(`   - Branch: ${connection.branchId?.name}`);
        console.log(`   - Business: ${connection.businessId?.name} (${connection.businessId?.businessType})`);

        const aiService = new AIService();
        
        // Probar diferentes mensajes
        const testMessages = [
            'hola',
            'menú',
            'qué me recomiendas',
            'quiero alitas',
            'cuánto cuestan las alitas',
            'tienen alitas picantes'
        ];

        for (const message of testMessages) {
            console.log(`\n💬 ===== PROBANDO: "${message}" =====`);
            
            try {
                const response = await aiService.generateResponse(
                    connection.branchId,
                    message,
                    connection.phoneNumber,
                    connection.businessId?.businessType || 'restaurant'
                );
                
                console.log('🤖 Respuesta:');
                console.log(`   "${response}"`);
                
            } catch (error) {
                console.log('❌ Error:', error.message);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

testAlitasMenu();
