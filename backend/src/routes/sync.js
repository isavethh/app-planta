const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * Endpoint para recibir sincronización desde Laravel
 * POST /api/sync/envio
 */
router.post('/envio', async (req, res) => {
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
      // Actualizar envío existente
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

    // Obtener estado
    const estadoResult = await pool.query(
      "SELECT id FROM estados_envio WHERE nombre = $1",
      [estado || 'pendiente']
    );
    const estadoId = estadoResult.rows[0]?.id || 1;

    // Crear nuevo envío
    const result = await pool.query(`
      INSERT INTO envios (
        codigo, 
        almacen_destino_id, 
        estado_id, 
        fecha_programada, 
        hora_estimada_llegada, 
        notas,
        laravel_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [codigo, almacen_destino_id, estadoId, fecha_programada, hora_estimada_llegada, notas, laravel_envio_id]);

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

/**
 * Actualizar estado de envío desde Laravel
 * PUT /api/sync/envio-estado/:codigo
 */
router.put('/envio-estado/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { estado_nombre } = req.body;

    // Obtener estado
    const estadoResult = await pool.query(
      'SELECT id FROM estados_envio WHERE nombre = $1',
      [estado_nombre]
    );

    if (estadoResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Estado no válido'
      });
    }

    // Actualizar envío
    const result = await pool.query(`
      UPDATE envios 
      SET estado_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE codigo = $2
      RETURNING *
    `, [estadoResult.rows[0].id, codigo]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Envío no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Estado actualizado',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar estado'
    });
  }
});

module.exports = router;


