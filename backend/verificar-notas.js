const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'Plantalogistica',
  user: 'postgres',
  password: '1234'
});

async function verificar() {
  try {
    // Contar envíos aceptados/entregados
    const envios = await pool.query(`
      SELECT COUNT(*) FROM envios 
      WHERE estado IN ('aceptado', 'en_transito', 'entregado')
    `);
    
    // Contar notas de venta
    const notas = await pool.query('SELECT COUNT(*) FROM notas_venta');
    
    // Ver últimos envíos aceptados
    const ultimos = await pool.query(`
      SELECT id, codigo, estado, created_at 
      FROM envios 
      WHERE estado IN ('aceptado', 'en_transito', 'entregado')
      ORDER BY updated_at DESC
      LIMIT 5
    `);
    
    console.log('\n📊 RESUMEN:');
    console.log('Envíos aceptados/entregados:', envios.rows[0].count);
    console.log('Notas de venta generadas:', notas.rows[0].count);
    console.log('\n📦 Últimos 5 envíos aceptados:');
    console.table(ultimos.rows);
    
    pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    pool.end();
  }
}

verificar();
