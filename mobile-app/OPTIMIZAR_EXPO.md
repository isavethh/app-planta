# Optimizar Inicio de Expo

## Problema
`npx expo start --clear` tarda demasiado en iniciar.

## Soluciones Aplicadas

### 1. Configuración de Metro Optimizada
- `metro.config.js` optimizado para iniciar más rápido
- WatchFolders configurado correctamente
- Extensiones de archivo limitadas

### 2. Scripts Optimizados

**Usa estos comandos en lugar de `npx expo start --clear`:**

```bash
# Inicio normal (usa cache, más rápido)
npm start

# Inicio rápido (sin dev tools)
npm run start:fast

# Solo si necesitas limpiar cache
npm run start:clear
```

### 3. Limpiar Cache Manualmente

```bash
# Windows
rmdir /s /q .expo
rmdir /s /q node_modules\.cache

# O usa el script
npm run clean
```

### 4. Usar el Script Batch

Ejecuta: `INICIAR_RAPIDO.bat`

Este script:
- Limpia cache automáticamente
- Inicia Expo de forma optimizada

## Consejos para Iniciar Más Rápido

1. **NO uses `--clear` a menos que sea necesario**
   - El cache acelera el inicio
   - Solo limpia si hay problemas

2. **Usa `npm start` en lugar de `npx expo start --clear`**
   - Más rápido porque usa cache

3. **Cierra otros procesos pesados**
   - Chrome con muchas pestañas
   - Otras aplicaciones que usen muchos recursos

4. **Usa `--no-dev` en producción**
   ```bash
   npm run start:fast
   ```

5. **Si tienes Watchman instalado, desinstálalo temporalmente**
   - A veces causa lentitud en Windows
   ```bash
   npm uninstall -g watchman
   ```

## Comandos Rápidos

```bash
# Inicio normal (RECOMENDADO - usa cache)
npm start

# Inicio rápido (sin dev tools)
npm run start:fast

# Limpiar y reiniciar (solo si hay problemas)
npm run start:clear
```

