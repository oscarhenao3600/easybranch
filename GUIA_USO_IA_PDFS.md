# 🚀 Guía de Uso - Sistema de IA y PDFs EasyBranch

## 📋 Pasos para Configurar IA y PDFs

### 1. 🔐 **Iniciar Sesión**
- Ve a `http://localhost:3000/index.html`
- Usa las credenciales creadas por el script de seed:

**Super Admin:**
- Email: `admin@easybranch.com`
- Password: `admin123`

**Business Admin:**
- Email: `gerente@elsabor.com`
- Password: `gerente123`

**Branch Admin:**
- Email: `sucursal@elsabor.com`
- Password: `sucursal123`

### 2. 🏢 **Verificar Negocios y Sucursales**
El sistema ya tiene datos de ejemplo creados:

**Negocios disponibles:**
- Restaurante El Sabor
- Café Aroma  
- Farmacia Salud Total

**Sucursales disponibles:**
- Sucursal Centro (Restaurante El Sabor) - ✅ Conectado WhatsApp
- Sucursal Norte (Restaurante El Sabor) - ❌ Desconectado
- Café Aroma - Zona Rosa (Café Aroma) - ❌ Desconectado

### 3. 🤖 **Acceder a Gestión de IA**
- Desde el dashboard principal, haz clic en "IA & PDFs"
- O ve directamente a `http://localhost:3000/ai-management.html`

### 4. 📄 **Subir PDF de Catálogo**
1. **Selecciona una sucursal** del dropdown
2. **Arrastra tu PDF** al área de subida o haz clic para seleccionar
3. **Haz clic en "Subir PDF"**
4. El sistema procesará automáticamente el PDF y extraerá:
   - Información del negocio
   - Productos y precios
   - Datos de contacto
   - Secciones del menú

### 5. 🧠 **Configurar Prompt de IA**
1. **Carga la configuración actual** haciendo clic en "Cargar Configuración"
2. **Personaliza el prompt** en el área de texto
3. **Habilita/deshabilita** la IA según necesites
4. **Guarda los cambios** con "Guardar Prompt"

## 🎯 **Funcionalidades Disponibles**

### ✅ **Gestión de PDFs**
- Subida por drag & drop
- Procesamiento automático de contenido
- Extracción de productos y precios
- Validación de archivos
- Eliminación de archivos

### ✅ **Gestión de Prompts**
- Prompts personalizados por sucursal
- Prompts por defecto según tipo de negocio
- Configuración de IA habilitada/deshabilitada
- Reset a configuración por defecto

### ✅ **Estadísticas en Tiempo Real**
- Número de archivos PDF
- Cantidad de secciones procesadas
- Estado del catálogo
- Última actualización

## 🔧 **Tipos de Negocio Soportados**

### 🍽️ **Restaurante**
- Extracción de platos principales, bebidas, postres
- Detección de precios y descripciones
- Categorización automática de productos

### ☕ **Cafetería**
- Bebidas calientes y frías
- Pastelería y snacks
- Horarios de atención

### 💊 **Farmacia**
- Medicamentos y productos de cuidado
- Información de contacto
- Servicios farmacéuticos

### 🛒 **Tienda de Víveres**
- Productos de consumo
- Ofertas y promociones
- Categorías de productos

## 📱 **Flujo de Trabajo Recomendado**

1. **Crear/Verificar Negocio** → 2. **Crear/Verificar Sucursal** → 3. **Conectar WhatsApp** → 4. **Subir PDF** → 5. **Configurar Prompt** → 6. **Probar IA**

## 🚨 **Solución de Problemas**

### ❌ **"No estás autenticado"**
- Asegúrate de haber iniciado sesión
- Verifica que el token esté en localStorage
- Recarga la página si es necesario

### ❌ **"Error cargando sucursales"**
- Verifica que el backend esté funcionando en puerto 4000
- Comprueba la conexión a la base de datos
- Ejecuta el script de seed si no hay datos

### ❌ **"Solicitud CORS bloqueada"**
- Verifica que el backend esté funcionando
- Comprueba la configuración de CORS
- Asegúrate de usar los puertos correctos (3000 frontend, 4000 backend)

### ❌ **"Archivo PDF inválido"**
- Verifica que el archivo sea realmente un PDF
- Comprueba que el tamaño sea menor a 10MB
- Asegúrate de que el PDF contenga texto (no solo imágenes)

## 🎉 **¡Listo para Usar!**

Una vez configurado, la IA podrá:
- Responder preguntas sobre productos y precios
- Proporcionar información de contacto
- Sugerir productos del menú
- Ayudar con pedidos
- Mantener conversaciones contextuales

**¡Tu sistema de IA está listo para atender clientes de manera inteligente!** 🤖✨
