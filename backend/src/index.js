const express = require('express');
const cors = require('cors');
require('dotenv').config();

const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Iniciar servidor en todas las interfaces (0.0.0.0) para que sea accesible desde la red local
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Node.js ejecutándose en puerto ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`📱 Accesible desde red local en: http://10.26.14.34:${PORT}/api`);
  console.log(`   (Asegúrate de que tu celular esté en la misma red WiFi)`);
  console.log(`\n✅ App móvil configurada para: http://10.26.14.34:${PORT}/api`);
});

module.exports = app;

