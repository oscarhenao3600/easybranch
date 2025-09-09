const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

// Test script to debug branch data structure
async function debugBranchData() {
    console.log('🔍 ===== DEBUGGEANDO ESTRUCTURA DE DATOS DE SUCURSALES =====');
    
    try {
        // Test 1: Get branches data
        console.log('\n📋 Obteniendo datos de sucursales...');
        const response = await axios.get(`${BASE_URL}/branch`);
        
        if (response.data.success) {
            const branches = response.data.data;
            console.log(`✅ Se obtuvieron ${branches.length} sucursales`);
            
            if (branches.length > 0) {
                const branch = branches[0];
                console.log('\n🔍 Estructura completa de la primera sucursal:');
                console.log(JSON.stringify(branch, null, 2));
                
                console.log('\n📍 Campos de dirección específicos:');
                console.log('- address:', branch.address);
                console.log('- city:', branch.city);
                console.log('- department:', branch.department);
                console.log('- businessId:', branch.businessId);
                
                // Test formatting
                console.log('\n🎨 Probando formato:');
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
                
                console.log('✅ Texto formateado:', displayText);
            }
        } else {
            console.log('❌ Error:', response.data.message);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Respuesta:', error.response.data);
        }
    }
}

debugBranchData();
