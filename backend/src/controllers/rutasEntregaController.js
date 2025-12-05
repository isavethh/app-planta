const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const notaVentaController = require('./notaVentaController');

// Configurar multer para subir fotos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads/evidencias');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `evidencia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes'));
    }
});

// ==================== RUTAS DE ENTREGA ====================

// Crear nueva ruta multi-entrega
async function crearRuta(req, res) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { transportista_id, vehiculo_id, envios_ids, fecha } = req.body;
        
        if (!transportista_id || !vehiculo_id || !envios_ids || !envios_ids.length) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren transportista, vehículo y al menos un envío'
            });
        }

        // Generar código único
        const fecha_codigo = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        const codigo = `RUTA-${fecha_codigo}-${random}`;

        // Crear la ruta principal
        const rutaResult = await client.query(`
            INSERT INTO rutas_entrega (
                codigo, transportista_id, vehiculo_id, fecha, 
                estado, total_envios
            )
            VALUES ($1, $2, $3, $4, 'programada', $5)
            RETURNING *
        `, [codigo, transportista_id, vehiculo_id, fecha || new Date(), envios_ids.length]);

        const ruta = rutaResult.rows[0];

        // Obtener coordenadas de cada envío para ordenar por distancia
        const enviosData = await client.query(`
            SELECT e.id, e.codigo, 
                   a.latitud::float as lat, a.longitud::float as lng,
                   a.nombre as destino_nombre, a.direccion_completa as destino_direccion
            FROM envios e
            JOIN almacenes a ON e.almacen_destino_id = a.id
            WHERE e.id = ANY($1)
        `, [envios_ids]);

        // Crear paradas en el orden proporcionado
        let totalPeso = 0;
        for (let i = 0; i < envios_ids.length; i++) {
            const envioId = envios_ids[i];
            const envioData = enviosData.rows.find(e => e.id == envioId);
            
            // Obtener peso del envío
            const pesoResult = await client.query(`
                SELECT COALESCE(SUM(total_peso), 0) as peso FROM envio_productos WHERE envio_id = $1
            `, [envioId]);
            totalPeso += parseFloat(pesoResult.rows[0].peso || 0);

            await client.query(`
                INSERT INTO ruta_paradas (
                    ruta_entrega_id, envio_id, orden, estado,
                    latitud, longitud
                )
                VALUES ($1, $2, $3, 'pendiente', $4, $5)
            `, [
                ruta.id, envioId, i + 1,
                envioData?.lat, envioData?.lng
            ]);

            // Actualizar envío con referencia a la ruta
            await client.query(`
                UPDATE envios SET ruta_entrega_id = $1 WHERE id = $2
            `, [ruta.id, envioId]);
        }

        // Actualizar peso total
        await client.query(`
            UPDATE rutas_entrega SET total_peso = $1 WHERE id = $2
        `, [totalPeso, ruta.id]);

        await client.query('COMMIT');

        // Obtener ruta completa con paradas
        const rutaCompleta = await obtenerRutaCompleta(ruta.id);

        res.json({
            success: true,
            message: 'Ruta creada exitosamente',
            ruta: rutaCompleta
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al crear ruta:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear ruta',
            error: error.message
        });
    } finally {
        client.release();
    }
}

// Obtener ruta completa con todas las relaciones
async function obtenerRutaCompleta(rutaId) {
    const rutaResult = await pool.query(`
        SELECT r.*,
               u.name as transportista_nombre,
               u.telefono as transportista_telefono,
               u.email as transportista_email,
               v.placa as vehiculo_placa,
               tv.nombre as vehiculo_tipo
        FROM rutas_entrega r
        LEFT JOIN users u ON r.transportista_id = u.id
        LEFT JOIN vehiculos v ON r.vehiculo_id = v.id
        LEFT JOIN tamano_vehiculos tv ON v.tamano_vehiculo_id = tv.id
        WHERE r.id = $1
    `, [rutaId]);

    if (rutaResult.rows.length === 0) return null;

    const ruta = rutaResult.rows[0];

    // Obtener paradas
    const paradasResult = await pool.query(`
        SELECT p.*,
               e.codigo as envio_codigo,
               e.estado as envio_estado,
               e.total_peso as envio_peso,
               e.total_cantidad as envio_cantidad
        FROM ruta_paradas p
        JOIN envios e ON p.envio_id = e.id
        WHERE p.ruta_entrega_id = $1
        ORDER BY p.orden ASC
    `, [rutaId]);

    ruta.paradas = paradasResult.rows;

    // Obtener checklists
    const checklistsResult = await pool.query(`
        SELECT * FROM checklists WHERE ruta_entrega_id = $1
    `, [rutaId]);
    ruta.checklists = checklistsResult.rows;

    return ruta;
}

// Obtener ruta por ID
async function obtenerRuta(req, res) {
    try {
        const { id } = req.params;
        const ruta = await obtenerRutaCompleta(id);
        
        if (!ruta) {
            return res.status(404).json({
                success: false,
                message: 'Ruta no encontrada'
            });
        }

        res.json({
            success: true,
            ruta
        });
    } catch (error) {
        console.error('Error al obtener ruta:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener ruta',
            error: error.message
        });
    }
}

// Listar rutas por transportista
async function listarRutasPorTransportista(req, res) {
    try {
        const { transportista_id } = req.params;
        
        const result = await pool.query(`
            SELECT r.*,
                   v.placa as vehiculo_placa,
                   tv.nombre as vehiculo_tipo,
                   (SELECT COUNT(*) FROM ruta_paradas WHERE ruta_entrega_id = r.id) as total_paradas,
                   (SELECT COUNT(*) FROM ruta_paradas WHERE ruta_entrega_id = r.id AND estado = 'entregado') as paradas_completadas
            FROM rutas_entrega r
            LEFT JOIN vehiculos v ON r.vehiculo_id = v.id
            LEFT JOIN tamano_vehiculos tv ON v.tamano_vehiculo_id = tv.id
            WHERE r.transportista_id = $1
            ORDER BY r.created_at DESC
        `, [transportista_id]);

        res.json({
            success: true,
            rutas: result.rows
        });
    } catch (error) {
        console.error('Error al listar rutas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al listar rutas',
            error: error.message
        });
    }
}

// Listar todas las rutas (admin)
async function listarTodasRutas(req, res) {
    try {
        const { estado, fecha } = req.query;
        
        let query = `
            SELECT r.*,
                   u.name as transportista_nombre,
                   v.placa as vehiculo_placa,
                   tv.nombre as vehiculo_tipo,
                   (SELECT COUNT(*) FROM ruta_paradas WHERE ruta_entrega_id = r.id) as total_paradas,
                   (SELECT COUNT(*) FROM ruta_paradas WHERE ruta_entrega_id = r.id AND estado = 'entregado') as paradas_completadas
            FROM rutas_entrega r
            LEFT JOIN users u ON r.transportista_id = u.id
            LEFT JOIN vehiculos v ON r.vehiculo_id = v.id
            LEFT JOIN tamano_vehiculos tv ON v.tamano_vehiculo_id = tv.id
            WHERE 1=1
        `;
        const params = [];

        if (estado) {
            params.push(estado);
            query += ` AND r.estado = $${params.length}`;
        }

        if (fecha) {
            params.push(fecha);
            query += ` AND r.fecha::date = $${params.length}::date`;
        }

        query += ' ORDER BY r.created_at DESC';

        const result = await pool.query(query, params);

        res.json({
            success: true,
            rutas: result.rows
        });
    } catch (error) {
        console.error('Error al listar rutas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al listar rutas',
            error: error.message
        });
    }
}

// ==================== CHECKLISTS ====================

// Items predefinidos del checklist de salida
const CHECKLIST_SALIDA_ITEMS = [
    { id: 'vehiculo_limpio', label: 'Vehículo limpio y en buen estado', tipo: 'boolean' },
    { id: 'documentos_completos', label: 'Documentos de carga completos', tipo: 'boolean' },
    { id: 'productos_verificados', label: 'Productos verificados y contados', tipo: 'boolean' },
    { id: 'productos_bien_cargados', label: 'Productos bien asegurados en el vehículo', tipo: 'boolean' },
    { id: 'refrigeracion_ok', label: 'Sistema de refrigeración funcionando (si aplica)', tipo: 'boolean' },
    { id: 'combustible_suficiente', label: 'Combustible suficiente para la ruta', tipo: 'boolean' },
    { id: 'gps_funcionando', label: 'GPS/App de tracking funcionando', tipo: 'boolean' },
    { id: 'observaciones', label: 'Observaciones adicionales', tipo: 'text' }
];

// Items predefinidos del checklist de entrega
const CHECKLIST_ENTREGA_ITEMS = [
    { id: 'productos_completos', label: 'Todos los productos entregados', tipo: 'boolean' },
    { id: 'productos_buen_estado', label: 'Productos en buen estado', tipo: 'boolean' },
    { id: 'cantidad_correcta', label: 'Cantidad correcta verificada', tipo: 'boolean' },
    { id: 'documentos_firmados', label: 'Documentos de entrega firmados', tipo: 'boolean' },
    { id: 'foto_entrega', label: 'Foto de entrega tomada', tipo: 'boolean' },
    { id: 'receptor_identificado', label: 'Receptor identificado correctamente', tipo: 'boolean' },
    { id: 'observaciones', label: 'Observaciones de entrega', tipo: 'text' }
];

// Obtener template de checklist
async function obtenerTemplateChecklist(req, res) {
    try {
        const { tipo } = req.params;
        
        const items = tipo === 'salida' ? CHECKLIST_SALIDA_ITEMS : CHECKLIST_ENTREGA_ITEMS;
        
        res.json({
            success: true,
            tipo,
            items
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener template',
            error: error.message
        });
    }
}

// Guardar checklist completado
async function guardarChecklist(req, res) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { 
            ruta_entrega_id, 
            ruta_parada_id, 
            envio_id, 
            tipo, 
            datos, 
            firma_base64 
        } = req.body;

        if (!tipo || !datos) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren tipo y datos del checklist'
            });
        }

        // Insertar checklist
        const result = await client.query(`
            INSERT INTO checklists (
                ruta_parada_id, ruta_entrega_id, envio_id, 
                tipo, datos, firma_base64, completado
            )
            VALUES ($1, $2, $3, $4, $5, $6, true)
            RETURNING *
        `, [
            ruta_parada_id || null,
            ruta_entrega_id || null,
            envio_id || null,
            tipo,
            JSON.stringify(datos),
            firma_base64 || null
        ]);

        const checklist = result.rows[0];

        // NOTA: El cambio de estado a 'en_transito' se hace en iniciarRuta, no aquí
        // para mantener el flujo: guardarChecklist -> iniciarRuta

        // Si es checklist de entrega, actualizar estado de la parada
        if (tipo === 'entrega' && ruta_parada_id) {
            await client.query(`
                UPDATE ruta_paradas 
                SET estado = 'entregado', hora_entrega = NOW()
                WHERE id = $1
            `, [ruta_parada_id]);

            // Actualizar envío
            if (envio_id) {
                await client.query(`
                    UPDATE envios SET estado = 'entregado', fecha_entrega = NOW()
                    WHERE id = $1
                `, [envio_id]);
            }

            // Verificar si todas las paradas están completadas
            const estadoParadas = await client.query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END) as completadas
                FROM ruta_paradas
                WHERE ruta_entrega_id = (SELECT ruta_entrega_id FROM ruta_paradas WHERE id = $1)
            `, [ruta_parada_id]);

            if (estadoParadas.rows[0].total == estadoParadas.rows[0].completadas) {
                // Ruta completada
                await client.query(`
                    UPDATE rutas_entrega 
                    SET estado = 'completada', hora_fin = NOW()
                    WHERE id = (SELECT ruta_entrega_id FROM ruta_paradas WHERE id = $1)
                `, [ruta_parada_id]);
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Checklist guardado exitosamente',
            checklist
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al guardar checklist:', error);
        res.status(500).json({
            success: false,
            message: 'Error al guardar checklist',
            error: error.message
        });
    } finally {
        client.release();
    }
}

// Guardar checklist con rutaId en la URL (wrapper para compatibilidad)
async function guardarChecklistConRutaId(req, res) {
    // Agregar el ruta_entrega_id del parámetro URL al body
    req.body.ruta_entrega_id = parseInt(req.params.id);
    
    // Llamar a la función original
    return guardarChecklist(req, res);
}

// Obtener checklist por ruta o parada
async function obtenerChecklist(req, res) {
    try {
        const { tipo, ruta_id, parada_id } = req.query;
        
        let query = 'SELECT * FROM checklists WHERE 1=1';
        const params = [];

        if (tipo) {
            params.push(tipo);
            query += ` AND tipo = $${params.length}`;
        }
        if (ruta_id) {
            params.push(ruta_id);
            query += ` AND ruta_entrega_id = $${params.length}`;
        }
        if (parada_id) {
            params.push(parada_id);
            query += ` AND ruta_parada_id = $${params.length}`;
        }

        const result = await pool.query(query, params);

        res.json({
            success: true,
            checklists: result.rows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener checklists',
            error: error.message
        });
    }
}

// ==================== EVIDENCIAS ====================

// Subir evidencia (foto)
async function subirEvidencia(req, res) {
    try {
        const { ruta_parada_id, checklist_id, tipo, nombre } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se recibió ninguna imagen'
            });
        }

        const url = `/uploads/evidencias/${req.file.filename}`;

        const result = await pool.query(`
            INSERT INTO evidencias_entrega (ruta_parada_id, checklist_id, tipo, nombre, url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [ruta_parada_id || null, checklist_id || null, tipo || 'foto', nombre || 'Evidencia', url]);

        res.json({
            success: true,
            message: 'Evidencia subida exitosamente',
            evidencia: result.rows[0]
        });
    } catch (error) {
        console.error('Error al subir evidencia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al subir evidencia',
            error: error.message
        });
    }
}

// Guardar evidencia en base64
async function guardarEvidenciaBase64(req, res) {
    try {
        // Aceptar parámetros de URL o del body
        const ruta_parada_id = req.params.parada_id || req.body.ruta_parada_id;
        const { checklist_id, tipo, nombre } = req.body;
        // Aceptar tanto 'base64' como 'imagen_base64'
        const base64 = req.body.base64 || req.body.imagen_base64;

        if (!base64) {
            return res.status(400).json({
                success: false,
                message: 'No se recibió imagen en base64'
            });
        }

        const result = await pool.query(`
            INSERT INTO evidencias_entrega (ruta_parada_id, checklist_id, tipo, nombre, base64)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [ruta_parada_id || null, checklist_id || null, tipo || 'foto', nombre || 'Evidencia', base64]);

        res.json({
            success: true,
            message: 'Evidencia guardada exitosamente',
            evidencia: result.rows[0]
        });
    } catch (error) {
        console.error('Error al guardar evidencia:', error);
        res.status(500).json({
            success: false,
            message: 'Error al guardar evidencia',
            error: error.message
        });
    }
}

// Obtener evidencias
async function obtenerEvidencias(req, res) {
    try {
        const { parada_id, checklist_id } = req.query;
        
        let query = 'SELECT * FROM evidencias_entrega WHERE 1=1';
        const params = [];

        if (parada_id) {
            params.push(parada_id);
            query += ` AND ruta_parada_id = $${params.length}`;
        }
        if (checklist_id) {
            params.push(checklist_id);
            query += ` AND checklist_id = $${params.length}`;
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);

        res.json({
            success: true,
            evidencias: result.rows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener evidencias',
            error: error.message
        });
    }
}

// ==================== PARADAS ====================

// Actualizar estado de parada (llegada)
async function registrarLlegada(req, res) {
    try {
        const { parada_id } = req.params;
        const { lat, lng } = req.body;

        console.log(`[registrarLlegada] parada_id: ${parada_id}, lat: ${lat}, lng: ${lng}`);

        const result = await pool.query(`
            UPDATE ruta_paradas 
            SET estado = 'en_destino', 
                hora_llegada = NOW()
            WHERE id = $1
            RETURNING *
        `, [parada_id]);

        console.log(`[registrarLlegada] Resultado:`, result.rows);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Parada no encontrada'
            });
        }

        // Actualizar envío si existe
        if (result.rows[0].envio_id) {
            await pool.query(`
                UPDATE envios SET estado = 'en_destino'
                WHERE id = $1
            `, [result.rows[0].envio_id]);
        }

        res.json({
            success: true,
            message: 'Llegada registrada',
            parada: result.rows[0]
        });
    } catch (error) {
        console.error('[registrarLlegada] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar llegada',
            error: error.message
        });
    }
}

// Completar entrega de parada
async function completarEntrega(req, res) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { parada_id } = req.params;
        const { 
            nombre_receptor, 
            cargo_receptor, 
            dni_receptor,
            firma_base64,
            observaciones 
        } = req.body;

        // Actualizar parada
        const paradaResult = await client.query(`
            UPDATE ruta_paradas 
            SET estado = 'entregado', 
                hora_entrega = NOW(),
                nombre_receptor = $2,
                cargo_receptor = $3,
                dni_receptor = $4,
                observaciones = $5
            WHERE id = $1
            RETURNING *
        `, [parada_id, nombre_receptor, cargo_receptor, dni_receptor, observaciones]);

        if (paradaResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Parada no encontrada'
            });
        }

        const parada = paradaResult.rows[0];

        // Actualizar envío
        await client.query(`
            UPDATE envios SET estado = 'entregado', fecha_entrega = NOW()
            WHERE id = $1
        `, [parada.envio_id]);

        // Crear checklist de entrega
        await client.query(`
            INSERT INTO checklists (
                ruta_parada_id, ruta_entrega_id, envio_id, 
                tipo, datos, firma_base64, completado
            )
            VALUES ($1, $2, $3, 'entrega', $4, $5, true)
        `, [
            parada_id,
            parada.ruta_entrega_id,
            parada.envio_id,
            JSON.stringify({
                nombre_receptor,
                cargo_receptor,
                dni_receptor,
                observaciones,
                fecha_entrega: new Date().toISOString()
            }),
            firma_base64
        ]);

        // Generar nota de venta automáticamente para el envío de la parada
        try {
            await notaVentaController.generarNotaVenta(parada.envio_id);
            console.log(`✅ Nota de venta generada para envío ${parada.envio_id} (ruta múltiple)`);
        } catch (notaError) {
            console.error(`⚠️ Error al generar nota de venta para envío ${parada.envio_id}:`, notaError.message);
            // No bloqueamos la entrega si falla la nota de venta
        }

        // Verificar si ruta completada
        const estadoParadas = await client.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END) as completadas
            FROM ruta_paradas
            WHERE ruta_entrega_id = $1
        `, [parada.ruta_entrega_id]);

        let rutaCompletada = false;
        if (estadoParadas.rows[0].total == estadoParadas.rows[0].completadas) {
            await client.query(`
                UPDATE rutas_entrega 
                SET estado = 'completada', hora_fin = NOW()
                WHERE id = $1
            `, [parada.ruta_entrega_id]);
            rutaCompletada = true;
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Entrega completada exitosamente',
            parada,
            rutaCompletada
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al completar entrega:', error);
        res.status(500).json({
            success: false,
            message: 'Error al completar entrega',
            error: error.message
        });
    } finally {
        client.release();
    }
}

// Reordenar paradas
async function reordenarParadas(req, res) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { ruta_id } = req.params;
        const { paradas } = req.body; // Array de { id, orden }

        for (const parada of paradas) {
            await client.query(`
                UPDATE ruta_paradas SET orden = $2 WHERE id = $1
            `, [parada.id, parada.orden]);
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Paradas reordenadas exitosamente'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({
            success: false,
            message: 'Error al reordenar paradas',
            error: error.message
        });
    } finally {
        client.release();
    }
}

// ==================== RESUMEN Y ESTADÍSTICAS ====================

// Obtener resumen de ruta
async function obtenerResumenRuta(req, res) {
    try {
        const { id } = req.params;

        // Datos de la ruta
        const rutaResult = await pool.query(`
            SELECT r.*,
                   u.name as transportista_nombre,
                   u.telefono as transportista_telefono,
                   v.placa as vehiculo_placa,
                   tv.nombre as vehiculo_tipo
            FROM rutas_entrega r
            LEFT JOIN users u ON r.transportista_id = u.id
            LEFT JOIN vehiculos v ON r.vehiculo_id = v.id
            LEFT JOIN tamano_vehiculos tv ON v.tamano_vehiculo_id = tv.id
            WHERE r.id = $1
        `, [id]);

        if (rutaResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ruta no encontrada' });
        }

        const ruta = rutaResult.rows[0];

        // Paradas con detalles
        const paradasResult = await pool.query(`
            SELECT p.*,
                   e.codigo as envio_codigo,
                   e.total_peso, e.total_cantidad, e.total_precio,
                   a.nombre as almacen_nombre, 
                   COALESCE(a.direccion_completa, a.direccion, '') as almacen_direccion
            FROM ruta_paradas p
            JOIN envios e ON p.envio_id = e.id
            JOIN almacenes a ON e.almacen_destino_id = a.id
            WHERE p.ruta_entrega_id = $1
            ORDER BY p.orden
        `, [id]);

        // Checklists
        const checklistsResult = await pool.query(`
            SELECT * FROM checklists WHERE ruta_entrega_id = $1
        `, [id]);

        // Evidencias
        const evidenciasResult = await pool.query(`
            SELECT e.* FROM evidencias_entrega e
            JOIN ruta_paradas p ON e.ruta_parada_id = p.id
            WHERE p.ruta_entrega_id = $1
        `, [id]);

        // Calcular tiempos
        let tiempoTotal = null;
        if (ruta.hora_salida && ruta.hora_fin) {
            const salida = new Date(ruta.hora_salida);
            const fin = new Date(ruta.hora_fin);
            tiempoTotal = Math.round((fin - salida) / (1000 * 60)); // minutos
        }

        res.json({
            success: true,
            resumen: {
                ruta,
                paradas: paradasResult.rows,
                checklists: checklistsResult.rows,
                evidencias: evidenciasResult.rows,
                estadisticas: {
                    total_paradas: paradasResult.rows.length,
                    paradas_completadas: paradasResult.rows.filter(p => p.estado === 'entregado').length,
                    tiempo_total_minutos: tiempoTotal,
                    total_peso: ruta.total_peso,
                    total_envios: ruta.total_envios
                }
            }
        });
    } catch (error) {
        console.error('Error al obtener resumen:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener resumen',
            error: error.message
        });
    }
}

// Dashboard estadísticas generales
async function obtenerEstadisticasRutas(req, res) {
    try {
        const { fecha_inicio, fecha_fin } = req.query;
        
        let whereClause = '';
        const params = [];

        if (fecha_inicio && fecha_fin) {
            params.push(fecha_inicio, fecha_fin);
            whereClause = 'WHERE r.fecha BETWEEN $1 AND $2';
        }

        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_rutas,
                SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as rutas_completadas,
                SUM(CASE WHEN estado = 'en_transito' THEN 1 ELSE 0 END) as rutas_en_transito,
                SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as rutas_pendientes,
                SUM(total_envios) as total_envios,
                SUM(total_peso) as total_peso,
                AVG(EXTRACT(EPOCH FROM (hora_fin - hora_salida)) / 60) as promedio_tiempo_minutos
            FROM rutas_entrega r
            ${whereClause}
        `, params);

        // Rutas activas (últimas 24 horas) con conteo de paradas
        const rutasActivas = await pool.query(`
            SELECT r.*, 
                   u.name as transportista,
                   (SELECT COUNT(*) FROM ruta_paradas WHERE ruta_entrega_id = r.id) as total_paradas,
                   (SELECT COUNT(*) FROM ruta_paradas WHERE ruta_entrega_id = r.id AND estado = 'entregado') as paradas_completadas
            FROM rutas_entrega r
            JOIN users u ON r.transportista_id = u.id
            WHERE r.estado = 'en_transito'
            ORDER BY r.hora_salida DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            estadisticas: stats.rows[0],
            rutasActivas: rutasActivas.rows
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
}

// Iniciar ruta (checklist de salida completado)
async function iniciarRuta(req, res) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { checklist_datos, firma_base64 } = req.body;

        // Verificar que la ruta existe y está pendiente
        const rutaResult = await client.query(`
            SELECT * FROM rutas_entrega WHERE id = $1
        `, [id]);

        if (rutaResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Ruta no encontrada'
            });
        }

        const estadoActual = rutaResult.rows[0].estado;
        // La ruta puede estar 'pendiente' o 'aceptada' para poder iniciarla
        if (estadoActual !== 'pendiente' && estadoActual !== 'aceptada') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `La ruta no puede iniciarse. Estado actual: ${estadoActual}`
            });
        }

        // Solo guardar checklist si se proporcionan datos (para compatibilidad)
        if (checklist_datos && firma_base64) {
            await client.query(`
                INSERT INTO checklists (
                    ruta_entrega_id, tipo, datos, firma_base64, completado
                )
                VALUES ($1, 'salida', $2, $3, true)
            `, [id, JSON.stringify(checklist_datos), firma_base64]);
        }

        // Actualizar ruta
        await client.query(`
            UPDATE rutas_entrega 
            SET estado = 'en_transito', hora_salida = NOW()
            WHERE id = $1
        `, [id]);

        // Actualizar todos los envíos asociados a esta ruta
        await client.query(`
            UPDATE envios 
            SET estado = 'en_transito', fecha_inicio_transito = NOW()
            WHERE id IN (
                SELECT envio_id FROM ruta_paradas WHERE ruta_entrega_id = $1
            )
        `, [id]);

        await client.query('COMMIT');

        const rutaActualizada = await obtenerRutaCompleta(id);

        res.json({
            success: true,
            message: 'Ruta iniciada exitosamente',
            ruta: rutaActualizada
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al iniciar ruta:', error);
        res.status(500).json({
            success: false,
            message: 'Error al iniciar ruta',
            error: error.message
        });
    } finally {
        client.release();
    }
}

// Aceptar ruta multi-entrega (transportista acepta)
async function aceptarRuta(req, res) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { transportista_nombre, transportista_email } = req.body;

        // Verificar que la ruta existe
        const rutaResult = await client.query(`
            SELECT r.*, u.name as transportista_nombre_db, u.email as transportista_email_db
            FROM rutas_entrega r
            LEFT JOIN users u ON r.transportista_id = u.id
            WHERE r.id = $1
        `, [id]);

        if (rutaResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Ruta no encontrada'
            });
        }

        const ruta = rutaResult.rows[0];

        // Si ya está aceptada
        if (ruta.estado === 'aceptada' || ruta.estado === 'en_transito') {
            await client.query('ROLLBACK');
            return res.json({
                success: true,
                message: 'La ruta ya fue aceptada anteriormente',
                yaAceptado: true
            });
        }

        // Solo permitir aceptar si está programada
        if (ruta.estado !== 'programada') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `No se puede aceptar una ruta en estado "${ruta.estado}"`
            });
        }

        // Datos para la firma
        const nombreFirma = transportista_nombre || ruta.transportista_nombre_db || 'Transportista';
        const emailFirma = transportista_email || ruta.transportista_email_db || 'sin@email.com';
        const fechaHora = new Date().toLocaleString('es-ES', { 
            timeZone: 'America/La_Paz',
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        // Actualizar estado de la ruta a aceptada
        await client.query(`
            UPDATE rutas_entrega 
            SET estado = 'aceptada',
                observaciones = COALESCE(observaciones, '') || $2
            WHERE id = $1
        `, [id, `\n✍️ Aceptado por ${nombreFirma} el ${fechaHora}`]);

        // Actualizar estado de todos los envíos de la ruta
        await client.query(`
            UPDATE envios 
            SET estado = 'aceptado'
            WHERE ruta_entrega_id = $1
        `, [id]);

        await client.query('COMMIT');

        console.log(`✅ Ruta ${id} aceptada por ${nombreFirma}`);

        res.json({
            success: true,
            message: 'Ruta multi-entrega aceptada correctamente',
            transportista: {
                nombre: nombreFirma,
                email: emailFirma,
                fecha_aceptacion: fechaHora
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al aceptar ruta:', error);
        res.status(500).json({
            success: false,
            message: 'Error al aceptar ruta',
            error: error.message
        });
    } finally {
        client.release();
    }
}

// Rechazar ruta multi-entrega
async function rechazarRuta(req, res) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { id } = req.params;
        const { motivo } = req.body;

        // Verificar que la ruta existe
        const rutaResult = await client.query(`
            SELECT * FROM rutas_entrega WHERE id = $1
        `, [id]);

        if (rutaResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Ruta no encontrada'
            });
        }

        const ruta = rutaResult.rows[0];

        // Solo permitir rechazar si está programada
        if (ruta.estado !== 'programada') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `No se puede rechazar una ruta en estado "${ruta.estado}"`
            });
        }

        // Actualizar estado de la ruta a rechazada
        await client.query(`
            UPDATE rutas_entrega 
            SET estado = 'rechazada',
                observaciones = COALESCE(observaciones, '') || $2
            WHERE id = $1
        `, [id, `\n❌ Rechazada: ${motivo || 'Sin motivo especificado'}`]);

        // Devolver envíos a estado pendiente y quitar de la ruta
        await client.query(`
            UPDATE envios 
            SET estado = 'pendiente', ruta_entrega_id = NULL
            WHERE ruta_entrega_id = $1
        `, [id]);

        // Eliminar paradas de la ruta
        await client.query(`
            DELETE FROM ruta_paradas WHERE ruta_entrega_id = $1
        `, [id]);

        await client.query('COMMIT');

        console.log(`❌ Ruta ${id} rechazada. Motivo: ${motivo}`);

        res.json({
            success: true,
            message: 'Ruta rechazada. Los envíos volverán a estar disponibles para asignación.',
            motivo: motivo
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al rechazar ruta:', error);
        res.status(500).json({
            success: false,
            message: 'Error al rechazar ruta',
            error: error.message
        });
    } finally {
        client.release();
    }
}

// ==================== UBICACIÓN EN TIEMPO REAL ====================

// Almacenamiento en memoria para ubicaciones (en producción usar Redis)
const ubicacionesActivas = new Map();

// Actualizar ubicación de una ruta (desde la app móvil)
async function actualizarUbicacion(req, res) {
    try {
        const { id } = req.params;
        const { latitud, longitud, parada_actual_index, en_simulacion, timestamp } = req.body;

        console.log(`📍 [Ubicación] Ruta ${id}: lat=${latitud}, lng=${longitud}, parada=${parada_actual_index}`);

        // Guardar en memoria
        ubicacionesActivas.set(parseInt(id), {
            ruta_id: parseInt(id),
            latitud: parseFloat(latitud),
            longitud: parseFloat(longitud),
            parada_actual_index: parada_actual_index || 0,
            en_simulacion: en_simulacion || false,
            timestamp: timestamp || new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        
        console.log(`📍 [Ubicación] Total rutas activas: ${ubicacionesActivas.size}`);

        // También actualizar en la base de datos para persistencia
        await pool.query(`
            UPDATE rutas_entrega 
            SET ultima_latitud = $2, 
                ultima_longitud = $3,
                ultima_actualizacion = NOW()
            WHERE id = $1
        `, [id, latitud, longitud]);

        // Emitir evento WebSocket para actualización en tiempo real
        const io = req.app.get('io');
        if (io) {
            io.emit('ubicacion-actualizada', {
                ruta_id: parseInt(id),
                latitud: parseFloat(latitud),
                longitud: parseFloat(longitud),
                parada_actual_index,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: 'Ubicación actualizada'
        });
    } catch (error) {
        console.error('❌ Error al actualizar ubicación:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar ubicación',
            error: error.message
        });
    }
}

// Obtener ubicación actual de una ruta
async function obtenerUbicacion(req, res) {
    try {
        const { id } = req.params;
        
        // Primero intentar desde memoria (más reciente)
        const ubicacionMemoria = ubicacionesActivas.get(parseInt(id));
        
        if (ubicacionMemoria) {
            return res.json({
                success: true,
                ubicacion: ubicacionMemoria,
                fuente: 'memoria'
            });
        }

        // Si no está en memoria, buscar en DB
        const result = await pool.query(`
            SELECT id, ultima_latitud, ultima_longitud, ultima_actualizacion
            FROM rutas_entrega 
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Ruta no encontrada'
            });
        }

        const ruta = result.rows[0];

        res.json({
            success: true,
            ubicacion: {
                ruta_id: ruta.id,
                latitud: ruta.ultima_latitud,
                longitud: ruta.ultima_longitud,
                timestamp: ruta.ultima_actualizacion
            },
            fuente: 'base_datos'
        });
    } catch (error) {
        console.error('Error al obtener ubicación:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener ubicación',
            error: error.message
        });
    }
}

// Obtener todas las ubicaciones activas (para monitoreo)
async function obtenerUbicacionesActivas(req, res) {
    try {
        const ubicaciones = Array.from(ubicacionesActivas.values());
        
        console.log(`📡 [Monitoreo] Solicitando ubicaciones activas: ${ubicaciones.length} encontradas`);
        if (ubicaciones.length > 0) {
            ubicaciones.forEach(u => {
                console.log(`   🚚 Ruta ${u.ruta_id}: lat=${u.latitud?.toFixed(4)}, lng=${u.longitud?.toFixed(4)}`);
            });
        }
        
        res.json({
            success: true,
            ubicaciones,
            total: ubicaciones.length
        });
    } catch (error) {
        console.error('❌ Error al obtener ubicaciones activas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener ubicaciones activas',
            error: error.message
        });
    }
}

module.exports = {
    // Rutas
    crearRuta,
    obtenerRuta,
    listarRutasPorTransportista,
    listarTodasRutas,
    iniciarRuta,
    obtenerResumenRuta,
    aceptarRuta,
    rechazarRuta,
    
    // Paradas
    registrarLlegada,
    completarEntrega,
    reordenarParadas,
    
    // Checklists
    obtenerTemplateChecklist,
    guardarChecklist,
    guardarChecklistConRutaId,
    obtenerChecklist,
    
    // Evidencias
    subirEvidencia,
    guardarEvidenciaBase64,
    obtenerEvidencias,
    upload,
    
    // Ubicación en tiempo real
    actualizarUbicacion,
    obtenerUbicacion,
    obtenerUbicacionesActivas,
    
    // Estadísticas
    obtenerEstadisticasRutas
};
