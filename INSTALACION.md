# 📖 Guía de Instalación - Applanta Transportista

Esta guía te llevará paso a paso para instalar y configurar el sistema completo.

## 📋 Requisitos del Sistema

### Software Necesario
- **Node.js** v16 o superior ([Descargar](https://nodejs.org/))
- **PostgreSQL** 12 o superior ([Descargar](https://www.postgresql.org/download/))
- **Git** ([Descargar](https://git-scm.com/))
- **Expo CLI** (se instala después)

### Para la App Móvil
- **Android**: Android Studio o dispositivo físico con Expo Go
- **iOS**: Xcode (solo macOS) o dispositivo físico con Expo Go

## 🔧 Instalación Paso a Paso

### Paso 1: Clonar el Repositorio

```bash
cd C:\Users\Personal\Downloads
# El proyecto ya está en applanta/
cd applanta
```

### Paso 2: Configurar PostgreSQL

1. **Abrir pgAdmin o terminal de PostgreSQL**

2. **Crear la base de datos**:
```sql
CREATE DATABASE applanta_db;
```

3. **Verificar conexión**:
```bash
psql -U postgres -d applanta_db
```

### Paso 3: Configurar el Backend

1. **Ir al directorio del backend**:
```bash
cd backend
```

2. **Instalar dependencias**:
```bash
npm install
```

3. **Crear archivo .env**:
```bash
# En Windows PowerShell:
Copy-Item env.example .env

# O copiar manualmente env.example a .env
```

4. **Editar el archivo .env**:
Abre `.env` con tu editor favorito y configura:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=applanta_db
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD_DE_POSTGRES
JWT_SECRET=cambia_esto_por_algo_seguro_123456
JWT_EXPIRES_IN=7d
```

5. **Inicializar la base de datos**:
```bash
npm run db:init
```

Este comando creará todas las tablas y datos de prueba.

6. **Iniciar el servidor**:
```bash
npm run dev
```

Deberías ver:
```
🚀 Servidor ejecutándose en puerto 3000
📍 Health check: http://localhost:3000/health
🔗 API: http://localhost:3000/api
Conectado a la base de datos PostgreSQL
```

7. **Probar el servidor**:
Abre tu navegador y ve a: `http://localhost:3000/health`

Deberías ver: `{"status":"ok","message":"Applanta API funcionando correctamente"}`

### Paso 4: Configurar la App Móvil

1. **Abrir una NUEVA terminal** (deja el backend corriendo)

2. **Ir al directorio de la app**:
```bash
cd C:\Users\Personal\Downloads\applanta\mobile-app
```

3. **Instalar dependencias**:
```bash
npm install
```

4. **Instalar Expo CLI globalmente** (si no lo tienes):
```bash
npm install -g expo-cli
```

5. **Obtener tu IP local**:

En PowerShell:
```powershell
ipconfig
```

Busca "IPv4 Address" de tu adaptador WiFi activo. Ejemplo: `192.168.1.100`

6. **Configurar la URL del backend**:

Abre el archivo `src/services/api.js` y cambia:

```javascript
// Antes:
const API_URL = 'http://192.168.1.100:3000/api';

// Después (con TU IP):
const API_URL = 'http://TU_IP_LOCAL:3000/api';
```

Por ejemplo:
```javascript
const API_URL = 'http://192.168.1.100:3000/api';
```

7. **Iniciar la aplicación**:
```bash
npm start
```

Se abrirá Expo DevTools en tu navegador.

### Paso 5: Ejecutar en Dispositivo Móvil

#### Opción A: Dispositivo Físico (Recomendado)

1. **Instalar Expo Go**:
   - Android: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. **Conectar a la misma red WiFi** que tu computadora

3. **Escanear el QR** que aparece en la terminal o en el navegador:
   - Android: Usar la app Expo Go directamente
   - iOS: Usar la cámara del iPhone y abrir con Expo Go

#### Opción B: Emulador Android

1. **Instalar Android Studio**

2. **Configurar un emulador** (AVD)

3. **Iniciar el emulador**

4. **En la terminal de Expo, presionar `a`**

#### Opción C: Simulador iOS (solo macOS)

1. **Instalar Xcode**

2. **En la terminal de Expo, presionar `i`**

## 🧪 Probar la Aplicación

### Usuarios de Prueba

Después de ejecutar `npm run db:init`, se crean usuarios de prueba:

#### Usuario Transportista
```
Email: transportista@applanta.com
Password: password123
```

#### Usuario Admin (para el panel web, si lo desarrollas)
```
Email: admin@applanta.com
Password: admin123
```

### Flujo de Prueba

1. **Abrir la app móvil**
2. **Iniciar sesión** con las credenciales del transportista
3. **Ver envíos asignados** en la pantalla principal
4. **Tocar un envío** para ver detalles
5. **Iniciar el envío** (si está en estado "asignado")
6. **Marcar como entregado** (si está "en tránsito")
7. **Ver historial** en la pestaña correspondiente
8. **Ver perfil** y cambiar disponibilidad

## 🐛 Solución de Problemas

### Error: "Cannot connect to database"

**Solución**:
- Verifica que PostgreSQL esté corriendo
- Verifica las credenciales en `.env`
- Prueba la conexión: `psql -U postgres -d applanta_db`

### Error: "Network request failed" en la app

**Solución**:
- Verifica que el backend esté corriendo
- Verifica que la IP en `api.js` sea correcta
- Usa `ipconfig` para obtener tu IP real
- NO uses `localhost` o `127.0.0.1` en la app móvil
- Asegúrate de estar en la misma red WiFi

### Error: "Esta aplicación es solo para transportistas"

**Solución**:
- Estás usando un usuario con rol diferente
- Usa: `transportista@applanta.com`

### El backend se cierra al cerrar la terminal

**Solución**:
- Es normal en modo desarrollo
- Para producción, usa PM2 o similar:
```bash
npm install -g pm2
pm2 start src/index.js --name applanta-backend
```

### Error al ejecutar npm install

**Solución**:
```bash
# Limpiar caché
npm cache clean --force

# Borrar node_modules
rm -rf node_modules package-lock.json

# Reinstalar
npm install
```

### Error: "Expo CLI not found"

**Solución**:
```bash
npm install -g expo-cli
```

## 📱 Configuración para Testing en Red Local

### Windows Firewall

Si no puedes conectarte desde el móvil:

1. Abre **Windows Defender Firewall**
2. Haz clic en **Configuración avanzada**
3. Crea una **Regla de entrada** para el puerto 3000
4. Permite la conexión

### Router/Módem

- Asegúrate de que tu red WiFi permita comunicación entre dispositivos
- Algunas redes de invitados bloquean esto
- Usa la red WiFi principal

## 🚀 Siguiente Pasos

Una vez que todo funcione:

1. **Explora la aplicación** con los datos de prueba
2. **Modifica el código** según tus necesidades
3. **Agrega nuevas funcionalidades**
4. **Personaliza el diseño**

## 📚 Documentación Adicional

- [README principal](README.md) - Visión general del proyecto
- [Backend README](backend/README.md) - Documentación de la API
- [Mobile App README](mobile-app/README.md) - Documentación de la app
- [Documentación de Expo](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)

## 💡 Consejos

- Mantén el backend corriendo mientras usas la app
- Usa `npm run dev` en el backend para hot-reload
- Usa Expo Go para desarrollo rápido
- Los cambios en React Native se reflejan automáticamente
- Revisa los logs en ambas terminales para debugging

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs del backend y de Expo
2. Verifica que todas las URLs y IPs sean correctas
3. Asegúrate de estar en la misma red WiFi
4. Reinicia el backend y la app

---

¡Feliz desarrollo! 🎉

