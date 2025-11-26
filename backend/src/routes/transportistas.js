const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const transportistasController = require('../controllers/transportistasController');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todos los transportistas
router.get('/', transportistasController.getAll);

// Obtener transportistas disponibles
router.get('/disponibles', transportistasController.getDisponibles);

// Obtener transportista por ID
router.get('/:id', transportistasController.getById);

// Obtener envíos asignados a un transportista
router.get('/:id/envios', transportistasController.getEnviosAsignados);

// Crear transportista
router.post('/', transportistasController.create);

// Actualizar transportista
router.put('/:id', transportistasController.update);

// Cambiar disponibilidad
router.put('/:id/disponibilidad', transportistasController.cambiarDisponibilidad);

// Eliminar transportista
router.delete('/:id', transportistasController.remove);

module.exports = router;

