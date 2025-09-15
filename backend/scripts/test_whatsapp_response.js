const mongoose = require('mongoose');
const WhatsAppController = require('../src/controllers/WhatsAppController');
const WhatsAppConnection = require('../src/models/WhatsAppConnection');

require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch';

async function testWhatsAppResponse() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Buscar una conexión activa
        const connection = await WhatsAppConnection.findOne({ status: 'connected' });
        if (!connection) {
            console.log('❌ No hay conexiones activas de WhatsApp');
            return;
        }

        console.log('📱 Conexión encontrada:', connection.phoneNumber);
        console.log('📊 Estado:', connection.status);

        // Crear instancia del controlador
        const whatsappController = new WhatsAppController();

        // Simular mensaje de prueba
        const testMessage = {
            connectionId: connection._id,
            from: '573113414361@c.us', // Número de prueba
            message: 'hola',
            timestamp: new Date(),
            messageId: 'test_' + Date.now()
        };

        console.log('\n🧪 ===== PROBANDO RESPUESTA DEL BOT =====');
        console.log('💬 Mensaje de prueba:', testMessage.message);
        console.log('📱 Para:', testMessage.from);

        // Procesar mensaje
        await whatsappController.handleMessageReceived(testMessage);

        console.log('✅ Mensaje procesado exitosamente');

    } catch (error) {
        console.error('❌ Error durante la prueba:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

testWhatsAppResponse();



