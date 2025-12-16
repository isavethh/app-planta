const express = require('express');
const router = express.Router();
const enviosController = require('../controllers/enviosController');
const documentoController = require('../controllers/documentoController');
const notaVentaController = require('../controllers/notaVentaController');
const { authenticateToken } = require('../middlewares/auth');

// ==================== RUTAS ESPECÍFICAS (ANTES DE /:id) ====================
// IMPORTANTE: Las rutas específicas deben ir ANTES de las rutas con parámetros dinámicos

// Rutas sin autenticación (para app simplificada)
router.get('/', enviosController.getAll); // Permitir ver envíos sin auth (filtrar por usuario_id en query)

// Rutas específicas que deben ir antes de /:id
router.get('/estados', enviosController.getEstados); // Obtener estados disponibles
router.get('/codigo/:codigo', enviosController.getByCode);
router.get('/transportista/:transportistaId', enviosController.getByTransportista); // Envíos del transportista

// Sincronización desde Laravel (sin autenticación)
router.post('/sync', async (req, res) => {
  const pool = require('../config/database');
  
  try {
    const {
      laravel_envio_id,
      codigo,
      almacen_destino_id,
      estado,
      fecha_programada,
      hora_estimada_llegada,
      notas
    } = req.body;

    // Verificar si ya existe
    const existingEnvio = await pool.query(
      'SELECT id FROM envios WHERE codigo = $1',
      [codigo]
    );

    if (existingEnvio.rows.length > 0) {
      // Actualizar
      await pool.query(`
        UPDATE envios 
        SET almacen_destino_id = $1, 
            fecha_programada = $2, 
            hora_estimada_llegada = $3,
            notas = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE codigo = $5
      `, [almacen_destino_id, fecha_programada, hora_estimada_llegada, notas, codigo]);

      return res.json({
        success: true,
        message: 'Envío actualizado',
        id: existingEnvio.rows[0].id
      });
    }

    // Crear nuevo envío
    const result = await pool.query(`
      INSERT INTO envios (
        codigo, 
        almacen_destino_id, 
        estado, 
        fecha_creacion,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [codigo, almacen_destino_id, estado || 'pendiente']);

    res.json({
      success: true,
      message: 'Envío sincronizado',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error en sincronización:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error al sincronizar envío' 
    });
  }
});

// ==================== RUTAS CON PARÁMETROS DINÁMICOS (DESPUÉS DE RUTAS ESPECÍFICAS) ====================

// Rutas con sub-rutas específicas (deben ir antes de /:id)
router.get('/:id/documento', documentoController.generarDocumentoHTML); // Documento HTML completo
router.get('/:id/nota-venta', notaVentaController.generarNotaVentaHTML); // Nota de venta HTML
router.get('/:id/seguimiento', enviosController.getSeguimiento);
router.put('/:id/estado', enviosController.updateEstado);
router.post('/:id/iniciar', enviosController.iniciarEnvio);
router.post('/:id/entregar', enviosController.marcarEntregado);
router.post('/:id/simular-movimiento', enviosController.simularMovimiento);

// Acciones del transportista (aceptar/rechazar asignación)
router.post('/:id/aceptar', enviosController.aceptarAsignacion);
router.post('/:id/rechazar', enviosController.rechazarAsignacion);

// Ruta genérica por ID (DEBE IR AL FINAL)
router.get('/:id', enviosController.getById);

module.exports = router;
