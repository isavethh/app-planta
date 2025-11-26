const pool = require('../config/database');

// Obtener todos los envíos
const getAll = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, 
             a.nombre as almacen_nombre
      FROM envios e
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      ORDER BY e.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener envíos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener envío por ID con detalles completos
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener envío
    const envioResult = await pool.query(`
      SELECT e.*, 
             a.nombre as almacen_nombre
      FROM envios e
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      WHERE e.id = $1
    `, [id]);

    if (envioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    const envio = envioResult.rows[0];
    
    // Obtener productos del envío
    const productosResult = await pool.query(`
      SELECT ep.*
      FROM envio_productos ep
      WHERE ep.envio_id = $1
    `, [id]);
    
    envio.productos = productosResult.rows;
    
    // Generar QR dinámicamente
    const QRCode = require('qrcode');
    const qrData = JSON.stringify({
      codigo: envio.codigo,
      type: 'ENVIO',
      envio_id: envio.id,
      almacen_id: envio.almacen_destino_id
    });
    envio.qr_code = await QRCode.toDataURL(qrData);

    res.json(envio);
  } catch (error) {
    console.error('Error al obtener envío:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener envío por código QR
const getByCode = async (req, res) => {
  try {
    const { codigo } = req.params;
    
    const result = await pool.query(`
      SELECT e.*, 
             a.nombre as almacen_nombre
      FROM envios e
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      WHERE e.codigo = $1
    `, [codigo]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    const envio = result.rows[0];
    
    // Obtener productos
    const productosResult = await pool.query(`
      SELECT ep.*
      FROM envio_productos ep
      WHERE ep.envio_id = $1
    `, [envio.id]);
    
    envio.productos = productosResult.rows;
    
    // Generar QR
    const QRCode = require('qrcode');
    const qrData = JSON.stringify({
      codigo: envio.codigo,
      type: 'ENVIO',
      envio_id: envio.id
    });
    envio.qr_code = await QRCode.toDataURL(qrData);

    res.json(envio);
  } catch (error) {
    console.error('Error al obtener envío por código:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar estado de un envío
const updateEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_nombre } = req.body;

    const result = await pool.query(
      'UPDATE envios SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [estado_nombre, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener seguimiento de un envío
const getSeguimiento = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT * FROM seguimiento_envio
      WHERE envio_id = $1
      ORDER BY fecha_hora DESC
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener seguimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener estados de envío
const getEstados = async (req, res) => {
  try {
    // Devolver estados hardcodeados ya que no hay tabla estados_envio
    const estados = [
      { id: 1, nombre: 'pendiente', color: '#FF9800', orden: 1 },
      { id: 2, nombre: 'asignado', color: '#2196F3', orden: 2 },
      { id: 3, nombre: 'en_transito', color: '#9C27B0', orden: 3 },
      { id: 4, nombre: 'entregado', color: '#4CAF50', orden: 4 },
      { id: 5, nombre: 'cancelado', color: '#F44336', orden: 5 }
    ];
    res.json(estados);
  } catch (error) {
    console.error('Error al obtener estados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Iniciar envío (cambiar estado a en_transito)
const iniciarEnvio = async (req, res) => {
  try {
    const { id } = req.params;

    // Actualizar estado a en_transito
    await pool.query(
      'UPDATE envios SET estado = $1, fecha_inicio_transito = CURRENT_TIMESTAMP WHERE id = $2',
      ['en_transito', id]
    );

    // Obtener envío actualizado
    const result = await pool.query(`
      SELECT e.*, a.nombre as almacen_nombre
      FROM envios e
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      WHERE e.id = $1
    `, [id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al iniciar envío:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Marcar envío como entregado
const marcarEntregado = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE envios
      SET estado = 'entregado',
          fecha_entrega = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al marcar como entregado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Aceptar asignación de envío (transportista acepta)
const aceptarAsignacion = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el envío esté en estado 'asignado'
    const envioCheck = await pool.query('SELECT estado FROM envios WHERE id = $1', [id]);
    if (envioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    if (envioCheck.rows[0].estado !== 'asignado') {
      return res.status(400).json({ error: 'El envío no está en estado asignado' });
    }

    // Actualizar estado a 'aceptado'
    const result = await pool.query(`
      UPDATE envios
      SET estado = 'aceptado',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    // Actualizar asignacion_transportistas
    await pool.query(`
      UPDATE asignacion_transportistas
      SET fecha_aceptacion = CURRENT_TIMESTAMP
      WHERE envio_id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Envío aceptado correctamente',
      envio: result.rows[0]
    });
  } catch (error) {
    console.error('Error al aceptar asignación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Rechazar asignación (transportista rechaza)
const rechazarAsignacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    // Actualizar estado a 'pendiente' para que pueda reasignarse
    await pool.query(`
      UPDATE envios
      SET estado = 'pendiente',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    // Eliminar asignación
    await pool.query('DELETE FROM asignacion_transportistas WHERE envio_id = $1', [id]);

    res.json({
      success: true,
      message: 'Asignación rechazada. El envío volverá a estar disponible para asignación.'
    });
  } catch (error) {
    console.error('Error al rechazar asignación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener envíos por transportista
const getByTransportista = async (req, res) => {
  try {
    const { transportistaId } = req.params;

    const result = await pool.query(`
      SELECT e.*, a.nombre as almacen_nombre
      FROM envios e
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      INNER JOIN asignacion_transportistas at ON e.id = at.envio_id
      WHERE at.transportista_id = $1
        AND e.estado IN ('asignado', 'aceptado', 'en_transito')
      ORDER BY e.created_at DESC
    `, [transportistaId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener envíos del transportista:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getAll,
  getById,
  getByCode,
  updateEstado,
  getSeguimiento,
  getEstados,
  iniciarEnvio,
  marcarEntregado,
  aceptarAsignacion,
  rechazarAsignacion,
  getByTransportista
};

