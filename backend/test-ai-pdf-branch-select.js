const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

// Test script to verify IA & PDF branch select improvements
async function testAIPDFBranchSelect() {
    console.log('🧪 ===== PROBANDO SELECT DE SUCURSALES EN IA & PDF =====');
    
    try {
        // Test 1: Get all branches (used by IA & PDF)
        console.log('\n📋 Test 1: Obteniendo todas las sucursales para IA & PDF...');
        const branchesResponse = await axios.get(`${BASE_URL}/branch`);
        
        if (branchesResponse.data.success) {
            const branches = branchesResponse.data.data;
            console.log(`✅ Se obtuvieron ${branches.length} sucursales`);
            
            // Test 2: Verify branch information structure
            console.log('\n📋 Test 2: Verificando estructura de información de sucursales...');
            if (branches.length > 0) {
                const branch = branches[0];
                console.log('✅ Información de sucursal:', {
                    name: branch.name,
                    address: branch.address,
                    city: branch.city,
                    department: branch.department,
                    businessName: branch.businessId?.name,
                    whatsappPhone: branch.whatsapp?.phoneNumber,
                    whatsappConnected: branch.whatsapp?.isConnected
                });
                
                // Test 3: Simulate frontend formatting
                console.log('\n📋 Test 3: Simulando formato del frontend...');
                const addressParts = [];
                if (branch.address) addressParts.push(branch.address);
                if (branch.city) addressParts.push(branch.city);
                if (branch.department) addressParts.push(branch.department);
                const fullAddress = addressParts.join(', ');
                
                let displayText = `${branch.name}`;
                if (branch.businessId && branch.businessId.name) {
                    displayText += ` (${branch.businessId.name})`;
                }
                if (fullAddress) {
                    displayText += ` - ${fullAddress}`;
                }
                if (branch.whatsapp && branch.whatsapp.phoneNumber) {
                    displayText += ` - WhatsApp: ${branch.whatsapp.phoneNumber}`;
                }
                if (branch.whatsapp && branch.whatsapp.isConnected) {
                    displayText += ' ✅ Conectado';
                } else {
                    displayText += ' ❌ Desconectado';
                }
                
                console.log('✅ Texto formateado para el select:', displayText);
            }
        } else {
            console.log('❌ Error obteniendo sucursales:', branchesResponse.data.message);
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
testAIPDFBranchSelect();
