module.exports = {
  apps: [
    {
      name: 'easybranch-backend',
      script: 'backend/src/server.js',
      cwd: '/home/oscarhenao/easybranch',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        PLATFORM: 'raspberry',
        MONGODB_URI: 'mongodb://localhost:27017/easybranch',
        // Variables para Puppeteer
        DISPLAY: ':0',
        CHROME_BIN: '/usr/bin/chromium',
        PUPPETEER_EXECUTABLE_PATH: '/usr/bin/chromium',
        // Variables de sistema
        PATH: process.env.PATH + ':/usr/bin:/usr/local/bin',
        // Configuración de WhatsApp
        WHATSAPP_PROVIDER: 'whatsapp-web',
        WHATSAPP_SESSION_PATH: './whatsapp-sessions',
        WHATSAPP_MAX_RECONNECTION_ATTEMPTS: 5,
        WHATSAPP_INITIALIZATION_TIMEOUT: 120000,
        // Configuración de IA
        HUGGINGFACE_API_KEY: 'tu_api_key_aqui',
        HUGGINGFACE_MODEL: 'microsoft/DialoGPT-medium',
        USE_HUGGINGFACE: true,
        // JWT Secret
        JWT_SECRET: 'your-super-secret-jwt-key-change-in-production',
        JWT_EXPIRES_IN: '24h'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // Configuración específica para Puppeteer
      exec_mode: 'fork',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Logs
      log_file: './logs/backend-out.log',
      out_file: './logs/backend-out.log',
      error_file: './logs/backend-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'easybranch-frontend',
      script: 'frontend-admin/server.js',
      cwd: '/home/oscarhenao/easybranch',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      // Logs
      log_file: './logs/frontend-out.log',
      out_file: './logs/frontend-out.log',
      error_file: './logs/frontend-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
};
