const mongoose = require('mongoose');
const WhatsAppConnection = require('./src/models/WhatsAppConnection');
const BranchAIConfig = require('./src/models/BranchAIConfig');
const Branch = require('./src/models/Branch');
const Business = require('./src/models/Business');
const AIService = require('./src/services/AIService');

async function testBranchSpecificAI() {
    try {
        console.log('🔗 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');

        // Buscar todas las conexiones de WhatsApp
        const connections = await WhatsAppConnection.find({})
            .populate('businessId', 'name businessType')
            .populate('branchId', 'name');

        console.log('📱 Conexiones de WhatsApp encontradas:');
        connections.forEach((conn, index) => {
            console.log(`   ${index + 1}. ${conn.connectionName}`);
            console.log(`      - Phone: ${conn.phoneNumber}`);
            console.log(`      - Business: ${conn.businessId?.name} (${conn.businessId?.businessType})`);
            console.log(`      - Branch: ${conn.branchId?.name}`);
            console.log(`      - Status: ${conn.status}`);
            console.log('');
        });

        if (connections.length === 0) {
            console.log('❌ No hay conexiones de WhatsApp disponibles');
            return;
        }

        // Probar cada conexión
        const aiService = new AIService();
        
        for (const connection of connections) {
            console.log(`🧪 ===== PROBANDO CONEXIÓN: ${connection.connectionName} =====`);
            console.log(`📞 Phone: ${connection.phoneNumber}`);
            console.log(`🏢 Business: ${connection.businessId?.name} (${connection.businessId?.businessType})`);
            console.log(`🏪 Branch: ${connection.branchId?.name}`);
            
            // Buscar configuración de IA específica
            const branchAIConfig = await BranchAIConfig.findOne({ branchId: connection.branchId });
            
            console.log('🔍 Configuración de IA:');
            console.log(`   - Config encontrada: ${branchAIConfig ? '✅' : '❌'}`);
            if (branchAIConfig) {
                console.log(`   - Menu Content: ${branchAIConfig.menuContent ? '✅' : '❌'}`);
                console.log(`   - Custom Prompt: ${branchAIConfig.customPrompt ? '✅' : '❌'}`);
                console.log(`   - Menu Length: ${branchAIConfig.menuContent ? branchAIConfig.menuContent.length : 0} caracteres`);
            }
            
            // Probar generación de respuesta
            const testMessage = 'hola';
            console.log(`💬 Mensaje de prueba: "${testMessage}"`);
            
            try {
                const response = await aiService.generateResponse(
                    connection.branchId,
                    testMessage,
                    connection.phoneNumber,
                    connection.businessId?.businessType || 'restaurant',
                    branchAIConfig
                );
                
                console.log('🤖 Respuesta generada:');
                console.log(`   "${response}"`);
                
            } catch (error) {
                console.log('❌ Error generando respuesta:', error.message);
            }
            
            console.log('================================================\n');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

// Ejecutar la prueba
testBranchSpecificAI();
