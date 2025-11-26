const bcrypt = require('bcryptjs');
const pool = require('../config/database');

// Obtener todos los usuarios
const getAll = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.nombre, u.apellido, u.telefono, u.activo, 
             u.created_at, u.updated_at, r.id as rol_id, r.nombre as rol_nombre
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener usuario por ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT u.id, u.email, u.nombre, u.apellido, u.telefono, u.activo, 
             u.created_at, u.updated_at, r.id as rol_id, r.nombre as rol_nombre
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Crear usuario
const create = async (req, res) => {
  try {
    const { email, password, nombre, apellido, telefono, rol_id } = req.body;

    if (!email || !password || !nombre || !apellido) {
      return res.status(400).json({ error: 'Email, contraseña, nombre y apellido son requeridos' });
    }

    // Verificar si el email ya existe
    const existingUser = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(`
      INSERT INTO usuarios (email, password, nombre, apellido, telefono, rol_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, nombre, apellido, telefono, rol_id, activo, created_at
    `, [email, hashedPassword, nombre, apellido, telefono, rol_id]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Actualizar usuario
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, nombre, apellido, telefono, rol_id, activo } = req.body;

    // Verificar si el usuario existe
    const existingUser = await pool.query('SELECT id FROM usuarios WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar si el nuevo email ya existe en otro usuario
    if (email) {
      const emailExists = await pool.query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [email, id]);
      if (emailExists.rows.length > 0) {
        return res.status(400).json({ error: 'El email ya está en uso por otro usuario' });
      }
    }

    const result = await pool.query(`
      UPDATE usuarios 
      SET email = COALESCE($1, email),
          nombre = COALESCE($2, nombre),
          apellido = COALESCE($3, apellido),
          telefono = COALESCE($4, telefono),
          rol_id = COALESCE($5, rol_id),
          activo = COALESCE($6, activo),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING id, email, nombre, apellido, telefono, rol_id, activo, updated_at
    `, [email, nombre, apellido, telefono, rol_id, activo, id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Eliminar usuario (soft delete)
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE usuarios SET activo = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener todos los roles
const getRoles = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roles ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener roles:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getRoles
};
