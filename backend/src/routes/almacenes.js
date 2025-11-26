const express = require('express');
const router = express.Router();
const almacenesController = require('../controllers/almacenesController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de almacenes
router.get('/', almacenesController.getAll);
router.get('/:id', almacenesController.getById);
router.get('/:id/inventario', almacenesController.getInventario);
router.get('/:id/inventario/resumen', almacenesController.getInventarioResumen);
router.get('/:id/envios', almacenesController.getEnvios);

// Solo admin puede crear/modificar/eliminar
router.post('/', requireRole('admin'), almacenesController.create);
router.put('/:id', requireRole('admin'), almacenesController.update);
router.delete('/:id', requireRole('admin'), almacenesController.remove);

module.exports = router;
