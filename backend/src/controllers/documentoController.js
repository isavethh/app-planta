const pool = require('../config/database');
const QRCode = require('qrcode');

const generarDocumentoHTML = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener envío completo con firma del transportista
    const envioResult = await pool.query(`
      SELECT e.*, 
             a.nombre as almacen_nombre,
             u.name as transportista_nombre,
             u.email as transportista_email,
             ea.fecha_aceptacion
      FROM envios e
      LEFT JOIN almacenes a ON e.almacen_destino_id = a.id
      LEFT JOIN envio_asignaciones ea ON e.id = ea.envio_id
      LEFT JOIN users u ON ea.transportista_id = u.id
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #ffffff;
            padding: 0;
            line-height: 1.6;
            font-size: 16px;
        }
        .container {
            max-width: 100%;
            margin: 0;
            background: white;
            box-shadow: none;
            border-radius: 0;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 50%, #2E7D32 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
            position: relative;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            opacity: 0;
        }
        .header h1 {
            font-size: 24px;
            margin-bottom: 12px;
            font-weight: 700;
            position: relative;
            z-index: 1;
        }
        .header .codigo {
            font-size: 22px;
            font-weight: 900;
            background: rgba(255,255,255,0.25);
            padding: 12px 24px;
            border-radius: 10px;
            display: inline-block;
            margin-top: 12px;
            letter-spacing: 1px;
            border: 2px solid rgba(255,255,255,0.4);
            position: relative;
            z-index: 1;
        }
        .estado {
            display: inline-block;
            padding: 8px 18px;
            border-radius: 20px;
            font-weight: 700;
            color: white;
            text-transform: uppercase;
            font-size: 13px;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            margin-top: 12px;
        }
        .estado.pendiente { background: linear-gradient(135deg, #FF9800, #F57C00); }
        .estado.asignado { background: linear-gradient(135deg, #2196F3, #1976D2); }
        .estado.aceptado { background: linear-gradient(135deg, #00BCD4, #0097A7); }
        .estado.en_transito { background: linear-gradient(135deg, #9C27B0, #7B1FA2); }
        .estado.entregado { background: linear-gradient(135deg, #4CAF50, #388E3C); }
        .content {
            padding: 20px;
        }
        .info-section {
            margin-bottom: 25px;
            border-left: 4px solid #4CAF50;
            padding: 18px;
            background: #f9fdf9;
            border-radius: 8px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        .info-section h3 {
            color: #2E7D32;
            margin-bottom: 14px;
            font-size: 19px;
            font-weight: 700;
        }
        .info-row {
            display: flex;
            flex-direction: column;
            padding: 10px 0;
            border-bottom: 1px solid #f0f0f0;
            gap: 4px;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            font-weight: 600;
            color: #666;
            font-size: 14px;
        }
        .info-value {
            color: #222;
            font-size: 16px;
            font-weight: 500;
        }
        .productos-table {
            width: 100%;
            border-collapse: collapse;
            margin: 18px 0;
            font-size: 14px;
        }
        .productos-table th {
            background: #4CAF50;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
        }
        .productos-table td {
            padding: 12px 8px;
            border-bottom: 1px solid #e0e0e0;
            background: white;
            font-size: 14px;
        }
        .productos-table tbody tr:hover {
            background: #f9fdf9;
            transition: all 0.2s;
        }
        .productos-table tbody tr:last-child td {
            border-bottom: none;
        }
        .totales {
            background: #E8F5E9;
            padding: 18px;
            border-radius: 8px;
            margin-top: 18px;
            border: 2px solid #C8E6C9;
        }
        .totales .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 16px;
        }
        .totales .total-final {
            font-size: 22px;
            font-weight: 900;
            color: #2E7D32;
            border-top: 3px solid #4CAF50;
            padding-top: 14px;
            margin-top: 10px;
        }
        .qr-section {
            text-align: center;
            padding: 25px 20px;
            background: #fafafa;
            border-radius: 8px;
            margin: 25px 0;
            border: 2px dashed #ddd;
        }
        .qr-section img {
            max-width: 200px;
            border: 3px solid white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-radius: 8px;
        }
        .qr-section h3 {
            font-size: 18px;
            margin-bottom: 15px;
        }
        .timeline {
            position: relative;
            padding: 25px 0;
        }
        .timeline-item {
            position: relative;
            padding-left: 50px;
            margin-bottom: 25px;
        }
        .timeline-item::before {
            content: '✓';
            position: absolute;
            left: 10px;
            top: 0;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 3px 10px rgba(76, 175, 80, 0.3);
        }
        .timeline-item::after {
            content: '';
            position: absolute;
            left: 23px;
            top: 28px;
            width: 3px;
            height: calc(100% + 5px);
            background: linear-gradient(to bottom, #C8E6C9, #e8f5e9);
        }
        .timeline-item:last-child::after {
            display: none;
        }
        .timeline-title {
            font-weight: 700;
            color: #2E7D32;
            margin-bottom: 6px;
            font-size: 16px;
        }
        .timeline-date {
            color: #777;
            font-size: 14px;
        }
        .firma-transportista {
            background: #E3F2FD;
            border: 3px solid #2196F3;
            border-radius: 10px;
            padding: 20px;
            margin: 25px 0;
        }
        .firma-transportista h3 {
            color: #1565C0;
            margin-bottom: 15px;
            font-size: 18px;
            font-weight: 700;
        }
        .firma-content {
            background: white;
            padding: 18px;
            border-radius: 6px;
            border-left: 4px solid #2196F3;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            line-height: 1.6;
            color: #333;
            font-size: 14px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .firma-box {
            border: 2px dashed #999;
            padding: 50px 20px;
            text-align: center;
            margin-top: 30px;
            border-radius: 8px;
            background: #fafafa;
        }
        .firma-box p {
            color: #999;
            font-size: 15px;
            margin-bottom: 50px;
        }
        .firma-line {
            border-top: 2px solid #333;
            width: 250px;
            margin: 0 auto;
            padding-top: 10px;
            color: #555;
            font-weight: 600;
            font-size: 14px;
        }
        .footer-info {
            margin-top: 25px;
            padding: 18px;
            background: #f5f5f5;
            border-radius: 8px;
            text-align: center;
            border-top: 3px solid #4CAF50;
        }
        .footer-info p {
            color: #666;
            margin: 4px 0;
            font-size: 13px;
        }
        .no-print { 
            margin: 25px 0; 
            text-align: center;
        }
        .no-print button {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            border: none;
            padding: 15px 35px;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            body { padding: 0; }
            .header h1 { font-size: 20px; }
            .header .codigo { font-size: 18px; padding: 10px 18px; }
            .content { padding: 16px; }
            .info-section { padding: 14px; }
            .info-section h3 { font-size: 17px; }
            .productos-table { font-size: 12px; }
            .productos-table th,
            .productos-table td { padding: 8px 6px; }
            .totales { padding: 14px; }
            .totales .total-row { font-size: 14px; }
            .totales .total-final { font-size: 18px; }
            .qr-section { padding: 20px 15px; }
            .qr-section img { max-width: 180px; }
            .firma-transportista { padding: 16px; }
            .firma-transportista h3 { font-size: 16px; }
            .firma-content { padding: 14px; font-size: 13px; }
            .firma-box { padding: 40px 15px; }
            .firma-line { width: 200px; font-size: 13px; }
            .no-print button { 
                display: block; 
                width: 90%; 
                margin: 10px auto !important; 
                padding: 14px;
                font-size: 15px;
            }
        }
        
        /* Estilos para impresión y PDF */
        @media print {
            body { 
                background: white; 
                padding: 0;
            }
            .container {
                max-width: 100%;
                box-shadow: none;
                border-radius: 0;
            }
            .no-print { display: none !important; }
            .header {
                background: #4CAF50 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .productos-table th {
                background: #4CAF50 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .totales,
            .info-section,
            .firma-transportista,
            .footer-info {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .qr-section {
                page-break-inside: avoid;
            }
            .firma-box {
                page-break-before: auto;
                page-break-inside: avoid;
            }
        }
        
        /* Animaciones sutiles */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .info-section,
        .productos-table,
        .qr-section {
            animation: fadeIn 0.5s ease-out;
        }
            font-size: 16px;
            border-radius: 8px;
            cursor: pointer;
            margin: 0 8px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
            transition: all 0.3s;
        }
        .no-print button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
        }
        .no-print button:nth-child(2) {
            background: linear-gradient(135deg, #666, #555);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        @media print {
            body { padding: 0; background: white; }
            .no-print { display: none; }
            .container { box-shadow: none; }
        }
        @media (max-width: 600px) {
            .info-row {
                grid-template-columns: 1fr;
                gap: 5px;
            }
            .header .codigo {
                font-size: 24px;
                padding: 12px 20px;
            }
            .content {
                padding: 20px;
            }
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

            <!-- Firma del Transportista -->
            <div class="firma-transportista">
                <h3>✍️ Firma Digital del Transportista</h3>
                ${envio.firma_transportista ? `
                <div class="firma-content">${envio.firma_transportista}</div>
                ` : `
                <div style="background: #FFF9C4; padding: 16px; border-radius: 6px; border-left: 4px solid #FFC107;">
                    <p style="color: #F57F17; font-weight: 600; margin: 0;">⚠️ El transportista aún no ha firmado este documento digitalmente.</p>
                </div>
                `}
                ${envio.transportista_nombre ? `
                <div style="margin-top: 18px; padding-top: 15px; border-top: 2px solid #E3F2FD; text-align: right;">
                    <p style="color: #1565C0; font-weight: 700; font-size: 15px; margin: 0;">
                        <span style="color: #666; font-weight: normal;">Transportista Asignado:</span> ${envio.transportista_nombre}
                    </p>
                    ${envio.transportista_email ? `
                    <p style="color: #666; font-size: 13px; margin: 4px 0 0 0;">📧 ${envio.transportista_email}</p>
                    ` : ''}
                </div>
                ` : ''}
            </div>

            <!-- Firma de Recepción -->
            <div class="firma-box">
                <p>✒️ FIRMA Y SELLO DE RECEPCIÓN</p>
                <div class="firma-line">
                    Nombre y Firma del Receptor
                </div>
            </div>

            <div class="footer-info">
                <p><strong style="font-size: 16px; color: #4CAF50;">🏭 Sistema de Gestión de Planta Logistica</strong></p>
                <p>Documento generado automáticamente el ${new Date().toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}</p>
                <p style="margin-top: 10px; color: #999; font-size: 12px;">Este documento es válido sin firma física</p>
            </div>
        </div>

        <div class="no-print" style="text-align: center; padding: 30px; background: linear-gradient(to bottom, #f5f5f5, #fff); border-top: 3px solid #4CAF50;">
            <button onclick="window.print()" style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; border: none; padding: 18px 40px; font-size: 17px; font-weight: 600; border-radius: 12px; cursor: pointer; margin: 8px; box-shadow: 0 4px 12px rgba(76,175,80,0.3); transition: all 0.3s;">
                🖨️ Imprimir Documento
            </button>
            <button onclick="descargarPDF()" style="background: linear-gradient(135deg, #2196F3, #1976D2); color: white; border: none; padding: 18px 40px; font-size: 17px; font-weight: 600; border-radius: 12px; cursor: pointer; margin: 8px; box-shadow: 0 4px 12px rgba(33,150,243,0.3); transition: all 0.3s;">
                📥 Descargar PDF
            </button>
            <button onclick="window.close()" style="background: linear-gradient(135deg, #757575, #616161); color: white; border: none; padding: 18px 40px; font-size: 17px; font-weight: 600; border-radius: 12px; cursor: pointer; margin: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: all 0.3s;">
                ✖️ Cerrar
            </button>
        </div>
        
        <script>
            // Efectos hover para botones
            document.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-2px)';
                    this.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                });
                btn.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0)';
                });
            });
            
            // Función para descargar como PDF
            function descargarPDF() {
                // Ocultar botones antes de imprimir
                const noprint = document.querySelectorAll('.no-print');
                noprint.forEach(el => el.style.display = 'none');
                
                // Configurar para PDF
                document.title = 'Documento_${envio.codigo}';
                
                // Imprimir (que permite guardar como PDF)
                window.print();
                
                // Restaurar botones
                setTimeout(() => {
                    noprint.forEach(el => el.style.display = 'block');
                }, 500);
            }
            
            // Atajos de teclado
            document.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.key === 'p') {
                    e.preventDefault();
                    window.print();
                }
                if (e.key === 'Escape') {
                    window.close();
                }
            });
        </script>
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

