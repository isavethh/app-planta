# 🚀 Cómo Iniciar la Aplicación Applanta

## ✅ Estado Actual

La aplicación está **completamente configurada y lista para usar**:

- ✅ Base de datos PostgreSQL creada (`applanta_db`)
- ✅ Tablas y datos de prueba insertados
- ✅ Dependencias instaladas (backend y mobile)
- ✅ IP configurada en la app móvil
- ✅ Scripts de inicio creados

## 📱 Opción 1: Inicio Rápido (Recomendado)

### Doble clic en `EJECUTAR.bat`

Este archivo abrirá **dos ventanas** automáticamente:
1. **Ventana del Backend** - Servidor Node.js
2. **Ventana de Expo** - App móvil

## 🖥️ Opción 2: Inicio Manual

### Paso 1: Iniciar el Backend

Abre una terminal y ejecuta:

```bash
cd C:\Users\Personal\Downloads\applanta\backend
npm run dev
```

Deberías ver:
```
🚀 Servidor ejecutándose en puerto 3000
📍 Health check: http://localhost:3000/health
🔗 API: http://localhost:3000/api
Conectado a la base de datos PostgreSQL
```

### Paso 2: Iniciar la App Móvil

Abre **OTRA terminal nueva** y ejecuta:

```bash
cd C:\Users\Personal\Downloads\applanta\mobile-app
npm start
```

Esto abrirá **Expo DevTools** en tu navegador.

## 📱 Usar la App en tu Celular

### Paso 1: Instalar Expo Go

- **Android**: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS**: [App Store](https://apps.apple.com/app/expo-go/id982107779)

### Paso 2: Conectarse

1. Asegúrate de que tu **celular y computadora estén en la misma red WiFi**
2. Abre **Expo Go** en tu celular
3. **Escanea el QR** que aparece en la terminal o en el navegador:
   - **Android**: Usa la opción "Scan QR Code" en Expo Go
   - **iOS**: Abre la cámara y escanea el QR, luego abre con Expo Go

### Paso 3: Iniciar Sesión

Una vez que la app se abra:

```
Email: transportista@applanta.com
Password: admin123
```

## 🎮 Funcionalidades Disponibles

Una vez dentro de la app podrás:

1. **Ver envíos asignados**
   - Filtrar por estado
   - Buscar por código/almacén/dirección
   
2. **Gestionar envíos**
   - Tocar un envío para ver detalles
   - Iniciar envío (si está "asignado")
   - Marcar como entregado (si está "en tránsito")

3. **Ver historial**
   - Envíos completados y cancelados

4. **Perfil**
   - Ver tu información
   - Cambiar disponibilidad
   - Ver vehículo asignado

## 🔧 Solución de Problemas

### Backend no inicia

**Error**: "Cannot connect to database"

**Solución**:
1. Verifica que PostgreSQL esté corriendo
2. Abre pgAdmin y confirma que la base de datos `applanta_db` existe
3. Si no existe, ejecuta:
   ```bash
   cd backend
   node src/config/createDb.js
   npm run db:init
   ```

### App móvil no se conecta

**Error**: "Network request failed"

**Solución**:
1. Verifica que el backend esté corriendo (paso 1)
2. Verifica que estés en la **misma red WiFi**
3. La IP configurada es: `10.26.5.55`
4. Si tu IP es diferente:
   - Ejecuta en PowerShell: `ipconfig`
   - Busca tu IPv4 (ejemplo: 192.168.1.X)
   - Edita `mobile-app/src/services/api.js`
   - Cambia la línea:
     ```javascript
     const API_URL = 'http://TU_IP:3000/api';
     ```
   - Reinicia Expo (presiona `r` en la terminal)

### "No hay envíos para mostrar"

**Solución**: Los envíos se crean desde el panel de administrador. Por ahora puedes:

1. Usar Postman o similar para crear envíos
2. Endpoint: `POST http://localhost:3000/api/envios`
3. Headers: `Authorization: Bearer TU_TOKEN` (del login)
4. Body:
   ```json
   {
     "almacen_destino_id": 1,
     "fecha_programada": "2025-11-26",
     "hora_estimada_llegada": "14:00:00",
     "notas": "Entrega urgente",
     "detalles": [
       {
         "producto_id": 1,
         "cantidad": 100,
         "peso_por_unidad": 0.5,
         "precio_por_unidad": 2.50,
         "tipo_empaque_id": 1,
         "unidad_medida_id": 1
       }
     ]
   }
   ```

5. Luego asignar el envío a tu transportista:
   - Endpoint: `POST http://localhost:3000/api/envios/asignacion-multiple`
   - Body:
     ```json
     {
       "envio_ids": [1],
       "transportista_id": 1,
       "vehiculo_id": 1,
       "tipo_vehiculo_id": 1
     }
     ```

## 📊 Verificar que Todo Funciona

### 1. Backend funcionando

Abre tu navegador en: http://localhost:3000/health

Deberías ver:
```json
{
  "status": "ok",
  "message": "Applanta API funcionando correctamente"
}
```

### 2. Base de datos con datos

Ejecuta en pgAdmin o psql:

```sql
SELECT * FROM usuarios;
SELECT * FROM transportistas;
SELECT * FROM productos;
```

Deberías ver datos de prueba.

### 3. App móvil conectada

En la app, después de login, deberías ver la pantalla de "Mis Envíos".

## 🎯 URLs Importantes

- **Backend Health**: http://localhost:3000/health
- **Backend API**: http://localhost:3000/api
- **Expo DevTools**: http://localhost:19002 (se abre automáticamente)

## 📞 Usuarios de Prueba

### Transportista (para la app móvil)
```
Email: transportista@applanta.com
Password: admin123
```

### Admin (para APIs)
```
Email: admin@applanta.com
Password: admin123
```

### Encargado de Almacén
```
Email: almacen@applanta.com
Password: admin123
```

## 🚀 Siguiente Paso

Una vez que hayas probado la app, puedes:

1. Crear más transportistas
2. Crear más envíos
3. Probar el flujo completo: asignar → iniciar → entregar
4. Personalizar la UI/UX
5. Agregar notificaciones push
6. Implementar mapas con rutas

---

## 🎉 ¡Listo!

La aplicación está funcionando completamente. Cualquier duda, revisa:

- `README.md` - Visión general
- `INSTALACION.md` - Instalación detallada
- `CARACTERISTICAS.md` - Lista de funcionalidades
- `backend/README.md` - API documentation

**¡Disfruta tu app de transporte! 🚚**

