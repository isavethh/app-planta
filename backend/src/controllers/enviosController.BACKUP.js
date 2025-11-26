const pool = require('../config/database');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

// Generar código único para envío
const generateEnvioCode = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ENV-${year}${month}${day}-${random}`;
};

// Obtener todos los envíos (filtrar por almacén destino)
const getAll = async (req, res) => {
  try {
    const { almacen_id } = req.query;
    
    let query = `
      SELECT e.*, 
             a.nombre as almacen_nombre
      FROM envios e
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
    `;
    
    const params = [];
    
    if (almacen_id) {
      query += ` WHERE e.almacen_destino_id = $1`;
      params.push(almacen_id);
    }
    
    query += ` ORDER BY e.fecha_creacion DESC`;
    
    const result = await pool.query(query, params);
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
    
    // Obtener productos del envío desde la tabla envio_productos
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

// Crear envío con detalles
const create = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { 
      direccion_destino_id, 
      almacen_destino_id, 
      fecha_programada, 
      hora_estimada_llegada,
      notas,
      detalles // Array de productos
    } = req.body;

    if (!almacen_destino_id || !detalles || detalles.length === 0) {
      return res.status(400).json({ error: 'Almacén destino y al menos un producto son requeridos' });
    }

    await client.query('BEGIN');

    // Generar código único
    const codigo = generateEnvioCode();
    
    // Generar QR
    const qrData = JSON.stringify({ codigo, type: 'ENVIO' });
    const qrCode = await QRCode.toDataURL(qrData);

    // Obtener estado pendiente
    const estadoResult = await client.query("SELECT id FROM estados_envio WHERE nombre = 'pendiente'");
    const estadoId = estadoResult.rows[0]?.id || 1;

    // Crear envío
    const envioResult = await client.query(`
      INSERT INTO envios (codigo, qr_code, direccion_destino_id, almacen_destino_id, estado_id, 
                          fecha_programada, hora_estimada_llegada, notas, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [codigo, qrCode, direccion_destino_id, almacen_destino_id, estadoId, 
        fecha_programada, hora_estimada_llegada, notas, req.user.id]);

    const envioId = envioResult.rows[0].id;

    // Insertar detalles
    for (const detalle of detalles) {
      const subtotal = (detalle.cantidad || 0) * (detalle.precio_por_unidad || 0);
      const pesoTotal = (detalle.cantidad || 0) * (detalle.peso_por_unidad || 0);

      await client.query(`
        INSERT INTO detalle_envios (envio_id, producto_id, cantidad, peso_por_unidad, 
                                    precio_por_unidad, subtotal, peso_total, 
                                    tipo_empaque_id, unidad_medida_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [envioId, detalle.producto_id, detalle.cantidad, detalle.peso_por_unidad,
          detalle.precio_por_unidad, subtotal, pesoTotal, 
          detalle.tipo_empaque_id, detalle.unidad_medida_id]);
    }

    await client.query('COMMIT');

    // Obtener envío completo
    const envioCompleto = await pool.query(`
      SELECT e.*, ee.nombre as estado_nombre, ee.color as estado_color,
             a.nombre as almacen_nombre
      FROM envios e
      LEFT JOIN estados_envio ee ON e.estado_id = ee.id
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      WHERE e.id = $1
    `, [envioId]);

    res.status(201).json(envioCompleto.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear envío:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
};

// Actualizar envío
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { direccion_destino_id, almacen_destino_id, fecha_programada, hora_estimada_llegada, notas } = req.body;

    const result = await pool.query(`
      UPDATE envios 
      SET direccion_destino_id = COALESCE($1, direccion_destino_id),
          almacen_destino_id = COALESCE($2, almacen_destino_id),
          fecha_programada = COALESCE($3, fecha_programada),
          hora_estimada_llegada = COALESCE($4, hora_estimada_llegada),
          notas = COALESCE($5, notas),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [direccion_destino_id, almacen_destino_id, fecha_programada, hora_estimada_llegada, notas, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar envío:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Cambiar estado del envío
const updateEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_nombre } = req.body;

    const estadoResult = await pool.query('SELECT id FROM estados_envio WHERE nombre = $1', [estado_nombre]);
    if (estadoResult.rows.length === 0) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    const result = await pool.query(`
      UPDATE envios 
      SET estado_id = $1, 
          fecha_entrega = CASE WHEN $2 = 'entregado' THEN CURRENT_TIMESTAMP ELSE fecha_entrega END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [estadoResult.rows[0].id, estado_nombre, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    // Si se entrega, agregar al inventario del almacén
    if (estado_nombre === 'entregado') {
      const envio = result.rows[0];
      const detalles = await pool.query('SELECT * FROM detalle_envios WHERE envio_id = $1', [id]);
      
      for (const detalle of detalles.rows) {
        await pool.query(`
          INSERT INTO inventario_almacen (almacen_id, producto_id, envio_id, cantidad, peso_total)
          VALUES ($1, $2, $3, $4, $5)
        `, [envio.almacen_destino_id, detalle.producto_id, id, detalle.cantidad, detalle.peso_total]);
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Asignación múltiple
const asignacionMultiple = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { envio_ids, transportista_id, vehiculo_id, tipo_vehiculo_id } = req.body;

    if (!envio_ids || envio_ids.length === 0) {
      return res.status(400).json({ error: 'Debe seleccionar al menos un envío' });
    }

    await client.query('BEGIN');

    for (const envioId of envio_ids) {
      // Verificar si ya tiene asignación
      const existingAsig = await client.query('SELECT id FROM asignaciones_envio WHERE envio_id = $1', [envioId]);
      
      if (existingAsig.rows.length > 0) {
        // Actualizar asignación existente
        await client.query(`
          UPDATE asignaciones_envio 
          SET transportista_id = $1, vehiculo_id = $2, tipo_vehiculo_id = $3, 
              fecha_asignacion = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE envio_id = $4
        `, [transportista_id, vehiculo_id, tipo_vehiculo_id, envioId]);
      } else {
        // Crear nueva asignación
        await client.query(`
          INSERT INTO asignaciones_envio (envio_id, transportista_id, vehiculo_id, tipo_vehiculo_id)
          VALUES ($1, $2, $3, $4)
        `, [envioId, transportista_id, vehiculo_id, tipo_vehiculo_id]);
      }

      // Actualizar estado del envío
      await client.query(`
        UPDATE envios SET estado_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
      `, [estadoAsignadoId, envioId]);
    }

    await client.query('COMMIT');

    res.json({ message: `${envio_ids.length} envíos asignados exitosamente` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en asignación múltiple:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
};

// Obtener seguimiento en tiempo real (simulado)
const getSeguimiento = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM seguimiento_envio 
      WHERE envio_id = $1 
      ORDER BY timestamp DESC 
      LIMIT 100
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener seguimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Simular movimiento en tiempo real
const simularMovimiento = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener envío con coordenadas de origen y destino
    const envioResult = await pool.query(`
      SELECT e.*, 
             p.latitud as origen_lat, p.longitud as origen_lng,
             d.latitud as destino_lat, d.longitud as destino_lng
      FROM envios e
      CROSS JOIN planta p
      LEFT JOIN direcciones d ON e.direccion_destino_id = d.id
      WHERE e.id = $1
    `, [id]);

    if (envioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    const envio = envioResult.rows[0];
    
    // Actualizar estado a en_transito
    await pool.query('UPDATE envios SET estado = $1, fecha_inicio_transito = CURRENT_TIMESTAMP WHERE id = $2', ['en_transito', id]);

    // Simular puntos de ruta (10 puntos entre origen y destino)
    const puntos = [];
    const pasos = 10;
    
    for (let i = 0; i <= pasos; i++) {
      const lat = parseFloat(envio.origen_lat) + (parseFloat(envio.destino_lat) - parseFloat(envio.origen_lat)) * (i / pasos);
      const lng = parseFloat(envio.origen_lng) + (parseFloat(envio.destino_lng) - parseFloat(envio.origen_lng)) * (i / pasos);
      const velocidad = 30 + Math.random() * 20; // 30-50 km/h
      
      puntos.push({ lat, lng, velocidad });
    }

    // Guardar puntos en la base de datos
    for (const punto of puntos) {
      await pool.query(`
        INSERT INTO seguimiento_envio (envio_id, latitud, longitud, velocidad)
        VALUES ($1, $2, $3, $4)
      `, [id, punto.lat, punto.lng, punto.velocidad]);
    }

    res.json({ 
      message: 'Simulación iniciada',
      puntos,
      origen: { lat: envio.origen_lat, lng: envio.origen_lng },
      destino: { lat: envio.destino_lat, lng: envio.destino_lng }
    });
  } catch (error) {
    console.error('Error al simular movimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Cancelar envío
const cancelar = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE envios SET estado = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, ['cancelado', id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    res.json({ message: 'Envío cancelado', envio: result.rows[0] });
  } catch (error) {
    console.error('Error al cancelar envío:', error);
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

module.exports = {
  getAll,
  getById,
  getByCode,
  create,
  update,
  updateEstado,
  asignacionMultiple,
  getSeguimiento,
  simularMovimiento,
  cancelar,
  getEstados
};
