const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar almacenamiento de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/incidentes');
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'incidente-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif)'));
    }
  }
});

// Crear tabla de incidentes si no existe
const crearTablaIncidentes = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS incidentes (
        id SERIAL PRIMARY KEY,
        envio_id INTEGER REFERENCES envios(id),
        tipo_incidente VARCHAR(50) NOT NULL,
        descripcion TEXT NOT NULL,
        foto_url VARCHAR(500),
        estado VARCHAR(20) DEFAULT 'pendiente',
        fecha_reporte TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_resolucion TIMESTAMP,
        notas_resolucion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla incidentes verificada/creada');
  } catch (error) {
    console.error('Error al crear tabla incidentes:', error);
  }
};

// Ejecutar al iniciar
crearTablaIncidentes();

// POST /api/incidentes - Crear nuevo incidente
router.post('/', upload.single('foto'), async (req, res) => {
  try {
    const { envio_id, tipo_incidente, descripcion } = req.body;
    
    console.log('📨 Recibiendo reporte de incidente:', { envio_id, tipo_incidente });
    
    if (!envio_id || !tipo_incidente || !descripcion) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos (envio_id, tipo_incidente, descripcion)'
      });
    }

    // URL de la foto si se subió
    let fotoUrl = null;
    if (req.file) {
      fotoUrl = `/uploads/incidentes/${req.file.filename}`;
      console.log('📷 Foto guardada:', fotoUrl);
    }

    // Insertar incidente en la base de datos
    const result = await pool.query(`
      INSERT INTO incidentes (envio_id, tipo_incidente, descripcion, foto_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [envio_id, tipo_incidente, descripcion, fotoUrl]);

    console.log('✅ Incidente registrado:', result.rows[0].id);

    res.json({
      success: true,
      incidente: result.rows[0],
      message: 'Incidente registrado correctamente'
    });

  } catch (error) {
    console.error('❌ Error al crear incidente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar el incidente'
    });
  }
});

// GET /api/incidentes - Listar todos los incidentes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, e.codigo as envio_codigo, a.nombre as almacen_nombre
      FROM incidentes i
      LEFT JOIN envios e ON i.envio_id = e.id
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      ORDER BY i.fecha_reporte DESC
    `);

    res.json({
      success: true,
      incidentes: result.rows
    });
  } catch (error) {
    console.error('Error al listar incidentes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener incidentes'
    });
  }
});

// GET /api/incidentes/envio/:envioId - Incidentes de un envío específico
router.get('/envio/:envioId', async (req, res) => {
  try {
    const { envioId } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM incidentes
      WHERE envio_id = $1
      ORDER BY fecha_reporte DESC
    `, [envioId]);

    res.json({
      success: true,
      incidentes: result.rows
    });
  } catch (error) {
    console.error('Error al obtener incidentes del envío:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener incidentes'
    });
  }
});

// PUT /api/incidentes/:id/resolver - Marcar incidente como resuelto
router.put('/:id/resolver', async (req, res) => {
  try {
    const { id } = req.params;
    const { notas_resolucion } = req.body;

    const result = await pool.query(`
      UPDATE incidentes 
      SET estado = 'resuelto', 
          fecha_resolucion = CURRENT_TIMESTAMP,
          notas_resolucion = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id, notas_resolucion || '']);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Incidente no encontrado'
      });
    }

    res.json({
      success: true,
      incidente: result.rows[0]
    });
  } catch (error) {
    console.error('Error al resolver incidente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al resolver incidente'
    });
  }
});

module.exports = router;
