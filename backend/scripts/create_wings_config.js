const mongoose = require('mongoose');
const BranchAIConfig = require('../src/models/BranchAIConfig');

async function createWingsConfig() {
    try {
        console.log('🍗 Creando configuración de IA para Wings Master...\n');
        
        // Conectar a MongoDB
        await mongoose.connect('mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB\n');
        
        // ID de la sucursal Wings Master existente
        const wingsBranchId = '68c98462727208bbd6a8becd';
        
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
            branchId: wingsBranchId,
            createdBy: new mongoose.Types.ObjectId(),
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
        
        console.log('\n🎉 ¡Configuración de Wings Master creada exitosamente!');
        console.log('📊 Resumen:');
        console.log('   🏪 Sucursal ID:', wingsBranchId);
        console.log('   🤖 Config IA:', wingsConfig._id);
        console.log('   📋 Productos en menú:', wingsMenuContent.split('•').length - 1);
        
        console.log('\n📝 Para probar el sistema:');
        console.log('   1. Usa el ID de sucursal:', wingsBranchId);
        console.log('   2. El menú ya está cargado y procesado');
        console.log('   3. Puedes hacer recomendaciones inmediatamente');
        
    } catch (error) {
        console.error('❌ Error creando configuración:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Desconectado de MongoDB');
    }
}

createWingsConfig();
