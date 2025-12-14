const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'Plantalogistica',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

async function fixChecklistsRedundantRelationship() {
  try {
    console.log('🔧 Corrigiendo relación redundante en checklists...\n');
    
    // 1. Verificar que ruta_parada_id existe y tiene datos
    const checkParadas = await pool.query(`
      SELECT COUNT(*) as total 
      FROM checklists 
      WHERE ruta_parada_id IS NOT NULL
    `);
    console.log(`✅ Checklists con ruta_parada_id: ${checkParadas.rows[0].total}`);
    
    // 2. Si hay checklists con ruta_entrega_id pero sin ruta_parada_id, 
    // intentar obtener ruta_parada_id desde ruta_paradas
    const checkSinParada = await pool.query(`
      SELECT c.id, c.ruta_entrega_id, c.envio_id
      FROM checklists c
      WHERE c.ruta_parada_id IS NULL 
      AND c.ruta_entrega_id IS NOT NULL
    `);
    
    if (checkSinParada.rows.length > 0) {
      console.log(`⚠️  Encontrados ${checkSinParada.rows.length} checklists sin ruta_parada_id`);
      
      for (const checklist of checkSinParada.rows) {
        // Intentar encontrar ruta_parada_id desde ruta_paradas
        const parada = await pool.query(`
          SELECT id 
          FROM ruta_paradas 
          WHERE ruta_entrega_id = $1 
          AND envio_id = $2
          LIMIT 1
        `, [checklist.ruta_entrega_id, checklist.envio_id]);
        
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
    
    // 3. Eliminar foreign key de ruta_entrega_id
    console.log('\n🗑️  Eliminando foreign key de ruta_entrega_id...');
    await pool.query(`
      ALTER TABLE checklists 
      DROP CONSTRAINT IF EXISTS checklists_ruta_entrega_id_fkey
    `);
    console.log('✅ Foreign key eliminado');
    
    // 4. Eliminar índice de ruta_entrega_id si existe
    await pool.query(`
      DROP INDEX IF EXISTS idx_checklists_ruta_entrega
    `);
    
    // 5. Eliminar columna ruta_entrega_id
    console.log('\n🗑️  Eliminando columna ruta_entrega_id...');
    await pool.query(`
      ALTER TABLE checklists 
      DROP COLUMN IF EXISTS ruta_entrega_id
    `);
    console.log('✅ Columna ruta_entrega_id eliminada');
    
    // 6. Verificar estructura final
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
    
    console.log('\n✅ Relación redundante eliminada correctamente');
    console.log('📝 Ahora checklists solo tiene ruta_parada_id (ruta_entrega_id se obtiene a través de ruta_paradas)');
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

fixChecklistsRedundantRelationship();

