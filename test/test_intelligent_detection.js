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

// Probar detección inteligente de productos mal escritos
async function testIntelligentProductDetection() {
    console.log('🧪 ===== PRUEBA DE DETECCIÓN INTELIGENTE DE PRODUCTOS =====');
    
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
    
    // Casos de prueba con productos mal escritos
    const testCases = [
        {
            message: "quiero un capuchino",
            expected: "cappuccino",
            description: "Variación común de cappuccino"
        },
        {
            message: "quiero un croisant",
            expected: "croissant",
            description: "Croissant mal escrito"
        },
        {
            message: "quiero un frappe de vainilla",
            expected: "frappé de vainilla",
            description: "Frappé sin acento"
        },
        {
            message: "quiero un cafe americano",
            expected: "café americano",
            description: "Café sin acento"
        },
        {
            message: "quiero un muffin de chocolat",
            expected: "muffin de chocolate",
            description: "Chocolate mal escrito"
        },
        {
            message: "quiero un limonada de coco",
            expected: "limonada de coco",
            description: "Limonada sin artículo"
        },
        {
            message: "quiero un crepe de nutela",
            expected: "crepes de nutella",
            description: "Crepes y Nutella mal escritos"
        },
        {
            message: "quiero un flan de caramelo",
            expected: "flan de caramelo",
            description: "Flan correcto"
        }
    ];
    
    console.log(`\n🔍 Probando ${testCases.length} casos de detección inteligente...\n`);
    
    let successCount = 0;
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`📝 Caso ${i + 1}: ${testCase.description}`);
        console.log(`   Mensaje: "${testCase.message}"`);
        console.log(`   Esperado: "${testCase.expected}"`);
        
        try {
            const result = await aiService.processOrder(testCase.message, '68c30abfe53cbd0d740e8c4e');
            
            if (result.products.length > 0) {
                const detectedProduct = result.products[0];
                const isCorrect = detectedProduct.name.toLowerCase().includes(testCase.expected.toLowerCase()) ||
                                testCase.expected.toLowerCase().includes(detectedProduct.name.toLowerCase());
                
                if (isCorrect) {
                    console.log(`   ✅ CORRECTO: Detectado "${detectedProduct.name}"`);
                    successCount++;
                } else {
                    console.log(`   ❌ INCORRECTO: Detectado "${detectedProduct.name}" en lugar de "${testCase.expected}"`);
                }
                
                console.log(`   💰 Precio: $${detectedProduct.price.toLocaleString()}`);
                console.log(`   📊 Total: $${result.total.toLocaleString()}`);
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
        
        const success = await testIntelligentProductDetection();
        
        console.log(`\n🏁 ===== RESULTADO FINAL =====`);
        if (success) {
            console.log(`🎉 ¡EL SISTEMA DE DETECCIÓN INTELIGENTE ESTÁ FUNCIONANDO!`);
            console.log(`✅ Puedes probar productos mal escritos en WhatsApp ahora.`);
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



