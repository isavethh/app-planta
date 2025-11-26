const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * Obtener lista de ALMACENES para dropdown de login
 * GET /api/public/almacenes-login
 */
router.get('/almacenes-login', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre
      FROM almacenes
      WHERE activo = true
      ORDER BY nombre
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener almacenes:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener almacenes: ' + error.message
    });
  }
});

/**
 * Obtener lista de TRANSPORTISTAS para dropdown de login
 * GET /api/public/transportistas-login
 */
router.get('/transportistas-login', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name as nombre, u.email, u.telefono, u.licencia
      FROM users u
      WHERE u.tipo = 'transportista'
      ORDER BY u.name
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener transportistas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener transportistas' 
    });
  }
});

/**
 * Login simplificado con ALMACÉN
 * POST /api/public/login-almacen
 */
router.post('/login-almacen', async (req, res) => {
  try {
    const { almacen_id } = req.body;

    if (!almacen_id) {
      return res.status(400).json({ 
        success: false,
        error: 'ID de almacén requerido' 
      });
    }

    const result = await pool.query(`
      SELECT id, nombre
      FROM almacenes
      WHERE id = $1 AND activo = true
    `, [almacen_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Almacén no encontrado' 
      });
    }

    const almacen = result.rows[0];

    res.json({
      success: true,
      data: {
        almacen: {
          id: almacen.id,
          nombre: almacen.nombre,
          tipo: 'almacen'
        },
        token: 'almacen-token-' + almacen.id
      }
    });
  } catch (error) {
    console.error('Error en login almacén:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Error en login: ' + error.message
    });
  }
});

/**
 * Login simplificado con TRANSPORTISTA
 * POST /api/public/login-transportista
 */
router.post('/login-transportista', async (req, res) => {
  try {
    const { transportista_id } = req.body;

    if (!transportista_id) {
      return res.status(400).json({ 
        success: false,
        error: 'ID de transportista requerido' 
      });
    }

    const result = await pool.query(`
      SELECT id, name as nombre, email, telefono, licencia
      FROM users
      WHERE id = $1 AND tipo = 'transportista'
    `, [transportista_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Transportista no encontrado' 
      });
    }

    const transportista = result.rows[0];

    res.json({
      success: true,
      data: {
        transportista: {
          id: transportista.id,
          nombre: transportista.nombre,
          email: transportista.email,
          telefono: transportista.telefono,
          licencia: transportista.licencia,
          tipo: 'transportista'
        },
        token: 'transportista-token-' + transportista.id
      }
    });
  } catch (error) {
    console.error('Error en login transportista:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error en login' 
    });
  }
});

/**
 * Obtener almacenes directo de PostgreSQL
 * GET /api/public/almacenes
 */
router.get('/almacenes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, activo
      FROM almacenes
      WHERE activo = true
      ORDER BY nombre
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener almacenes:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener almacenes: ' + error.message
    });
  }
});

/**
 * Obtener usuarios desde Laravel
 * GET /api/public/usuarios-laravel
 */
router.get('/usuarios-laravel', async (req, res) => {
  try {
    const axios = require('axios');
    const laravelUrl = process.env.LARAVEL_API_URL || 'http://localhost:8000/api';
    
    const response = await axios.get(`${laravelUrl}/usuarios`);
    
    res.json({
      success: true,
      data: response.data.data || response.data
    });
  } catch (error) {
    console.error('Error al obtener usuarios de Laravel:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener usuarios de Laravel' 
    });
  }
});

/**
 * Obtener envíos desde Laravel
 * GET /api/public/envios-laravel
 */
router.get('/envios-laravel', async (req, res) => {
  try {
    const axios = require('axios');
    const laravelUrl = process.env.LARAVEL_API_URL || 'http://localhost:8000/api';
    const { usuario_id } = req.query;
    
    const url = usuario_id 
      ? `${laravelUrl}/envios?usuario_id=${usuario_id}`
      : `${laravelUrl}/envios`;
    
    const response = await axios.get(url);
    
    res.json({
      success: true,
      data: response.data.data || response.data
    });
  } catch (error) {
    console.error('Error al obtener envíos de Laravel:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener envíos de Laravel' 
    });
  }
});

module.exports = router;

