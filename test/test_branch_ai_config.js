const mongoose = require('mongoose');
const BranchAIConfig = require('../src/models/BranchAIConfig');
const Branch = require('../src/models/Branch');
const User = require('../src/models/User'); // Agregar el modelo User

async function testBranchAIConfig() {
    try {
        console.log('🔍 Probando configuración de IA por sucursal...\n');
        
        // Conectar a MongoDB
        await mongoose.connect('mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB\n');
        
        // Probar la consulta que hace getAllConfigs
        console.log('📊 Probando consulta getAllConfigs...');
        const configs = await BranchAIConfig.find({ isActive: true })
            .populate('branchId', 'name address phone')
            .populate('createdBy', 'name email')
            .sort({ lastUpdated: -1 });
        
        console.log('📊 Configuraciones encontradas:', configs.length);
        
        configs.forEach((config, index) => {
            console.log(`\n🤖 Configuración ${index + 1}:`);
            console.log(`   ID: ${config._id}`);
            console.log(`   Branch ID: ${config.branchId}`);
            console.log(`   Branch Name: ${config.branchId?.name || 'Sin nombre'}`);
            console.log(`   Address: ${config.branchId?.address || 'Sin dirección'}`);
            console.log(`   Phone: ${config.branchId?.phone || 'Sin teléfono'}`);
            console.log(`   Has Menu: ${config.menuContent ? 'Sí' : 'No'}`);
            console.log(`   Menu Length: ${config.menuContent?.length || 0} caracteres`);
            console.log(`   Created By: ${config.createdBy?.name || 'Sistema'}`);
            console.log(`   Is Active: ${config.isActive}`);
        });
        
        // Probar también sin populate para ver los datos raw
        console.log('\n📊 Probando sin populate...');
        const rawConfigs = await BranchAIConfig.find({ isActive: true });
        
        rawConfigs.forEach((config, index) => {
            console.log(`\n🔍 Raw Config ${index + 1}:`);
            console.log(`   ID: ${config._id}`);
            console.log(`   Branch ID: ${config.branchId}`);
            console.log(`   Has Menu: ${config.menuContent ? 'Sí' : 'No'}`);
        });
        
        console.log('\n✅ Prueba completada');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

testBranchAIConfig();
