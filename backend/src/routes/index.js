const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const usuariosRoutes = require('./usuarios');
const almacenesRoutes = require('./almacenes');
const enviosRoutes = require('./envios');
const transportistasRoutes = require('./transportistas');
const catalogosRoutes = require('./catalogos');
const checklistRoutes = require('./checklist');
const syncRoutes = require('./sync');
const publicRoutes = require('./public');

// Rutas públicas
router.use('/auth', authRoutes);
router.use('/public', publicRoutes);

// Rutas de sincronización (públicas para Laravel)
router.use('/sync', syncRoutes);

// Rutas protegidas
router.use('/usuarios', usuariosRoutes);
router.use('/almacenes', almacenesRoutes);
router.use('/envios', enviosRoutes);
router.use('/transportistas', transportistasRoutes);
router.use('/catalogos', catalogosRoutes);
router.use('/checklist', checklistRoutes);

module.exports = router;
