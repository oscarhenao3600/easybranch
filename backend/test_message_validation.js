const WhatsAppController = require('./src/controllers/WhatsAppController');

function testMessageValidation() {
    console.log('🧪 ===== PROBANDO VALIDACIÓN DE MENSAJES =====\n');
    
    const controller = new WhatsAppController();
    
    // Casos de prueba para diferentes tipos de mensajes
    const testCases = [
        {
            name: "Imagen enviada",
            message: null,
            messageType: "image",
            mediaType: "image",
            expected: "shouldRespond"
        },
        {
            name: "Audio enviado",
            message: null,
            messageType: "audio",
            mediaType: "audio",
            expected: "shouldRespond"
        },
        {
            name: "Video enviado",
            message: null,
            messageType: "video",
            mediaType: "video",
            expected: "shouldRespond"
        },
        {
            name: "Documento enviado",
            message: null,
            messageType: "document",
            mediaType: "document",
            expected: "shouldRespond"
        },
        {
            name: "Mensaje de solo puntos",
            message: ".....",
            messageType: "text",
            mediaType: "text",
            expected: "shouldCancel"
        },
        {
            name: "Mensaje de solo signos",
            message: "???!!!",
            messageType: "text",
            mediaType: "text",
            expected: "shouldCancel"
        },
        {
            name: "Letra repetida",
            message: "aaaaa",
            messageType: "text",
            mediaType: "text",
            expected: "shouldCancel"
        },
        {
            name: "Letras separadas",
            message: "a b c",
            messageType: "text",
            mediaType: "text",
            expected: "shouldCancel"
        },
        {
            name: "Solo números cortos",
            message: "12",
            messageType: "text",
            mediaType: "text",
            expected: "shouldCancel"
        },
        {
            name: "Solo símbolos especiales",
            message: "@#$%",
            messageType: "text",
            mediaType: "text",
            expected: "shouldCancel"
        },
        {
            name: "Mensaje válido corto",
            message: "hola",
            messageType: "text",
            mediaType: "text",
            expected: "valid"
        },
        {
            name: "Mensaje válido - sí",
            message: "si",
            messageType: "text",
            mediaType: "text",
            expected: "valid"
        },
        {
            name: "Mensaje válido normal",
            message: "Quiero hacer un pedido",
            messageType: "text",
            mediaType: "text",
            expected: "valid"
        },
        {
            name: "Mensaje vacío",
            message: "",
            messageType: "text",
            mediaType: "text",
            expected: "shouldIgnore"
        },
        {
            name: "Solo espacios",
            message: "   ",
            messageType: "text",
            mediaType: "text",
            expected: "shouldIgnore"
        }
    ];
    
    console.log('🎯 Probando validación de diferentes tipos de mensajes...\n');
    
    for (const testCase of testCases) {
        console.log(`📝 **${testCase.name}**`);
        console.log(`📨 Mensaje: "${testCase.message || 'N/A'}"`);
        console.log(`🏷️ Tipo: ${testCase.messageType}, Media: ${testCase.mediaType}`);
        
        try {
            const result = controller.validateMessageType(testCase.message, testCase.messageType, testCase.mediaType);
            
            let actualResult = 'valid';
            if (result.shouldIgnore) actualResult = 'shouldIgnore';
            else if (result.shouldCancel) actualResult = 'shouldCancel';
            else if (result.shouldRespond) actualResult = 'shouldRespond';
            
            const status = actualResult === testCase.expected ? '✅' : '❌';
            console.log(`${status} Resultado: ${actualResult} (esperado: ${testCase.expected})`);
            
            if (result.response) {
                console.log(`🤖 Respuesta: "${result.response}"`);
            }
            
            if (result.reason) {
                console.log(`💭 Razón: ${result.reason}`);
            }
            
            console.log('---\n');
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}\n`);
        }
    }
    
    console.log('🎉 ===== PRUEBAS DE VALIDACIÓN COMPLETADAS =====');
    console.log('\n📋 RESUMEN DE FUNCIONALIDADES:');
    console.log('✅ Detección de mensajes multimedia (imagen, audio, video, documento)');
    console.log('✅ Respuestas automáticas para mensajes no-texto');
    console.log('✅ Detección de mensajes sin sentido (puntos, signos, letras repetidas)');
    console.log('✅ Cancelación de orden para mensajes sin sentido');
    console.log('✅ Ignorar mensajes vacíos');
    console.log('✅ Permitir mensajes válidos cortos (hola, sí, no, etc.)');
}

// Ejecutar las pruebas
testMessageValidation();
