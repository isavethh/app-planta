const pool = require('./src/config/database');

async function testNotaVenta() {
  try {
    console.log('🧪 Probando consulta de nota de venta...\n');
    
    const envioId = 10;
    
    console.log('Buscando nota de venta para envío ID:', envioId);
    
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
    `, [envioId]);
    
    if (notaResult.rows.length === 0) {
      console.log('❌ No se encontró nota de venta para envío', envioId);
    } else {
      console.log('✅ Nota de venta encontrada:');
      console.log('   Número:', notaResult.rows[0].numero_nota);
      console.log('   Almacén:', notaResult.rows[0].almacen_nombre);
      console.log('   Dirección:', notaResult.rows[0].almacen_direccion);
      console.log('   Total:', notaResult.rows[0].total_precio);
    }
    
    // Obtener productos
    console.log('\n📦 Buscando productos del envío...');
    const productosResult = await pool.query(`
      SELECT * FROM envio_productos WHERE envio_id = $1
    `, [envioId]);
    
    console.log('✅ Productos encontrados:', productosResult.rows.length);
    productosResult.rows.forEach((p, i) => {
      console.log(`   ${i+1}. ${p.producto_nombre} - Cantidad: ${p.cantidad} - Precio: ${p.total_precio}`);
    });
    
    console.log('\n✅ CONSULTA DE NOTA DE VENTA FUNCIONA CORRECTAMENTE!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testNotaVenta();
