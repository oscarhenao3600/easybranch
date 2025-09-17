const mongoose = require('mongoose');
const WhatsAppConnection = require('./src/models/WhatsAppConnection');
const Branch = require('./src/models/Branch');
const Business = require('./src/models/Business');

async function fixWhatsAppConnection() {
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

        console.log('📱 Conexión actual:');
        console.log(`   - Connection Name: ${connection.connectionName}`);
        console.log(`   - Phone: ${connection.phoneNumber}`);
        console.log(`   - Business: ${connection.businessId?.name} (${connection.businessId?.businessType})`);
        console.log(`   - Branch: ${connection.branchId?.name}`);
        console.log(`   - Branch ID: ${connection.branchId?._id}`);

        // Buscar la sucursal correcta (alitas mix)
        const correctBranch = await Branch.findOne({ name: 'alitas mix' })
            .populate('businessId', 'name businessType');

        if (!correctBranch) {
            console.log('❌ No se encontró la sucursal correcta');
            return;
        }

        console.log('\n🏪 Sucursal correcta:');
        console.log(`   - Branch: ${correctBranch.name}`);
        console.log(`   - Branch ID: ${correctBranch._id}`);
        console.log(`   - Business: ${correctBranch.businessId?.name} (${correctBranch.businessId?.businessType})`);

        // Actualizar la conexión
        console.log('\n🔄 Actualizando conexión...');
        connection.branchId = correctBranch._id;
        connection.businessId = correctBranch.businessId._id;
        
        await connection.save();

        console.log('✅ Conexión actualizada exitosamente!');

        // Verificar la actualización
        const updatedConnection = await WhatsAppConnection.findOne({ phoneNumber: '573053397959' })
            .populate('businessId', 'name businessType')
            .populate('branchId', 'name');

        console.log('\n📱 Conexión actualizada:');
        console.log(`   - Connection Name: ${updatedConnection.connectionName}`);
        console.log(`   - Phone: ${updatedConnection.phoneNumber}`);
        console.log(`   - Business: ${updatedConnection.businessId?.name} (${updatedConnection.businessId?.businessType})`);
        console.log(`   - Branch: ${updatedConnection.branchId?.name}`);
        console.log(`   - Branch ID: ${updatedConnection.branchId?._id}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

fixWhatsAppConnection();
