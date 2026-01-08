// Configuración dinámica para el frontend
// Detecta automáticamente la URL del backend basada en la ubicación actual

class Config {
    constructor() {
        this.baseURL = this.detectBaseURL();
    }

    detectBaseURL() {
        const hostname = window.location.hostname;
        const currentURL = window.location.href;
        
        console.log('🔍 Detectando entorno:', { hostname, currentURL });
        
        // PRIORIDAD 1: Si estamos accediendo desde localhost/127.0.0.1, SIEMPRE usar localhost
        // Esto prevalece sobre cualquier otra configuración
        if (hostname === 'localhost' || hostname === '127.0.0.1' || currentURL.includes('localhost') || currentURL.includes('127.0.0.1')) {
            const localPort = '3000';
            const detectedURL = `http://localhost:${localPort}/api`;
            console.log('✅ Entorno local detectado, usando:', detectedURL);
            return detectedURL;
        }
        
        // PRIORIDAD 2: Permitir override manual SOLO si NO estamos en localhost
        if (typeof window.API_BASE_URL === 'string' && window.API_BASE_URL.length > 0) {
            const overrideURL = window.API_BASE_URL.replace(/\/$/, '');
            console.log('⚠️ Override manual detectado:', overrideURL);
            return overrideURL;
        }

        // PRIORIDAD 3: Si estamos en una IP de red (Raspberry Pi o servidor remoto)
        // Detectar si es una IP privada (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        const isPrivateIP = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostname);
        
        if (isPrivateIP) {
            // En Raspberry Pi o servidor de red, usar puerto 4000
            const protocol = window.location.protocol;
            const backendPort = '4000';
            const detectedURL = `${protocol}//${hostname}:${backendPort}/api`;
            console.log('🌐 IP de red detectada, usando:', detectedURL);
            return detectedURL;
        }

        // Por defecto (dominio público), usar puerto 4000
        const protocol = window.location.protocol;
        const backendPort = '4000';
        const defaultURL = `${protocol}//${hostname}:${backendPort}/api`;
        console.log('📡 Usando configuración por defecto:', defaultURL);
        return defaultURL;
    }

    getBaseURL() {
        return this.baseURL;
    }

    // Método para debug - mostrar la configuración actual
    debug() {
        console.log('🔧 Configuración detectada:');
        console.log(`📍 Hostname: ${window.location.hostname}`);
        console.log(`🌐 Protocolo: ${window.location.protocol}`);
        console.log(`🔗 Base URL: ${this.baseURL}`);
        return {
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            baseURL: this.baseURL
        };
    }
}

// Crear instancia global
window.appConfig = new Config();

// Para compatibilidad con código existente
window.getBaseURL = () => window.appConfig.getBaseURL();

// Función para forzar localhost (útil para desarrollo en Windows)
window.forceLocalhost = () => {
    console.log('🔄 Forzando localhost...');
    window.API_BASE_URL = 'http://localhost:3000/api';
    window.appConfig = new Config();
    console.log('✅ Configuración actualizada:', window.appConfig.getBaseURL());
    return window.appConfig.getBaseURL();
};

// Auto-detectar y corregir si estamos en localhost pero se configuró una IP
(function() {
    const hostname = window.location.hostname;
    const currentURL = window.location.href;
    
    // Si estamos en localhost pero hay una IP configurada, forzar localhost
    if ((hostname === 'localhost' || hostname === '127.0.0.1' || currentURL.includes('localhost') || currentURL.includes('127.0.0.1')) 
        && typeof window.API_BASE_URL === 'string' 
        && window.API_BASE_URL.includes('192.168')) {
        console.warn('⚠️ Detectado localhost con IP de red configurada. Forzando localhost...');
        window.API_BASE_URL = 'http://localhost:3000/api';
        window.appConfig = new Config();
    }
})();
