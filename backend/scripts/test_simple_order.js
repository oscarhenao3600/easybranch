const mongoose = require('mongoose');
const AIService = require('../src/services/AIService');

// Conectar a MongoDB
async function connectDB() {
    try {
        await mongoose.connect('mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error);
        process.exit(1);
    }
}

// Función para probar el pedido original específico
async function testOriginalOrder() {
    console.log('🧪 ===== PRUEBA DEL PEDIDO ORIGINAL =====');
    
    const aiService = new AIService();
    
    const testMessage = 'quiero un Cappuccino, Limonada de Coco, Croissant con Jamón y Queso, Wrap de Pollo';
    
    console.log(`💬 Mensaje: "${testMessage}"`);
    console.log('🎯 Esperado: 4 productos, Total $21,000');
    
    try {
        const result = aiService.processOrder(testMessage);
        
        console.log(`\n📊 RESULTADOS:`);
        console.log(`📦 Productos detectados: ${result.products.length}`);
        console.log(`💰 Subtotal: $${result.subtotal.toLocaleString()}`);
        console.log(`🚚 Delivery: $${result.deliveryFee.toLocaleString()}`);
        console.log(`💵 Total: $${result.total.toLocaleString()}`);
        
        console.log(`\n📋 PRODUCTOS ENCONTRADOS:`);
        result.products.forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.name} x${product.quantity} - $${product.total.toLocaleString()}`);
        });
        
        // Verificar resultados
        const expectedProducts = 4;
        const expectedTotal = 21000;
        
        console.log(`\n🔍 VERIFICACIÓN:`);
        console.log(`✅ Productos: ${result.products.length === expectedProducts ? 'CORRECTO' : 'INCORRECTO'} (${result.products.length}/${expectedProducts})`);
        console.log(`✅ Total: ${result.total === expectedTotal ? 'CORRECTO' : 'INCORRECTO'} ($${result.total.toLocaleString()}/${expectedTotal.toLocaleString()})`);
        
        if (result.products.length === expectedProducts && result.total === expectedTotal) {
            console.log('\n🎉 ¡PRUEBA PASADA! El sistema funciona correctamente.');
            return true;
        } else {
            console.log('\n💥 PRUEBA FALLIDA. El sistema necesita ajustes.');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
        return false;
    }
}

// Función principal
async function runTest() {
    try {
        await connectDB();
        
        const testPassed = await testOriginalOrder();
        
        console.log('\n🏁 ===== RESULTADO FINAL =====');
        if (testPassed) {
            console.log('🎉 ¡EL SISTEMA ESTÁ FUNCIONANDO CORRECTAMENTE!');
            console.log('✅ Puedes probar el pedido en WhatsApp ahora.');
        } else {
            console.log('⚠️ El sistema necesita más ajustes.');
        }
        
    } catch (error) {
        console.error('❌ Error ejecutando prueba:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
        process.exit(0);
    }
}

// Ejecutar prueba
runTest();



