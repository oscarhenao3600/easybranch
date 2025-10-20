## Migraciones de Base de Datos (MongoDB/Mongoose)

Este proyecto usa un sistema simple de migraciones con Mongoose. Las migraciones se guardan en la colección `migrations` y se ejecutan en orden alfabético.

### Estructura

- Directorio: `src/migrations`
- Runner: `src/utils/migration.js`
- Formato de archivo: `YYYY-MM-DD-###-descripcion.js`
- Cada migración exporta `up(mongoose)`

### Crear una migración

1. Crear un archivo en `src/migrations/` por ejemplo: `2025-10-20-002-ajustar-campos.js`
2. Exportar una función `up(mongoose)`.

```js
// src/migrations/2025-10-20-002-ajustar-campos.js
module.exports.up = async function up(mongoose) {
  const User = mongoose.model('User');
  await User.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } });
};
```

### Ejecutar migraciones

Desde la carpeta `backend`:

```bash
npm run migrate
```

El runner se conectará usando `MONGODB_URI` (o `MONGODB_URI_PROD` si `NODE_ENV=production`).

### Notas de despliegue

- Añade las variables en `.env` o variables de entorno del servidor:
  - `MONGODB_URI`
  - `MONGODB_URI_PROD` (opcional para producción)
- Ejecuta `npm run migrate` como paso previo/post despliegue.
- La migración inicial `2025-10-20-001-sync-indexes.js` asegura índices de todos los modelos.


