const mongoose = require('mongoose');
const WhatsAppConnection = require('./backend/src/models/WhatsAppConnection');
const Business = require('./backend/src/models/Business');
const Branch = require('./backend/src/models/Branch');
const User = require('./backend/src/models/User');
const WhatsAppServiceSimple = require('./backend/src/services/WhatsAppServiceSimple');

async function testWhatsAppConnectionCreation() {
    try {
        console.log('🔗 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');

        // Obtener datos necesarios
        const business = await Business.findOne({});
        const branch = await Branch.findOne({});
        const user = await User.findOne({});

        if (!business || !branch || !user) {
            console.log('❌ Faltan datos básicos:');
            console.log('   - Business:', business ? '✅' : '❌');
            console.log('   - Branch:', branch ? '✅' : '❌');
            console.log('   - User:', user ? '✅' : '❌');
            return;
        }

        console.log('📊 Datos disponibles:');
        console.log('   - Business:', business.name);
        console.log('   - Branch:', branch.name);
        console.log('   - User:', user.email);

        // Verificar si ya existe conexión para esta branch
        const existingConnection = await WhatsAppConnection.findOne({ branchId: branch._id });
        if (existingConnection) {
            console.log('⚠️  Ya existe una conexión para esta branch:');
            console.log('   - ID:', existingConnection._id);
            console.log('   - Phone:', existingConnection.phoneNumber);
            console.log('   - Status:', existingConnection.status);
            
            // Probar refrescar QR de la conexión existente
            console.log('🔄 Probando refresco de QR code...');
            await testQRRefresh(existingConnection._id);
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

        // Probar generación de QR code
        console.log('📱 Probando generación de QR code...');
        await testQRGeneration(connection._id, testPhoneNumber);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

async function testQRGeneration(connectionId, phoneNumber) {
    try {
        console.log('🔄 Inicializando WhatsAppService...');
        const whatsappService = new WhatsAppServiceSimple();
        
        console.log('📱 Generando QR code real de WhatsApp...');
        console.log('⏳ Esto puede tomar unos segundos...');
        
        const qrCodeDataURL = await whatsappService.generateQRCode(connectionId, phoneNumber);
        
        if (qrCodeDataURL) {
            console.log('✅ QR Code generado exitosamente!');
            console.log('📏 Tamaño del QR:', qrCodeDataURL.length, 'caracteres');
            console.log('🔗 Tipo:', qrCodeDataURL.substring(0, 50) + '...');
            
            // Actualizar la conexión
            await WhatsAppConnection.findByIdAndUpdate(connectionId, {
                qrCodeDataURL: qrCodeDataURL,
                status: 'connecting',
                qrExpiresAt: new Date(Date.now() + (5 * 60 * 1000))
            });
            
            console.log('💾 QR Code guardado en la base de datos');
            
        } else {
            console.log('❌ No se pudo generar el QR code');
        }
        
    } catch (error) {
        console.log('❌ Error generando QR code:', error.message);
    }
}

async function testQRRefresh(connectionId) {
    try {
        console.log('🔄 Probando refresco de QR code...');
        const whatsappService = new WhatsAppServiceSimple();
        
        const connection = await WhatsAppConnection.findById(connectionId);
        if (!connection) {
            console.log('❌ Conexión no encontrada');
            return;
        }
        
        console.log('📞 Phone:', connection.phoneNumber);
        console.log('📱 Generando nuevo QR code...');
        
        const qrCodeDataURL = await whatsappService.generateQRCode(connectionId, connection.phoneNumber);
        
        if (qrCodeDataURL) {
            console.log('✅ QR Code refrescado exitosamente!');
            console.log('📏 Tamaño del QR:', qrCodeDataURL.length, 'caracteres');
            
            // Actualizar la conexión
            await WhatsAppConnection.findByIdAndUpdate(connectionId, {
                qrCodeDataURL: qrCodeDataURL,
                status: 'connecting',
                qrExpiresAt: new Date(Date.now() + (5 * 60 * 1000))
            });
            
            console.log('💾 QR Code actualizado en la base de datos');
            
        } else {
            console.log('❌ No se pudo refrescar el QR code');
        }
        
    } catch (error) {
        console.log('❌ Error refrescando QR code:', error.message);
    }
}

// Ejecutar la prueba
testWhatsAppConnectionCreation();
