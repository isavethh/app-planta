const pool = require('./src/config/database');

async function testEstadisticas() {
  try {
    console.log('🧪 Probando consultas de estadísticas...\n');
    
    const almacenId = 5;
    
    // Test 1: Total envíos
    console.log('1️⃣ Probando total de envíos...');
    const totalEnvios = await pool.query(`
      SELECT COUNT(*)::integer as total
      FROM envios
      WHERE almacen_destino_id = $1
    `, [almacenId]);
    console.log('✅ Total envíos:', totalEnvios.rows[0].total);
    
    // Test 2: Total notas
    console.log('\n2️⃣ Probando total de notas...');
    const totalNotas = await pool.query(`
      SELECT COUNT(*)::integer as total
      FROM notas_venta nv
      INNER JOIN envios e ON nv.envio_id = e.id
      WHERE e.almacen_destino_id = $1
    `, [almacenId]);
    console.log('✅ Total notas:', totalNotas.rows[0].total);
    
    // Test 3: Total compras
    console.log('\n3️⃣ Probando total de compras...');
    const totalCompras = await pool.query(`
      SELECT COALESCE(SUM(CAST(nv.total_precio AS NUMERIC)), 0) as total
      FROM notas_venta nv
      INNER JOIN envios e ON nv.envio_id = e.id
      WHERE e.almacen_destino_id = $1
    `, [almacenId]);
    console.log('✅ Total compras:', totalCompras.rows[0].total);
    
    // Test 4: Envíos por estado
    console.log('\n4️⃣ Probando envíos por estado...');
    const enviosPorEstado = await pool.query(`
      SELECT estado, COUNT(*) as cantidad
      FROM envios
      WHERE almacen_destino_id = $1
      GROUP BY estado
      ORDER BY cantidad DESC
    `, [almacenId]);
    console.log('✅ Envíos por estado:', enviosPorEstado.rows);
    
    console.log('\n✅ TODAS LAS CONSULTAS FUNCIONAN CORRECTAMENTE!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testEstadisticas();
