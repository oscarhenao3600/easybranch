// Script simple para probar la API de sucursales
async function testBranchAPI() {
    console.log('🧪 ===== PROBANDO API DE SUCURSALES =====');
    
    try {
        // Obtener token del localStorage
        const token = localStorage.getItem('token');
        console.log('🔑 Token encontrado:', token ? 'Sí' : 'No');
        
        if (!token) {
            console.error('❌ No hay token de autenticación');
            return;
        }
        
        // Hacer request a la API
        const response = await fetch('http://localhost:3000/api/branch', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            console.error('❌ Error en la respuesta:', response.status, response.statusText);
            return;
        }
        
        const data = await response.json();
        console.log('📋 Datos recibidos:', data);
        
        if (data.success && data.data) {
            const branches = data.data;
            console.log('🏢 Total sucursales:', branches.length);
            
            if (branches.length > 0) {
                const branch = branches[0];
                console.log('📍 Primera sucursal:');
                console.log('  - name:', branch.name);
                console.log('  - address:', branch.address);
                console.log('  - city:', branch.city);
                console.log('  - department:', branch.department);
                console.log('  - businessId:', branch.businessId);
                
                // Probar formateo
                const addressParts = [];
                if (branch.address) addressParts.push(branch.address);
                if (branch.city) addressParts.push(branch.city);
                if (branch.department) addressParts.push(branch.department);
                const fullAddress = addressParts.join(', ');
                
                const businessName = branch.businessId?.name || 'Sin negocio';
                const addressText = fullAddress ? ` - ${fullAddress}` : '';
                const displayText = `${branch.name} (${businessName})${addressText}`;
                
                console.log('🎨 Texto formateado:', displayText);
            }
        } else {
            console.error('❌ Error en los datos:', data.message);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Ejecutar el test
testBranchAPI();
