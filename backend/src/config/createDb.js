const { Pool } = require('pg');
require('dotenv').config();

// Conectar a la base de datos por defecto (postgres) para crear applanta_db
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'postgres', // Conectar a la BD por defecto
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const createDatabase = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('Conectado a PostgreSQL...');

    // Verificar si la base de datos existe
    const checkDb = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME || 'applanta_db']
    );

    if (checkDb.rows.length === 0) {
      // La base de datos no existe, crearla
      console.log(`Creando base de datos ${process.env.DB_NAME || 'applanta_db'}...`);
      await client.query(`CREATE DATABASE ${process.env.DB_NAME || 'applanta_db'}`);
      console.log('✓ Base de datos creada exitosamente');
    } else {
      console.log('✓ La base de datos ya existe');
    }

  } catch (error) {
    console.error('Error al crear la base de datos:', error.message);
    throw error;
  } finally {
    if (client) client.release();
    await pool.end();
  }
};

if (require.main === module) {
  createDatabase()
    .then(() => {
      console.log('Proceso completado');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = createDatabase;

