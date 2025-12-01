const pool = require('./src/config/database');

const crearTabla = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notas_venta (
        id SERIAL PRIMARY KEY,
        numero_nota VARCHAR(50) UNIQUE NOT NULL,
        envio_id INTEGER REFERENCES envios(id),
        fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        almacen_nombre VARCHAR(255),
        almacen_direccion TEXT,
        total_cantidad INTEGER,
        total_precio DECIMAL(10,2),
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Tabla notas_venta creada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al crear tabla:', error.message);
    process.exit(1);
  }
};

crearTabla();
