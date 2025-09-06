// Script para forzar actualización del menú
console.log('🔄 Forzando actualización del menú...');

// Verificar si estamos en la página correcta
if (window.location.pathname.includes('business.html')) {
    console.log('✅ Página correcta detectada');
    
    // Buscar el menú
    const menuLinks = document.querySelectorAll('.nav-link[data-section]');
    console.log('📋 Enlaces del menú encontrados:', menuLinks.length);
    
    menuLinks.forEach(link => {
        const text = link.textContent.trim();
        const section = link.dataset.section;
        console.log(`🔗 ${text} → ${section}`);
        
        // Verificar si es el menú unificado
        if (text.includes('Mi Negocio') && section === 'business-management') {
            console.log('✅ Menú unificado detectado correctamente');
        }
    });
    
    // Forzar recarga del contenido
    const dashboard = window.dashboard || window.businessManager;
    if (dashboard) {
        console.log('🔄 Recargando contenido...');
        dashboard.loadBusinessManagement();
    }
} else {
    console.log('❌ No estás en la página correcta');
    console.log('📍 URL actual:', window.location.href);
    console.log('🎯 Deberías estar en: http://localhost:3000/business.html');
}
