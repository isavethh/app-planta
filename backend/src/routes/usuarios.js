const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de usuarios (solo admin)
router.get('/', requireRole('admin'), usuariosController.getAll);
router.get('/roles', usuariosController.getRoles);
router.get('/:id', requireRole('admin'), usuariosController.getById);
router.post('/', requireRole('admin'), usuariosController.create);
router.put('/:id', requireRole('admin'), usuariosController.update);
router.delete('/:id', requireRole('admin'), usuariosController.remove);

module.exports = router;
