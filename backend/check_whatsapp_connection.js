const mongoose = require('mongoose');
const WhatsAppConnection = require('./src/models/WhatsAppConnection');
const Branch = require('./src/models/Branch');
const Business = require('./src/models/Business');

async function checkWhatsAppConnection() {
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

        console.log('📱 Conexión de WhatsApp encontrada:');
        console.log(`   - Connection Name: ${connection.connectionName}`);
        console.log(`   - Phone: ${connection.phoneNumber}`);
        console.log(`   - Business: ${connection.businessId?.name} (${connection.businessId?.businessType})`);
        console.log(`   - Branch: ${connection.branchId?.name}`);
        console.log(`   - Branch ID: ${connection.branchId?._id}`);
        console.log(`   - Status: ${connection.status}`);

        // Verificar si la sucursal es correcta
        const correctBranch = await Branch.findOne({ name: 'alitas mix' });
        if (correctBranch) {
            console.log('\n🔍 Verificación:');
            console.log(`   - Branch actual: ${connection.branchId?.name} (${connection.branchId?._id})`);
            console.log(`   - Branch correcta: ${correctBranch.name} (${correctBranch._id})`);
            console.log(`   - ¿Es la correcta?: ${connection.branchId?._id.toString() === correctBranch._id.toString() ? '✅' : '❌'}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

checkWhatsAppConnection();
