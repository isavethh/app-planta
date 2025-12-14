const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'Plantalogistica',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});

async function fixEvidenciasTriangulation() {
  try {
    console.log('🔧 Corrigiendo triangulación en evidencias_entrega...\n');
    
    // 1. Verificar que ruta_parada_id existe y tiene datos
    const checkParadas = await pool.query(`
      SELECT COUNT(*) as total 
      FROM evidencias_entrega 
      WHERE ruta_parada_id IS NOT NULL
    `);
    console.log(`✅ Evidencias con ruta_parada_id: ${checkParadas.rows[0].total}`);
    
    // 2. Si hay evidencias con checklist_id pero sin ruta_parada_id, 
    // intentar obtener ruta_parada_id desde checklists
    const checkSinParada = await pool.query(`
      SELECT e.id, e.checklist_id
      FROM evidencias_entrega e
      WHERE e.ruta_parada_id IS NULL 
      AND e.checklist_id IS NOT NULL
    `);
    
    if (checkSinParada.rows.length > 0) {
      console.log(`⚠️  Encontradas ${checkSinParada.rows.length} evidencias sin ruta_parada_id`);
      
      for (const evidencia of checkSinParada.rows) {
        // Intentar encontrar ruta_parada_id desde checklists
        const checklist = await pool.query(`
          SELECT ruta_parada_id 
          FROM checklists 
          WHERE id = $1
        `, [evidencia.checklist_id]);
        
        if (checklist.rows.length > 0 && checklist.rows[0].ruta_parada_id) {
          await pool.query(`
            UPDATE evidencias_entrega 
            SET ruta_parada_id = $1 
            WHERE id = $2
          `, [checklist.rows[0].ruta_parada_id, evidencia.id]);
          console.log(`  ✅ Evidencia ${evidencia.id} actualizada con ruta_parada_id`);
        }
      }
    }
    
    // 3. Eliminar foreign key de checklist_id
    console.log('\n🗑️  Eliminando foreign key de checklist_id...');
    await pool.query(`
      ALTER TABLE evidencias_entrega 
      DROP CONSTRAINT IF EXISTS evidencias_entrega_checklist_id_fkey
    `);
    console.log('✅ Foreign key eliminado');
    
    // 4. Eliminar índice de checklist_id si existe
    await pool.query(`
      DROP INDEX IF EXISTS idx_evidencias_checklist
    `);
    
    // 5. Eliminar columna checklist_id (redundante - se obtiene a través de ruta_parada_id -> checklists)
    console.log('\n🗑️  Eliminando columna checklist_id redundante...');
    await pool.query(`
      ALTER TABLE evidencias_entrega 
      DROP COLUMN IF EXISTS checklist_id
    `);
    console.log('✅ Columna checklist_id eliminada');
    
    // 6. Verificar estructura final
    const estructura = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'evidencias_entrega' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Estructura final de evidencias_entrega:');
    estructura.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    console.log('\n✅ Triangulación eliminada correctamente');
    console.log('📝 Ahora evidencias_entrega solo tiene ruta_parada_id (checklist_id se obtiene a través de ruta_parada_id -> checklists)');
    
    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
    process.exit(1);
  }
}

fixEvidenciasTriangulation();

