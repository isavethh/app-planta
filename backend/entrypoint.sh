#!/bin/sh

# Salir si algún comando falla
set -e

# Crear .env si no existe
if [ ! -f .env ]; then
    echo "📄 No existe .env — creando desde env.example"
    cp env.example .env
else
    echo "✔️ Archivo .env ya existe — no se copia"
fi

echo "📦 Instalando dependencias de npm..."
npm install

echo "⏳ Esperando a que la base de datos esté lista..."
# Esperar hasta que PostgreSQL esté disponible usando nc (netcat)
until nc -z "${DB_HOST:-org2-db}" "${DB_PORT:-5432}" 2>/dev/null; do
    echo "⏳ Esperando a PostgreSQL en ${DB_HOST:-org2-db}:${DB_PORT:-5432}..."
    sleep 2
done

echo "✅ Base de datos disponible"

echo "🚀 Iniciando servidor Node.js..."
exec node src/index.js

