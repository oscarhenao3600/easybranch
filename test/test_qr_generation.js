const mongoose = require('mongoose');
const WhatsAppConnection = require('./backend/src/models/WhatsAppConnection');
const WhatsAppServiceSimple = require('./backend/src/services/WhatsAppServiceSimple');

async function testQRGeneration() {
    try {
        console.log('🔗 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');

        // Buscar una conexión existente
        const connection = await WhatsAppConnection.findOne({});
        
        if (!connection) {
            console.log('❌ No hay conexiones de WhatsApp disponibles');
            console.log('💡 Crea una conexión desde el frontend primero');
            return;
        }

        console.log('📱 Conexión encontrada:');
        console.log('   - ID:', connection._id);
        console.log('   - Phone:', connection.phoneNumber);
        console.log('   - Name:', connection.connectionName);
        console.log('   - Status:', connection.status);

        // Crear servicio de WhatsApp
        console.log('🔄 Inicializando WhatsAppService...');
        const whatsappService = new WhatsAppServiceSimple();
        
        // Generar QR code real
        console.log('📱 Generando QR code real de WhatsApp...');
        console.log('⏳ Esto puede tomar unos segundos...');
        
        try {
            const qrCodeDataURL = await whatsappService.generateQRCode(connection._id, connection.phoneNumber);
            
            if (qrCodeDataURL) {
                console.log('✅ QR Code generado exitosamente!');
                console.log('📏 Tamaño del QR:', qrCodeDataURL.length, 'caracteres');
                console.log('🔗 Tipo:', qrCodeDataURL.substring(0, 50) + '...');
                
                // Actualizar la conexión con el QR generado
                connection.qrCodeDataURL = qrCodeDataURL;
                connection.status = 'connecting';
                connection.qrExpiresAt = new Date(Date.now() + (5 * 60 * 1000));
                await connection.save();
                
                console.log('💾 QR Code guardado en la base de datos');
                console.log('⏰ Expira en:', connection.qrExpiresAt);
                
            } else {
                console.log('❌ No se pudo generar el QR code');
            }
            
        } catch (error) {
            console.log('❌ Error generando QR code:', error.message);
            console.log('Stack:', error.stack);
        }

    } catch (error) {
        console.error('❌ Error general:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

// Ejecutar la prueba
testQRGeneration();
