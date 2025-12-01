const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'Plantalogistica',
  user: 'postgres',
  password: '1234'
});

async function verTabla() {
  const result = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'envio_productos'
    ORDER BY ordinal_position
  `);
  
  console.log('Columnas de envio_productos:');
  console.table(result.rows);
  
  // Ver datos de ejemplo
  const ejemplo = await pool.query('SELECT * FROM envio_productos LIMIT 2');
  console.log('\nDatos de ejemplo:');
  console.table(ejemplo.rows);
  
  pool.end();
}

verTabla();
