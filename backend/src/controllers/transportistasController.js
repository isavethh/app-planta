const pool = require('../config/database');

// Obtener todos los transportistas
const getAll = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, 
             u.nombre, u.apellido, u.email, u.telefono,
             v.placa, v.marca, v.modelo as vehiculo_modelo,
             tv.nombre as tipo_vehiculo
      FROM transportistas t
      LEFT JOIN usuarios u ON t.usuario_id = u.id
      LEFT JOIN vehiculos v ON t.vehiculo_asignado_id = v.id
      LEFT JOIN tipos_vehiculo tv ON v.tipo_vehiculo_id = tv.id
      WHERE u.activo = true
      ORDER BY u.nombre
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener transportistas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener transportista por ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT t.*, 
             u.nombre, u.apellido, u.email, u.telefono,
             v.placa, v.marca, v.modelo as vehiculo_modelo, v.color as vehiculo_color,
             tv.nombre as tipo_vehiculo, tv.capacidad_kg
      FROM transportistas t
      LEFT JOIN usuarios u ON t.usuario_id = u.id
      LEFT JOIN vehiculos v ON t.vehiculo_asignado_id = v.id
      LEFT JOIN tipos_vehiculo tv ON v.tipo_vehiculo_id = tv.id
      WHERE t.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transportista no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener transportista:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear transportista
const create = async (req, res) => {
  try {
    const { usuario_id, licencia, tipo_licencia, fecha_vencimiento_licencia, vehiculo_asignado_id } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ error: 'Usuario ID es requerido' });
    }

    // Verificar que el usuario existe y tiene rol transportista
    const userCheck = await pool.query(`
      SELECT u.id, r.nombre as rol 
      FROM usuarios u 
      LEFT JOIN roles r ON u.rol_id = r.id 
      WHERE u.id = $1
    `, [usuario_id]);

    if (userCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    // Verificar que no existe ya como transportista
    const existingTransp = await pool.query('SELECT id FROM transportistas WHERE usuario_id = $1', [usuario_id]);
    if (existingTransp.rows.length > 0) {
      return res.status(400).json({ error: 'Este usuario ya está registrado como transportista' });
    }

    const result = await pool.query(`
      INSERT INTO transportistas (usuario_id, licencia, tipo_licencia, fecha_vencimiento_licencia, vehiculo_asignado_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [usuario_id, licencia, tipo_licencia, fecha_vencimiento_licencia, vehiculo_asignado_id]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear transportista:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar transportista
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { licencia, tipo_licencia, fecha_vencimiento_licencia, vehiculo_asignado_id, disponible } = req.body;

    const result = await pool.query(`
      UPDATE transportistas 
      SET licencia = COALESCE($1, licencia),
          tipo_licencia = COALESCE($2, tipo_licencia),
          fecha_vencimiento_licencia = COALESCE($3, fecha_vencimiento_licencia),
          vehiculo_asignado_id = COALESCE($4, vehiculo_asignado_id),
          disponible = COALESCE($5, disponible),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [licencia, tipo_licencia, fecha_vencimiento_licencia, vehiculo_asignado_id, disponible, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transportista no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar transportista:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar transportista
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM transportistas WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transportista no encontrado' });
    }

    res.json({ message: 'Transportista eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar transportista:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener envíos asignados al transportista
const getEnviosAsignados = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT e.*, 
             ee.nombre as estado_nombre, ee.color as estado_color,
             d.nombre as direccion_nombre, d.direccion_completa, d.latitud, d.longitud,
             a.nombre as almacen_nombre
      FROM envios e
      LEFT JOIN asignaciones_envio ae ON e.id = ae.envio_id
      LEFT JOIN estados_envio ee ON e.estado_id = ee.id
      LEFT JOIN direcciones d ON e.direccion_destino_id = d.id
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      WHERE ae.transportista_id = $1
      ORDER BY e.fecha_programada DESC
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener envíos asignados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Cambiar disponibilidad
const cambiarDisponibilidad = async (req, res) => {
  try {
    const { id } = req.params;
    const { disponible } = req.body;

    const result = await pool.query(`
      UPDATE transportistas 
      SET disponible = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [disponible, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transportista no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al cambiar disponibilidad:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener transportistas disponibles
const getDisponibles = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, 
             u.nombre, u.apellido, u.telefono,
             v.placa, v.marca, v.modelo,
             tv.nombre as tipo_vehiculo
      FROM transportistas t
      LEFT JOIN usuarios u ON t.usuario_id = u.id
      LEFT JOIN vehiculos v ON t.vehiculo_asignado_id = v.id
      LEFT JOIN tipos_vehiculo tv ON v.tipo_vehiculo_id = tv.id
      WHERE t.disponible = true AND u.activo = true
      ORDER BY u.nombre
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener transportistas disponibles:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getEnviosAsignados,
  cambiarDisponibilidad,
  getDisponibles
};
