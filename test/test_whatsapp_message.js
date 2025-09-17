const mongoose = require('mongoose');
const WhatsAppController = require('../src/controllers/WhatsAppController');

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

// Función para simular un mensaje de WhatsApp
async function simulateWhatsAppMessage() {
    console.log('🧪 ===== SIMULANDO MENSAJE DE WHATSAPP =====');
    
    const whatsappController = new WhatsAppController();
    
    // Simular el mensaje del usuario
    const testMessage = 'quiero un Cappuccino, Limonada de Coco, Croissant con Jamón y Queso, Wrap de Pollo';
    const phoneNumber = '573113414361'; // Número de prueba
    const branchId = '68c30abfe53cbd0d740e8c4e'; // ID de la sucursal
    
    console.log(`📱 Simulando mensaje de: ${phoneNumber}`);
    console.log(`💬 Mensaje: "${testMessage}"`);
    console.log(`🏢 Sucursal: ${branchId}`);
    
    try {
        // Simular el procesamiento del mensaje
        const mockMessage = {
            from: phoneNumber,
            body: testMessage,
            timestamp: Date.now()
        };
        
        console.log('\n🔄 Procesando mensaje...');
        
        // Llamar al método de procesamiento de mensajes
        await whatsappController.handleMessageReceived(mockMessage, branchId);
        
        console.log('\n✅ Mensaje procesado exitosamente');
        
    } catch (error) {
        console.error('❌ Error procesando mensaje:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Función principal
async function runTest() {
    try {
        await connectDB();
        await simulateWhatsAppMessage();
        
    } catch (error) {
        console.error('❌ Error ejecutando prueba:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
        process.exit(0);
    }
}

// Ejecutar prueba
runTest();



