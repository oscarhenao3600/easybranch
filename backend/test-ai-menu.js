// Script para probar la IA con contenido de menú
const AIService = require('./src/services/AIService');

async function testAIWithMenu() {
    try {
        console.log('🧪 ===== PROBANDO IA CON CONTENIDO DE MENÚ =====');
        
        const aiService = new AIService();
        
        // Simular contenido de menú PDF
        const menuContent = `
MENÚ CAFETERÍA EL SABOR

BEBIDAS CALIENTES
☕ Café Americano - $3.500
☕ Café Latte - $4.200
☕ Cappuccino - $4.000
☕ Café Mocha - $4.500
☕ Té Verde - $2.800
☕ Té Negro - $2.800

BEBIDAS FRÍAS
🥤 Frappé de Café - $5.200
🥤 Smoothie de Frutas - $4.800
🥤 Limonada Natural - $3.000
🥤 Jugo de Naranja - $3.500

POSTRES
🍰 Cheesecake - $6.500
🍰 Brownie con Helado - $5.800
🍰 Tiramisu - $7.200
🍰 Muffin de Chocolate - $3.200

DESAYUNOS
🥞 Pancakes - $8.500
🥞 Waffles - $9.000
🥞 Tostada Francesa - $7.800
🥞 Omelette - $6.500

HORARIOS DE ATENCIÓN
Lunes a Viernes: 7:00 AM - 8:00 PM
Sábados y Domingos: 8:00 AM - 6:00 PM
        `;
        
        // Simular configuración de sucursal
        const branchConfig = {
            menuContent: menuContent,
            customPrompt: 'Eres un asistente virtual de Cafetería El Sabor. Responde de manera amigable y profesional, siempre mencionando nuestros productos específicos del menú.',
            businessSettings: {
                businessType: 'cafe',
                messages: {
                    welcome: '¡Hola! Bienvenido a Cafetería El Sabor ☕\n\n¿En qué puedo ayudarte hoy?'
                }
            }
        };
        
        // Probar diferentes mensajes
        const testMessages = [
            'hola',
            'tienes algo de cafe?',
            'me regalas un listado de tus productos con cafe',
            'cuales son los precios?',
            'que horarios tienen?'
        ];
        
        for (const message of testMessages) {
            console.log(`\n💬 Probando mensaje: "${message}"`);
            
            try {
                const response = await aiService.generateResponse(
                    'test-branch-id',
                    message,
                    'test-client',
                    'cafe',
                    branchConfig
                );
                
                console.log(`🤖 Respuesta: ${response}`);
                
            } catch (error) {
                console.error(`❌ Error procesando "${message}":`, error.message);
            }
        }
        
        console.log('\n🎉 Prueba completada');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

testAIWithMenu();

