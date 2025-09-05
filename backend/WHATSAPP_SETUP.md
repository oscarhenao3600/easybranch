# 📱 Configuración de WhatsApp para EasyBranch

## 🚀 Servicios Implementados

### **1. whatsapp-web.js (Desarrollo/Pruebas)**
- ✅ **Gratuito** - No requiere API keys
- ✅ **Fácil de configurar** - Solo necesita QR code
- ✅ **Perfecto para desarrollo** - Pruebas locales
- ⚠️ **Limitaciones** - Puede desconectarse, requiere sesión activa

### **2. Twilio (Producción)**
- ✅ **Estable** - Servicio profesional
- ✅ **Escalable** - Maneja múltiples conexiones
- ✅ **Confiable** - 99.9% uptime
- 💰 **Costo** - Pago por mensaje enviado

## 🔧 Configuración

### **Variables de Entorno**

```bash
# Proveedor de WhatsApp (whatsapp-web o twilio)
WHATSAPP_PROVIDER=whatsapp-web

# Configuración de Twilio (solo para producción)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_NUMBER=+14155238886
```

### **Para Desarrollo (whatsapp-web.js)**
1. ✅ Instalar dependencias: `npm install whatsapp-web.js qrcode-terminal`
2. ✅ Configurar `WHATSAPP_PROVIDER=whatsapp-web`
3. ✅ Crear conexión en la interfaz
4. ✅ Escanear QR code con WhatsApp
5. ✅ ¡Listo para enviar mensajes!

### **Para Producción (Twilio)**
1. ✅ Crear cuenta en [Twilio Console](https://console.twilio.com/)
2. ✅ Configurar WhatsApp Sandbox
3. ✅ Obtener Account SID y Auth Token
4. ✅ Configurar variables de entorno
5. ✅ Cambiar `WHATSAPP_PROVIDER=twilio`

## 📋 Funcionalidades Implementadas

### **✅ Generación de QR Code**
- QR codes reales de WhatsApp Web
- Fallback a QR codes informativos
- Actualización automática del estado

### **✅ Envío de Mensajes**
- Mensajes de texto
- Soporte para múltiples conexiones
- Estadísticas automáticas

### **✅ Respuestas Automáticas**
- Detección de saludos ("Hola", "Hello", etc.)
- Mensajes de bienvenida personalizables
- Integración con IA (preparado)

### **✅ Gestión de Conexiones**
- Conectar/Desconectar
- Estados en tiempo real
- Manejo de errores

## 🎯 Cómo Usar

### **1. Crear Nueva Conexión**
```javascript
// Frontend
const connectionData = {
    connectionName: "WhatsApp Sucursal Centro",
    phoneNumber: "+573001234567",
    customerServiceNumber: "+573001112233",
    branchId: "branch_id",
    autoReply: true,
    welcomeMessage: "¡Hola! 👋 Bienvenido..."
};
```

### **2. Enviar Mensaje**
```javascript
// Backend
await whatsappService.sendMessage(connectionId, to, message);
```

### **3. Recibir Mensajes**
```javascript
// Los mensajes se procesan automáticamente
// Respuestas automáticas a saludos
// Logs detallados de todas las interacciones
```

## 🔍 Debugging

### **Logs Importantes**
```bash
# QR Code generado
"QR code generated and saved"

# Cliente conectado
"WhatsApp client ready"

# Mensaje enviado
"WhatsApp message sent"

# Error de autenticación
"WhatsApp authentication failed"
```

### **Estados de Conexión**
- `not_initialized` - No iniciado
- `connecting` - Generando QR / Conectando
- `connected` - Conectado y listo
- `disconnected` - Desconectado
- `error` - Error de autenticación/conexión

## 🚨 Solución de Problemas

### **QR Code no se genera**
1. ✅ Verificar que `whatsapp-web.js` esté instalado
2. ✅ Revisar logs del backend
3. ✅ Verificar permisos de escritura en `/sessions`

### **Mensajes no se envían**
1. ✅ Verificar estado de conexión
2. ✅ Revisar logs de WhatsApp service
3. ✅ Verificar formato del número (+573001234567)

### **Conexión se pierde**
1. ✅ Verificar sesión de WhatsApp Web
2. ✅ Revisar logs de desconexión
3. ✅ Regenerar QR code si es necesario

## 📊 Monitoreo

### **Métricas Disponibles**
- Mensajes enviados hoy
- Total de mensajes
- Tasa de respuesta
- Estado de conexión
- Última actividad

### **Logs de Auditoría**
- Todas las conexiones/desconexiones
- Mensajes enviados/recibidos
- Errores y fallos
- Estadísticas de uso

## 🔄 Migración a Producción

### **Cambio de whatsapp-web.js a Twilio**
1. ✅ Configurar cuenta de Twilio
2. ✅ Actualizar variables de entorno
3. ✅ Cambiar `WHATSAPP_PROVIDER=twilio`
4. ✅ Reiniciar aplicación
5. ✅ Probar envío de mensajes

### **Consideraciones**
- ✅ Twilio requiere números verificados
- ✅ Costo por mensaje enviado
- ✅ Límites de rate limiting
- ✅ Soporte para multimedia

## 📞 Soporte

Para problemas específicos:
1. ✅ Revisar logs en `/backend/src/logs/`
2. ✅ Verificar estado de conexión en la interfaz
3. ✅ Probar con QR code nuevo
4. ✅ Verificar configuración de variables de entorno

---

**¡WhatsApp está listo para usar en EasyBranch! 🎉**
