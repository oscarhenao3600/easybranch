const mongoose = require('mongoose');
const WhatsAppConnection = require('../src/models/WhatsAppConnection');

require('dotenv').config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch';

async function checkQRStatus() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const connections = await WhatsAppConnection.find({});
        console.log(`📊 Conexiones encontradas: ${connections.length}`);

        if (connections.length === 0) {
            console.log('❌ No hay conexiones de WhatsApp configuradas');
            console.log('💡 Necesitas crear una nueva conexión desde el dashboard');
            return;
        }

        connections.forEach((conn, index) => {
            console.log(`\n📱 Conexión ${index + 1}:`);
            console.log(`   📞 Teléfono: ${conn.phoneNumber}`);
            console.log(`   📊 Estado: ${conn.status}`);
            console.log(`   📅 Última actividad: ${conn.lastActivity}`);
            
            if (conn.status === 'connected') {
                console.log('   🟢 ¡CONECTADA! El bot debería responder');
            } else if (conn.status === 'connecting') {
                console.log('   🟡 Conectando... Escanea el código QR');
            } else {
                console.log('   🔴 Desconectada - Necesita reconexión');
                console.log('   💡 Ve al dashboard para escanear el código QR');
            }
        });

        console.log('\n🌐 ACCESO AL DASHBOARD:');
        console.log('   📱 Frontend: http://localhost:4000/super.html');
        console.log('   🔗 Backend: http://localhost:3000');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

checkQRStatus();


