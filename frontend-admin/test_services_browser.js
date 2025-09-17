// Script para probar el endpoint desde el navegador
// Abre la consola del navegador y ejecuta este código

async function testServicesEndpoint() {
    try {
        console.log('🔍 Probando endpoint /api/branch/services...');
        
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('❌ No hay token en localStorage');
            return;
        }
        
        console.log('🔑 Token encontrado:', token.substring(0, 50) + '...');
        
        const response = await fetch('/api/branch/services?limit=100', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📊 Status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error en respuesta:', errorText);
            return;
        }
        
        const data = await response.json();
        console.log('✅ Respuesta del servidor:', data);
        
        console.log(`🍗 Total productos: ${data.data?.length || 0}`);
        
        if (data.data && data.data.length > 0) {
            console.log('\n📋 Primeros 5 productos:');
            data.data.slice(0, 5).forEach((product, index) => {
                console.log(`   ${index + 1}. ${product.name} - $${product.price?.toLocaleString()} (${product.category})`);
            });
            
            // Buscar productos de alitas
            const alitasProducts = data.data.filter(p => 
                p.name.toLowerCase().includes('combo') || 
                p.category.includes('Combo') ||
                p.tags?.includes('alitas')
            );
            console.log(`\n🍗 Productos de alitas encontrados: ${alitasProducts.length}`);
            alitasProducts.forEach((product, index) => {
                console.log(`   ${index + 1}. ${product.name} - $${product.price?.toLocaleString()} (${product.category})`);
            });
            
            // Agrupar por categoría
            const categories = {};
            data.data.forEach(product => {
                if (!categories[product.category]) {
                    categories[product.category] = [];
                }
                categories[product.category].push(product);
            });
            
            console.log(`\n📂 ===== PRODUCTOS POR CATEGORÍA =====`);
            Object.keys(categories).forEach(category => {
                console.log(`\n${category}: ${categories[category].length} productos`);
                categories[category].forEach(product => {
                    console.log(`   • ${product.name} - $${product.price?.toLocaleString()}`);
                });
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Ejecutar el test
testServicesEndpoint();
