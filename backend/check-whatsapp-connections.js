const mongoose = require('mongoose');
const WhatsAppConnection = require('./src/models/WhatsAppConnection');
const Branch = require('./src/models/Branch');

async function checkWhatsAppConnections() {
    try {
        console.log('📱 ===== REVISANDO CONEXIONES WHATSAPP =====');
        
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');
        
        // Buscar conexiones
        const connections = await WhatsAppConnection.find({}).populate('branchId', 'name').populate('businessId', 'name');
        console.log(`📊 Total de conexiones: ${connections.length}`);
        
        if (connections.length === 0) {
            console.log('⚠️ No hay conexiones de WhatsApp configuradas');
        } else {
            connections.forEach((conn, index) => {
                console.log(`\n${index + 1}. ${conn.connectionName}`);
                console.log(`   📞 Teléfono: ${conn.phoneNumber}`);
                console.log(`   🏪 Sucursal: ${conn.branchId?.name || 'No encontrada'}`);
                console.log(`   🏢 Negocio: ${conn.businessId?.name || 'No encontrado'}`);
                console.log(`   📊 Estado: ${conn.status}`);
                console.log(`   🔗 Conectado: ${conn.isConnected ? 'Sí' : 'No'}`);
                console.log(`   🤖 IA: ${conn.aiIntegration ? 'Habilitada' : 'Deshabilitada'}`);
                console.log(`   📅 Creado: ${conn.createdAt}`);
            });
        }
        
        // Buscar sucursales disponibles
        const branches = await Branch.find({ isActive: true });
        console.log(`\n🏪 Total de sucursales activas: ${branches.length}`);
        
        if (branches.length === 0) {
            console.log('⚠️ No hay sucursales creadas');
        } else {
            console.log('\nSucursales disponibles:');
            branches.forEach((branch, index) => {
                console.log(`${index + 1}. ${branch.name} (${branch.branchId})`);
            });
        }
        
        console.log('\n🎉 Revisión completada');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

// Ejecutar revisión
checkWhatsAppConnections();
