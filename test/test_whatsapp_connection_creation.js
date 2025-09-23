const mongoose = require('mongoose');
const WhatsAppConnection = require('../backend/src/models/WhatsAppConnection');
const Business = require('../backend/src/models/Business');
const Branch = require('../backend/src/models/Branch');
const User = require('../backend/src/models/User');

async function testConnectionCreation() {
    try {
        console.log('🔗 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');

        // Verificar que tenemos datos básicos
        const businesses = await Business.find({});
        const branches = await Branch.find({});
        const users = await User.find({});
        
        console.log('📊 Datos disponibles:');
        console.log(`   - Businesses: ${businesses.length}`);
        console.log(`   - Branches: ${branches.length}`);
        console.log(`   - Users: ${users.length}`);

        if (businesses.length === 0) {
            console.log('❌ No hay businesses disponibles');
            return;
        }

        if (branches.length === 0) {
            console.log('❌ No hay branches disponibles');
            return;
        }

        if (users.length === 0) {
            console.log('❌ No hay users disponibles');
            return;
        }

        // Usar el primer business, branch y user disponibles
        const business = businesses[0];
        const branch = branches[0];
        const user = users[0];

        console.log('🏢 Usando Business:', business.name);
        console.log('🏪 Usando Branch:', branch.name);
        console.log('👤 Usando User:', user.email);

        // Verificar si ya existe una conexión para esta branch
        const existingConnection = await WhatsAppConnection.findOne({ branchId: branch._id });
        if (existingConnection) {
            console.log('⚠️  Ya existe una conexión para esta branch:', existingConnection.connectionName);
            console.log('📞 Phone:', existingConnection.phoneNumber);
            console.log('🔄 Status:', existingConnection.status);
            return;
        }

        // Crear nueva conexión de prueba
        const testPhoneNumber = `+57300${Math.floor(Math.random() * 10000000)}`;
        const connectionName = `Test Connection ${Date.now()}`;

        console.log('📱 Creando nueva conexión de prueba...');
        console.log('📞 Phone Number:', testPhoneNumber);
        console.log('🏷️  Connection Name:', connectionName);

        const connection = new WhatsAppConnection({
            businessId: business._id,
            branchId: branch._id,
            phoneNumber: testPhoneNumber,
            connectionName: connectionName,
            customerServiceNumber: testPhoneNumber,
            autoReply: true,
            aiIntegration: true,
            businessHours: { start: '08:00', end: '22:00' },
            offHoursMessage: 'Gracias por contactarnos. Te responderemos pronto.',
            createdBy: user._id
        });

        await connection.save();
        console.log('✅ Conexión creada exitosamente!');
        console.log('🆔 Connection ID:', connection._id);
        console.log('📊 Status:', connection.status);

        // Verificar que se guardó correctamente
        const savedConnection = await WhatsAppConnection.findById(connection._id)
            .populate('businessId', 'name')
            .populate('branchId', 'name')
            .populate('createdBy', 'name email');

        console.log('🔍 Conexión guardada:');
        console.log('   - Business:', savedConnection.businessId?.name);
        console.log('   - Branch:', savedConnection.branchId?.name);
        console.log('   - Created By:', savedConnection.createdBy?.email);
        console.log('   - Phone:', savedConnection.phoneNumber);
        console.log('   - Status:', savedConnection.status);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

// Ejecutar la prueba
testConnectionCreation();
