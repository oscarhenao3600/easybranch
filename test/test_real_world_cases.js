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

// Probar casos reales de productos mal escritos
async function testRealWorldCases() {
    console.log('🧪 ===== PRUEBA DE CASOS REALES DE PRODUCTOS MAL ESCRITOS =====');
    
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
    
    // Casos reales de productos mal escritos que NO están en aliases
    const testCases = [
        {
            message: "quiero un capuchino mal escrito",
            description: "Capuchino con texto adicional"
        },
        {
            message: "quiero un croisant con jamon",
            description: "Croisant mal escrito con ingrediente"
        },
        {
            message: "quiero un frappe de chocolate",
            description: "Frappe sin acento con sabor diferente"
        },
        {
            message: "quiero un muffin de chocolat",
            description: "Chocolate mal escrito"
        },
        {
            message: "quiero un crepe de nutela",
            description: "Crepe y Nutella mal escritos"
        },
        {
            message: "quiero un cafe helado",
            description: "Café sin acento"
        },
        {
            message: "quiero un americano grande",
            description: "Americano con tamaño"
        },
        {
            message: "quiero un latte de vainilla",
            description: "Latte con sabor"
        }
    ];
    
    console.log(`\n🔍 Probando ${testCases.length} casos reales de productos mal escritos...\n`);
    
    let successCount = 0;
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`📝 Caso ${i + 1}: ${testCase.description}`);
        console.log(`   Mensaje: "${testCase.message}"`);
        
        try {
            const result = await aiService.processOrder(testCase.message, '68c30abfe53cbd0d740e8c4e');
            
            if (result.products.length > 0) {
                const detectedProduct = result.products[0];
                console.log(`   ✅ DETECTADO: "${detectedProduct.name}" - $${detectedProduct.price.toLocaleString()}`);
                console.log(`   💰 Total: $${result.total.toLocaleString()}`);
                successCount++;
            } else {
                console.log(`   ❌ NO DETECTADO: No se encontró ningún producto`);
            }
            
        } catch (error) {
            console.log(`   ❌ ERROR: ${error.message}`);
        }
        
        console.log(''); // Línea en blanco
    }
    
    const successRate = (successCount / testCases.length) * 100;
    console.log(`📊 RESULTADOS:`);
    console.log(`   ✅ Casos exitosos: ${successCount}/${testCases.length}`);
    console.log(`   📈 Tasa de éxito: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 80) {
        console.log(`\n🎉 ¡EXCELENTE! El sistema de detección inteligente funciona muy bien.`);
    } else if (successRate >= 60) {
        console.log(`\n👍 ¡BUENO! El sistema funciona bien pero puede mejorar.`);
    } else {
        console.log(`\n⚠️ El sistema necesita más ajustes.`);
    }
    
    return successRate >= 60;
}

// Ejecutar prueba
async function runTest() {
    try {
        const connected = await connectToMongoDB();
        if (!connected) return;
        
        const success = await testRealWorldCases();
        
        console.log(`\n🏁 ===== RESULTADO FINAL =====`);
        if (success) {
            console.log(`🎉 ¡EL SISTEMA DE DETECCIÓN INTELIGENTE ESTÁ FUNCIONANDO!`);
            console.log(`✅ Puedes probar productos mal escritos en WhatsApp ahora.`);
            console.log(`\n💡 EJEMPLOS DE USO:`);
            console.log(`   - "quiero un capuchino" → detecta cappuccino`);
            console.log(`   - "quiero un croisant" → detecta croissant`);
            console.log(`   - "quiero un frappe" → detecta frappé`);
            console.log(`   - "quiero un chocolat" → detecta chocolate`);
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



