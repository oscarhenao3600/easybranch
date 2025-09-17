const mongoose = require('mongoose');
const WhatsAppConnection = require('./src/models/WhatsAppConnection');
const Business = require('./src/models/Business');
const Branch = require('./src/models/Branch');
const AIService = require('./src/services/AIService');

async function testAlitasOrderProcessing() {
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

        console.log('📱 Probando con conexión:');
        console.log(`   - Branch: ${connection.branchId?.name}`);
        console.log(`   - Business: ${connection.businessId?.name} (${connection.businessId?.businessType})`);

        const aiService = new AIService();
        
        // Probar diferentes tipos de pedidos de alitas
        const testOrders = [
            'quiero combo 1',
            'quiero combo 2 con salsa bbq',
            'quiero 9 alitas con salsa picante y papas criollas',
            'quiero combo familiar 1 con salsa cheddar y gaseosa',
            'quiero 20 alitas bañadas con salsa miel mostaza',
            'quiero combo emparejado con 2 limonadas',
            'quiero 7 alitas con salsa aparte',
            'quiero combo 3 con papas francesa'
        ];

        for (const order of testOrders) {
            console.log(`\n🍗 ===== PROBANDO: "${order}" =====`);
            
            try {
                // Cargar configuración específica
                await aiService.loadBranchConfig(connection.branchId);
                
                // Obtener prompt personalizado
                const customPrompt = aiService.aiPrompts.get(connection.branchId);
                
                // Procesar pedido
                const orderAnalysis = aiService.processOrder(order, connection.branchId, customPrompt);
                
                console.log('📊 Análisis del pedido:');
                console.log(`   - Has Products: ${orderAnalysis.hasProducts}`);
                console.log(`   - Order Type: ${orderAnalysis.orderType}`);
                console.log(`   - Needs Clarification: ${orderAnalysis.needsClarification}`);
                console.log(`   - Total: $${orderAnalysis.total}`);
                
                if (orderAnalysis.products.length > 0) {
                    console.log('🛒 Productos detectados:');
                    orderAnalysis.products.forEach((product, index) => {
                        console.log(`   ${index + 1}. ${product.name} - $${product.total}`);
                        if (product.details) {
                            console.log(`      - Alitas: ${product.details.alitas}`);
                            console.log(`      - Salsas: ${product.details.salsas.map(s => s.nombre).join(', ') || 'No especificadas'}`);
                            console.log(`      - Acompañantes: ${product.details.acompanantes.join(', ') || 'No especificados'}`);
                            console.log(`      - Bebidas: ${product.details.bebidas.join(', ') || 'No especificadas'}`);
                            console.log(`      - Tipo: ${product.details.tipoAlitas || 'No especificado'}`);
                        }
                    });
                }
                
                if (orderAnalysis.clarificationQuestions.length > 0) {
                    console.log('❓ Preguntas de clarificación:');
                    orderAnalysis.clarificationQuestions.forEach((question, index) => {
                        console.log(`   ${index + 1}. ${question}`);
                    });
                }
                
                // Generar respuesta
                const response = aiService.generateOrderResponse(orderAnalysis);
                console.log('🤖 Respuesta generada:');
                console.log(`   "${response}"`);
                
            } catch (error) {
                console.log('❌ Error:', error.message);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

testAlitasOrderProcessing();
