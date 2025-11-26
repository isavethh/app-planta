const express = require('express');
const router = express.Router();
const enviosController = require('../controllers/enviosController');
const documentoController = require('../controllers/documentoController');
const { authenticateToken } = require('../middlewares/auth');

// Rutas sin autenticación (para app simplificada)
router.get('/', enviosController.getAll); // Permitir ver envíos sin auth (filtrar por usuario_id en query)
router.get('/codigo/:codigo', enviosController.getByCode);
router.get('/:id/documento', documentoController.generarDocumentoHTML); // Documento HTML completo (ANTES de /:id)
router.get('/:id', enviosController.getById);

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

// Rutas con autenticación (las que modifican datos)
router.get('/estados', enviosController.getEstados);
router.get('/:id/seguimiento', enviosController.getSeguimiento);
router.put('/:id/estado', enviosController.updateEstado);
router.post('/:id/iniciar', enviosController.iniciarEnvio);
router.post('/:id/entregar', enviosController.marcarEntregado);

module.exports = router;
