// Script de diagnóstico completo
console.log('🔍 DIAGNÓSTICO COMPLETO DEL MENÚ');
console.log('================================');

// 1. Verificar URL
console.log('📍 URL actual:', window.location.href);
console.log('📍 Hostname:', window.location.hostname);
console.log('📍 Port:', window.location.port);
console.log('📍 Pathname:', window.location.pathname);

// 2. Verificar si estamos en la página correcta
if (window.location.pathname.includes('business.html')) {
    console.log('✅ Página correcta detectada');
} else {
    console.log('❌ NO estás en business.html');
    console.log('🎯 Deberías estar en: http://localhost:3000/business.html');
}

// 3. Buscar todos los enlaces del menú
const menuLinks = document.querySelectorAll('.nav-link[data-section]');
console.log('📋 Enlaces del menú encontrados:', menuLinks.length);

menuLinks.forEach((link, index) => {
    const text = link.textContent.trim();
    const section = link.dataset.section;
    console.log(`${index + 1}. "${text}" → ${section}`);
    
    // Verificar específicamente el menú unificado
    if (text.includes('Mi Negocio') && section === 'business-management') {
        console.log('✅ Menú unificado detectado correctamente');
    } else if (text.includes('Negocios') || text.includes('Sucursales')) {
        console.log('❌ Menú antiguo detectado - PROBLEMA DE CACHE');
    }
});

// 4. Verificar si existe la función loadBusinessManagement
if (typeof window.dashboard !== 'undefined') {
    console.log('✅ Dashboard object encontrado');
    if (typeof window.dashboard.loadBusinessManagement === 'function') {
        console.log('✅ Función loadBusinessManagement encontrada');
    } else {
        console.log('❌ Función loadBusinessManagement NO encontrada');
    }
} else if (typeof window.businessManager !== 'undefined') {
    console.log('✅ BusinessManager object encontrado');
    if (typeof window.businessManager.loadBusinessManagement === 'function') {
        console.log('✅ Función loadBusinessManagement encontrada');
    } else {
        console.log('❌ Función loadBusinessManagement NO encontrada');
    }
} else {
    console.log('❌ Ni dashboard ni businessManager encontrados');
}

// 5. Verificar timestamp del archivo
const timestamp = document.querySelector('meta[name="timestamp"]');
if (timestamp) {
    console.log('🕒 Timestamp del archivo:', timestamp.content);
} else {
    console.log('⚠️ No se encontró timestamp del archivo');
}

// 6. Forzar recarga si es necesario
console.log('🔄 Para forzar recarga completa:');
console.log('   location.reload(true);');
console.log('   O hacer Ctrl + Shift + R');

// 7. Verificar cache buster
const cacheBuster = document.querySelector('html').innerHTML.includes('Cache buster');
if (cacheBuster) {
    console.log('✅ Cache buster detectado - archivo actualizado');
} else {
    console.log('⚠️ Cache buster NO detectado');
}

console.log('================================');
console.log('🎯 CONCLUSIÓN: Si ves "Mi Negocio" en el menú, está correcto');
console.log('❌ Si ves "Negocios" y "Sucursales" separados, es problema de cache');
