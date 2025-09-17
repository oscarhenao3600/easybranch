const mongoose = require('mongoose');
const WhatsAppConnection = require('../src/models/WhatsAppConnection');

require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch';

async function checkConnectionStatus() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const connections = await WhatsAppConnection.find({});
        console.log(`📊 Conexiones encontradas: ${connections.length}`);

        connections.forEach((conn, index) => {
            console.log(`\n📱 Conexión ${index + 1}:`);
            console.log(`   📞 Teléfono: ${conn.phoneNumber}`);
            console.log(`   📊 Estado: ${conn.status}`);
            console.log(`   📅 Última actividad: ${conn.lastActivity}`);
            
            if (conn.status === 'connected') {
                console.log('   🟢 ¡CONECTADA! El bot debería responder');
            } else {
                console.log('   🔴 Desconectada - Necesita reconexión');
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

checkConnectionStatus();



