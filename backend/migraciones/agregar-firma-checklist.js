const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'applanta',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function agregarFirmaChecklist() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('🔄 Verificando/agregando columna firma_base64 a tabla checklists...');
        
        // Verificar si la columna ya existe
        const checkColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'checklists' AND column_name = 'firma_base64'
        `);
        
        if (checkColumn.rows.length === 0) {
            // Agregar columna firma_base64
            await client.query(`
                ALTER TABLE checklists 
                ADD COLUMN firma_base64 TEXT
            `);
            
            console.log('✅ Columna firma_base64 agregada a checklists');
        } else {
            console.log('ℹ️ La columna firma_base64 ya existe en checklists');
        }
        
        await client.query('COMMIT');
        console.log('✅ Migración completada exitosamente');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en migración:', error);
        throw error;
    } finally {
        client.release();
    }
}

agregarFirmaChecklist()
    .then(() => {
        console.log('✅ Proceso completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });

