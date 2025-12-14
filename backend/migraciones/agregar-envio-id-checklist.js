const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'applanta',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function agregarEnvioIdChecklist() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('🔄 Agregando columna envio_id a tabla checklists...');
        
        // Verificar si la columna ya existe
        const checkColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'checklists' AND column_name = 'envio_id'
        `);
        
        if (checkColumn.rows.length === 0) {
            // Agregar columna envio_id
            await client.query(`
                ALTER TABLE checklists 
                ADD COLUMN envio_id INTEGER REFERENCES envios(id) ON DELETE CASCADE
            `);
            
            console.log('✅ Columna envio_id agregada a checklists');
        } else {
            console.log('ℹ️ La columna envio_id ya existe en checklists');
        }
        
        // Agregar índice para mejorar búsquedas
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_checklists_envio_id ON checklists(envio_id)
        `);
        
        console.log('✅ Índice creado para envio_id');
        
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

agregarEnvioIdChecklist()
    .then(() => {
        console.log('✅ Proceso completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });

