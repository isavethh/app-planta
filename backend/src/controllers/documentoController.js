const pool = require('../config/database');
const QRCode = require('qrcode');

const generarDocumentoHTML = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener envío completo
    const envioResult = await pool.query(`
      SELECT e.*, a.nombre as almacen_nombre
      FROM envios e
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      WHERE e.id = $1
    `, [id]);

    if (envioResult.rows.length === 0) {
      return res.status(404).send('<h1>Envío no encontrado</h1>');
    }

    const envio = envioResult.rows[0];
    
    // Obtener productos
    const productosResult = await pool.query(`
      SELECT ep.*
      FROM envio_productos ep
      WHERE ep.envio_id = $1
    `, [id]);
    
    // Generar QR
    const qrData = JSON.stringify({
      codigo: envio.codigo,
      type: 'ENVIO',
      envio_id: envio.id
    });
    const qrCode = await QRCode.toDataURL(qrData, { width: 200 });

    // Generar HTML
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documento de Envío - ${envio.codigo}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        .header .codigo {
            font-size: 32px;
            font-weight: bold;
            background: rgba(255,255,255,0.2);
            padding: 10px 20px;
            border-radius: 8px;
            display: inline-block;
            margin-top: 15px;
        }
        .content {
            padding: 30px;
        }
        .info-section {
            margin-bottom: 30px;
            border-left: 4px solid #4CAF50;
            padding: 15px;
            background: #f9f9f9;
        }
        .info-section h3 {
            color: #2E7D32;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .info-label {
            font-weight: bold;
            color: #666;
        }
        .info-value {
            color: #333;
        }
        .estado {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            color: white;
            text-transform: uppercase;
        }
        .estado.pendiente { background: #FF9800; }
        .estado.asignado { background: #2196F3; }
        .estado.en_transito { background: #9C27B0; }
        .estado.entregado { background: #4CAF50; }
        .productos-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .productos-table th {
            background: #4CAF50;
            color: white;
            padding: 12px;
            text-align: left;
        }
        .productos-table td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
        }
        .productos-table tbody tr:hover {
            background: #f5f5f5;
        }
        .totales {
            background: #E8F5E9;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        .totales .total-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            font-size: 18px;
        }
        .totales .total-final {
            font-size: 24px;
            font-weight: bold;
            color: #2E7D32;
            border-top: 3px solid #4CAF50;
            padding-top: 15px;
            margin-top: 10px;
        }
        .qr-section {
            text-align: center;
            padding: 30px;
            background: #f9f9f9;
            border-radius: 8px;
            margin: 30px 0;
        }
        .timeline {
            position: relative;
            padding: 20px 0;
        }
        .timeline-item {
            position: relative;
            padding-left: 40px;
            margin-bottom: 20px;
        }
        .timeline-item::before {
            content: '';
            position: absolute;
            left: 10px;
            top: 5px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #4CAF50;
        }
        .timeline-item::after {
            content: '';
            position: absolute;
            left: 15px;
            top: 17px;
            width: 2px;
            height: calc(100% + 20px);
            background: #ddd;
        }
        .timeline-item:last-child::after {
            display: none;
        }
        .timeline-title {
            font-weight: bold;
            color: #2E7D32;
            margin-bottom: 5px;
        }
        .timeline-date {
            color: #666;
            font-size: 14px;
        }
        .firma-box {
            border: 2px dashed #999;
            padding: 60px 20px;
            text-align: center;
            margin-top: 40px;
            border-radius: 8px;
        }
        .no-print { margin: 20px 0; }
        @media print {
            body { padding: 0; background: white; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📦 DOCUMENTO DE ENVÍO</h1>
            <div class="codigo">${envio.codigo}</div>
            <div style="margin-top: 15px;">
                <span class="estado ${envio.estado}">${envio.estado}</span>
            </div>
        </div>

        <div class="content">
            <!-- Información General -->
            <div class="info-section">
                <h3>📋 Información del Envío</h3>
                <div class="info-row">
                    <span class="info-label">Almacén Destino:</span>
                    <span class="info-value">${envio.almacen_nombre || 'No especificado'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Categoría:</span>
                    <span class="info-value">${envio.categoria || 'General'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Fecha de Creación:</span>
                    <span class="info-value">${new Date(envio.fecha_creacion).toLocaleDateString('es-ES')}</span>
                </div>
                ${envio.fecha_estimada_entrega ? `
                <div class="info-row">
                    <span class="info-label">Fecha Estimada de Entrega:</span>
                    <span class="info-value">${new Date(envio.fecha_estimada_entrega).toLocaleDateString('es-ES')} ${envio.hora_estimada || ''}</span>
                </div>
                ` : ''}
            </div>

            <!-- Timeline -->
            <div class="info-section">
                <h3>🕐 Timeline del Envío</h3>
                <div class="timeline">
                    <div class="timeline-item">
                        <div class="timeline-title">✅ Envío Creado</div>
                        <div class="timeline-date">${new Date(envio.created_at).toLocaleString('es-ES')}</div>
                    </div>
                    ${envio.fecha_asignacion ? `
                    <div class="timeline-item">
                        <div class="timeline-title">📋 Asignado a Transportista</div>
                        <div class="timeline-date">${new Date(envio.fecha_asignacion).toLocaleString('es-ES')}</div>
                    </div>
                    ` : ''}
                    ${envio.fecha_inicio_transito ? `
                    <div class="timeline-item">
                        <div class="timeline-title">🚚 Inicio de Tránsito</div>
                        <div class="timeline-date">${new Date(envio.fecha_inicio_transito).toLocaleString('es-ES')}</div>
                    </div>
                    ` : ''}
                    ${envio.fecha_entrega ? `
                    <div class="timeline-item">
                        <div class="timeline-title">✅ Entrega Completada</div>
                        <div class="timeline-date">${new Date(envio.fecha_entrega).toLocaleString('es-ES')}</div>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- Productos -->
            <div class="info-section">
                <h3>📦 Productos del Envío</h3>
                <table class="productos-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Peso Unit.</th>
                            <th>Precio Unit.</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productosResult.rows.map((p, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td><strong>${p.producto_nombre || 'Producto'}</strong></td>
                            <td>${p.cantidad} unidades</td>
                            <td>${parseFloat(p.peso_unitario || 0).toFixed(2)} kg</td>
                            <td>$${parseFloat(p.precio_unitario || 0).toFixed(2)}</td>
                            <td><strong>$${parseFloat(p.total_precio || 0).toFixed(2)}</strong></td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="totales">
                    <div class="total-row">
                        <span>Total Cantidad:</span>
                        <span><strong>${envio.total_cantidad || 0} unidades</strong></span>
                    </div>
                    <div class="total-row">
                        <span>Total Peso:</span>
                        <span><strong>${parseFloat(envio.total_peso || 0).toFixed(2)} kg</strong></span>
                    </div>
                    <div class="total-row total-final">
                        <span>TOTAL:</span>
                        <span>$${parseFloat(envio.total_precio || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <!-- Código QR -->
            <div class="qr-section">
                <h3 style="margin-bottom: 20px;">📱 Código QR del Envío</h3>
                <img src="${qrCode}" alt="QR Code" style="max-width: 250px;">
                <p style="margin-top: 15px; font-weight: bold; color: #2E7D32;">${envio.codigo}</p>
            </div>

            ${envio.observaciones ? `
            <div class="info-section">
                <h3>📝 Observaciones</h3>
                <p>${envio.observaciones}</p>
            </div>
            ` : ''}

            <!-- Firma -->
            <div class="firma-box">
                <p style="color: #999; margin-bottom: 60px;">FIRMA Y SELLO DE RECEPCIÓN</p>
                <div style="border-top: 2px solid #999; width: 300px; margin: 0 auto; padding-top: 10px;">
                    <p style="color: #666;">Nombre y Firma del Receptor</p>
                </div>
            </div>

            <div style="margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px; text-align: center;">
                <p style="color: #666;">
                    <strong>Sistema de Gestión de Planta</strong><br>
                    Documento generado automáticamente<br>
                    ${new Date().toLocaleString('es-ES')}
                </p>
            </div>
        </div>

        <div class="no-print" style="text-align: center; padding: 20px;">
            <button onclick="window.print()" style="background: #4CAF50; color: white; border: none; padding: 15px 30px; font-size: 16px; border-radius: 8px; cursor: pointer; margin-right: 10px;">
                🖨️ Imprimir Documento
            </button>
            <button onclick="window.close()" style="background: #666; color: white; border: none; padding: 15px 30px; font-size: 16px; border-radius: 8px; cursor: pointer;">
                ✖️ Cerrar
            </button>
        </div>
    </div>
</body>
</html>
    `;

    res.send(html);
  } catch (error) {
    console.error('Error al generar documento:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1 style="color: #F44336;">❌ Error</h1>
          <p>No se pudo generar el documento del envío</p>
          <p style="color: #999;">${error.message}</p>
        </body>
      </html>
    `);
  }
};

module.exports = {
  generarDocumentoHTML
};

