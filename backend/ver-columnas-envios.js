const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: '1234',
  host: 'localhost',
  port: 5432,
  database: 'Plantalogistica'
});

async function main() {
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'almacenes' 
      ORDER BY ordinal_position
    `);
    
    console.log('Columnas de la tabla almacenes:');
    result.rows.forEach(row => console.log('  -', row.column_name));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
