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
      SELECT ep.*, p.nombre as producto_nombre
      FROM envio_productos ep
      LEFT JOIN productos p ON ep.producto_id = p.id
      WHERE ep.envio_id = $1
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
    const { id } = req.params; // ID de la nota de venta

    // Obtener nota de venta
    const notaResult = await pool.query(`
      SELECT nv.*, e.codigo as envio_codigo
      FROM notas_venta nv
      LEFT JOIN envios e ON nv.envio_id = e.id
      WHERE nv.id = $1
    `, [id]);

    if (notaResult.rows.length === 0) {
      return res.status(404).send('<h1>Nota de venta no encontrada</h1>');
    }

    const nota = notaResult.rows[0];

    // Obtener productos del envío
    const productosResult = await pool.query(`
      SELECT ep.*, p.nombre as producto_nombre
      FROM envio_productos ep
      LEFT JOIN productos p ON ep.producto_id = p.id
      WHERE ep.envio_id = $1
    `, [nota.envio_id]);

    const productos = productosResult.rows;

    // Generar HTML profesional
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
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .header p {
            font-size: 18px;
            opacity: 0.9;
        }
        
        .info-section {
            padding: 30px;
            border-bottom: 2px solid #e0e0e0;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 20px;
        }
        
        .info-box {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #4CAF50;
        }
        
        .info-box label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: block;
            margin-bottom: 5px;
        }
        
        .info-box value {
            font-size: 16px;
            font-weight: 600;
            color: #333;
        }
        
        .productos-section {
            padding: 30px;
        }
        
        .section-title {
            font-size: 20px;
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #4CAF50;
        }
        
        .productos-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        .productos-table thead {
            background: #4CAF50;
            color: white;
        }
        
        .productos-table th {
            padding: 15px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 1px;
        }
        
        .productos-table td {
            padding: 15px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .productos-table tbody tr:hover {
            background: #f9f9f9;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .totales {
            margin-top: 20px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            font-size: 16px;
        }
        
        .total-row.grand-total {
            border-top: 2px solid #4CAF50;
            margin-top: 10px;
            padding-top: 15px;
            font-size: 24px;
            font-weight: 700;
            color: #4CAF50;
        }
        
        .footer {
            padding: 30px;
            background: #f9f9f9;
            text-align: center;
            border-top: 2px solid #e0e0e0;
        }
        
        .footer p {
            color: #666;
            font-size: 14px;
            margin: 5px 0;
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
        <!-- Header -->
        <div class="header">
            <h1>📄 Nota de Venta</h1>
            <p>${nota.numero_nota}</p>
        </div>
        
        <!-- Información General -->
        <div class="info-section">
            <h2 class="section-title">Información General</h2>
            <div class="info-grid">
                <div class="info-box">
                    <label>Fecha de Emisión</label>
                    <value>${new Date(nota.fecha_emision).toLocaleDateString('es-BO', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</value>
                </div>
                <div class="info-box">
                    <label>Código de Envío</label>
                    <value>${nota.envio_codigo}</value>
                </div>
                <div class="info-box">
                    <label>Cliente / Almacén</label>
                    <value>${nota.almacen_nombre || 'N/A'}</value>
                </div>
                <div class="info-box">
                    <label>Dirección</label>
                    <value>${nota.almacen_direccion || 'N/A'}</value>
                </div>
            </div>
        </div>
        
        <!-- Productos -->
        <div class="productos-section">
            <h2 class="section-title">Detalle de Productos</h2>
            <table class="productos-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th class="text-center">Cantidad</th>
                        <th class="text-right">Precio Unit.</th>
                        <th class="text-right">Peso (kg)</th>
                        <th class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${productos.map(p => `
                        <tr>
                            <td><strong>${p.producto_nombre || 'Producto'}</strong></td>
                            <td class="text-center">${p.cantidad}</td>
                            <td class="text-right">Bs. ${parseFloat(p.precio_unitario || 0).toFixed(2)}</td>
                            <td class="text-right">${parseFloat(p.peso_unitario || 0).toFixed(3)} kg</td>
                            <td class="text-right"><strong>Bs. ${parseFloat(p.total_precio || 0).toFixed(2)}</strong></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <!-- Totales -->
            <div class="totales">
                <div class="total-row">
                    <span>Cantidad Total de Productos:</span>
                    <strong>${nota.total_cantidad} unidades</strong>
                </div>
                <div class="total-row grand-total">
                    <span>TOTAL A PAGAR:</span>
                    <strong>Bs. ${parseFloat(nota.total_precio || 0).toFixed(2)}</strong>
                </div>
            </div>
        </div>
        
        ${nota.observaciones ? `
        <!-- Observaciones -->
        <div class="observaciones">
            <strong>⚠️ Observaciones:</strong>
            <p>${nota.observaciones}</p>
        </div>
        ` : ''}
        
        <!-- Footer -->
        <div class="footer">
            <p><strong>Planta Logística</strong></p>
            <p>Documento generado automáticamente el ${new Date().toLocaleString('es-BO')}</p>
            <p>Este documento es una nota de venta oficial del sistema</p>
        </div>
    </div>
</body>
</html>
    `;

    res.send(html);
  } catch (error) {
    console.error('❌ Error al generar nota de venta HTML:', error);
    res.status(500).send('<h1>Error al generar nota de venta</h1>');
  }
};

module.exports = {
  generarNotaVenta,
  generarNotaVentaHTML
};
