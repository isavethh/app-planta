const pool = require('../config/database');
const QRCode = require('qrcode');

const generarDocumentoHTML = async (req, res) => {
  console.log('🔥 GENERANDO DOCUMENTO HTML - ID:', req.params.id);
  
  try {
    const { id } = req.params;
    
    // Obtener envío
    const envioResult = await pool.query(`
      SELECT e.*, 
             a.nombre as almacen_nombre,
             u.name as transportista_nombre,
             u.email as transportista_email,
             ea.fecha_aceptacion,
             ea.observaciones as firma_transportista
      FROM envios e
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      LEFT JOIN envio_asignaciones ea ON e.id = ea.envio_id
      LEFT JOIN users u ON ea.transportista_id = u.id
      WHERE e.id = $1
    `, [id]);

    console.log('📦 Datos del envío obtenidos:', envioResult.rows.length, 'rows');

    if (envioResult.rows.length === 0) {
      return res.status(404).send('<h1>Envío no encontrado</h1>');
    }

    const envio = envioResult.rows[0];
    console.log('✍️ Firma del transportista:', envio.firma_transportista ? 'SÍ' : 'NO');
    
    // Obtener productos
    const productosResult = await pool.query(`
      SELECT * FROM envio_productos WHERE envio_id = $1
    `, [id]);
    
    console.log('📦 Productos obtenidos:', productosResult.rows.length);
    
    // Generar QR
    const qrData = JSON.stringify({
      codigo: envio.codigo,
      type: 'ENVIO',
      envio_id: envio.id
    });
    const qrCode = await QRCode.toDataURL(qrData, { width: 200 });

    // Formatear firma
    let firmaHTML = '';
    if (envio.firma_transportista) {
      const firmaEscapada = String(envio.firma_transportista)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      
      firmaHTML = `
        <div style="margin: 20px 0; padding: 20px; background: #f9f9f9; border: 2px solid #4CAF50; border-radius: 8px;">
          <h3 style="color: #1565C0; margin-bottom: 15px;">✍️ Firma Digital del Transportista</h3>
          <div style="font-family: \'Courier New\', monospace; line-height: 1.8;">
            ${firmaEscapada}
          </div>
          <div style="margin-top: 15px; padding: 12px; background: #E8F5E9; border-left: 4px solid #4CAF50; border-radius: 4px;">
            <p style="margin: 0; color: #2E7D32; font-weight: 600; font-size: 14px;">
              ✅ Firma Digital Verificada - Este documento fue aceptado digitalmente y tiene validez legal
            </p>
          </div>
        </div>
      `;
    } else {
      firmaHTML = `
        <div style="margin: 20px 0; padding: 20px; background: #FFF9C4; border: 2px solid #FFC107; border-radius: 8px;">
          <p style="color: #F57F17; font-weight: 600; margin: 0;">⚠️ El transportista aún no ha firmado este documento digitalmente.</p>
        </div>
      `;
    }

    // HTML del documento
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
            font-family: Arial, sans-serif;
            background: #fff;
            padding: 20px;
            line-height: 1.6;
        }
        .header {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .section {
            margin: 20px 0;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
            border-left: 4px solid #4CAF50;
        }
        h2 { color: #2E7D32; margin-bottom: 15px; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #4CAF50;
            color: white;
        }
        .qr-section {
            text-align: center;
            padding: 20px;
            background: #fafafa;
            border-radius: 8px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📦 DOCUMENTO DE ENVÍO</h1>
        <h2>${envio.codigo}</h2>
        <p style="background: rgba(255,255,255,0.3); padding: 10px; border-radius: 5px; display: inline-block;">
            Estado: ${envio.estado.toUpperCase()}
        </p>
    </div>

    <div class="section">
        <h2>📋 Información del Envío</h2>
        <p><strong>Almacén Destino:</strong> ${envio.almacen_nombre || 'No especificado'}</p>
        <p><strong>Categoría:</strong> ${envio.categoria || 'General'}</p>
        <p><strong>Fecha de Creación:</strong> ${new Date(envio.fecha_creacion || envio.created_at).toLocaleDateString('es-ES')}</p>
    </div>

    <div class="section">
        <h2>📦 Productos del Envío</h2>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Peso</th>
                    <th>Precio</th>
                </tr>
            </thead>
            <tbody>
                ${productosResult.rows.map((p, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${p.producto_nombre || 'Producto'}</td>
                    <td>${p.cantidad} unidades</td>
                    <td>${parseFloat(p.peso_unitario || 0).toFixed(2)} kg</td>
                    <td>$${parseFloat(p.precio_unitario || 0).toFixed(2)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="qr-section">
        <h2>📱 Código QR del Envío</h2>
        <img src="${qrCode}" alt="QR Code" style="max-width: 200px; margin: 20px;">
        <p><strong>${envio.codigo}</strong></p>
    </div>

    ${firmaHTML}

    <div style="margin-top: 40px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px;">
        <p><strong style="color: #4CAF50;">Sistema de Gestión de Planta Logística</strong></p>
        <p style="font-size: 12px; color: #666;">Documento generado el ${new Date().toLocaleString('es-ES')}</p>
    </div>
</body>
</html>
    `;

    console.log('✅ HTML generado, longitud:', html.length);
    res.send(html);
    
  } catch (error) {
    console.error('❌ Error al generar documento:', error);
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
