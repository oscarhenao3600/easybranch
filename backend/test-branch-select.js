const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

// Test script to verify branch select improvements
async function testBranchSelectImprovements() {
    console.log('🧪 ===== PROBANDO MEJORAS EN SELECT DE SUCURSALES =====');
    
    try {
        // Test 1: Get available branches for WhatsApp
        console.log('\n📋 Test 1: Obteniendo sucursales disponibles para WhatsApp...');
        const whatsappResponse = await axios.get(`${BASE_URL}/whatsapp/available-branches`);
        console.log('✅ Respuesta WhatsApp:', JSON.stringify(whatsappResponse.data, null, 2));
        
        // Test 2: Get all branches (for AI & PDF)
        console.log('\n📋 Test 2: Obteniendo todas las sucursales...');
        const branchesResponse = await axios.get(`${BASE_URL}/branch`);
        console.log('✅ Respuesta Branches:', JSON.stringify(branchesResponse.data, null, 2));
        
        // Test 3: Verify address information is included
        console.log('\n📋 Test 3: Verificando información de dirección...');
        if (whatsappResponse.data.data.branches.length > 0) {
            const branch = whatsappResponse.data.data.branches[0];
            console.log('✅ Información de sucursal:', {
                name: branch.name,
                address: branch.address,
                city: branch.city,
                department: branch.department,
                businessName: branch.businessId?.name
            });
        }
        
        console.log('\n🎉 ===== PRUEBAS COMPLETADAS =====');
        
    } catch (error) {
        console.error('❌ Error en las pruebas:', error.message);
        if (error.response) {
            console.error('Respuesta del servidor:', error.response.data);
        }
    }
}

// Run tests
testBranchSelectImprovements();
