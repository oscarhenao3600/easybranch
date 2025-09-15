const mongoose = require('mongoose');
const AIService = require('../src/services/AIService');

// Conectar a MongoDB
async function connectToMongoDB() {
    try {
        await mongoose.connect('mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');
        return true;
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error.message);
        return false;
    }
}

// Probar el pedido complejo que falló
async function testComplexOrder() {
    console.log('🧪 ===== PRUEBA DEL PEDIDO COMPLEJO =====');
    
    const aiService = new AIService();
    
    // Configurar menú de prueba
    const testMenu = `
    ☕ MENÚ CAFETERÍA EASYBRANCH CENTRO
    
    📂 Nueva sección: Postres Especiales
    ✅ Producto 64: • Sundae de Chocolate - - $8000
    ✅ Producto 65: • Banana Split - - $9500
    ✅ Producto 66: • Waffle con Helado - - $10000
    ✅ Producto 67: • Crepes de Nutella - - $8500
    
    📂 Nueva sección: Postres Caseros
    ✅ Producto 57: • Torta de Chocolate - - $6500
    ✅ Producto 58: • Torta de Zanahoria - - $6000
    ✅ Producto 59: • Tiramisu - - $7500
    ✅ Producto 60: • Flan de Caramelo - - $5500
    
    📂 Nueva sección: Pastelería
    ✅ Producto 33: • Croissant Simple - - $3500
    ✅ Producto 34: • Croissant con Jamón y Queso - - $5500
    ✅ Producto 35: • Muffin de Arándanos - - $4000
    ✅ Producto 36: • Muffin de Chocolate - - $4000
    
    📂 Nueva sección: Jugos y Refrescos
    ✅ Producto 24: • Limonada Natural - - $3500
    ✅ Producto 25: • Limonada de Coco - - $4000
    `;
    
    aiService.setMenuContent('68c30abfe53cbd0d740e8c4e', testMenu);
    
    const message = "quiero Crepes de Nutella, 2 Flan de Caramelo, Muffin de Chocolate, 2 Limonada Natural y 1 Limonada de Coco";
    
    console.log(`💬 Mensaje: "${message}"`);
    console.log(`🎯 Esperado: 5 productos diferentes`);
    console.log(`   - Crepes de Nutella x1 - $8,500`);
    console.log(`   - Flan de Caramelo x2 - $11,000 (2 x $5,500)`);
    console.log(`   - Muffin de Chocolate x1 - $4,000`);
    console.log(`   - Limonada Natural x2 - $7,000 (2 x $3,500)`);
    console.log(`   - Limonada de Coco x1 - $4,000`);
    console.log(`   Total esperado: $34,500`);
    
    try {
        const result = await aiService.processOrder(message, '68c30abfe53cbd0d740e8c4e');
        
        console.log(`\n📊 RESULTADOS:`);
        console.log(`📦 Productos detectados: ${result.products.length}`);
        console.log(`💰 Subtotal: $${result.subtotal.toLocaleString()}`);
        console.log(`🚚 Delivery: $${result.delivery.toLocaleString()}`);
        console.log(`💵 Total: $${result.total.toLocaleString()}`);
        
        console.log(`\n📋 PRODUCTOS ENCONTRADOS:`);
        result.products.forEach((product, index) => {
            console.log(`   ${index + 1}. ${product.name} x${product.quantity} - $${product.total.toLocaleString()}`);
        });
        
        // Verificar resultados
        const expectedProducts = [
            { name: 'crepes de nutella', quantity: 1, total: 8500 },
            { name: 'flan de caramelo', quantity: 2, total: 11000 },
            { name: 'muffin de chocolate', quantity: 1, total: 4000 },
            { name: 'limonada natural', quantity: 2, total: 7000 },
            { name: 'limonada de coco', quantity: 1, total: 4000 }
        ];
        
        console.log(`\n🔍 VERIFICACIÓN:`);
        let allCorrect = true;
        
        for (const expected of expectedProducts) {
            const found = result.products.find(p => 
                p.name.toLowerCase().includes(expected.name.split(' ')[0]) && 
                p.quantity === expected.quantity
            );
            
            if (found) {
                console.log(`✅ ${expected.name} x${expected.quantity}: CORRECTO`);
            } else {
                console.log(`❌ ${expected.name} x${expected.quantity}: NO ENCONTRADO`);
                allCorrect = false;
            }
        }
        
        const expectedTotal = 34500;
        const totalCorrect = result.subtotal === expectedTotal;
        
        console.log(`✅ Total: ${totalCorrect ? 'CORRECTO' : 'INCORRECTO'} ($${result.subtotal.toLocaleString()}/${expectedTotal.toLocaleString()})`);
        
        if (allCorrect && totalCorrect) {
            console.log(`\n🎉 ¡PRUEBA PASADA! El sistema funciona correctamente.`);
        } else {
            console.log(`\n⚠️ El sistema necesita más ajustes.`);
        }
        
        return allCorrect && totalCorrect;
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
        return false;
    }
}

// Ejecutar prueba
async function runTest() {
    try {
        const connected = await connectToMongoDB();
        if (!connected) return;
        
        const success = await testComplexOrder();
        
        console.log(`\n🏁 ===== RESULTADO FINAL =====`);
        if (success) {
            console.log(`🎉 ¡EL SISTEMA ESTÁ FUNCIONANDO CORRECTAMENTE!`);
            console.log(`✅ Puedes probar el pedido en WhatsApp ahora.`);
        } else {
            console.log(`⚠️ El sistema necesita más ajustes.`);
        }
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

runTest();



