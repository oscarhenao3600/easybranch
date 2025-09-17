# 🔄 Migración de Base de Datos - Negocios y Sucursales

## 📋 **Descripción de la Migración:**

Esta migración actualiza la estructura de datos de los modelos `Business` y `Branch` para incluir los nuevos campos requeridos:

### **Cambios en Business Model:**
- **Nuevos campos**: `razonSocial`, `nit`, `phone`, `address`, `city`, `department`, `country`
- **Estructura de address**: De objeto anidado a campos planos
- **Validaciones**: Al menos uno de `name` o `razonSocial` debe estar presente

### **Cambios en Branch Model:**
- **Nuevos campos**: `razonSocial`, `nit`, `phone`, `address`, `city`, `department`, `country`, `manager`
- **Estructura de address**: De objeto anidado a campos planos
- **Validaciones**: Al menos uno de `name` o `razonSocial` debe estar presente

## 🚀 **Cómo Ejecutar la Migración:**

### **1. Migración Completa (Recomendado):**
```bash
cd backend
node scripts/run-migration.js
```

### **2. Migración Paso a Paso:**

#### **Paso 1: Ejecutar Migración**
```bash
cd backend
node scripts/migrate-business-branch.js
```

#### **Paso 2: Verificar Migración**
```bash
cd backend
node scripts/verify-migration.js
```

### **3. Rollback (Si es necesario):**
```bash
cd backend
node scripts/rollback-business-branch.js
```

## 📊 **Proceso de Migración:**

### **1. Migración de Negocios:**
- Convierte `address.street` → `address` (string)
- Convierte `address.city` → `city` (string)
- Convierte `address.state` → `department` (string)
- Convierte `address.country` → `country` (string)
- Mueve `contact.phone` → `phone` (string)
- Agrega `nit` con formato `MIGRATED-{businessId}` si no existe
- Agrega `name` con valor `businessId` si no existe
- Establece `country` como "Colombia" por defecto

### **2. Migración de Sucursales:**
- Convierte `address.street` → `address` (string)
- Convierte `address.city` → `city` (string)
- Convierte `address.state` → `department` (string)
- Convierte `address.country` → `country` (string)
- Mueve `contact.phone` → `phone` (string)
- Agrega `nit` con formato `MIGRATED-{branchId}` si no existe
- Agrega `name` con valor `branchId` si no existe
- Establece `country` como "Colombia" por defecto
- Verifica que `businessId` existe

## ✅ **Verificación de la Migración:**

### **Validaciones de Negocios:**
- ✓ NIT presente
- ✓ Teléfono presente
- ✓ Dirección presente
- ✓ Ciudad presente
- ✓ Departamento presente
- ✓ País presente
- ✓ Al menos uno de nombre o razón social presente
- ✓ Dirección es string (no objeto)

### **Validaciones de Sucursales:**
- ✓ NIT presente
- ✓ Teléfono presente
- ✓ Dirección presente
- ✓ Ciudad presente
- ✓ Departamento presente
- ✓ País presente
- ✓ businessId presente
- ✓ Al menos uno de nombre o razón social presente
- ✓ Dirección es string (no objeto)
- ✓ businessId referencia existe

## 🔄 **Rollback:**

### **Proceso de Rollback:**
- Convierte campos planos de vuelta a estructura anidada
- Mueve `phone` de vuelta a `contact.phone`
- Elimina campos nuevos agregados
- Restaura estructura original

### **Cuándo Usar Rollback:**
- Si la migración falla
- Si necesitas revertir cambios
- Si encuentras problemas después de la migración

## 📝 **Logs y Monitoreo:**

### **Logs de Migración:**
- Conexión a MongoDB
- Número de registros encontrados
- Progreso de migración por registro
- Errores específicos
- Tiempo de ejecución

### **Logs de Verificación:**
- Número de registros verificados
- Registros válidos vs inválidos
- Issues específicos por registro
- Resumen de validaciones

## ⚠️ **Consideraciones Importantes:**

### **Antes de Ejecutar:**
1. **Backup**: Hacer backup de la base de datos
2. **Entorno**: Ejecutar en entorno de desarrollo primero
3. **Datos**: Verificar que no hay datos críticos en producción
4. **Conexión**: Asegurar conexión estable a MongoDB

### **Durante la Migración:**
1. **No interrumpir**: No detener el proceso una vez iniciado
2. **Monitorear logs**: Revisar logs para detectar errores
3. **Tiempo**: La migración puede tomar tiempo dependiendo del volumen de datos

### **Después de la Migración:**
1. **Verificar**: Ejecutar script de verificación
2. **Probar**: Probar funcionalidades del sistema
3. **Rollback**: Tener plan de rollback listo si es necesario

## 🎯 **Ejemplos de Uso:**

### **Migración en Desarrollo:**
```bash
# 1. Backup de desarrollo
mongodump --db easybranch --out backup-dev

# 2. Ejecutar migración
cd backend
node scripts/run-migration.js

# 3. Verificar resultados
node scripts/verify-migration.js
```

### **Migración en Producción:**
```bash
# 1. Backup completo
mongodump --db easybranch --out backup-prod-$(date +%Y%m%d)

# 2. Ejecutar migración
cd backend
node scripts/run-migration.js

# 3. Verificar y probar
node scripts/verify-migration.js
# Probar funcionalidades del sistema
```

## 📞 **Soporte:**

Si encuentras problemas durante la migración:

1. **Revisar logs**: Buscar errores específicos en los logs
2. **Verificar conexión**: Asegurar que MongoDB esté accesible
3. **Rollback**: Usar script de rollback si es necesario
4. **Contactar**: Reportar issues específicos con logs completos

---

**¡Migración lista para ejecutar!** 🚀

La migración está diseñada para ser segura, reversible y completamente verificable.
