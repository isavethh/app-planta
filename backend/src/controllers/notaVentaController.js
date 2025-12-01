const pool = require('../config/database');

const generarNotaVenta = async (envioId) => {
  try {
    // Obtener datos del envío con productos
    const envioResult = await pool.query(`
      SELECT e.*, 
             a.nombre as almacen_nombre,
             a.direccion_completa as almacen_direccion
      FROM envios e
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      WHERE e.id = $1
    `, [envioId]);

    if (envioResult.rows.length === 0) {
      throw new Error('Envío no encontrado');
    }

    const envio = envioResult.rows[0];

    // Obtener productos del envío
    const productosResult = await pool.query(`
      SELECT 
        producto_nombre,
        cantidad,
        precio_unitario,
        peso_unitario,
        total_peso,
        total_precio
      FROM envio_productos
      WHERE envio_id = $1
    `, [envioId]);

    const productos = productosResult.rows;

    // Generar número de nota de venta
    const fechaActual = new Date();
    const numeroNota = `NV-${fechaActual.getFullYear()}${String(fechaActual.getMonth() + 1).padStart(2, '0')}${String(fechaActual.getDate()).padStart(2, '0')}-${envio.codigo.split('-').pop()}`;

    // Insertar nota de venta
    const notaResult = await pool.query(`
      INSERT INTO notas_venta (
        numero_nota,
        envio_id,
        fecha_emision,
        almacen_nombre,
        almacen_direccion,
        total_cantidad,
        total_precio,
        observaciones
      )
      VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      numeroNota,
      envioId,
      envio.almacen_nombre,
      envio.almacen_direccion,
      envio.total_cantidad,
      envio.total_precio,
      envio.observaciones
    ]);

    console.log(`✅ Nota de venta ${numeroNota} generada para envío ${envio.codigo}`);
    
    return {
      nota: notaResult.rows[0],
      envio,
      productos
    };
  } catch (error) {
    console.error('❌ Error al generar nota de venta:', error);
    throw error;
  }
};

const generarNotaVentaHTML = async (req, res) => {
  try {
    const { id } = req.params; // ID del ENVÍO (no de la nota)

    console.log('📄 Generando nota de venta HTML para envío:', id);

    // Obtener nota de venta por envio_id
    const notaResult = await pool.query(`
      SELECT nv.*, 
             e.codigo as envio_codigo,
             e.estado as envio_estado,
             a.nombre as almacen_nombre,
             a.direccion_completa as almacen_direccion,
             u.name as transportista_nombre,
             u.email as transportista_email,
             ea.fecha_aceptacion,
             ea.observaciones as firma_transportista
      FROM notas_venta nv
      INNER JOIN envios e ON nv.envio_id = e.id
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      LEFT JOIN envio_asignaciones ea ON e.id = ea.envio_id
      LEFT JOIN users u ON ea.transportista_id = u.id
      WHERE nv.envio_id = $1
      ORDER BY nv.created_at DESC
      LIMIT 1
    `, [id]);

    if (notaResult.rows.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial; text-align: center; padding: 50px; }
              .error { color: #F44336; }
            </style>
          </head>
          <body>
            <h1 class="error">⚠️ Nota de Venta No Encontrada</h1>
            <p>No existe una nota de venta para este envío.</p>
            <p style="color: #666; font-size: 14px;">ID del envío: ${id}</p>
          </body>
        </html>
      `);
    }

    const nota = notaResult.rows[0];

    console.log('✅ Nota de venta encontrada:', nota.numero_nota);

    // Obtener productos del envío
    const productosResult = await pool.query(`
      SELECT 
        producto_nombre,
        cantidad,
        precio_unitario,
        peso_unitario,
        total_peso,
        total_precio
      FROM envio_productos
      WHERE envio_id = $1
    `, [id]);

    const productos = productosResult.rows;

    console.log('📦 Productos encontrados:', productos.length);

    // Calcular totales
    const subtotal = parseFloat(nota.subtotal || nota.total_precio || 0);
    const ivaPercentaje = parseFloat(nota.porcentaje_iva || 13);
    const iva = (subtotal * ivaPercentaje) / 100;
    const total = subtotal + iva;

    // Generar HTML profesional y formal
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nota de Venta - ${nota.numero_nota}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            padding: 0;
            background: #ffffff;
            color: #333;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        .header {
            border-bottom: 3px solid #2E7D32;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .company-info {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .company-name {
            font-size: 28px;
            font-weight: 700;
            color: #2E7D32;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 5px;
        }
        
        .company-subtitle {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .document-title {
            background: #2E7D32;
            color: white;
            padding: 15px 30px;
            text-align: center;
            margin: 20px 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 3px;
        }
        
        .document-number {
            text-align: center;
            font-size: 18px;
            font-weight: 600;
            color: #2E7D32;
            margin-bottom: 30px;
            letter-spacing: 1px;
        }
        
        .info-section {
            margin-bottom: 30px;
            border: 2px solid #e0e0e0;
            border-radius: 5px;
            overflow: hidden;
        }
        
        .info-header {
            background: #f5f5f5;
            padding: 12px 20px;
            border-bottom: 2px solid #e0e0e0;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 13px;
            color: #2E7D32;
            letter-spacing: 1px;
        }
        
        .info-content {
            padding: 20px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .info-row:last-child {
            border-bottom: none;
        }
        
        .info-label {
            font-size: 13px;
            color: #666;
            font-weight: 600;
            min-width: 180px;
        }
        
        .info-value {
            font-size: 14px;
            color: #333;
            font-weight: 400;
            text-align: right;
        }
        
        .section-title {
            background: #f5f5f5;
            padding: 12px 20px;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 13px;
            color: #2E7D32;
            letter-spacing: 1px;
            margin: 30px 0 20px 0;
            border-left: 4px solid #2E7D32;
        }
        
        .productos-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            border: 2px solid #e0e0e0;
        }
        
        .productos-table thead {
            background: #2E7D32;
            color: white;
        }
        
        .productos-table th {
            padding: 12px 15px;
            text-align: left;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
            border-right: 1px solid #388E3C;
        }
        
        .productos-table th:last-child {
            border-right: none;
        }
        
        .productos-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 13px;
        }
        
        .productos-table tbody tr {
            background: white;
        }
        
        .productos-table tbody tr:nth-child(even) {
            background: #f9f9f9;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .totales-container {
            margin-top: 30px;
            border: 2px solid #2E7D32;
            background: #f5f5f5;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 20px;
            border-bottom: 1px solid #d0d0d0;
            font-size: 14px;
        }
        
        .total-row:last-child {
            border-bottom: none;
        }
        
        .total-label {
            font-weight: 600;
            color: #333;
        }
        
        .total-value {
            font-weight: 700;
            color: #333;
        }
        
        .grand-total {
            background: #2E7D32;
            color: white !important;
            font-size: 18px;
            font-weight: 700;
        }
        
        .grand-total .total-label,
        .grand-total .total-value {
            color: white;
        }
        
        .firma-section {
            margin-top: 40px;
            padding: 20px;
            background: #E8F5E9;
            border: 2px solid #4CAF50;
            border-radius: 5px;
        }
        
        .firma-title {
            font-size: 14px;
            font-weight: 700;
            color: #2E7D32;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .firma-content {
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.8;
            color: #333;
            white-space: pre-line;
        }
        
        .firma-badge {
            display: inline-block;
            background: #4CAF50;
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            margin-top: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 3px solid #2E7D32;
            text-align: center;
        }
        
        .footer-note {
            color: #666;
            font-size: 11px;
            line-height: 1.6;
            margin: 8px 0;
        }
        
        .footer-company {
            font-weight: 700;
            color: #2E7D32;
            font-size: 14px;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .observaciones {
            padding: 20px;
            background: #fff8e1;
            border-left: 4px solid #ffc107;
            margin: 20px 30px;
            border-radius: 4px;
        }
        
        .observaciones strong {
            color: #f57c00;
            display: block;
            margin-bottom: 10px;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .container {
                box-shadow: none;
            }
        }
        
        @media (max-width: 600px) {
            .info-grid {
                grid-template-columns: 1fr;
            }
            
            .productos-table {
                font-size: 12px;
            }
            
            .productos-table th,
            .productos-table td {
                padding: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Encabezado de la Empresa -->
        <div class="header">
            <div class="company-info">
                <div class="company-name">🌿 PLANTA LOGÍSTICA</div>
                <div class="company-subtitle">Sistema de Gestión y Control de Envíos</div>
            </div>
        </div>
        
        <!-- Título del Documento -->
        <div class="document-title">NOTA DE VENTA</div>
        <div class="document-number">N° ${nota.numero_nota}</div>
        
        <!-- Información del Documento -->
        <div class="info-section">
            <div class="info-header">📋 INFORMACIÓN DEL DOCUMENTO</div>
            <div class="info-content">
                <div class="info-row">
                    <span class="info-label">Fecha de Emisión:</span>
                    <span class="info-value">${new Date(nota.fecha_emision || nota.created_at).toLocaleDateString('es-BO', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Código de Envío:</span>
                    <span class="info-value">${nota.envio_codigo}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Estado del Envío:</span>
                    <span class="info-value">${(nota.envio_estado || 'pendiente').toUpperCase()}</span>
                </div>
            </div>
        </div>
        
        <!-- Información del Cliente -->
        <div class="info-section">
            <div class="info-header">🏢 DATOS DEL CLIENTE / ALMACÉN</div>
            <div class="info-content">
                <div class="info-row">
                    <span class="info-label">Nombre / Razón Social:</span>
                    <span class="info-value">${nota.almacen_nombre || 'No especificado'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Ubicación:</span>
                    <span class="info-value">${nota.almacen_direccion || 'No especificada'}</span>
                </div>
                ${nota.transportista_nombre ? `
                <div class="info-row">
                    <span class="info-label">Transportista Asignado:</span>
                    <span class="info-value">${nota.transportista_nombre}</span>
                </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Detalle de Productos -->
        <h2 class="section-title">📦 DETALLE DE PRODUCTOS</h2>
        <table class="productos-table">
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 40%;">DESCRIPCIÓN</th>
                    <th style="width: 15%;" class="text-center">CANTIDAD</th>
                    <th style="width: 15%;" class="text-right">PRECIO UNIT.</th>
                    <th style="width: 10%;" class="text-right">PESO (KG)</th>
                    <th style="width: 15%;" class="text-right">TOTAL</th>
                </tr>
            </thead>
            <tbody>
                ${productos.map((p, index) => `
                    <tr>
                        <td class="text-center">${index + 1}</td>
                        <td><strong>${p.producto_nombre || 'Producto sin nombre'}</strong></td>
                        <td class="text-center">${p.cantidad} uds.</td>
                        <td class="text-right">Bs. ${parseFloat(p.precio_unitario || 0).toFixed(2)}</td>
                        <td class="text-right">${parseFloat(p.peso_unitario || 0).toFixed(2)}</td>
                        <td class="text-right"><strong>Bs. ${parseFloat(p.total_precio || 0).toFixed(2)}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <!-- Totales -->
        <div class="totales-container">
            <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span class="total-value">Bs. ${subtotal.toFixed(2)}</span>
            </div>
            <div class="total-row">
                <span class="total-label">IVA (${ivaPercentaje}%):</span>
                <span class="total-value">Bs. ${iva.toFixed(2)}</span>
            </div>
            <div class="total-row grand-total">
                <span class="total-label">TOTAL A PAGAR:</span>
                <span class="total-value">Bs. ${total.toFixed(2)}</span>
            </div>
        </div>
        
        ${nota.firma_transportista ? `
        <!-- Firma Digital del Transportista -->
        <div class="firma-section">
            <div class="firma-title">✍️ FIRMA DIGITAL DEL TRANSPORTISTA</div>
            <div class="firma-content">${String(nota.firma_transportista)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
            }</div>
            <div class="firma-badge">✓ DOCUMENTO FIRMADO DIGITALMENTE</div>
        </div>
        ` : ''}
        
        <!-- Footer -->
        <div class="footer">
            <p class="footer-company">🌿 PLANTA LOGÍSTICA</p>
            <p class="footer-note">Documento generado automáticamente el ${new Date().toLocaleString('es-BO', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p class="footer-note">Este documento constituye una Nota de Venta oficial del sistema.</p>
            <p class="footer-note">Para consultas o aclaraciones, contacte con el departamento de logística.</p>
        </div>
    </div>
</body>
</html>
    `;

    res.send(html);
  } catch (error) {
    console.error('❌ Error al generar nota de venta HTML:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial; 
              text-align: center; 
              padding: 50px;
              background: #f5f5f5;
            }
            .error { 
              color: #F44336; 
              font-size: 24px;
              margin-bottom: 20px;
            }
            .details {
              background: white;
              padding: 20px;
              border-radius: 8px;
              max-width: 600px;
              margin: 0 auto;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <h1 class="error">⚠️ Error al Generar Nota de Venta</h1>
          <div class="details">
            <p>No se pudo generar el documento de nota de venta.</p>
            <p style="color: #666; font-size: 14px; margin-top: 15px;">
              <strong>Detalle del error:</strong><br>
              ${error.message}
            </p>
          </div>
        </body>
      </html>
    `);
  }
};

module.exports = {
  generarNotaVenta,
  generarNotaVentaHTML
};
