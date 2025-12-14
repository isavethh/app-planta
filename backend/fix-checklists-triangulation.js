const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'Plantalogistica',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

async function fixChecklistsTriangulation() {
  try {
    console.log('🔧 Corrigiendo triangulación en checklists...\n');
    
    // 1. Verificar que ruta_parada_id existe y tiene datos
    const checkParadas = await pool.query(`
      SELECT COUNT(*) as total 
      FROM checklists 
      WHERE ruta_parada_id IS NOT NULL
    `);
    console.log(`✅ Checklists con ruta_parada_id: ${checkParadas.rows[0].total}`);
    
    // 2. Si hay checklists con envio_id pero sin ruta_parada_id, 
    // intentar obtener ruta_parada_id desde ruta_paradas
    const checkSinParada = await pool.query(`
      SELECT c.id, c.envio_id
      FROM checklists c
      WHERE c.ruta_parada_id IS NULL 
      AND c.envio_id IS NOT NULL
    `);
    
    if (checkSinParada.rows.length > 0) {
      console.log(`⚠️  Encontrados ${checkSinParada.rows.length} checklists sin ruta_parada_id`);
      
      for (const checklist of checkSinParada.rows) {
        // Intentar encontrar ruta_parada_id desde ruta_paradas
        const parada = await pool.query(`
          SELECT id 
          FROM ruta_paradas 
          WHERE envio_id = $1
          LIMIT 1
        `, [checklist.envio_id]);
        
        if (parada.rows.length > 0) {
          await pool.query(`
            UPDATE checklists 
            SET ruta_parada_id = $1 
            WHERE id = $2
          `, [parada.rows[0].id, checklist.id]);
          console.log(`  ✅ Checklist ${checklist.id} actualizado con ruta_parada_id`);
        }
      }
    }
    
    // 3. Eliminar columna envio_id (redundante - se obtiene a través de ruta_paradas)
    console.log('\n🗑️  Eliminando columna envio_id redundante...');
    await pool.query(`
      ALTER TABLE checklists 
      DROP COLUMN IF EXISTS envio_id
    `);
    console.log('✅ Columna envio_id eliminada');
    
    // 4. Verificar estructura final
    const estructura = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'checklists' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Estructura final de checklists:');
    estructura.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    console.log('\n✅ Triangulación eliminada correctamente');
    console.log('📝 Ahora checklists solo tiene ruta_parada_id (envio_id se obtiene a través de ruta_paradas.envio_id)');
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

fixChecklistsTriangulation();

