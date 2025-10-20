// Configuración dinámica para el frontend
// Detecta automáticamente la URL del backend basada en la ubicación actual

class Config {
    constructor() {
        this.baseURL = this.detectBaseURL();
    }

    detectBaseURL() {
        // Si estamos en localhost, usar localhost:3000 (desarrollo)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000/api';
        }
        
        // Si estamos en una IP (como Raspberry Pi), usar la misma IP y puerto 4000
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = '4000'; // Puerto del backend
        
        return `${protocol}//${hostname}:${port}/api`;
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
