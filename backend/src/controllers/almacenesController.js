const pool = require('../config/database');

// Obtener todos los almacenes
const getAll = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, 
             d.nombre as direccion_nombre, d.direccion_completa, d.ciudad,
             u.nombre as encargado_nombre, u.apellido as encargado_apellido, u.email as encargado_email
      FROM almacenes a
      LEFT JOIN direcciones d ON a.direccion_id = d.id
      LEFT JOIN usuarios u ON a.encargado_id = u.id
      WHERE a.activo = true
      ORDER BY a.nombre
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener almacenes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener almacén por ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT a.*, 
             d.nombre as direccion_nombre, d.direccion_completa, d.ciudad, d.latitud, d.longitud,
             u.nombre as encargado_nombre, u.apellido as encargado_apellido, u.email as encargado_email
      FROM almacenes a
      LEFT JOIN direcciones d ON a.direccion_id = d.id
      LEFT JOIN usuarios u ON a.encargado_id = u.id
      WHERE a.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Almacén no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener almacén:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear almacén
const create = async (req, res) => {
  try {
    const { nombre, codigo, direccion_id, encargado_id, capacidad_maxima } = req.body;

    if (!nombre || !codigo) {
      return res.status(400).json({ error: 'Nombre y código son requeridos' });
    }

    // Verificar si el código ya existe
    const existingCode = await pool.query('SELECT id FROM almacenes WHERE codigo = $1', [codigo]);
    if (existingCode.rows.length > 0) {
      return res.status(400).json({ error: 'El código ya está en uso' });
    }

    const result = await pool.query(`
      INSERT INTO almacenes (nombre, codigo, direccion_id, encargado_id, capacidad_maxima)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [nombre, codigo, direccion_id, encargado_id, capacidad_maxima]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear almacén:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar almacén
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, codigo, direccion_id, encargado_id, capacidad_maxima, activo } = req.body;

    const result = await pool.query(`
      UPDATE almacenes 
      SET nombre = COALESCE($1, nombre),
          codigo = COALESCE($2, codigo),
          direccion_id = COALESCE($3, direccion_id),
          encargado_id = COALESCE($4, encargado_id),
          capacidad_maxima = COALESCE($5, capacidad_maxima),
          activo = COALESCE($6, activo),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [nombre, codigo, direccion_id, encargado_id, capacidad_maxima, activo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Almacén no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar almacén:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar almacén (soft delete)
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE almacenes SET activo = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Almacén no encontrado' });
    }

    res.json({ message: 'Almacén eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar almacén:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener inventario de un almacén
const getInventario = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT ia.*, 
             p.nombre as producto_nombre, p.codigo as producto_codigo,
             c.nombre as categoria_nombre,
             e.codigo as envio_codigo, e.fecha_creacion as envio_fecha
      FROM inventario_almacen ia
      LEFT JOIN productos p ON ia.producto_id = p.id
      LEFT JOIN categorias c ON p.categoria_id = c.id
      LEFT JOIN envios e ON ia.envio_id = e.id
      WHERE ia.almacen_id = $1
      ORDER BY ia.fecha_ingreso DESC
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener resumen de inventario por producto
const getInventarioResumen = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT p.id as producto_id, p.nombre as producto_nombre, p.codigo as producto_codigo,
             c.nombre as categoria_nombre,
             SUM(ia.cantidad) as cantidad_total,
             SUM(ia.peso_total) as peso_total
      FROM inventario_almacen ia
      LEFT JOIN productos p ON ia.producto_id = p.id
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE ia.almacen_id = $1 AND ia.estado = 'disponible'
      GROUP BY p.id, p.nombre, p.codigo, c.nombre
      ORDER BY p.nombre
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener resumen de inventario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener envíos de un almacén
const getEnvios = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT e.*, 
             ee.nombre as estado_nombre, ee.color as estado_color,
             d.direccion_completa as direccion_destino
      FROM envios e
      LEFT JOIN estados_envio ee ON e.estado_id = ee.id
      LEFT JOIN direcciones d ON e.direccion_destino_id = d.id
      WHERE e.almacen_destino_id = $1
      ORDER BY e.fecha_creacion DESC
    `, [id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener envíos del almacén:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getInventario,
  getInventarioResumen,
  getEnvios
};
