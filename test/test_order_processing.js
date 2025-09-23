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

// Función para probar el procesamiento de pedidos
async function testOrderProcessing() {
    console.log('🧪 ===== INICIANDO PRUEBAS AUTOMÁTICAS =====');
    
    const aiService = new AIService();
    
    // Casos de prueba
    const testCases = [
        {
            name: 'Pedido completo original',
            message: 'quiero un Cappuccino, Limonada de Coco, Croissant con Jamón y Queso, Wrap de Pollo',
            expectedProducts: 4,
            expectedTotal: 21000 // 4000 + 4000 + 4500 + 5500 + 3000 delivery
        },
        {
            name: 'Pedido con cantidad específica',
            message: 'quiero 2 Cappuccinos y 1 Wrap de Pollo',
            expectedProducts: 2,
            expectedTotal: 15000 // (2*4000) + 5500 + 3000 delivery
        },
        {
            name: 'Pedido con variaciones de nombres',
            message: 'quiero capuchino, limonada coco, croissant jamón queso, wrap pollo',
            expectedProducts: 4,
            expectedTotal: 21000
        },
        {
            name: 'Pedido parcial',
            message: 'quiero un Cappuccino y Limonada de Coco',
            expectedProducts: 2,
            expectedTotal: 11000 // 4000 + 4000 + 3000 delivery
        }
    ];
    
    let passedTests = 0;
    let totalTests = testCases.length;
    
    for (const testCase of testCases) {
        console.log(`\n🔍 Probando: ${testCase.name}`);
        console.log(`💬 Mensaje: "${testCase.message}"`);
        
        try {
            const result = aiService.processOrder(testCase.message);
            
            console.log(`📊 Productos detectados: ${result.products.length}`);
            console.log(`💰 Total calculado: $${result.total.toLocaleString()}`);
            
            // Verificar productos detectados
            if (result.products.length === testCase.expectedProducts) {
                console.log(`✅ Productos: CORRECTO (${result.products.length}/${testCase.expectedProducts})`);
            } else {
                console.log(`❌ Productos: INCORRECTO (${result.products.length}/${testCase.expectedProducts})`);
            }
            
            // Verificar total
            if (result.total === testCase.expectedTotal) {
                console.log(`✅ Total: CORRECTO ($${result.total.toLocaleString()})`);
            } else {
                console.log(`❌ Total: INCORRECTO ($${result.total.toLocaleString()}, esperado: $${testCase.expectedTotal.toLocaleString()})`);
            }
            
            // Mostrar productos detectados
            console.log('📋 Productos encontrados:');
            result.products.forEach((product, index) => {
                console.log(`   ${index + 1}. ${product.name} x${product.quantity} - $${product.total.toLocaleString()}`);
            });
            
            // Verificar si la prueba pasó
            if (result.products.length === testCase.expectedProducts && result.total === testCase.expectedTotal) {
                console.log('🎉 PRUEBA PASADA');
                passedTests++;
            } else {
                console.log('💥 PRUEBA FALLIDA');
            }
            
        } catch (error) {
            console.error('❌ Error en la prueba:', error.message);
        }
    }
    
    console.log(`\n📊 ===== RESUMEN DE PRUEBAS =====`);
    console.log(`✅ Pruebas pasadas: ${passedTests}/${totalTests}`);
    console.log(`❌ Pruebas fallidas: ${totalTests - passedTests}/${totalTests}`);
    console.log(`📈 Porcentaje de éxito: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
        console.log('🎉 ¡TODAS LAS PRUEBAS PASARON!');
    } else {
        console.log('⚠️ Algunas pruebas fallaron. Revisar el sistema.');
    }
    
    return passedTests === totalTests;
}

// Función para probar la detección de productos específicos
async function testSpecificProducts() {
    console.log('\n🔍 ===== PRUEBAS DE PRODUCTOS ESPECÍFICOS =====');
    
    const aiService = new AIService();
    
    const specificTests = [
        { product: 'Cappuccino', expected: true },
        { product: 'capuchino', expected: true },
        { product: 'capuccino', expected: true },
        { product: 'Limonada de Coco', expected: true },
        { product: 'limonada coco', expected: true },
        { product: 'Croissant con Jamón y Queso', expected: true },
        { product: 'croissant jamón queso', expected: true },
        { product: 'Wrap de Pollo', expected: true },
        { product: 'wrap pollo', expected: true },
        { product: 'Producto Inexistente', expected: false }
    ];
    
    let passedSpecific = 0;
    
    for (const test of specificTests) {
        const message = `quiero un ${test.product}`;
        const result = aiService.processOrder(message);
        const found = result.products.length > 0;
        
        if (found === test.expected) {
            console.log(`✅ "${test.product}": CORRECTO`);
            passedSpecific++;
        } else {
            console.log(`❌ "${test.product}": INCORRECTO (encontrado: ${found}, esperado: ${test.expected})`);
        }
    }
    
    console.log(`\n📊 Productos específicos: ${passedSpecific}/${specificTests.length} correctos`);
    return passedSpecific === specificTests.length;
}

// Función principal
async function runAllTests() {
    try {
        await connectDB();
        
        const orderTestsPassed = await testOrderProcessing();
        const specificTestsPassed = await testSpecificProducts();
        
        console.log('\n🏁 ===== RESULTADO FINAL =====');
        if (orderTestsPassed && specificTestsPassed) {
            console.log('🎉 ¡TODAS LAS PRUEBAS AUTOMÁTICAS PASARON!');
            console.log('✅ El sistema de procesamiento de pedidos está funcionando correctamente.');
        } else {
            console.log('⚠️ Algunas pruebas fallaron.');
            console.log('🔧 Revisar el sistema de procesamiento de pedidos.');
        }
        
    } catch (error) {
        console.error('❌ Error ejecutando pruebas:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
        process.exit(0);
    }
}

// Ejecutar pruebas
runAllTests();



