const AIService = require('../src/services/AIService');

// Crear instancia del servicio
const aiService = new AIService();

// Probar algunos productos específicos que mencionaste que faltaban
const productosPrueba = [
    'té verde',
    'frappé de café', 
    'hamburguesa con queso',
    'limonada de coco',
    'wrap de pollo',
    'crepes de nutella',
    'flan de caramelo',
    'muffin de chocolate'
];

console.log('🧪 ===== PROBANDO PRODUCTOS ESPECÍFICOS =====\n');

productosPrueba.forEach(producto => {
    try {
        const mensajePrueba = `quiero 1 ${producto}`;
        console.log(`🔍 Probando: ${producto}`);
        
        const resultado = aiService.processOrder(mensajePrueba, 'test-branch-id');
        
        if (resultado && resultado.products && resultado.products.length > 0) {
            const productoEncontrado = resultado.products[0];
            console.log(`✅ ${producto} - $${productoEncontrado.info.price} (${productoEncontrado.info.category})`);
        } else {
            console.log(`❌ ${producto} - NO ENCONTRADO`);
        }
    } catch (error) {
        console.log(`❌ ${producto} - ERROR: ${error.message}`);
    }
    console.log('---');
});

console.log('\n🎯 ===== PRUEBA COMPLETA =====');
console.log('Probando pedido complejo: "quiero 1 té verde, 2 frappé de café, 1 hamburguesa con queso"');

try {
    const pedidoComplejo = 'quiero 1 té verde, 2 frappé de café, 1 hamburguesa con queso';
    const resultado = aiService.processOrder(pedidoComplejo, 'test-branch-id');
    
    if (resultado && resultado.products && resultado.products.length > 0) {
        console.log('\n✅ PRODUCTOS DETECTADOS:');
        resultado.products.forEach((producto, index) => {
            console.log(`${index + 1}. ${producto.name} x${producto.quantity} - $${producto.info.price}`);
        });
        console.log(`\n💰 TOTAL: $${resultado.subtotal}`);
    } else {
        console.log('❌ No se detectaron productos');
    }
} catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
}
