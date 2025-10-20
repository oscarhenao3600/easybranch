# Solución CORS para Despliegue en Raspberry Pi

## Problema
Al desplegar en Raspberry Pi (IP: `192.168.1.23:4000`), el frontend intenta hacer requests a `localhost:3000` causando errores CORS.

## Solución Implementada

### 1. Configuración Dinámica del Frontend
- **Archivo**: `frontend-admin/config.js`
- **Función**: Detecta automáticamente la URL del backend basada en la ubicación actual
- **Comportamiento**:
  - Si está en `localhost` → usa `http://localhost:3000/api`
  - Si está en IP (Raspberry Pi) → usa `http://[IP]:4000/api`

### 2. Actualización de CORS en Backend
- **Archivo**: `backend/env.example`
- **Variable**: `ALLOWED_ORIGINS`
- **Valor agregado**: `http://192.168.1.23:4000`

### 3. Archivos Actualizados
- `frontend-admin/index.html` - Login page
- `frontend-admin/super.html` - Dashboard principal
- `frontend-admin/config.js` - Configuración dinámica

## Pasos para Desplegar

### En el Raspberry Pi:

1. **Configurar variables de entorno**:
   ```bash
   # En backend/.env
   ALLOWED_ORIGINS=http://192.168.1.23:4000,http://localhost:3000,http://localhost:4000
   PORT=4000
   NODE_ENV=production
   ```

2. **Copiar archivos actualizados**:
   ```bash
   # Copiar config.js al directorio del frontend
   cp frontend-admin/config.js /ruta/del/servidor/frontend-admin/
   ```

3. **Reiniciar el backend**:
   ```bash
   cd backend
   npm start
   ```

### Verificación:
- Acceder a `http://192.168.1.23:4000/index.html`
- Abrir DevTools (F12) → Console
- Debería mostrar: `🔧 AuthService inicializado con URL: http://192.168.1.23:4000/api`
- El login debería funcionar sin errores CORS

## Script de Actualización Automática

Para actualizar todos los archivos HTML automáticamente:
```bash
node scripts/update-frontend-urls.js
```

## Debugging

### Verificar configuración:
```javascript
// En la consola del navegador
window.appConfig.debug()
```

### Verificar CORS:
- Revisar logs del backend para mensajes de CORS
- Verificar que `ALLOWED_ORIGINS` incluya la IP del Raspberry Pi

## Notas Importantes

1. **HTTPS**: Si usas HTTPS, cambiar `http://` por `https://` en las URLs
2. **Puerto**: Asegurar que el puerto 4000 esté abierto en el firewall
3. **DNS**: Considerar usar un dominio en lugar de IP para producción
4. **Certificados**: Para HTTPS, necesitarás certificados SSL válidos
