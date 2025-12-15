FROM node:20-alpine

# Instalar dependencias del sistema (incluyendo netcat para health checks)
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    netcat-openbsd

WORKDIR /app

# Copiar el resto de la aplicación
COPY . .

# Copiar entrypoint
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Exponer el puerto de la aplicación
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

