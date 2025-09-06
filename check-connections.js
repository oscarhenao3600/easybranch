const mongoose = require('mongoose');
require('dotenv').config();

async function checkConnections() {
    try {
        console.log('🔍 ===== VERIFICANDO CONEXIONES WHATSAPP =====');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');
        
        const WhatsAppConnection = require('./backend/src/models/WhatsAppConnection');
        
        const connections = await WhatsAppConnection.find({});
        console.log('📊 Total de conexiones en BD:', connections.length);
        
        connections.forEach((conn, index) => {
            console.log(`\n📱 Conexión ${index + 1}:`);
            console.log(`   🆔 ID: ${conn._id}`);
            console.log(`   📞 Teléfono: ${conn.phoneNumber}`);
            console.log(`   📊 Estado: ${conn.status}`);
            console.log(`   🤖 IA Integrada: ${conn.aiIntegration ? 'Sí' : 'No'}`);
            console.log(`   📅 Creada: ${conn.createdAt}`);
            console.log(`   📝 Nombre: ${conn.connectionName}`);
        });
        
        // Check sessions directory
        const fs = require('fs');
        const path = require('path');
        
        const sessionsDir = './backend/sessions';
        if (fs.existsSync(sessionsDir)) {
            const sessions = fs.readdirSync(sessionsDir);
            console.log(`\n💾 Sesiones en disco: ${sessions.length}`);
            
            sessions.forEach(session => {
                const sessionPath = path.join(sessionsDir, session);
                const stats = fs.statSync(sessionPath);
                console.log(`   📁 ${session} - Modificado: ${stats.mtime}`);
            });
        } else {
            console.log('\n❌ Directorio de sesiones no existe');
        }
        
        console.log('\n==========================================');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

checkConnections();
