// Script para probar la creación de conexión WhatsApp directamente
async function testWhatsAppConnection() {
    console.log('🧪 ===== PROBANDO CREACIÓN DE CONEXIÓN WHATSAPP =====');
    
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.error('❌ No hay token de autenticación');
            console.log('💡 Necesitas iniciar sesión primero');
            return;
        }
        
        console.log('🔑 Token encontrado:', token.substring(0, 20) + '...');
        
        // Primero obtener sucursales disponibles
        console.log('\n📋 Obteniendo sucursales disponibles...');
        const branchesResponse = await fetch('http://localhost:3000/api/whatsapp/available-branches', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 Status sucursales:', branchesResponse.status);
        
        if (!branchesResponse.ok) {
            const errorData = await branchesResponse.json();
            console.error('❌ Error obteniendo sucursales:', errorData);
            return;
        }
        
        const branchesData = await branchesResponse.json();
        console.log('✅ Sucursales disponibles:', branchesData);
        
        if (!branchesData.data.canCreateConnection) {
            console.log('⚠️ No se puede crear conexión:', branchesData.data.message);
            return;
        }
        
        // Intentar crear una conexión de prueba
        console.log('\n🔄 Creando conexión de prueba...');
        const connectionData = {
            phoneNumber: '573053397959',
            branchId: branchesData.data.branches[0]._id,
            businessId: branchesData.data.branches[0].businessId
        };
        
        console.log('📝 Datos de conexión:', connectionData);
        
        const createResponse = await fetch('http://localhost:3000/api/whatsapp/connections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(connectionData)
        });
        
        console.log('📡 Status creación:', createResponse.status);
        
        if (createResponse.ok) {
            const createData = await createResponse.json();
            console.log('✅ Conexión creada exitosamente:', createData);
        } else {
            const errorData = await createResponse.json();
            console.error('❌ Error creando conexión:', errorData);
        }
        
    } catch (error) {
        console.error('❌ Error general:', error);
    }
}

// Ejecutar prueba
testWhatsAppConnection();
