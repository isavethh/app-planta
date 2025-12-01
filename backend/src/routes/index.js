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
const notasVentaRoutes = require('./notasVenta');
const almacenAppRoutes = require('./almacenApp');
const iaRoutes = require('./ia');

// Rutas públicas
router.use('/auth', authRoutes);
router.use('/public', publicRoutes);

// Rutas de sincronización (públicas para Laravel)
router.use('/sync', syncRoutes);

// Rutas de notas de venta (públicas para Laravel)
router.use('/notas-venta', notasVentaRoutes);

// Rutas específicas para app móvil de almacén (sin auth)
router.use('/almacen-app', almacenAppRoutes);

// Rutas de IA (públicas)
router.use('/ia', iaRoutes);

// Rutas protegidas
router.use('/usuarios', usuariosRoutes);
router.use('/almacenes', almacenesRoutes);
router.use('/envios', enviosRoutes);
router.use('/transportistas', transportistasRoutes);
router.use('/catalogos', catalogosRoutes);
router.use('/checklist', checklistRoutes);

module.exports = router;
