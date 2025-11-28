const pool = require('./database');

const agregarColumnasEnvios = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Agregando columnas faltantes a la tabla envios...');
    
    // Agregar columnas una por una, ignorando errores si ya existen
    const columnas = [
      { nombre: 'estado', tipo: "VARCHAR(50) DEFAULT 'pendiente'" },
      { nombre: 'fecha_estimada_entrega', tipo: 'DATE' },
      { nombre: 'hora_estimada', tipo: 'TIME' },
      { nombre: 'fecha_inicio_transito', tipo: 'TIMESTAMP' },
      { nombre: 'total_cantidad', tipo: 'DECIMAL(10, 2) DEFAULT 0' },
      { nombre: 'total_peso', tipo: 'DECIMAL(10, 3) DEFAULT 0' },
      { nombre: 'total_precio', tipo: 'DECIMAL(12, 2) DEFAULT 0' },
      { nombre: 'observaciones', tipo: 'TEXT' }
    ];

    for (const columna of columnas) {
      try {
        await client.query(`
          ALTER TABLE envios 
          ADD COLUMN IF NOT EXISTS ${columna.nombre} ${columna.tipo}
        `);
        console.log(`✅ Columna ${columna.nombre} agregada`);
      } catch (error) {
        if (error.code === '42701') { // Código de error para columna duplicada
          console.log(`⚠️  Columna ${columna.nombre} ya existe`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Columnas agregadas correctamente');

  } catch (error) {
    console.error('❌ Error al agregar columnas:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  agregarColumnasEnvios()
    .then(() => {
      console.log('Proceso completado');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = agregarColumnasEnvios;


