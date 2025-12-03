const express = require('express');
const router = express.Router();
const rutasEntregaController = require('../controllers/rutasEntregaController');

// ==================== RUTAS DE ENTREGA ====================

// Crear nueva ruta multi-entrega
router.post('/', rutasEntregaController.crearRuta);

// Listar todas las rutas (admin/web)
router.get('/', rutasEntregaController.listarTodasRutas);

// Estadísticas generales de rutas
router.get('/estadisticas', rutasEntregaController.obtenerEstadisticasRutas);

// Obtener ruta por ID con detalles completos
router.get('/:id', rutasEntregaController.obtenerRuta);

// Aceptar ruta multi-entrega (transportista acepta)
router.post('/:id/aceptar', rutasEntregaController.aceptarRuta);

// Rechazar ruta multi-entrega (transportista rechaza)
router.post('/:id/rechazar', rutasEntregaController.rechazarRuta);

// Obtener resumen de ruta (para PDF)
router.get('/:id/resumen', rutasEntregaController.obtenerResumenRuta);

// Iniciar ruta (con checklist de salida)
router.post('/:id/iniciar', rutasEntregaController.iniciarRuta);

// Listar rutas por transportista
router.get('/transportista/:transportista_id', rutasEntregaController.listarRutasPorTransportista);

// ==================== PARADAS ====================

// Registrar llegada a parada
router.post('/paradas/:parada_id/llegada', rutasEntregaController.registrarLlegada);

// Completar entrega en parada
router.post('/paradas/:parada_id/entregar', rutasEntregaController.completarEntrega);

// Reordenar paradas de una ruta
router.put('/:ruta_id/paradas/reordenar', rutasEntregaController.reordenarParadas);

// ==================== CHECKLISTS ====================

// Obtener template de checklist (salida/entrega)
router.get('/checklists/template/:tipo', rutasEntregaController.obtenerTemplateChecklist);

// Guardar checklist completado
router.post('/checklists', rutasEntregaController.guardarChecklist);

// Obtener checklists (por ruta o parada)
router.get('/checklists', rutasEntregaController.obtenerChecklist);

// ==================== EVIDENCIAS ====================

// Subir evidencia (foto)
router.post('/evidencias/upload', 
    rutasEntregaController.upload.single('foto'),
    rutasEntregaController.subirEvidencia
);

// Guardar evidencia en base64
router.post('/evidencias/base64', rutasEntregaController.guardarEvidenciaBase64);

// Obtener evidencias
router.get('/evidencias', rutasEntregaController.obtenerEvidencias);

module.exports = router;
