const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const checklistController = require('../controllers/checklistController');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todos los checklists
router.get('/', checklistController.getAll);

// Obtener checklist por ID
router.get('/:id', checklistController.getById);

// Crear checklist
router.post('/', checklistController.create);

// Actualizar checklist
router.put('/:id', checklistController.update);

// Eliminar checklist
router.delete('/:id', checklistController.remove);

module.exports = router;

