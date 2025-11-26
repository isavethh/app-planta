# 📱 CÓMO CONECTAR TU CELULAR - GUÍA PASO A PASO

## ✅ CONFIRMACIÓN: Expo está funcionando correctamente en puerto 8081

Lo que viste en el navegador es el **manifiesto de la app**, lo cual confirma que Expo está corriendo bien.

---

## 🔄 MÉTODO 1: Usar el Túnel de Expo (MÁS FÁCIL)

Este método funciona incluso si tu celular y PC están en redes diferentes.

### Paso 1: Detener Expo actual
En la terminal donde está corriendo Expo, presiona:
```
Ctrl + C
```

### Paso 2: Reiniciar Expo con túnel
Ejecuta en la terminal:
```bash
cd C:\Users\Personal\Downloads\applanta\mobile-app
npx expo start --tunnel
```

### Paso 3: Esperar
Verás algo como:
```
› Metro waiting on exp://...
› Scan the QR code above with Expo Go
```

### Paso 4: Escanear el QR
- **Android**: Abre Expo Go → "Scan QR Code" → Escanea el QR de la terminal
- **iOS**: Abre la cámara → Escanea el QR → Abre con Expo Go

---

## 📱 MÉTODO 2: Usar URL directa en Expo Go

### Paso 1: Abre Expo Go en tu celular

### Paso 2: En Expo Go, busca la opción "Enter URL manually"

### Paso 3: Escribe esta URL:
```
exp://127.0.0.1:8081
```

### Paso 4: Presiona "Connect"

---

## 🌐 MÉTODO 3: Ver el QR en la terminal

### Paso 1: Abre la terminal donde está corriendo Expo

Deberías ver algo como:
```
› Metro waiting on exp://10.26.5.55:8081
› Scan the QR code above with Expo Go
```

Y un **código QR grande** hecho con caracteres ASCII

### Paso 2: Escanear ese QR
Usa Expo Go para escanearlo directamente de la terminal

---

## 🔧 MÉTODO 4: Forzar reinicio completo

Si nada funciona, ejecuta esto:

### 1. Detener todo
```powershell
# Matar todos los procesos de Node
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Matar procesos en puerto 8081 y 19002
netstat -ano | findstr :8081
netstat -ano | findstr :19002
# Anota los PID y ejecuta: taskkill /F /PID [numero]
```

### 2. Limpiar caché de Expo
```bash
cd C:\Users\Personal\Downloads\applanta\mobile-app
npx expo start --clear
```

### 3. Si aún no funciona, reinstalar Expo Go
```bash
npm cache clean --force
rm -rf node_modules
npm install
npx expo start --tunnel
```

---

## 📋 VERIFICACIÓN RÁPIDA

### ✅ Backend funcionando
```bash
curl http://localhost:3000/health
```
Debe responder: `{"status":"ok","message":"Applanta API funcionando correctamente"}`

### ✅ Metro bundler funcionando
```bash
curl http://localhost:8081
```
Debe mostrar el JSON que ya viste

---

## ⚡ SOLUCIÓN RÁPIDA RECOMENDADA

**Ejecuta estos comandos en una terminal nueva:**

```powershell
# 1. Ve al directorio de la app
cd C:\Users\Personal\Downloads\applanta\mobile-app

# 2. Detén cualquier instancia anterior (Ctrl+C si hay alguna)

# 3. Inicia Expo con túnel (esto funciona mejor)
npx expo start --tunnel
```

Espera a que aparezca el QR en la terminal y escanéalo con Expo Go.

---

## 📱 INSTALACIÓN DE EXPO GO (si no lo tienes)

### Android
1. Abre Google Play Store
2. Busca "Expo Go"
3. Instala la app oficial de Expo

### iOS
1. Abre App Store
2. Busca "Expo Go"
3. Instala la app oficial de Expo

---

## 🔐 CREDENCIALES DE LOGIN

Una vez que la app cargue:

```
Email:    transportista@applanta.com
Password: admin123
```

---

## ❓ SI NADA FUNCIONA

Puedes probar ejecutar la app en un emulador en tu PC:

### Android Emulator
```bash
cd C:\Users\Personal\Downloads\applanta\mobile-app
npx expo start
# Luego presiona 'a' en la terminal
```

### Web Browser (para probar)
```bash
cd C:\Users\Personal\Downloads\applanta\mobile-app
npx expo start --web
```

Esto abrirá la app en tu navegador (aunque la experiencia móvil es mejor).

---

## 🎯 RESUMEN

**LA FORMA MÁS SIMPLE:**

1. Abre una terminal
2. Ejecuta:
   ```bash
   cd C:\Users\Personal\Downloads\applanta\mobile-app
   npx expo start --tunnel
   ```
3. Espera el QR
4. Escanea con Expo Go
5. Login con: transportista@applanta.com / admin123

---

**¿Cuál método quieres probar primero?**

