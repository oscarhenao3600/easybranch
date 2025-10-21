# 🚀 Configuración Automática de Plataforma para EasyBranch

## 📋 **Resumen**

He configurado el sistema para que automáticamente detecte la plataforma usando la variable de entorno `PLATFORM` en el archivo `.env`. Esto evitará tener que hacer cambios manuales cada vez que actualices el repositorio.

## 🔧 **Configuración Local (Windows)**

### 1. Crear archivo `.env` en el backend:
```bash
cd d:\EasyBranch\backend
copy env.example .env
```

### 2. Editar el archivo `.env` y asegurarse de que tenga:
```env
# Configuración de Plataforma
PLATFORM=windows
```

## 🍓 **Configuración en Raspberry Pi**

### 1. Conectarse al Raspberry Pi:
```bash
ssh usuario@ip_del_raspberry_pi
```

### 2. Navegar al directorio:
```bash
cd /home/oscarhenao/easybranch/backend
```

### 3. Crear o editar el archivo `.env`:
```bash
nano .env
```

### 4. Asegurarse de que tenga:
```env
# Configuración de Plataforma
PLATFORM=raspberry
```

### 5. Guardar y salir:
```bash
Ctrl+X, Y, Enter
```

### 6. Reiniciar PM2:
```bash
pm2 restart all
```

## 🐧 **Configuración para Linux (Servidores)**

Si tienes un servidor Linux normal (no Raspberry Pi):
```env
# Configuración de Plataforma
PLATFORM=linux
```

## 📊 **Valores de PLATFORM Disponibles**

| Valor | Descripción | Configuración |
|-------|-------------|---------------|
| `windows` | Windows (desarrollo) | Configuración básica, sin executablePath |
| `linux` | Linux (servidores) | Usa `/usr/bin/chromium-browser` |
| `raspberry` | Raspberry Pi | Configuración optimizada con argumentos adicionales |

## 🎯 **Beneficios**

✅ **Automático**: No más cambios manuales al código
✅ **Mantenible**: Se actualiza automáticamente con git pull
✅ **Configurable**: Fácil cambio entre entornos
✅ **Optimizado**: Simulación específica para cada plataforma

## 🔍 **Verificación**

Para verificar que funciona correctamente:

### En Windows:
```bash
npm start
```
Debería ver: `✅ Cliente WhatsApp inicializado exitosamente`

### En Raspberry Pi:
```bash
pm2 logs --lines 10
```
Debería ver: `✅ Cliente WhatsApp inicializado exitosamente`

## 🚨 **Solución de Problemas**

Si aún tienes problemas:

1. **Verificar variable de entorno**:
   ```bash
   echo $PLATFORM  # En Linux/Pi
   echo %PLATFORM% # En Windows
   ```

2. **Verificar archivo .env**:
   ```bash
   cat .env | grep PLATFORM
   ```

3. **Reiniciar el servicio**:
   ```bash
   pm2 restart all  # En Pi
   npm start        # En Windows
   ```

## 📝 **Notas Importantes**

- La variable `PLATFORM` debe estar en el archivo `.env` del backend
- No incluir espacios alrededor del `=` en el archivo `.env`
- El archivo `.env` no se sube a Git (está en `.gitignore`)
- Cada entorno debe tener su propio archivo `.env` configurado

¡Con esta configuración, el sistema se adaptará automáticamente a cada plataforma! 🎉
