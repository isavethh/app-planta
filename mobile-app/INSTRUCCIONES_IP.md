# ⚠️ INSTRUCCIONES URGENTES: Configurar IP

## El Error de Red se Soluciona Cambiando la IP

### Paso 1: Editar api.js

Abre el archivo:
```
applanta/mobile-app/src/services/api.js
```

**Línea 13:** Cambia la IP:

```javascript
export const API_URL = Platform.OS === 'web' 
  ? 'http://localhost:8001/api'
  : 'http://192.168.56.1:8001/api'; // ⚠️ CAMBIA ESTA IP
```

### Paso 2: Probar Cada IP

Tienes estas IPs disponibles (según ipconfig):
1. `192.168.56.1` - VirtualBox (actual)
2. `10.26.10.192` - Red local principal (actual)
3. `100.125.212.89` - VPN/Red externa

**Prueba cambiando la IP en la línea 13 a cada una hasta que funcione.**

### Paso 3: Verificar que Laravel esté corriendo

```bash
cd C:\Users\Personal\Downloads\proyectoplantajunto\Planta\plantaCruds
php artisan serve --host=0.0.0.0 --port=8001
```

### Paso 4: Abrir Firewall (IMPORTANTE)

**Ejecuta como Administrador:**
```bash
netsh advfirewall firewall add rule name="Laravel API 8001" dir=in action=allow protocol=TCP localport=8001
```

O ejecuta: `ABRIR_PUERTO_FIREWALL.bat` (como administrador)

### Paso 5: Reiniciar la App

1. Cierra completamente la app móvil
2. Vuelve a abrirla
3. Prueba nuevamente

## Optimizaciones Aplicadas

✅ Timeout reducido a 3 segundos (antes 15s)
✅ Eliminada detección automática de IP (causaba lentitud)
✅ Errores no se loguean repetitivamente
✅ La app no se bloquea si hay error de red

## Si Aún No Funciona

1. Prueba acceder desde el navegador del móvil a: `http://TU_IP:8001/api/ping`
2. Si no funciona desde el navegador, el problema es de red/firewall
3. Si funciona desde el navegador pero no desde la app, verifica la IP en api.js

