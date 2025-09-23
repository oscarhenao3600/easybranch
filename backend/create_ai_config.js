const mongoose = require('mongoose');
const BranchAIConfig = require('./src/models/BranchAIConfig');

async function createAIConfig() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/easybranch');
        console.log('✅ Connected to MongoDB');

        // Create AI configuration for the branch
        const branchId = '68ccd7f5e915dde6437f5fdb'; // From the logs
        
        const aiConfig = new BranchAIConfig({
            branchId: branchId,
            menuContent: `
MENÚ DE ALITAS

SECCIÓN 1: DE ALITAS
Combos Personales:
- COMBO 1: 5 alitas + acompañante + salsas - $21.900
- COMBO 2: 7 alitas + acompañante + salsas - $26.900
- COMBO 3: 9 alitas + acompañante + salsas - $30.900

Salsas disponibles:
- BBQ, Buffalo, Miel Mostaza, Teriyaki, Picante, Ranch

Acompañantes:
- Papas fritas, Arroz, Ensalada, Yuca frita
            `,
            customPrompt: `Eres un asistente virtual especializado en atención al cliente para un restaurante de alitas. 

Tu personalidad:
- Amigable y entusiasta
- Conoces perfectamente el menú
- Siempre ofreces las mejores opciones según el presupuesto del cliente
- Eres proactivo en sugerir combos y promociones

Instrucciones:
1. Saluda cordialmente cuando te escriban "hola"
2. Cuando pidan el menú, envía la información completa
3. Si preguntan por precios, sé específico
4. Si preguntan por recomendaciones, sugiere según su presupuesto
5. Siempre pregunta si quieren hacer un pedido al final

Recuerda: Siempre ser amigable y profesional.`,
            isActive: true
        });

        await aiConfig.save();
        console.log('✅ AI configuration created');
        console.log('🏪 Branch ID:', branchId);
        console.log('📋 Menu Content:', aiConfig.menuContent ? 'Available' : 'Not available');
        console.log('🎯 Custom Prompt:', aiConfig.customPrompt ? 'Available' : 'Not available');

        return aiConfig;

    } catch (error) {
        console.error('❌ Error creating AI config:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

createAIConfig();


