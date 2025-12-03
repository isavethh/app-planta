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
             u.name as transportista_nombre,
             u.email as transportista_email,
             v.placa as vehiculo_placa
      FROM envios e
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      LEFT JOIN envio_asignaciones ae ON e.id = ae.envio_id
      LEFT JOIN users u ON ae.transportista_id = u.id
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
             a.latitud as destino_latitud,
             a.longitud as destino_longitud,
             -17.7833 as origen_latitud,
             -63.1821 as origen_longitud,
             ae.transportista_id,
             ae.vehiculo_id,
             ae.fecha_asignacion,
             ae.fecha_aceptacion,
             ae.observaciones as firma_transportista,
             u.name as transportista_nombre,
             u.email as transportista_email,
             v.placa as vehiculo_placa
      FROM envios e
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      LEFT JOIN envio_asignaciones ae ON e.id = ae.envio_id
      LEFT JOIN users u ON ae.transportista_id = u.id
      LEFT JOIN vehiculos v ON ae.vehiculo_id = v.id
      WHERE e.id = $1
    `, [id]);

    if (envioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    const envio = envioResult.rows[0];
    
    // Normalizar campo estado_nombre
    envio.estado_nombre = envio.estado;
    
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
             -17.7833 AS origen_lat,
             -63.1821 AS origen_lng,
             a.latitud AS destino_lat,
             a.longitud AS destino_lng
      FROM envios e
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      WHERE e.id = $1
    `, [id]);

    if (envioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Envío no encontrado' });
    }

    const envio = envioResult.rows[0];

    // Valores por defecto (Santa Cruz) si faltan coordenadas
    const origen_lat = parseFloat(envio.origen_lat) || -17.7833;
    const origen_lng = parseFloat(envio.origen_lng) || -63.1821;
    const destino_lat = parseFloat(envio.destino_lat) || -17.7892;
    const destino_lng = parseFloat(envio.destino_lng) || -63.1751;

    console.log(`🗺️ Obteniendo ruta real para envío ${id}...`);
    console.log(`   Origen: ${origen_lat}, ${origen_lng}`);
    console.log(`   Destino: ${destino_lat}, ${destino_lng}`);

    // Actualizar estado a en_transito si aún no lo está
    await pool.query(
      'UPDATE envios SET estado = $1, fecha_inicio_transito = COALESCE(fecha_inicio_transito, CURRENT_TIMESTAMP) WHERE id = $2',
      ['en_transito', id]
    );

    // Limpiar seguimiento anterior de este envío
    try {
      await pool.query('DELETE FROM seguimiento_envio WHERE envio_id = $1', [id]);
    } catch (err) {
      console.warn('No se pudo limpiar seguimiento previo:', err.message);
    }

    // Obtener ruta real usando OSRM (Open Source Routing Machine) - API gratuita
    let puntos = [];
    try {
      const fetch = require('node-fetch');
      // OSRM espera coordenadas en formato lng,lat (inverso a lo normal)
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origen_lng},${origen_lat};${destino_lng},${destino_lat}?overview=full&geometries=geojson`;
      
      console.log(`🌐 Consultando OSRM: ${osrmUrl}`);
      const response = await fetch(osrmUrl, { timeout: 10000 });
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const coordinates = data.routes[0].geometry.coordinates;
        console.log(`✅ OSRM devolvió ${coordinates.length} puntos de ruta`);

        // Reducir puntos si son demasiados (para animación más suave)
        // Tomamos máximo 50 puntos distribuidos uniformemente
        const maxPuntos = 50;
        const step = Math.max(1, Math.floor(coordinates.length / maxPuntos));
        
        for (let i = 0; i < coordinates.length; i += step) {
          const coord = coordinates[i];
          // OSRM devuelve [lng, lat], convertimos a lat, lng
          puntos.push({
            latitud: coord[1],
            longitud: coord[0],
            velocidad: (30 + Math.random() * 20).toFixed(2)
          });
        }
        
        // Asegurar que el último punto sea el destino exacto
        const lastCoord = coordinates[coordinates.length - 1];
        if (puntos.length > 0) {
          puntos[puntos.length - 1] = {
            latitud: lastCoord[1],
            longitud: lastCoord[0],
            velocidad: '0.00'
          };
        }

        console.log(`📍 Ruta optimizada a ${puntos.length} puntos`);
      } else {
        console.warn('⚠️ OSRM no devolvió ruta válida, usando interpolación');
      }
    } catch (osrmError) {
      console.warn('⚠️ Error consultando OSRM:', osrmError.message);
    }

    // Fallback: Si OSRM falla, crear ruta interpolada
    if (puntos.length === 0) {
      console.log('📍 Usando ruta interpolada como fallback');
      const pasos = 20;
      for (let i = 0; i <= pasos; i++) {
        const ratio = i / pasos;
        puntos.push({
          latitud: origen_lat + (destino_lat - origen_lat) * ratio,
          longitud: origen_lng + (destino_lng - origen_lng) * ratio,
          velocidad: (30 + Math.random() * 20).toFixed(2)
        });
      }
    }

    // Guardar puntos en la base de datos
    let puntosGuardados = 0;
    try {
      for (const punto of puntos) {
        await pool.query(`
          INSERT INTO seguimiento_envio (envio_id, latitud, longitud, velocidad)
          VALUES ($1, $2, $3, $4)
        `, [id, punto.latitud, punto.longitud, punto.velocidad]);
        puntosGuardados++;
      }
      console.log(`✅ ${puntosGuardados} puntos guardados en seguimiento_envio para envío ${id}`);
    } catch (dbError) {
      console.warn(`⚠️ Solo se guardaron ${puntosGuardados} puntos:`, dbError.message);
    }

    return res.json({
      success: true,
      message: 'Ruta real obtenida correctamente',
      puntos,
      puntosGuardados,
      rutaReal: puntos.length > 20, // Indica si es ruta real o interpolada
      origen: { lat: origen_lat, lng: origen_lng },
      destino: { lat: destino_lat, lng: destino_lng }
    });
  } catch (error) {
    console.error('❌ Error al simular movimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
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

    console.log(`✅ Envío ${id} iniciado (en_transito)`);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Error al iniciar envío:', error);
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

    console.log(`✅ Envío ${id} marcado como entregado`);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Error al marcar como entregado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Aceptar asignación de envío (transportista acepta)
const aceptarAsignacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { transportista_nombre, transportista_email } = req.body;

    // Verificar que el envío existe y obtener su estado con info del transportista
    const envioCheck = await pool.query(`
      SELECT e.estado, 
             ea.transportista_id,
             u.name as transportista_nombre_db,
             u.email as transportista_email_db
      FROM envios e
      LEFT JOIN envio_asignaciones ea ON e.id = ea.envio_id
      LEFT JOIN users u ON ea.transportista_id = u.id
      WHERE e.id = $1
    `, [id]);
    
    if (envioCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Envío no encontrado' });
    }

    const envioData = envioCheck.rows[0];
    const estadoActual = envioData.estado;

    // Usar datos enviados desde app o datos de BD
    const nombreFirma = transportista_nombre || envioData.transportista_nombre_db || 'Transportista';
    const emailFirma = transportista_email || envioData.transportista_email_db || 'sin@email.com';

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

    // Actualizar fecha_aceptacion y observaciones con firma en envio_asignaciones
    const fechaHora = new Date().toLocaleString('es-ES', { 
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const firmaTexto = `✍️ FIRMA DIGITAL DEL TRANSPORTISTA\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nNombre: ${nombreFirma}\nEmail: ${emailFirma}\nFecha y Hora: ${fechaHora}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nEl transportista acepta la responsabilidad de este envío.`;
    
    await pool.query(`
      UPDATE envio_asignaciones
      SET fecha_aceptacion = CURRENT_TIMESTAMP,
          observaciones = COALESCE(observaciones || E'\n\n', '') || $2
      WHERE envio_id = $1
    `, [id, firmaTexto]);

    console.log(`✅ Envío ${id} aceptado por ${nombreFirma}`);
    console.log(`📝 Firma registrada:\n${firmaTexto}`);

    // GENERAR NOTA DE VENTA AUTOMÁTICAMENTE
    let notaVentaInfo = null;
    try {
      console.log(`📄 Generando nota de venta para envío ${id}...`);
      const notaVentaController = require('./notaVentaController');
      const notaResult = await notaVentaController.generarNotaVenta(id);
      notaVentaInfo = {
        numero_nota: notaResult.nota.numero_nota,
        total_precio: notaResult.nota.total_precio,
        total_cantidad: notaResult.nota.total_cantidad
      };
      console.log(`✅ Nota de venta generada: ${notaResult.nota.numero_nota}`);
    } catch (notaError) {
      console.error('❌ Error al generar nota de venta:', notaError.message);
      // No falla la aceptación si falla la nota de venta
    }

    res.json({
      success: true,
      message: 'Envío aceptado correctamente. Firma digital registrada y nota de venta generada.',
      envio: result.rows[0],
      firma: firmaTexto,
      transportista: {
        nombre: nombreFirma,
        email: emailFirma,
        fecha_aceptacion: fechaHora
      },
      nota_venta: notaVentaInfo
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

// Obtener envíos por transportista (incluye envíos individuales Y rutas multi-entrega)
const getByTransportista = async (req, res) => {
  try {
    const { transportistaId } = req.params;

    console.log(`🔍 Buscando envíos para transportista ID: ${transportistaId}`);

    // 1. Obtener envíos individuales (asignación normal)
    const enviosIndividuales = await pool.query(`
      SELECT e.id, e.codigo, e.estado, e.fecha_estimada_entrega, e.hora_estimada, 
             e.total_cantidad, e.total_peso, e.total_precio, e.created_at,
             e.categoria, e.observaciones,
             e.fecha_inicio_transito, e.fecha_entrega,
             a.nombre as almacen_nombre,
             a.direccion_completa,
             a.latitud as destino_latitud,
             a.longitud as destino_longitud,
             -17.7833 as origen_latitud,
             -63.1821 as origen_longitud,
             'Planta Principal' as origen_nombre,
             ae.transportista_id,
             ae.vehiculo_id,
             ae.fecha_asignacion,
             v.placa as vehiculo_placa,
             v.marca as vehiculo_marca,
             v.modelo as vehiculo_modelo,
             FALSE as es_multi_entrega,
             NULL::integer as ruta_id,
             1 as total_envios_ruta
      FROM envios e
      INNER JOIN envio_asignaciones ae ON e.id = ae.envio_id
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      LEFT JOIN vehiculos v ON ae.vehiculo_id = v.id
      WHERE ae.transportista_id = $1
        AND e.estado IN ('pendiente', 'asignado', 'aceptado', 'en_transito', 'entregado')
        AND e.ruta_entrega_id IS NULL
      ORDER BY e.created_at DESC
    `, [transportistaId]);

    // 2. Obtener rutas multi-entrega asignadas al transportista
    const rutasMulti = await pool.query(`
      SELECT 
        r.id as ruta_id,
        r.codigo,
        r.estado,
        r.fecha as fecha_estimada_entrega,
        NULL as hora_estimada,
        r.total_envios as total_cantidad,
        r.total_peso,
        0 as total_precio,
        r.created_at,
        'multi-entrega' as categoria,
        r.observaciones,
        r.hora_salida as fecha_inicio_transito,
        r.hora_fin as fecha_entrega,
        'Múltiples destinos' as almacen_nombre,
        'Ruta con ' || r.total_envios || ' paradas' as direccion_completa,
        NULL as destino_latitud,
        NULL as destino_longitud,
        -17.7833 as origen_latitud,
        -63.1821 as origen_longitud,
        'Planta Principal' as origen_nombre,
        r.transportista_id,
        r.vehiculo_id,
        r.created_at as fecha_asignacion,
        v.placa as vehiculo_placa,
        v.marca as vehiculo_marca,
        v.modelo as vehiculo_modelo,
        TRUE as es_multi_entrega,
        r.id as id,
        r.total_envios as total_envios_ruta
      FROM rutas_entrega r
      LEFT JOIN vehiculos v ON r.vehiculo_id = v.id
      WHERE r.transportista_id = $1
        AND r.estado IN ('programada', 'aceptada', 'en_transito', 'completada')
      ORDER BY r.created_at DESC
    `, [transportistaId]);

    // Combinar resultados
    const todosLosEnvios = [...enviosIndividuales.rows, ...rutasMulti.rows];
    
    // Ordenar por estado (pendientes primero) y fecha
    todosLosEnvios.sort((a, b) => {
      const ordenEstado = {
        'programada': 0,
        'aceptada': 1,
        'asignado': 2,
        'aceptado': 3,
        'en_transito': 4,
        'entregado': 5,
        'completada': 5
      };
      const estadoA = ordenEstado[a.estado] ?? 5;
      const estadoB = ordenEstado[b.estado] ?? 5;
      if (estadoA !== estadoB) return estadoA - estadoB;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    console.log(`✅ Encontrados ${enviosIndividuales.rows.length} envíos individuales y ${rutasMulti.rows.length} rutas multi-entrega`);
    console.log(`📦 Total: ${todosLosEnvios.length} items para transportista ${transportistaId}`);
    
    res.json({ success: true, data: todosLosEnvios });
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

