// Script simple para probar la creación de conexión WhatsApp
// Simula exactamente lo que hace el controlador

const mongoose = require('mongoose');
const WhatsAppConnection = require('./src/models/WhatsAppConnection');
const Business = require('./src/models/Business');
const Branch = require('./src/models/Branch');
const User = require('./src/models/User');
const WhatsAppServiceSimple = require('./src/services/WhatsAppServiceSimple');
const QRCode = require('qrcode');

async function simulateConnectionCreation() {
    try {
        console.log('🔗 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');

        // Simular datos del request (como viene del frontend)
        const requestData = {
            businessId: 'business1', // String ID como viene del frontend
            branchId: 'branch1',    // String ID como viene del frontend
            phoneNumber: '+573001234567',
            connectionName: 'Test Connection Frontend',
            customerServiceNumber: '+573001234567',
            autoReply: true,
            aiIntegration: true,
            businessHours: { start: '08:00', end: '22:00' },
            offHoursMessage: 'Gracias por contactarnos. Te responderemos pronto.'
        };

        console.log('📱 Simulando creación de conexión con datos:');
        console.log('   - Business ID:', requestData.businessId);
        console.log('   - Branch ID:', requestData.branchId);
        console.log('   - Phone:', requestData.phoneNumber);
        console.log('   - Name:', requestData.connectionName);

        // Simular la lógica del controlador
        const { businessId, branchId, phoneNumber, connectionName, customerServiceNumber, autoReply, aiIntegration, businessHours, offHoursMessage } = requestData;

        // Validar campos requeridos
        if (!businessId || !branchId || !phoneNumber || !connectionName || !customerServiceNumber) {
            throw new Error('Todos los campos son requeridos');
        }

        // Manejar IDs de string (como viene del frontend)
        let businessObjectId, branchObjectId;
        
        if (businessId === 'business1' || typeof businessId === 'string') {
            // Buscar o crear business por defecto
            let business = await Business.findOne({ name: 'Restaurante El Sabor' });
            if (!business) {
                business = new Business({
                    businessId: `BS${Date.now()}`,
                    name: 'Restaurante El Sabor',
                    nit: '900123456-1',
                    businessType: 'restaurant',
                    contact: {
                        email: 'info@elsabor.com',
                        phone: '+573001234567'
                    },
                    address: 'Calle 123 #45-67',
                    city: 'Bogotá',
                    department: 'Cundinamarca',
                    country: 'Colombia',
                    settings: {
                        timezone: 'America/Bogota',
                        currency: 'COP',
                        language: 'es',
                        autoReply: true,
                        delivery: true
                    }
                });
                await business.save();
            }
            businessObjectId = business._id;
        } else {
            businessObjectId = businessId;
        }

        if (branchId === 'branch1' || typeof branchId === 'string') {
            // Buscar o crear branch por defecto
            let branch = await Branch.findOne({ name: 'Sucursal Centro' });
            if (!branch) {
                branch = new Branch({
                    branchId: `BR${Date.now()}`,
                    businessId: businessObjectId,
                    name: 'Sucursal Centro',
                    razonSocial: 'Sucursal Centro',
                    nit: '900123456-1',
                    phone: '+573001234567',
                    address: 'Calle 123 #45-67',
                    city: 'Bogotá',
                    department: 'Cundinamarca',
                    country: 'Colombia',
                    description: 'Sucursal principal en el centro de la ciudad',
                    manager: 'Gerente Centro',
                    email: 'centro@elsabor.com',
                    contact: {
                        phone: '+573001234567',
                        email: 'centro@elsabor.com'
                    },
                    whatsapp: {
                        provider: 'whatsapp-web.js',
                        phoneNumber: phoneNumber,
                        connectionStatus: 'disconnected',
                        qrCode: null,
                        sessionData: null
                    },
                    settings: {
                        autoReply: true,
                        delivery: {
                            enabled: true,
                            radius: 5,
                            fee: 0
                        },
                        businessHours: {
                            monday: { open: '08:00', close: '22:00' },
                            tuesday: { open: '08:00', close: '22:00' },
                            wednesday: { open: '08:00', close: '22:00' },
                            thursday: { open: '08:00', close: '22:00' },
                            friday: { open: '08:00', close: '23:00' },
                            saturday: { open: '09:00', close: '23:00' },
                            sunday: { open: '10:00', close: '21:00' }
                        }
                    },
                    status: 'active',
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                await branch.save();
            }
            branchObjectId = branch._id;
        } else {
            branchObjectId = branchId;
        }

        // Verificar si el número ya existe
        const existingConnection = await WhatsAppConnection.findOne({ phoneNumber });
        if (existingConnection) {
            console.log('⚠️  Este número de WhatsApp ya está registrado');
            return;
        }

        // Obtener usuario creador
        let createdByUser = await User.findOne({ email: 'admin@easybranch.com' });
        if (!createdByUser) {
            createdByUser = new User({
                email: 'admin@easybranch.com',
                password: 'admin123',
                name: 'Super Administrador',
                role: 'super_admin',
                userId: 'USR' + Date.now(),
                isActive: true,
                profile: {
                    phone: '+573001234567',
                    timezone: 'America/Bogota',
                    language: 'es'
                }
            });
            await createdByUser.save();
        }

        // Crear nueva conexión
        const connection = new WhatsAppConnection({
            businessId: businessObjectId,
            branchId: branchObjectId,
            phoneNumber,
            connectionName,
            customerServiceNumber,
            connectionId: `CONN${Date.now()}`,
            autoReply: autoReply !== undefined ? autoReply : true,
            aiIntegration: aiIntegration !== undefined ? aiIntegration : true,
            businessHours: businessHours || { start: '08:00', end: '22:00' },
            offHoursMessage: offHoursMessage || 'Gracias por contactarnos. Te responderemos pronto.',
            createdBy: createdByUser._id
        });

        await connection.save();
        console.log('✅ Conexión creada exitosamente!');
        console.log('🆔 Connection ID:', connection._id);

        // Obtener business y branch para QR code
        const business = await Business.findById(businessObjectId);
        const branch = await Branch.findById(branchObjectId);

        // Generar QR code real de WhatsApp
        console.log('📱 ===== GENERANDO QR CODE REAL DE WHATSAPP =====');
        console.log('🔗 Connection ID:', connection._id);
        console.log('📞 Phone:', phoneNumber);
        console.log('🏪 Branch:', branch?.name);
        console.log('===============================================');

        let qrCodeDataURL = null;
        let qrExpiresAt = null;

        try {
            // Crear servicio de WhatsApp
            const whatsappService = new WhatsAppServiceSimple();
            console.log('🔄 Generando QR Code usando WhatsAppService...');
            
            qrCodeDataURL = await whatsappService.generateQRCode(connection._id, phoneNumber);
            
            if (qrCodeDataURL) {
                connection.qrCodeDataURL = qrCodeDataURL;
                connection.status = 'connecting';
                qrExpiresAt = new Date(Date.now() + (5 * 60 * 1000)); // 5 minutos
                connection.qrExpiresAt = qrExpiresAt;
                await connection.save();
                
                console.log('✅ QR Code real generado exitosamente');
                console.log('📏 Tamaño del QR:', qrCodeDataURL.length, 'caracteres');
                console.log('⏰ Expira en:', qrExpiresAt);
                console.log('🔗 Tipo:', qrCodeDataURL.substring(0, 50) + '...');
                
            } else {
                throw new Error('No se pudo generar el QR code');
            }
        } catch (error) {
            console.log('❌ Error generando QR real:', error.message);
            
            // Fallback: generar QR con información de conexión
            console.log('🔄 Generando QR de fallback...');
            const qrData = {
                connectionId: connection._id,
                businessName: business?.name || 'Business',
                branchName: branch?.name || 'Branch',
                phoneNumber,
                timestamp: Date.now(),
                message: 'Escanea este código para vincular WhatsApp'
            };

            qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            connection.qrCodeDataURL = qrCodeDataURL;
            connection.status = 'disconnected';
            await connection.save();
            
            console.log('✅ QR de fallback generado');
        }

        // Poblar referencias
        await connection.populate('businessId', 'name');
        await connection.populate('branchId', 'name');
        await connection.populate('createdBy', 'name email');

        console.log('🎉 ===== SIMULACIÓN COMPLETADA =====');
        console.log('📊 Resultado final:');
        console.log('   - Connection ID:', connection._id);
        console.log('   - Business:', connection.businessId?.name);
        console.log('   - Branch:', connection.branchId?.name);
        console.log('   - Created By:', connection.createdBy?.email);
        console.log('   - Phone:', connection.phoneNumber);
        console.log('   - Status:', connection.status);
        console.log('   - QR Generated:', connection.qrCodeDataURL ? '✅' : '❌');
        console.log('   - QR Expires:', connection.qrExpiresAt);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

// Ejecutar la simulación
simulateConnectionCreation();
