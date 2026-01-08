// Configuración dinámica para el frontend
// Detecta automáticamente la URL del backend basada en la ubicación actual

class Config {
    constructor() {
        this.baseURL = this.detectBaseURL();
    }

    detectBaseURL() {
        // Permitir override manual si se define en una etiqueta <script>
        if (typeof window.API_BASE_URL === 'string' && window.API_BASE_URL.length > 0) {
            return window.API_BASE_URL.replace(/\/$/, '');
        }

        // Si estamos en localhost, usar localhost:3000 (desarrollo)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000/api';
        }

        // Por defecto, asumir backend en el mismo host puerto 3000 (backend)
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const backendPort = '3000'; // Backend corre en puerto 3000
        return `${protocol}//${hostname}:${backendPort}/api`;
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
