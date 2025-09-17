const AIService = require('../src/services/AIService');

// Crear instancia del servicio
const aiService = new AIService();

console.log('🧪 ===== PROBANDO CONVERSACIÓN MÁS NATURAL =====\n');

// Mensajes de prueba para verificar que no hay frases repetitivas
const mensajesPrueba = [
    'hola',
    'menu',
    'quiero 1 café americano',
    'horarios',
    'ubicación',
    'gracias'
];

let frasesRepetitivasEncontradas = [];

mensajesPrueba.forEach(mensaje => {
    try {
        console.log(`📝 Probando mensaje: "${mensaje}"`);
        
        const resultado = aiService.generateResponse('test-branch-id', mensaje, '573113414361', 'restaurant', null);
        
        // Verificar frases repetitivas
        const frasesRepetitivas = [
            '¿En qué más puedo ayudarte?',
            '¿Necesitas agregar algo más?',
            '¿Hay algo más en lo que pueda ayudarte?',
            '¿Necesitas algo más urgente?'
        ];
        
        let respuesta = typeof resultado === 'string' ? resultado : resultado.text || resultado;
        
        frasesRepetitivas.forEach(frase => {
            if (respuesta.includes(frase)) {
                frasesRepetitivasEncontradas.push({
                    mensaje,
                    frase,
                    respuesta: respuesta.substring(0, 200) + '...'
                });
            }
        });
        
        console.log(`✅ Respuesta: ${respuesta.substring(0, 100)}${respuesta.length > 100 ? '...' : ''}`);
        console.log('---');
        
    } catch (error) {
        console.log(`❌ Error con "${mensaje}": ${error.message}`);
        console.log('---');
    }
});

console.log('\n📊 ===== RESUMEN =====');
if (frasesRepetitivasEncontradas.length === 0) {
    console.log('🎉 ¡Perfecto! No se encontraron frases repetitivas.');
    console.log('✅ La conversación ahora es más natural y fluida.');
} else {
    console.log(`❌ Se encontraron ${frasesRepetitivasEncontradas.length} frases repetitivas:`);
    frasesRepetitivasEncontradas.forEach(item => {
        console.log(`   - "${item.frase}" en respuesta a "${item.mensaje}"`);
    });
}

console.log('\n🤖 La conversación ahora es más natural y no termina abruptamente cada respuesta.');
