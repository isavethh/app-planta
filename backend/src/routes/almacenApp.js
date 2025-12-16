const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Obtener envíos de un almacén (sin autenticación para app móvil)
router.get('/:id/envios', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📦 Obteniendo envíos del almacén:', id);
    
    const result = await pool.query(`
      SELECT 
        e.*,
        a.nombre as almacen_nombre,
        u.name as transportista_nombre,
        u.email as transportista_email,
        ea.estado as estado_asignacion,
        ea.fecha_aceptacion,
        ea.fecha_rechazo,
        ea.observaciones as firma_transportista
      FROM envios e
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      LEFT JOIN envio_asignaciones ea ON e.id = ea.envio_id
      LEFT JOIN vehiculos v ON ea.vehiculo_id = v.id
      LEFT JOIN users u ON v.transportista_id = u.id
      WHERE e.almacen_destino_id = $1
      ORDER BY e.created_at DESC
    `, [id]);

    console.log('✅ Envíos encontrados para almacén:', result.rows.length);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error al obtener envíos del almacén:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener envíos del almacén'
    });
  }
});

// Obtener notas de venta de un almacén (sin autenticación para app móvil)
router.get('/:id/notas-venta', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📄 Obteniendo notas de venta del almacén:', id);
    
    const result = await pool.query(`
      SELECT 
        nv.*,
        e.codigo as envio_codigo,
        e.estado as envio_estado,
        a.nombre as almacen_nombre,
        u.name as transportista_nombre,
        u.email as transportista_email
      FROM notas_venta nv
      INNER JOIN envios e ON nv.envio_id = e.id
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      LEFT JOIN envio_asignaciones ea ON e.id = ea.envio_id
      LEFT JOIN vehiculos v ON ea.vehiculo_id = v.id
      LEFT JOIN users u ON v.transportista_id = u.id
      WHERE e.almacen_destino_id = $1
      ORDER BY nv.created_at DESC
    `, [id]);

    console.log('✅ Notas de venta encontradas para almacén:', result.rows.length);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error al obtener notas de venta del almacén:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener notas de venta del almacén'
    });
  }
});

// Obtener estadísticas del almacén
router.get('/:id/estadisticas', async (req, res) => {
  try {
    const estadisticasController = require('../controllers/estadisticasController');
    return estadisticasController.getEstadisticasAlmacen(req, res);
  } catch (error) {
    console.error('❌ Error en estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
});

// Obtener detalles de una nota de venta específica
router.get('/nota-venta/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📄 Obteniendo detalles de nota de venta:', id);
    
    const result = await pool.query(`
      SELECT 
        nv.*,
        e.codigo as envio_codigo,
        e.estado as envio_estado,
        a.nombre as almacen_nombre,
        a.direccion as almacen_direccion,
        u.name as transportista_nombre,
        u.email as transportista_email,
        ea.fecha_aceptacion,
        ea.observaciones as firma_transportista
      FROM notas_venta nv
      INNER JOIN envios e ON nv.envio_id = e.id
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      LEFT JOIN envio_asignaciones ea ON e.id = ea.envio_id
      LEFT JOIN vehiculos v ON ea.vehiculo_id = v.id
      LEFT JOIN users u ON v.transportista_id = u.id
      WHERE nv.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Nota de venta no encontrada'
      });
    }

    console.log('✅ Nota de venta encontrada');

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error al obtener nota de venta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener nota de venta'
    });
  }
});

module.exports = router;
