const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const routes = require('./routes');

const app = express();
const server = http.createServer(app);

// Configurar Socket.IO con CORS permisivo
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Hacer io accesible en las rutas
app.set('io', io);

// Servir archivos estáticos (fotos de incidentes, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Logger simple
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas
app.use('/api', routes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Applanta API funcionando correctamente' });
});

// Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
});

// ========== SOCKET.IO - TRACKING EN TIEMPO REAL ==========
// Namespace para tracking de envíos
const trackingNamespace = io.of('/tracking');

trackingNamespace.on('connection', (socket) => {
  console.log(`🔌 Cliente tracking conectado: ${socket.id}`);
  
  // Cliente se une a una sala de envío específico
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`📦 Cliente ${socket.id} unido a sala: ${room}`);
  });
  
  socket.on('join-envio', (envioId) => {
    socket.join(`envio-${envioId}`);
    console.log(`📦 Cliente ${socket.id} siguiendo envío ${envioId}`);
  });
  
  // Cliente sale de una sala
  socket.on('leave-envio', (envioId) => {
    socket.leave(`envio-${envioId}`);
    console.log(`📦 Cliente ${socket.id} dejó de seguir envío ${envioId}`);
  });
  
  // Iniciar simulación desde la app móvil
  socket.on('iniciar-simulacion', (data) => {
    console.log(`🚚 Simulación iniciada para envío ${data.envioId} con ${data.rutaPuntos?.length || 0} puntos`);
    
    // Emitir a TODOS los clientes conectados al namespace tracking
    trackingNamespace.emit('simulacion-iniciada', {
      envioId: data.envioId,
      rutaPuntos: data.rutaPuntos,
      timestamp: new Date().toISOString()
    });
    
    // También emitir a la sala específica del envío
    socket.to(`envio-${data.envioId}`).emit('simulacion-iniciada', {
      envioId: data.envioId,
      rutaPuntos: data.rutaPuntos,
      timestamp: new Date().toISOString()
    });
  });
  
  // Recibir actualización de posición desde la app móvil
  socket.on('posicion-update', (data) => {
    const progreso = data.progreso || 0;
    console.log(`📍 Posición envío ${data.envioId}: lat=${data.posicion?.latitude?.toFixed(6)}, lng=${data.posicion?.longitude?.toFixed(6)} (${Math.round(progreso * 100)}%)`);
    
    // Emitir a TODOS los clientes conectados al namespace tracking
    trackingNamespace.emit('posicion-actualizada', {
      envioId: data.envioId,
      posicion: data.posicion,
      progreso: data.progreso,
      timestamp: new Date().toISOString()
    });
    
    // También emitir a la sala específica del envío
    socket.to(`envio-${data.envioId}`).emit('posicion-actualizada', {
      envioId: data.envioId,
      posicion: data.posicion,
      progreso: data.progreso,
      timestamp: new Date().toISOString()
    });
  });
  
  // Simulación completada
  socket.on('envio-completado', (data) => {
    console.log(`✅ Envío ${data.envioId} completado`);
    
    trackingNamespace.emit('envio-completado', {
      envioId: data.envioId,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('disconnect', () => {
    console.log(`❌ Cliente tracking desconectado: ${socket.id}`);
  });
});

// También manejar conexiones en el namespace raíz para compatibilidad
io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado (raíz): ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado (raíz): ${socket.id}`);
  });
});

// Iniciar servidor en todas las interfaces (0.0.0.0) para que sea accesible desde la red local
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Node.js ejecutándose en puerto ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log(`📱 Accesible desde red local en: http://10.26.14.34:${PORT}/api`);
  console.log(`   (Asegúrate de que tu celular esté en la misma red WiFi)`);
  console.log(`\n✅ App móvil configurada para: http://10.26.14.34:${PORT}/api`);
});

module.exports = { app, io, server };

