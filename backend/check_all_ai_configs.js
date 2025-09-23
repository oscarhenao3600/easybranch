const mongoose = require('mongoose');
const BranchAIConfig = require('./src/models/BranchAIConfig');
const Branch = require('./src/models/Branch');
const Business = require('./src/models/Business');
const User = require('./src/models/User');

async function checkAllAIConfigs() {
    try {
        console.log('🔗 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB');

        // Buscar todas las configuraciones de IA
        const configs = await BranchAIConfig.find({})
            .populate('branchId', 'name businessId')
            .populate('createdBy', 'name email');

        console.log('🤖 Configuraciones de IA encontradas:');
        configs.forEach((config, index) => {
            console.log(`\n${index + 1}. Configuración ID: ${config._id}`);
            console.log(`   - Branch: ${config.branchId?.name}`);
            console.log(`   - Business ID: ${config.branchId?.businessId}`);
            console.log(`   - Menu Content: ${config.menuContent ? '✅' : '❌'}`);
            console.log(`   - Custom Prompt: ${config.customPrompt ? '✅' : '❌'}`);
            console.log(`   - Created By: ${config.createdBy?.email}`);
            
            if (config.menuContent) {
                const firstLine = config.menuContent.split('\n')[0];
                console.log(`   - Menu Preview: "${firstLine}"`);
            }
        });

        // Buscar todas las sucursales
        console.log('\n🏪 Todas las sucursales:');
        const branches = await Branch.find({}).populate('businessId', 'name businessType');
        branches.forEach((branch, index) => {
            console.log(`${index + 1}. ${branch.name}`);
            console.log(`   - Business: ${branch.businessId?.name} (${branch.businessId?.businessType})`);
            console.log(`   - Branch ID: ${branch._id}`);
        });

        // Buscar todas las empresas
        console.log('\n🏢 Todas las empresas:');
        const businesses = await Business.find({});
        businesses.forEach((business, index) => {
            console.log(`${index + 1}. ${business.name}`);
            console.log(`   - Type: ${business.businessType}`);
            console.log(`   - Business ID: ${business._id}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

checkAllAIConfigs();
