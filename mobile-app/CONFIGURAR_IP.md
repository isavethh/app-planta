# Configuración de IP para App Móvil

## ⚠️ IMPORTANTE: Configurar la IP correcta

La app móvil necesita conectarse a Laravel (puerto 8001), NO a Node.js (puerto 3001).

### 1. Editar el archivo `src/services/api.js`

Busca esta línea (alrededor de la línea 8-10):

```javascript
export const API_URL = Platform.OS === 'web' 
  ? 'http://localhost:8001/api'  // Para web
  : 'http://192.168.0.129:8001/api'; // ✅ IP CORRECTA
```

**CAMBIA `192.168.0.129` por TU IP local.**

### 2. Encontrar tu IP local

**Windows:**
```bash
ipconfig
```
Busca "Dirección IPv4" (generalmente `192.168.x.x` o `10.x.x.x`)

**Linux/Mac:**
```bash
ifconfig
# o
ip addr show
```

### 3. Verificar que Laravel esté corriendo

```bash
php artisan serve --host=0.0.0.0 --port=8001
```

### 4. Verificar que puedas acceder desde el navegador

Abre en tu navegador:
```
http://TU_IP:8001/api/ping
```

Deberías ver un JSON con `{"success": true, ...}`

### 5. Endpoints correctos

La app móvil ahora usa estos endpoints en Laravel:

- `GET /api/transportista/{id}/envios` - Obtener envíos del transportista
- `POST /api/envios/{id}/aceptar` - Aceptar envío
- `POST /api/envios/{id}/rechazar` - Rechazar envío
- `GET /api/public/transportistas-login` - Lista de transportistas
- `POST /api/public/login-transportista` - Login de transportista

### 6. Notas importantes

1. **Misma red WiFi:** El dispositivo móvil debe estar en la misma red que tu computadora
2. **Firewall:** Asegúrate de que el puerto 8001 esté abierto
3. **IP dinámica:** Si tu IP cambia, actualiza el archivo `api.js`

