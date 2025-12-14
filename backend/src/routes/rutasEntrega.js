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

// Obtener todas las ubicaciones activas (para monitoreo web)
// TODO: Implementar obtenerUbicacionesActivas
// router.get('/ubicaciones-activas', rutasEntregaController.obtenerUbicacionesActivas);

// ==================== CHECKLISTS (ANTES DE RUTAS DINÁMICAS) ====================

// Obtener template de checklist (salida/entrega)
router.get('/checklists/template/:tipo', rutasEntregaController.obtenerTemplateChecklist);

// Obtener firma de un checklist específico (DEBE ESTAR ANTES DE /checklists)
router.get('/checklists/firma', rutasEntregaController.obtenerFirmaChecklist);

// Obtener checklists (por ruta o parada)
router.get('/checklists', rutasEntregaController.obtenerChecklist);

// Guardar checklist completado
router.post('/checklists', rutasEntregaController.guardarChecklist);

// ==================== EVIDENCIAS (ANTES DE RUTAS DINÁMICAS) ====================

// Obtener evidencias
router.get('/evidencias', rutasEntregaController.obtenerEvidencias);

// Subir evidencia (foto)
router.post('/evidencias/upload', 
    rutasEntregaController.upload.single('foto'),
    rutasEntregaController.subirEvidencia
);

// Guardar evidencia en base64
router.post('/evidencias/base64', rutasEntregaController.guardarEvidenciaBase64);

// ==================== RUTAS DINÁMICAS (DESPUÉS DE RUTAS ESPECÍFICAS) ====================

// Obtener ruta por ID con detalles completos
router.get('/:id', rutasEntregaController.obtenerRuta);

// Aceptar ruta multi-entrega (transportista acepta)
// TODO: Implementar aceptarRuta
// router.post('/:id/aceptar', rutasEntregaController.aceptarRuta);

// Rechazar ruta multi-entrega (transportista rechaza)
// TODO: Implementar rechazarRuta
// router.post('/:id/rechazar', rutasEntregaController.rechazarRuta);

// Obtener resumen de ruta (para PDF)
router.get('/:id/resumen', rutasEntregaController.obtenerResumenRuta);

// Iniciar ruta (con checklist de salida)
router.post('/:id/iniciar', rutasEntregaController.iniciarRuta);

// Actualizar ubicación en tiempo real (para monitoreo)
// TODO: Implementar actualizarUbicacion
// router.post('/:id/ubicacion', rutasEntregaController.actualizarUbicacion);

// Obtener ubicación actual de una ruta
// TODO: Implementar obtenerUbicacion
// router.get('/:id/ubicacion', rutasEntregaController.obtenerUbicacion);

// Listar rutas por transportista
router.get('/transportista/:transportista_id', rutasEntregaController.listarRutasPorTransportista);

// ==================== PARADAS ====================

// Registrar llegada a parada
router.post('/paradas/:parada_id/llegada', rutasEntregaController.registrarLlegada);

// Completar entrega en parada
router.post('/paradas/:parada_id/entregar', rutasEntregaController.completarEntrega);

// Reordenar paradas de una ruta
router.put('/:ruta_id/paradas/reordenar', rutasEntregaController.reordenarParadas);

// Ruta alternativa para guardar checklist con ruta ID
// TODO: Implementar guardarChecklistConRutaId o usar guardarChecklist
// router.post('/:id/checklists', rutasEntregaController.guardarChecklistConRutaId);

// Ruta alternativa para subir evidencia por parada
router.post('/:ruta_id/paradas/:parada_id/evidencias', rutasEntregaController.guardarEvidenciaBase64);

module.exports = router;
