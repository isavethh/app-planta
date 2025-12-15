# 📘 Documentación Docker - Backend Node.js

Este documento explica cómo ejecutar el backend de Node.js con Docker, siguiendo el mismo esquema que el proyecto Laravel.

---

## 📑 Índice

1. [⚙️ Puertos para Pruebas Locales](#️-puertos-para-pruebas-locales)
2. [🟣 Contenedor Backend](#-contenedor-backend)
3. [📝 Script de Inicio (entrypoint)](#-script-de-inicio-entrypointsh)
4. [📄 Importancia de `env.example`](#-importancia-de-envexample)
5. [🌐 Variables de Entorno en Docker Compose](#-variables-de-entorno-en-docker-compose)
6. [🔗 Conexión con Laravel y Base de Datos](#-conexión-con-laravel-y-base-de-datos)
7. [🚀 Despliegue del Proyecto](#-despliegue-del-proyecto)
8. [📜 Ver Logs del Contenedor](#-ver-logs-del-contenedor)

---

## ⚙️ Puertos para Pruebas Locales

Este backend usa Docker (Node.js + PostgreSQL compartido con Laravel).  
Solo necesitas ajustar el **puerto** del backend.

---

<details>
<summary><strong>🔵 Puerto del Backend Node.js</strong></summary>

```yaml
backend:
  ports:
    - "3000:3000"
```

* **3000** = puerto local (puede cambiarse)
* **3000** = puerto interno del contenedor (puede cambiarse también)

Si está ocupado:

```yaml
"3001:3000"
"4000:3000"
```

Acceso:

```
http://localhost:3000/api
http://localhost:3000/health
```

</details>

---

## 🟣 Contenedor Backend

El nombre del contenedor es:

```yaml
container_name: org2-backend
```

Este nombre se usa para la comunicación entre servicios Docker.

---

## ✔ Resumen Rápido

* **Cambias:** `3000` (puerto externo)
* **No cambias:** `org2-db` (nombre del contenedor de BD), `org2-net` (red Docker)

---

## 📝 Script de Inicio (`entrypoint.sh`)

Este script automatiza:

* Crear `.env` desde `env.example`
* Instalar dependencias de npm
* Esperar a que PostgreSQL esté disponible
* Iniciar el servidor Node.js

Evita configuraciones manuales en cada arranque.

---

## 📄 Importancia de `env.example`

`env.example` funciona como **plantilla base** para el `.env`.

Ventajas:

* Evita subir contraseñas reales
* Estándar para cualquier entorno
* Permite al entrypoint crear el `.env` automáticamente

Sin este archivo, el contenedor no sabría qué variables generar.

---

## 🌐 Variables de Entorno en Docker Compose

Puedes agregar más variables a Node.js desde `docker-compose.yml` usando la sección:

```yaml
environment:
  PORT: 3000
  NODE_ENV: production
  DB_HOST: org2-db
  DB_PORT: 5432
  DB_NAME: org2_db
  DB_USER: admin
  DB_PASSWORD: admin123
```

### ➕ ¿Cómo agregar más variables?

Simplemente añade nuevas líneas:

```yaml
environment:
  JWT_SECRET: tu_secreto_super_seguro
  JWT_EXPIRES_IN: 7d
  PLANTA_LAT: -12.0464
  PLANTA_LNG: -77.0428
```

### ⚠ Importante

* Estas variables **sobrescriben** las del `.env` dentro del contenedor.
* Si agregas nuevas variables, asegúrate de que existan también en tu `env.example`.

---

## 🔗 Conexión con Laravel y Base de Datos

### Base de Datos Compartida

El backend comparte la misma base de datos PostgreSQL que Laravel:

* **Nombre de BD:** `org2_db`
* **Usuario:** `admin`
* **Contraseña:** `admin123`
* **Host:** `org2-db` (nombre del contenedor)

### Red Docker Compartida

Ambos proyectos usan la misma red Docker (`org2-net`):

```yaml
networks:
  org2-net:
    external: true
```

Esto permite que:
* El backend se conecte a la misma base de datos que Laravel
* Ambos servicios se comuniquen entre sí usando los nombres de contenedores

### Comunicación con Laravel

El backend puede comunicarse con Laravel usando:

```yaml
LARAVEL_API_URL: http://org2-laravel:9000/api
```

**Importante:** Para que esto funcione, Laravel debe estar ejecutándose primero.

---

## 🚀 Despliegue del Proyecto

### Orden de Ejecución

1. **Primero, inicia Laravel** (para crear la red y la base de datos):
```bash
cd ../Planta/plantaCruds
docker compose up --build -d
```

2. **Luego, inicia el backend**:
```bash
cd backend
docker compose up --build -d
```

Este comando puede tardar porque ejecuta todo el entrypoint.

---

## 🐢 ¿Se queda en "📦 Instalando dependencias de npm..."?

Si ves:

```
npm WARN deprecated...
```

y no avanza, es porque tu carpeta `node_modules/` está afectando al contenedor.

### ✔ Solución

```bash
rm -rf node_modules
docker compose up --build -d
```

---

## 📜 Ver Logs del Contenedor

```bash
docker logs org2-backend -f
```

Ejemplo:

```bash
docker logs org2-backend -f
```

O usando **Docker Desktop** → *Containers*.

---

## 🔧 Solución de Problemas

### Error: "Network org2-net not found"

**Causa:** Laravel no está ejecutándose o la red no existe.

**Solución:**
```bash
# Iniciar Laravel primero
cd ../Planta/plantaCruds
docker compose up -d

# Luego iniciar el backend
cd ../../applanta/backend
docker compose up -d
```

### Error: "Cannot connect to database"

**Causa:** La base de datos no está disponible o las credenciales son incorrectas.

**Solución:**
1. Verifica que el contenedor `org2-db` esté corriendo:
```bash
docker ps | grep org2-db
```

2. Verifica las variables de entorno en `docker-compose.yml`

### Error: "Port 3000 already in use"

**Causa:** Otro servicio está usando el puerto 3000.

**Solución:**
Cambia el puerto en `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Usa 3001 en lugar de 3000
```

---

## 📝 Notas Adicionales

* El backend espera automáticamente a que PostgreSQL esté disponible antes de iniciar
* Los archivos se sincronizan en tiempo real gracias a los volúmenes Docker
* Los `node_modules` se excluyen del volumen para evitar conflictos

