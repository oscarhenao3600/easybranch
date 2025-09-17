const AIService = require('../src/services/AIService');

// Crear instancia del servicio
const aiService = new AIService();

// Lista de productos del menú completo para probar
const productosMenu = [
    // Tés e Infusiones
    'té negro',
    'té verde', 
    'té de hierbas',
    'té de manzanilla',
    'té de jengibre',
    'chocolate caliente',
    'aromática de canela',
    
    // Cafés
    'café americano',
    'café con leche',
    'cappuccino',
    'latte',
    'mocha',
    'macchiato',
    'café descafeinado',
    'espresso doble',
    
    // Bebidas Frías
    'café helado',
    'frappé de café',
    'cold brew',
    'iced latte',
    'frappé de mocha',
    
    // Jugos y Refrescos
    'jugo de naranja natural',
    'jugo de maracuyá',
    'jugo de mango',
    'limonada natural',
    'limonada de coco',
    'agua de panela',
    'gaseosa',
    
    // Desayunos
    'desayuno ejecutivo',
    'desayuno continental',
    'desayuno saludable',
    'arepa con huevo',
    'calentado paisa',
    
    // Pastelería
    'croissant simple',
    'croissant con jamón y queso',
    'muffin de arándanos',
    'muffin de chocolate',
    'donut glaseado',
    'brownie',
    'cheesecake',
    
    // Sopas
    'sopa de pollo',
    'crema de espinacas',
    'sopa de lentejas',
    'sopa de verduras',
    
    // Platos Principales
    'ensalada césar',
    'ensalada de pollo',
    'sandwich club',
    'hamburguesa clásica',
    'hamburguesa con queso',
    'wrap de pollo',
    'wrap vegetariano',
    'pasta alfredo',
    'pasta bolognesa',
    
    // Acompañamientos
    'papas a la francesa',
    'papas rústicas',
    'ensalada verde',
    'arroz blanco',
    
    // Postres Caseros
    'torta de chocolate',
    'torta de zanahoria',
    'tiramisu',
    'flan de caramelo',
    'helado de vainilla',
    'helado de chocolate',
    'helado de fresa',
    
    // Postres Especiales
    'sundae de chocolate',
    'banana split',
    'waffle con helado',
    'crepes de nutella'
];

console.log('🧪 ===== PROBANDO DETECCIÓN DE PRODUCTOS DEL MENÚ COMPLETO =====\n');

let productosEncontrados = 0;
let productosNoEncontrados = [];

productosMenu.forEach(producto => {
    try {
        // Simular un pedido simple con el producto
        const mensajePrueba = `quiero 1 ${producto}`;
        const resultado = aiService.processOrder(mensajePrueba, 'test-branch-id');
        
        if (resultado && resultado.products && resultado.products.length > 0) {
            const productoEncontrado = resultado.products[0];
            console.log(`✅ ${producto} - $${productoEncontrado.info.price} (${productoEncontrado.info.category})`);
            productosEncontrados++;
        } else {
            console.log(`❌ ${producto} - NO ENCONTRADO`);
            productosNoEncontrados.push(producto);
        }
    } catch (error) {
        console.log(`❌ ${producto} - ERROR: ${error.message}`);
        productosNoEncontrados.push(producto);
    }
});

console.log('\n📊 ===== RESUMEN =====');
console.log(`✅ Productos encontrados: ${productosEncontrados}/${productosMenu.length}`);
console.log(`❌ Productos no encontrados: ${productosNoEncontrados.length}`);

if (productosNoEncontrados.length > 0) {
    console.log('\n❌ Productos que faltan:');
    productosNoEncontrados.forEach(producto => {
        console.log(`   - ${producto}`);
    });
} else {
    console.log('\n🎉 ¡Todos los productos del menú están correctamente configurados!');
}
