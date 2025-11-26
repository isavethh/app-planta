const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const catalogosController = require('../controllers/catalogosController');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Productos
router.get('/productos', catalogosController.getProductos);
router.get('/productos/:id', catalogosController.getProductoById);
router.post('/productos', catalogosController.createProducto);
router.put('/productos/:id', catalogosController.updateProducto);
router.delete('/productos/:id', catalogosController.deleteProducto);

// Categorías
router.get('/categorias', catalogosController.getCategorias);
router.post('/categorias', catalogosController.createCategoria);

// Tipos de empaque
router.get('/tipos-empaque', catalogosController.getTiposEmpaque);
router.post('/tipos-empaque', catalogosController.createTipoEmpaque);

// Unidades de medida
router.get('/unidades-medida', catalogosController.getUnidadesMedida);
router.post('/unidades-medida', catalogosController.createUnidadMedida);

// Tipos de vehículo
router.get('/tipos-vehiculo', catalogosController.getTiposVehiculo);
router.post('/tipos-vehiculo', catalogosController.createTipoVehiculo);

// Vehículos
router.get('/vehiculos', catalogosController.getVehiculos);
router.get('/vehiculos/:id', catalogosController.getVehiculoById);
router.post('/vehiculos', catalogosController.createVehiculo);
router.put('/vehiculos/:id', catalogosController.updateVehiculo);
router.delete('/vehiculos/:id', catalogosController.deleteVehiculo);

// Direcciones
router.get('/direcciones', catalogosController.getDirecciones);
router.get('/direcciones/:id', catalogosController.getDireccionById);
router.post('/direcciones', catalogosController.createDireccion);
router.put('/direcciones/:id', catalogosController.updateDireccion);
router.delete('/direcciones/:id', catalogosController.deleteDireccion);

module.exports = router;

