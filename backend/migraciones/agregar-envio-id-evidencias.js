const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'applanta',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function agregarEnvioIdEvidencias() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('🔄 Agregando columna envio_id a tabla evidencias_entrega...');
        
        // Verificar si la columna ya existe
        const checkColumn = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'evidencias_entrega' AND column_name = 'envio_id'
        `);
        
        if (checkColumn.rows.length === 0) {
            // Agregar columna envio_id
            await client.query(`
                ALTER TABLE evidencias_entrega 
                ADD COLUMN envio_id INTEGER REFERENCES envios(id) ON DELETE CASCADE
            `);
            
            console.log('✅ Columna envio_id agregada a evidencias_entrega');
        } else {
            console.log('ℹ️ La columna envio_id ya existe en evidencias_entrega');
        }
        
        // Agregar índice para mejorar búsquedas
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_evidencias_envio_id ON evidencias_entrega(envio_id)
        `);
        
        console.log('✅ Índice creado para envio_id en evidencias_entrega');
        
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

agregarEnvioIdEvidencias()
    .then(() => {
        console.log('✅ Proceso completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });

