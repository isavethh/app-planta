const pool = require('../config/database');

// Obtener todos los envíos
const getAll = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, 
             a.nombre as almacen_nombre,
             a.direccion_completa,
             ae.transportista_id,
             ae.vehiculo_id,
             ae.fecha_asignacion,
             u.nombre as transportista_nombre,
             u.apellido as transportista_apellido,
             v.placa as vehiculo_placa
      FROM envios e
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      LEFT JOIN asignaciones_envio ae ON e.id = ae.envio_id
      LEFT JOIN transportistas t ON ae.transportista_id = t.id
      LEFT JOIN usuarios u ON t.usuario_id = u.id
      LEFT JOIN vehiculos v ON ae.vehiculo_id = v.id
      ORDER BY e.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener envíos:', error);
    console.error('Detalles del error:', error.message);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
};

// Obtener envío por ID con detalles completos
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener envío
    const envioResult = await pool.query(`
      SELECT e.*,
             a.nombre as almacen_nombre,
             a.direccion_completa,
             a.latitud,
             a.longitud,
             ae.transportista_id,
             ae.vehiculo_id,
             ae.fecha_asignacion,
             u.nombre as transportista_nombre,
             u.apellido as transportista_apellido,
             v.placa as vehiculo_placa
      FROM envios e
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      LEFT JOIN asignaciones_envio ae ON e.id = ae.envio_id
      LEFT JOIN transportistas t ON ae.transportista_id = t.id
      LEFT JOIN usuarios u ON t.usuario_id = u.id
      LEFT JOIN vehiculos v ON ae.vehiculo_id = v.id
      WHERE e.id = $1
    `, [id]);

    if (envioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    const envio = envioResult.rows[0];
    
    // Obtener productos del envío
    const productosResult = await pool.query(`
      SELECT *
      FROM envio_productos
      WHERE envio_id = $1
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
      SELECT *
      FROM envio_productos
      WHERE envio_id = $1
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

    try {
      const result = await pool.query(`
        SELECT * FROM seguimiento_envio
        WHERE envio_id = $1
        ORDER BY timestamp DESC
      `, [id]);

      return res.json(result.rows);
    } catch (dbError) {
      // Si la tabla de seguimiento aún no existe, devolvemos una lista vacía
      if (dbError.code === '42P01') {
        console.warn('Tabla seguimiento_envio no existe, devolviendo lista vacía');
        return res.json([]);
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error al obtener seguimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Simular movimiento en tiempo real (para pruebas de tracking)
const simularMovimiento = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener envío con coordenadas de origen (planta) y destino (almacén)
    const envioResult = await pool.query(`
      SELECT e.*,
             p.latitud  AS origen_lat,
             p.longitud AS origen_lng,
             COALESCE(a.latitud, d.latitud)   AS destino_lat,
             COALESCE(a.longitud, d.longitud) AS destino_lng
      FROM envios e
      CROSS JOIN planta p
      LEFT JOIN almacenes  a ON e.almacen_destino_id = a.id
      LEFT JOIN direcciones d ON a.direccion_id = d.id
      WHERE e.id = $1
    `, [id]);

    if (envioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    const envio = envioResult.rows[0];

    if (!envio.origen_lat || !envio.origen_lng || !envio.destino_lat || !envio.destino_lng) {
      console.warn('⚠️ Faltan coordenadas completas para simular ruta, usando valores por defecto');
      // Valores por defecto (Santa Cruz) para no romper la simulación
      envio.origen_lat = envio.origen_lat  || -17.7833;
      envio.origen_lng = envio.origen_lng  || -63.1821;
      envio.destino_lat = envio.destino_lat || -17.7892;
      envio.destino_lng = envio.destino_lng || -63.1751;
    }

    // Actualizar estado a en_transito si aún no lo está
    await pool.query(
      'UPDATE envios SET estado = $1, fecha_inicio_transito = COALESCE(fecha_inicio_transito, CURRENT_TIMESTAMP) WHERE id = $2',
      ['en_transito', id]
    );

    // Simular puntos de ruta (10 puntos entre origen y destino)
    const puntos = [];
    const pasos = 10;

    for (let i = 0; i <= pasos; i++) {
      const lat = parseFloat(envio.origen_lat) +
        (parseFloat(envio.destino_lat) - parseFloat(envio.origen_lat)) * (i / pasos);
      const lng = parseFloat(envio.origen_lng) +
        (parseFloat(envio.destino_lng) - parseFloat(envio.origen_lng)) * (i / pasos);
      const velocidad = 30 + Math.random() * 20; // 30-50 km/h

      puntos.push({ lat, lng, velocidad });
    }

    // Intentar guardar puntos en la base de datos (opcional)
    try {
      for (const punto of puntos) {
        await pool.query(`
          INSERT INTO seguimiento_envio (envio_id, latitud, longitud, velocidad)
          VALUES ($1, $2, $3, $4)
        `, [id, punto.lat, punto.lng, punto.velocidad]);
      }
    } catch (dbError) {
      // Si la tabla no existe u otro error de BD, lo registramos pero NO rompemos la simulación
      console.warn('No se pudieron guardar puntos de seguimiento en BD:', dbError.message);
    }

    return res.json({
      message: 'Simulación de ruta creada correctamente',
      puntos,
      origen: { lat: envio.origen_lat, lng: envio.origen_lng },
      destino: { lat: envio.destino_lat, lng: envio.destino_lng }
    });
  } catch (error) {
    console.error('Error al simular movimiento:', error);
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
      SELECT e.*, 
             a.nombre as almacen_nombre,
             a.direccion_completa
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

    // Verificar que el envío existe y obtener su estado
    const envioCheck = await pool.query('SELECT estado FROM envios WHERE id = $1', [id]);
    if (envioCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Envío no encontrado' });
    }

    const estadoActual = envioCheck.rows[0].estado;

    // Si ya está aceptado, devolver mensaje apropiado
    if (estadoActual === 'aceptado') {
      return res.json({
        success: true,
        message: 'El envío ya fue aceptado anteriormente',
        yaAceptado: true
      });
    }

    // Solo permitir aceptar si está en estado 'asignado'
    if (estadoActual !== 'asignado') {
      return res.status(400).json({ 
        success: false, 
        error: `No se puede aceptar un envío en estado "${estadoActual}". Solo se pueden aceptar envíos asignados.` 
      });
    }

    // Actualizar estado a 'aceptado'
    const result = await pool.query(`
      UPDATE envios
      SET estado = 'aceptado',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    // Actualizar fecha_aceptacion en envio_asignaciones
    await pool.query(`
      UPDATE envio_asignaciones
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
    res.status(500).json({ success: false, error: 'Error interno del servidor', details: error.message });
  }
};

// Rechazar asignación (transportista rechaza)
const rechazarAsignacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    // Verificar que el envío existe
    const envioCheck = await pool.query('SELECT estado FROM envios WHERE id = $1', [id]);
    if (envioCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Envío no encontrado' });
    }

    // Actualizar estado a 'pendiente' para que pueda reasignarse
    await pool.query(`
      UPDATE envios
      SET estado = 'pendiente',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    // Eliminar asignación
    await pool.query('DELETE FROM envio_asignaciones WHERE envio_id = $1', [id]);

    res.json({
      success: true,
      message: 'Asignación rechazada. El envío volverá a estar disponible para asignación.',
      motivo: motivo
    });
  } catch (error) {
    console.error('Error al rechazar asignación:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor', details: error.message });
  }
};

// Obtener envíos por transportista
const getByTransportista = async (req, res) => {
  try {
    const { transportistaId } = req.params;

    console.log(`🔍 Buscando envíos para transportista ID: ${transportistaId}`);

    const result = await pool.query(`
      SELECT e.id, e.codigo, e.estado, e.fecha_estimada_entrega, e.hora_estimada, 
             e.total_cantidad, e.total_peso, e.total_precio, e.created_at,
             e.categoria, e.observaciones,
             e.fecha_inicio_transito, e.fecha_entrega,
             a.nombre as almacen_nombre,
             a.direccion_completa,
             a.latitud,
             a.longitud,
             ae.transportista_id,
             ae.vehiculo_id,
             ae.fecha_asignacion,
             v.placa as vehiculo_placa
      FROM envios e
      INNER JOIN asignaciones_envio ae ON e.id = ae.envio_id
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      LEFT JOIN vehiculos v ON ae.vehiculo_id = v.id
      WHERE ae.transportista_id = $1
        AND e.estado IN ('pendiente', 'asignado', 'aceptado', 'en_transito', 'entregado')
      ORDER BY 
        CASE 
          WHEN e.estado = 'entregado' THEN 1
          ELSE 0
        END ASC,
        e.created_at DESC
    `, [transportistaId]);

    console.log(`✅ Encontrados ${result.rows.length} envíos para transportista ${transportistaId}`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ Error al obtener envíos del transportista:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ success: false, error: 'Error interno del servidor', details: error.message });
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
  getByTransportista,
  simularMovimiento
};

