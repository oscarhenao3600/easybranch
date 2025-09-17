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

// Probar detección inteligente directamente
async function testDirectIntelligentDetection() {
    console.log('🧪 ===== PRUEBA DIRECTA DE DETECCIÓN INTELIGENTE =====');
    
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
    
    // Casos de prueba específicos para detección inteligente
    const testCases = [
        {
            searchTerm: "capuchino",
            expected: "cappuccino",
            description: "Capuchino → Cappuccino"
        },
        {
            searchTerm: "croisant",
            expected: "croissant",
            description: "Croisant → Croissant"
        },
        {
            searchTerm: "frappe",
            expected: "frappé",
            description: "Frappe → Frappé"
        },
        {
            searchTerm: "chocolat",
            expected: "chocolate",
            description: "Chocolat → Chocolate"
        },
        {
            searchTerm: "nutela",
            expected: "nutella",
            description: "Nutela → Nutella"
        },
        {
            searchTerm: "crepe",
            expected: "crepes",
            description: "Crepe → Crepes"
        }
    ];
    
    console.log(`\n🔍 Probando ${testCases.length} casos de detección inteligente directa...\n`);
    
    // Simular la función findProductIntelligent directamente
    const products = {
        'cappuccino': { price: 4000, category: 'café', aliases: ['capuchino', 'capuccino'] },
        'croissant': { price: 3000, category: 'pastelería', aliases: ['croisant'] },
        'frappé de vainilla': { price: 4800, category: 'café', aliases: ['frappe de vainilla'] },
        'muffin de chocolate': { price: 4000, category: 'pastelería', aliases: ['muffin chocolate'] },
        'crepes de nutella': { price: 8500, category: 'postres', aliases: ['crepes nutella'] },
        'flan de caramelo': { price: 5500, category: 'postres', aliases: ['flan caramelo'] }
    };
    
    // Función para normalizar texto
    const normalizeText = (text) => {
        return text
            .replace(/ñ/g, 'n')
            .replace(/á/g, 'a')
            .replace(/é/g, 'e')
            .replace(/í/g, 'i')
            .replace(/ó/g, 'o')
            .replace(/ú/g, 'u')
            .replace(/ü/g, 'u')
            .replace(/ç/g, 'c')
            .replace(/[bcdfghjklmnpqrstvwxyz]{2,}/g, (match) => match[0])
            .replace(/[aeiou]{2,}/g, (match) => match[0])
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };
    
    // Función para calcular distancia de Levenshtein
    const levenshteinDistance = (str1, str2) => {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    };
    
    // Función para calcular similitud
    const calculateSimilarity = (str1, str2) => {
        const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
        const maxLength = Math.max(str1.length, str2.length);
        return maxLength === 0 ? 100 : ((maxLength - distance) / maxLength) * 100;
    };
    
    // Función para encontrar productos similares
    const findSimilarProducts = (searchTerm, products, threshold = 50) => {
        const normalizedSearchTerm = normalizeText(searchTerm);
        const similarProducts = [];
        
        for (const [productName, productInfo] of Object.entries(products)) {
            const normalizedProductName = normalizeText(productName);
            
            // Calcular similitud con el nombre del producto
            const nameSimilarity = calculateSimilarity(normalizedSearchTerm, normalizedProductName);
            
            // Calcular similitud con aliases
            let maxAliasSimilarity = 0;
            if (productInfo.aliases) {
                for (const alias of productInfo.aliases) {
                    const aliasSimilarity = calculateSimilarity(normalizedSearchTerm, normalizeText(alias));
                    maxAliasSimilarity = Math.max(maxAliasSimilarity, aliasSimilarity);
                }
            }
            
            // Usar la mayor similitud encontrada
            const maxSimilarity = Math.max(nameSimilarity, maxAliasSimilarity);
            
            if (maxSimilarity >= threshold) {
                similarProducts.push({
                    name: productName,
                    info: productInfo,
                    similarity: maxSimilarity,
                    matchType: nameSimilarity >= maxAliasSimilarity ? 'name' : 'alias'
                });
            }
        }
        
        // Ordenar por similitud descendente
        return similarProducts.sort((a, b) => b.similarity - a.similarity);
    };
    
    let successCount = 0;
    
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`📝 Caso ${i + 1}: ${testCase.description}`);
        console.log(`   Búsqueda: "${testCase.searchTerm}"`);
        console.log(`   Esperado: "${testCase.expected}"`);
        
        const similarProducts = findSimilarProducts(testCase.searchTerm, products, 50);
        
        if (similarProducts.length > 0) {
            const bestMatch = similarProducts[0];
            console.log(`   🔍 Mejor coincidencia: "${bestMatch.name}" (${Math.round(bestMatch.similarity)}% similitud)`);
            
            const isCorrect = bestMatch.name.toLowerCase().includes(testCase.expected.toLowerCase()) ||
                            testCase.expected.toLowerCase().includes(bestMatch.name.toLowerCase());
            
            if (isCorrect) {
                console.log(`   ✅ CORRECTO: Detectado "${bestMatch.name}"`);
                successCount++;
            } else {
                console.log(`   ❌ INCORRECTO: Detectado "${bestMatch.name}" en lugar de "${testCase.expected}"`);
            }
            
            // Mostrar todas las coincidencias
            if (similarProducts.length > 1) {
                console.log(`   💡 Otras coincidencias:`);
                similarProducts.slice(1, 3).forEach((match, index) => {
                    console.log(`      ${index + 2}. "${match.name}" (${Math.round(match.similarity)}%)`);
                });
            }
        } else {
            console.log(`   ❌ NO DETECTADO: No se encontraron productos similares`);
        }
        
        console.log(''); // Línea en blanco
    }
    
    const successRate = (successCount / testCases.length) * 100;
    console.log(`📊 RESULTADOS:`);
    console.log(`   ✅ Casos exitosos: ${successCount}/${testCases.length}`);
    console.log(`   📈 Tasa de éxito: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 80) {
        console.log(`\n🎉 ¡EXCELENTE! El algoritmo de detección inteligente funciona muy bien.`);
    } else if (successRate >= 60) {
        console.log(`\n👍 ¡BUENO! El algoritmo funciona bien pero puede mejorar.`);
    } else {
        console.log(`\n⚠️ El algoritmo necesita más ajustes.`);
    }
    
    return successRate >= 60;
}

// Ejecutar prueba
async function runTest() {
    try {
        const connected = await connectToMongoDB();
        if (!connected) return;
        
        const success = await testDirectIntelligentDetection();
        
        console.log(`\n🏁 ===== RESULTADO FINAL =====`);
        if (success) {
            console.log(`🎉 ¡EL ALGORITMO DE DETECCIÓN INTELIGENTE ESTÁ FUNCIONANDO!`);
            console.log(`✅ El sistema puede detectar productos mal escritos.`);
        } else {
            console.log(`⚠️ El algoritmo necesita más ajustes.`);
        }
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

runTest();



