const pool = require('./src/config/database');

async function addColumns() {
  try {
    // Verificar columnas existentes
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rutas_entrega'
    `);
    
    const existingColumns = result.rows.map(r => r.column_name);
    console.log('Columnas existentes:', existingColumns.join(', '));
    
    // Agregar columnas si no existen
    if (!existingColumns.includes('ultima_latitud')) {
      await pool.query('ALTER TABLE rutas_entrega ADD COLUMN ultima_latitud DECIMAL(10,8)');
      console.log('✅ Columna ultima_latitud agregada');
    }
    
    if (!existingColumns.includes('ultima_longitud')) {
      await pool.query('ALTER TABLE rutas_entrega ADD COLUMN ultima_longitud DECIMAL(11,8)');
      console.log('✅ Columna ultima_longitud agregada');
    }
    
    if (!existingColumns.includes('ultima_actualizacion')) {
      await pool.query('ALTER TABLE rutas_entrega ADD COLUMN ultima_actualizacion TIMESTAMP');
      console.log('✅ Columna ultima_actualizacion agregada');
    }
    
    console.log('✅ Todas las columnas están configuradas');
    pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    pool.end();
  }
}

addColumns();
