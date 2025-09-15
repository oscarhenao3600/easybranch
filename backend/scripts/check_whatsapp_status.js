const mongoose = require('mongoose');
const WhatsAppConnection = require('../src/models/WhatsAppConnection');

require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch';

async function checkWhatsAppStatus() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Buscar conexiones
        const connections = await WhatsAppConnection.find({});
        console.log(`📊 Total conexiones: ${connections.length}`);

        connections.forEach((conn, index) => {
            console.log(`\n📱 Conexión ${index + 1}:`);
            console.log(`   📞 Teléfono: ${conn.phoneNumber}`);
            console.log(`   📊 Estado: ${conn.status}`);
            console.log(`   🆔 ID: ${conn._id}`);
            console.log(`   📅 Última actividad: ${conn.lastActivity}`);
        });

        // Verificar si hay conexiones activas
        const activeConnections = await WhatsAppConnection.find({ status: 'connected' });
        console.log(`\n🟢 Conexiones activas: ${activeConnections.length}`);

        if (activeConnections.length === 0) {
            console.log('⚠️ No hay conexiones activas. El bot no puede responder.');
            console.log('💡 Solución: Escanea el código QR en WhatsApp para conectar.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

checkWhatsAppStatus();



