// Script para diagnosticar problemas de autenticación en el frontend
function diagnoseAuth() {
    console.log('🔍 ===== DIAGNÓSTICO DE AUTENTICACIÓN =====');
    
    // Verificar token en localStorage
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('🔑 Token en localStorage:', token ? 'Presente' : 'Ausente');
    console.log('👤 Usuario en localStorage:', user ? 'Presente' : 'Ausente');
    
    if (token) {
        console.log('📝 Token (primeros 20 caracteres):', token.substring(0, 20) + '...');
        
        // Decodificar el token JWT para verificar expiración
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('📅 Token expira en:', new Date(payload.exp * 1000));
            console.log('⏰ Tiempo actual:', new Date());
            console.log('✅ Token válido:', new Date(payload.exp * 1000) > new Date());
        } catch (error) {
            console.error('❌ Error decodificando token:', error);
        }
    }
    
    if (user) {
        try {
            const userData = JSON.parse(user);
            console.log('👤 Datos del usuario:', userData);
        } catch (error) {
            console.error('❌ Error parseando usuario:', error);
        }
    }
    
    // Probar conexión con el backend
    testBackendConnection();
}

async function testBackendConnection() {
    console.log('\n🌐 ===== PROBANDO CONEXIÓN CON BACKEND =====');
    
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch('http://localhost:3000/api/whatsapp/connections', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📡 Status de respuesta:', response.status);
        console.log('📡 Status text:', response.statusText);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Conexión exitosa:', data);
        } else {
            const errorData = await response.json();
            console.log('❌ Error en respuesta:', errorData);
        }
        
    } catch (error) {
        console.log('❌ Error de red:', error.message);
    }
}

// Ejecutar diagnóstico
diagnoseAuth();
