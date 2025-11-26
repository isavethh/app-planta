const pool = require('../config/database');

// ==================== DIRECCIONES ====================

const getDirecciones = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM direcciones WHERE activo = true ORDER BY nombre
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener direcciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getDireccionById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM direcciones WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dirección no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener dirección:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createDireccion = async (req, res) => {
  try {
    const { nombre, direccion_completa, ciudad, departamento, pais, latitud, longitud, referencia } = req.body;
    
    if (!nombre || !direccion_completa || !ciudad) {
      return res.status(400).json({ error: 'Nombre, dirección y ciudad son requeridos' });
    }

    const result = await pool.query(`
      INSERT INTO direcciones (nombre, direccion_completa, ciudad, departamento, pais, latitud, longitud, referencia)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [nombre, direccion_completa, ciudad, departamento || 'Santa Cruz', pais || 'Bolivia', latitud, longitud, referencia]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear dirección:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateDireccion = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, direccion_completa, ciudad, departamento, pais, latitud, longitud, referencia, activo } = req.body;

    const result = await pool.query(`
      UPDATE direcciones 
      SET nombre = COALESCE($1, nombre),
          direccion_completa = COALESCE($2, direccion_completa),
          ciudad = COALESCE($3, ciudad),
          departamento = COALESCE($4, departamento),
          pais = COALESCE($5, pais),
          latitud = COALESCE($6, latitud),
          longitud = COALESCE($7, longitud),
          referencia = COALESCE($8, referencia),
          activo = COALESCE($9, activo),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [nombre, direccion_completa, ciudad, departamento, pais, latitud, longitud, referencia, activo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dirección no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar dirección:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const deleteDireccion = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      UPDATE direcciones SET activo = false WHERE id = $1 RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Dirección no encontrada' });
    }

    res.json({ message: 'Dirección eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar dirección:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ==================== CATEGORÍAS Y PRODUCTOS ====================

const getCategorias = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias WHERE activo = true ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getProductos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.nombre as categoria_nombre 
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.activo = true 
      ORDER BY c.nombre, p.nombre
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getProductosByCategoria = async (req, res) => {
  try {
    const { categoriaId } = req.params;
    const result = await pool.query(`
      SELECT * FROM productos WHERE categoria_id = $1 AND activo = true ORDER BY nombre
    `, [categoriaId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener productos por categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.*, c.nombre as categoria_nombre 
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createProducto = async (req, res) => {
  try {
    const { nombre, codigo, categoria_id, descripcion } = req.body;
    
    if (!nombre || !codigo) {
      return res.status(400).json({ error: 'Nombre y código son requeridos' });
    }

    const result = await pool.query(`
      INSERT INTO productos (nombre, codigo, categoria_id, descripcion)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [nombre, codigo, categoria_id, descripcion]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, codigo, categoria_id, descripcion, activo } = req.body;

    const result = await pool.query(`
      UPDATE productos 
      SET nombre = COALESCE($1, nombre),
          codigo = COALESCE($2, codigo),
          categoria_id = COALESCE($3, categoria_id),
          descripcion = COALESCE($4, descripcion),
          activo = COALESCE($5, activo),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [nombre, codigo, categoria_id, descripcion, activo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      UPDATE productos SET activo = false WHERE id = $1 RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createCategoria = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre es requerido' });
    }

    const result = await pool.query(`
      INSERT INTO categorias (nombre, descripcion)
      VALUES ($1, $2)
      RETURNING *
    `, [nombre, descripcion]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ==================== TIPOS DE EMPAQUE ====================

const getTiposEmpaque = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tipos_empaque WHERE activo = true ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener tipos de empaque:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createTipoEmpaque = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre es requerido' });
    }

    const result = await pool.query(`
      INSERT INTO tipos_empaque (nombre, descripcion) VALUES ($1, $2) RETURNING *
    `, [nombre, descripcion]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear tipo de empaque:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateTipoEmpaque = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, activo } = req.body;

    const result = await pool.query(`
      UPDATE tipos_empaque 
      SET nombre = COALESCE($1, nombre),
          descripcion = COALESCE($2, descripcion),
          activo = COALESCE($3, activo),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [nombre, descripcion, activo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tipo de empaque no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar tipo de empaque:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ==================== UNIDADES DE MEDIDA ====================

const getUnidadesMedida = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM unidades_medida WHERE activo = true ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener unidades de medida:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createUnidadMedida = async (req, res) => {
  try {
    const { nombre, abreviatura, tipo } = req.body;
    if (!nombre || !abreviatura) {
      return res.status(400).json({ error: 'Nombre y abreviatura son requeridos' });
    }

    const result = await pool.query(`
      INSERT INTO unidades_medida (nombre, abreviatura, tipo) VALUES ($1, $2, $3) RETURNING *
    `, [nombre, abreviatura, tipo]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear unidad de medida:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ==================== TIPOS DE VEHÍCULO ====================

const getTiposVehiculo = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tipos_vehiculo WHERE activo = true ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener tipos de vehículo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createTipoVehiculo = async (req, res) => {
  try {
    const { nombre, descripcion, capacidad_kg, capacidad_m3 } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre es requerido' });
    }

    const result = await pool.query(`
      INSERT INTO tipos_vehiculo (nombre, descripcion, capacidad_kg, capacidad_m3) 
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [nombre, descripcion, capacidad_kg, capacidad_m3]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear tipo de vehículo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ==================== VEHÍCULOS ====================

const getVehiculos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*, tv.nombre as tipo_vehiculo_nombre, tv.capacidad_kg, tv.capacidad_m3
      FROM vehiculos v
      LEFT JOIN tipos_vehiculo tv ON v.tipo_vehiculo_id = tv.id
      WHERE v.activo = true
      ORDER BY v.placa
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener vehículos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getVehiculoById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT v.*, tv.nombre as tipo_vehiculo_nombre
      FROM vehiculos v
      LEFT JOIN tipos_vehiculo tv ON v.tipo_vehiculo_id = tv.id
      WHERE v.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener vehículo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createVehiculo = async (req, res) => {
  try {
    const { placa, marca, modelo, anio, tipo_vehiculo_id, color } = req.body;
    
    if (!placa) {
      return res.status(400).json({ error: 'Placa es requerida' });
    }

    const existingPlaca = await pool.query('SELECT id FROM vehiculos WHERE placa = $1', [placa]);
    if (existingPlaca.rows.length > 0) {
      return res.status(400).json({ error: 'La placa ya está registrada' });
    }

    const result = await pool.query(`
      INSERT INTO vehiculos (placa, marca, modelo, anio, tipo_vehiculo_id, color)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [placa, marca, modelo, anio, tipo_vehiculo_id, color]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear vehículo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateVehiculo = async (req, res) => {
  try {
    const { id } = req.params;
    const { placa, marca, modelo, anio, tipo_vehiculo_id, color, activo } = req.body;

    const result = await pool.query(`
      UPDATE vehiculos 
      SET placa = COALESCE($1, placa),
          marca = COALESCE($2, marca),
          modelo = COALESCE($3, modelo),
          anio = COALESCE($4, anio),
          tipo_vehiculo_id = COALESCE($5, tipo_vehiculo_id),
          color = COALESCE($6, color),
          activo = COALESCE($7, activo),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [placa, marca, modelo, anio, tipo_vehiculo_id, color, activo, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar vehículo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const deleteVehiculo = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      UPDATE vehiculos SET activo = false WHERE id = $1 RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehículo no encontrado' });
    }

    res.json({ message: 'Vehículo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar vehículo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ==================== PLANTA ====================

const getPlanta = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM planta LIMIT 1');
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error al obtener planta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updatePlanta = async (req, res) => {
  try {
    const { nombre, direccion, ciudad, departamento, pais, latitud, longitud, telefono, email } = req.body;

    const result = await pool.query(`
      UPDATE planta 
      SET nombre = COALESCE($1, nombre),
          direccion = COALESCE($2, direccion),
          ciudad = COALESCE($3, ciudad),
          departamento = COALESCE($4, departamento),
          pais = COALESCE($5, pais),
          latitud = COALESCE($6, latitud),
          longitud = COALESCE($7, longitud),
          telefono = COALESCE($8, telefono),
          email = COALESCE($9, email),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
      RETURNING *
    `, [nombre, direccion, ciudad, departamento, pais, latitud, longitud, telefono, email]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar planta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  // Direcciones
  getDirecciones,
  getDireccionById,
  createDireccion,
  updateDireccion,
  deleteDireccion,
  // Categorías y Productos
  getCategorias,
  createCategoria,
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
  getProductosByCategoria,
  // Tipos de Empaque
  getTiposEmpaque,
  createTipoEmpaque,
  updateTipoEmpaque,
  // Unidades de Medida
  getUnidadesMedida,
  createUnidadMedida,
  // Tipos de Vehículo
  getTiposVehiculo,
  createTipoVehiculo,
  // Vehículos
  getVehiculos,
  getVehiculoById,
  createVehiculo,
  updateVehiculo,
  deleteVehiculo,
  // Planta
  getPlanta,
  updatePlanta
};
