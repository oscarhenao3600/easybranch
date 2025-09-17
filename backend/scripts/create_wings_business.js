const mongoose = require('mongoose');
const BranchAIConfig = require('../src/models/BranchAIConfig');
const Branch = require('../src/models/Branch');
const Business = require('../src/models/Business');

async function createWingsBusiness() {
    try {
        console.log('🍗 Creando negocio de alitas de pollo fritas...\n');
        
        // Conectar a MongoDB
        await mongoose.connect('mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB\n');
        
        // Crear el negocio de alitas
        const wingsBusiness = new Business({
            businessId: 'WINGS001',
            name: 'Wings Master',
            nit: '900123456-7',
            businessType: 'restaurant',
            description: 'Especialistas en alitas de pollo fritas con salsas artesanales',
            address: 'Calle 100 #15-30',
            city: 'Bogotá',
            department: 'Cundinamarca',
            contact: {
                email: 'info@wingsmaster.com',
                phone: '+57 1 234 5678',
                website: 'www.wingsmaster.com'
            },
            settings: {
                currency: 'COP',
                timezone: 'America/Bogota',
                language: 'es'
            },
            isActive: true
        });
        
        await wingsBusiness.save();
        console.log('✅ Negocio creado:', wingsBusiness.name, '- ID:', wingsBusiness._id);
        
        // Crear sucursal principal
        const wingsBranch = new Branch({
            branchId: 'WINGS001-CENTRO',
            businessId: wingsBusiness.businessId,
            name: 'Wings Master Centro',
            nit: '900123456-7',
            address: 'Calle 100 #15-30',
            city: 'Bogotá',
            department: 'Cundinamarca',
            contact: {
                phone: '+57 1 234 5678',
                email: 'centro@wingsmaster.com',
                whatsapp: '+57 1 234 5678'
            },
            whatsapp: {
                phoneNumber: '+57 1 234 5678',
                isConnected: false,
                status: 'disconnected'
            },
            coordinates: {
                lat: 4.6097,
                lng: -74.0817
            },
            operatingHours: {
                monday: { open: '11:00', close: '23:00' },
                tuesday: { open: '11:00', close: '23:00' },
                wednesday: { open: '11:00', close: '23:00' },
                thursday: { open: '11:00', close: '23:00' },
                friday: { open: '11:00', close: '00:00' },
                saturday: { open: '11:00', close: '00:00' },
                sunday: { open: '12:00', close: '22:00' }
            },
            services: ['dine_in', 'takeaway', 'delivery'],
            isActive: true
        });
        
        await wingsBranch.save();
        console.log('✅ Sucursal creada:', wingsBranch.name, '- ID:', wingsBranch._id);
        
        // Crear configuración de IA para la sucursal
        const wingsMenuContent = `🍗 MENÚ WINGS MASTER CENTRO
📍 INFORMACIÓN DEL LOCAL
• Dirección: Calle 100 #15-30, Bogotá
• Teléfono: +57 1 234 5678
• WhatsApp: +57 1 234 5678
• Horarios: Lunes a Domingo 11:00 AM - 11:00 PM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🍗 ALITAS DE POLLO
Alitas Tradicionales
• 6 Alitas - $18,000
• 12 Alitas - $32,000
• 18 Alitas - $45,000
• 24 Alitas - $58,000

Alitas Premium
• 6 Alitas Premium - $22,000
• 12 Alitas Premium - $40,000
• 18 Alitas Premium - $55,000
• 24 Alitas Premium - $68,000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌶️ SALSAS DISPONIBLES
Salsas Clásicas
• BBQ Original - Sin costo adicional
• Buffalo Clásica - Sin costo adicional
• Honey Mustard - Sin costo adicional
• Ranch - Sin costo adicional

Salsas Picantes
• Buffalo Picante - Sin costo adicional
• Carolina Reaper - Sin costo adicional
• Ghost Pepper - Sin costo adicional
• Habanero - Sin costo adicional

Salsas Especiales
• Mango Habanero - Sin costo adicional
• Teriyaki - Sin costo adicional
• Garlic Parmesan - Sin costo adicional
• Sweet Chili - Sin costo adicional

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🍟 ACOMPAÑAMIENTOS
Papas y Sides
• Papas a la Francesa - $8,000
• Papas con Queso y Tocino - $12,000
• Aros de Cebolla - $10,000
• Palitos de Queso - $9,000
• Ensalada César - $11,000
• Ensalada de Col - $7,000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🍺 BEBIDAS
Bebidas Frías
• Coca Cola - $4,500
• Pepsi - $4,500
• Sprite - $4,500
• Jugo de Naranja - $5,000
• Limonada Natural - $4,000
• Agua - $3,000

Cervezas
• Cerveza Nacional - $8,000
• Cerveza Importada - $12,000
• Michelada - $10,000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🍰 POSTRES
• Brownie con Helado - $8,000
• Cheesecake - $9,000
• Helado de Vainilla - $5,000
• Helado de Chocolate - $5,000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚚 SERVICIOS
Delivery
• Costo de Domicilio: $3,000
• Radio de Entrega: 8 km
• Tiempo Estimado: 25-35 minutos
• Pedido Mínimo: $25,000

Pickup
• Tiempo de Preparación: 15-20 minutos
• Disponible Todo el día

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💳 MÉTODOS DE PAGO
• Efectivo
• Tarjeta de Crédito/Débito
• PSE
• Nequi
• Daviplata
• Todos los precios incluyen IVA`;

        const wingsConfig = new BranchAIConfig({
            branchId: wingsBranch._id,
            menuContent: wingsMenuContent,
            aiSettings: {
                personality: 'friendly',
                language: 'es',
                responseStyle: 'casual',
                businessType: 'restaurant'
            },
            isActive: true
        });
        
        await wingsConfig.save();
        console.log('✅ Configuración de IA creada para Wings Master');
        
        console.log('\n🎉 ¡Negocio de alitas creado exitosamente!');
        console.log('📊 Resumen:');
        console.log('   🏢 Negocio:', wingsBusiness.name, '- ID:', wingsBusiness._id);
        console.log('   🏪 Sucursal:', wingsBranch.name, '- ID:', wingsBranch._id);
        console.log('   🤖 Config IA:', wingsConfig._id);
        console.log('   📋 Productos en menú:', wingsMenuContent.split('•').length - 1);
        
        console.log('\n📝 Para probar el sistema:');
        console.log('   1. Usa el ID de sucursal:', wingsBranch._id);
        console.log('   2. El menú ya está cargado y procesado');
        console.log('   3. Puedes hacer recomendaciones inmediatamente');
        
    } catch (error) {
        console.error('❌ Error creando negocio:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Desconectado de MongoDB');
    }
}

createWingsBusiness();
