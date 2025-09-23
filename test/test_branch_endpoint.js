const mongoose = require('mongoose');
const Branch = require('../src/models/Branch');
const Business = require('../src/models/Business');

async function testBranchEndpoint() {
    try {
        console.log('🔍 Probando endpoint de sucursales...\n');
        
        // Conectar a MongoDB
        await mongoose.connect('mongodb://localhost:27017/easybranch');
        console.log('✅ Conectado a MongoDB\n');
        
        // Simular la consulta que hace el endpoint
        const branches = await Branch.find({})
            .populate('businessId', 'name businessType')
            .select('-__v')
            .sort({ createdAt: -1 });
        
        console.log('📊 Sucursales encontradas:', branches.length);
        
        branches.forEach((branch, index) => {
            console.log(`\n🏪 Sucursal ${index + 1}:`);
            console.log(`   ID: ${branch._id}`);
            console.log(`   Branch ID: ${branch.branchId}`);
            console.log(`   Nombre: ${branch.name || branch.razonSocial}`);
            console.log(`   Negocio: ${branch.businessId?.name || 'Sin negocio'}`);
            console.log(`   Dirección: ${branch.address || 'Sin dirección'}`);
            console.log(`   Ciudad: ${branch.city || 'Sin ciudad'}`);
            console.log(`   Departamento: ${branch.department || 'Sin departamento'}`);
            console.log(`   Activa: ${branch.isActive ? 'Sí' : 'No'}`);
        });
        
        // Verificar si hay problemas con el populate
        console.log('\n🔍 Verificando populate de businessId...');
        const branchesWithBusiness = await Branch.find({})
            .populate('businessId', 'name businessType')
            .select('name businessId');
        
        branchesWithBusiness.forEach((branch, index) => {
            console.log(`Sucursal ${index + 1}: ${branch.name} -> Negocio: ${branch.businessId?.name || 'NULL'}`);
        });
        
        console.log('\n✅ Prueba completada');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');
    }
}

testBranchEndpoint();


