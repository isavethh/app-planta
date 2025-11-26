const pool = require('../config/database');

// Obtener todos los checklists
const getAll = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cc.*, 
             e.codigo as envio_codigo,
             a.nombre as almacen_nombre,
             u.nombre as revisado_por_nombre, u.apellido as revisado_por_apellido
      FROM checklist_condiciones cc
      LEFT JOIN envios e ON cc.envio_id = e.id
      LEFT JOIN almacenes a ON cc.almacen_id = a.id
      LEFT JOIN usuarios u ON cc.revisado_por = u.id
      ORDER BY cc.fecha_revision DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener checklists:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener checklist de un envío
const getByEnvio = async (req, res) => {
  try {
    const { envioId } = req.params;
    
    const result = await pool.query(`
      SELECT cc.*, 
             u.nombre as revisado_por_nombre, u.apellido as revisado_por_apellido,
             a.nombre as almacen_nombre
      FROM checklist_condiciones cc
      LEFT JOIN usuarios u ON cc.revisado_por = u.id
      LEFT JOIN almacenes a ON cc.almacen_id = a.id
      WHERE cc.envio_id = $1
      ORDER BY cc.fecha_revision DESC
    `, [envioId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener checklist:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener checklist por ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT cc.*, 
             u.nombre as revisado_por_nombre, u.apellido as revisado_por_apellido,
             a.nombre as almacen_nombre,
             e.codigo as envio_codigo
      FROM checklist_condiciones cc
      LEFT JOIN usuarios u ON cc.revisado_por = u.id
      LEFT JOIN almacenes a ON cc.almacen_id = a.id
      LEFT JOIN envios e ON cc.envio_id = e.id
      WHERE cc.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener checklist:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear checklist
const create = async (req, res) => {
  try {
    const {
      envio_id,
      almacen_id,
      estado_general,
      productos_completos,
      empaque_intacto,
      temperatura_adecuada,
      sin_danos_visibles,
      documentacion_completa,
      observaciones
    } = req.body;

    if (!envio_id) {
      return res.status(400).json({ error: 'Envío ID es requerido' });
    }

    // Verificar que el envío existe
    const envioCheck = await pool.query('SELECT id, almacen_destino_id FROM envios WHERE id = $1', [envio_id]);
    if (envioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    const almacenToUse = almacen_id || envioCheck.rows[0].almacen_destino_id;

    const result = await pool.query(`
      INSERT INTO checklist_condiciones (
        envio_id, almacen_id, revisado_por, estado_general,
        productos_completos, empaque_intacto, temperatura_adecuada,
        sin_danos_visibles, documentacion_completa, observaciones
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      envio_id, almacenToUse, req.user.id, estado_general,
      productos_completos, empaque_intacto, temperatura_adecuada,
      sin_danos_visibles, documentacion_completa, observaciones
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear checklist:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar checklist
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      estado_general,
      productos_completos,
      empaque_intacto,
      temperatura_adecuada,
      sin_danos_visibles,
      documentacion_completa,
      observaciones
    } = req.body;

    const result = await pool.query(`
      UPDATE checklist_condiciones 
      SET estado_general = COALESCE($1, estado_general),
          productos_completos = COALESCE($2, productos_completos),
          empaque_intacto = COALESCE($3, empaque_intacto),
          temperatura_adecuada = COALESCE($4, temperatura_adecuada),
          sin_danos_visibles = COALESCE($5, sin_danos_visibles),
          documentacion_completa = COALESCE($6, documentacion_completa),
          observaciones = COALESCE($7, observaciones)
      WHERE id = $8
      RETURNING *
    `, [
      estado_general, productos_completos, empaque_intacto,
      temperatura_adecuada, sin_danos_visibles, documentacion_completa,
      observaciones, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar checklist:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener resumen de condiciones por almacén
const getResumenPorAlmacen = async (req, res) => {
  try {
    const { almacenId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_revisiones,
        SUM(CASE WHEN estado_general = 'bueno' THEN 1 ELSE 0 END) as buenos,
        SUM(CASE WHEN estado_general = 'regular' THEN 1 ELSE 0 END) as regulares,
        SUM(CASE WHEN estado_general = 'malo' THEN 1 ELSE 0 END) as malos,
        SUM(CASE WHEN productos_completos = true THEN 1 ELSE 0 END) as productos_ok,
        SUM(CASE WHEN empaque_intacto = true THEN 1 ELSE 0 END) as empaque_ok,
        SUM(CASE WHEN sin_danos_visibles = true THEN 1 ELSE 0 END) as sin_danos
      FROM checklist_condiciones
      WHERE almacen_id = $1
    `, [almacenId]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener últimos checklists
const getRecientes = async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    
    const result = await pool.query(`
      SELECT cc.*, 
             e.codigo as envio_codigo,
             a.nombre as almacen_nombre,
             u.nombre as revisado_por_nombre, u.apellido as revisado_por_apellido
      FROM checklist_condiciones cc
      LEFT JOIN envios e ON cc.envio_id = e.id
      LEFT JOIN almacenes a ON cc.almacen_id = a.id
      LEFT JOIN usuarios u ON cc.revisado_por = u.id
      ORDER BY cc.fecha_revision DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener checklists recientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar checklist
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM checklist_condiciones WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Checklist no encontrado' });
    }

    res.json({ message: 'Checklist eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar checklist:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getAll,
  getByEnvio,
  getById,
  create,
  update,
  remove,
  getResumenPorAlmacen,
  getRecientes
};
