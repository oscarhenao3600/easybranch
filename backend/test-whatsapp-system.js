const fetch = require('node-fetch');

async function testWhatsAppSystem() {
    try {
        console.log('🧪 ===== PROBANDO SISTEMA WHATSAPP MEJORADO =====');
        
        const baseURL = 'http://localhost:4000/api';
        
        // Probar estadísticas del sistema
        console.log('\n📊 Probando estadísticas del sistema...');
        try {
            const statsResponse = await fetch(`${baseURL}/whatsapp/stats/system`, {
                headers: {
                    'Authorization': 'Bearer test-token' // Token de prueba
                }
            });
            
            if (statsResponse.ok) {
                const stats = await statsResponse.json();
                console.log('✅ Estadísticas obtenidas:', stats.data);
            } else {
                console.log('⚠️ Error obteniendo estadísticas:', statsResponse.status);
            }
        } catch (error) {
            console.log('❌ Error en estadísticas:', error.message);
        }
        
        // Probar conexiones disponibles
        console.log('\n🏪 Probando sucursales disponibles...');
        try {
            const branchesResponse = await fetch(`${baseURL}/whatsapp/available-branches`, {
                headers: {
                    'Authorization': 'Bearer test-token'
                }
            });
            
            if (branchesResponse.ok) {
                const branches = await branchesResponse.json();
                console.log('✅ Sucursales disponibles:', branches.data?.length || 0);
            } else {
                console.log('⚠️ Error obteniendo sucursales:', branchesResponse.status);
            }
        } catch (error) {
            console.log('❌ Error en sucursales:', error.message);
        }
        
        // Probar conexiones existentes
        console.log('\n📱 Probando conexiones existentes...');
        try {
            const connectionsResponse = await fetch(`${baseURL}/whatsapp/connections`, {
                headers: {
                    'Authorization': 'Bearer test-token'
                }
            });
            
            if (connectionsResponse.ok) {
                const connections = await connectionsResponse.json();
                console.log('✅ Conexiones encontradas:', connections.data?.length || 0);
                
                if (connections.data && connections.data.length > 0) {
                    const connection = connections.data[0];
                    console.log(`   - ${connection.connectionName}: ${connection.status}`);
                    console.log(`   - Teléfono: ${connection.phoneNumber}`);
                    console.log(`   - Conectado: ${connection.isConnected ? 'Sí' : 'No'}`);
                }
            } else {
                console.log('⚠️ Error obteniendo conexiones:', connectionsResponse.status);
            }
        } catch (error) {
            console.log('❌ Error en conexiones:', error.message);
        }
        
        console.log('\n🎉 Prueba del sistema completada');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

// Ejecutar prueba
testWhatsAppSystem();
