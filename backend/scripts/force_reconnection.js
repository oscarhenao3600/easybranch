const mongoose = require('mongoose');
const WhatsAppConnection = require('../src/models/WhatsAppConnection');

require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch';

async function forceReconnection() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Buscar conexiones
        const connections = await WhatsAppConnection.find({});
        console.log(`📊 Total conexiones encontradas: ${connections.length}`);

        if (connections.length === 0) {
            console.log('❌ No hay conexiones de WhatsApp en la base de datos');
            return;
        }

        // Marcar todas las conexiones como desconectadas para forzar reconexión
        await WhatsAppConnection.updateMany({}, { 
            status: 'disconnected',
            lastActivity: new Date()
        });

        console.log('🔄 Todas las conexiones marcadas como desconectadas');
        console.log('💡 El servidor debería detectar esto y reconectar automáticamente');
        console.log('📱 Si no se reconecta automáticamente, escanea el código QR nuevamente');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

forceReconnection();



