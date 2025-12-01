const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'Plantalogistica',
  user: 'postgres',
  password: '1234'
});

async function crearIndices() {
  try {
    console.log('📊 Creando índices para optimizar consultas...\n');
    
    // Índice en notas_venta.envio_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notas_venta_envio_id 
      ON notas_venta(envio_id)
    `);
    console.log('✅ Índice creado: notas_venta.envio_id');
    
    // Índice en envios.almacen_destino_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_envios_almacen_destino 
      ON envios(almacen_destino_id)
    `);
    console.log('✅ Índice creado: envios.almacen_destino_id');
    
    // Índice en envio_productos.envio_id
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_envio_productos_envio_id 
      ON envio_productos(envio_id)
    `);
    console.log('✅ Índice creado: envio_productos.envio_id');
    
    // Índice en notas_venta.created_at para ordenamiento
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notas_venta_created_at 
      ON notas_venta(created_at DESC)
    `);
    console.log('✅ Índice creado: notas_venta.created_at');
    
    console.log('\n🎉 Todos los índices creados exitosamente!');
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
  }
}

crearIndices();
