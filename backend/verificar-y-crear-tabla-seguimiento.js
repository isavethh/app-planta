const pool = require('./src/config/database');

async function verificarYCrearTablaSeguimiento() {
  try {
    // Verificar si existe la tabla seguimiento_envio
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'seguimiento_envio'
      );
    `);

    const existe = checkTable.rows[0].exists;
    console.log('¿Existe tabla seguimiento_envio?', existe);

    if (!existe) {
      console.log('Creando tabla seguimiento_envio...');
      
      await pool.query(`
        CREATE TABLE seguimiento_envio (
          id SERIAL PRIMARY KEY,
          envio_id INTEGER NOT NULL,
          latitud DECIMAL(10, 8) NOT NULL,
          longitud DECIMAL(11, 8) NOT NULL,
          velocidad DECIMAL(5, 2),
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_envio FOREIGN KEY (envio_id) REFERENCES envios(id) ON DELETE CASCADE
        );
      `);
      
      console.log('✅ Tabla seguimiento_envio creada correctamente');
    } else {
      console.log('✅ Tabla seguimiento_envio ya existe');
    }

    // Verificar si existe la tabla planta
    const checkPlanta = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'planta'
      );
    `);

    const existePlanta = checkPlanta.rows[0].exists;
    console.log('¿Existe tabla planta?', existePlanta);

    if (!existePlanta) {
      console.log('Creando tabla planta...');
      
      await pool.query(`
        CREATE TABLE planta (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          direccion TEXT,
          ciudad VARCHAR(100),
          departamento VARCHAR(100),
          pais VARCHAR(100),
          latitud DECIMAL(10, 8) NOT NULL,
          longitud DECIMAL(11, 8) NOT NULL,
          telefono VARCHAR(20),
          email VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Insertar datos de la planta principal
      await pool.query(`
        INSERT INTO planta (nombre, direccion, ciudad, departamento, pais, latitud, longitud, telefono, email)
        VALUES (
          'Planta Central Applanta',
          'Av. Cristo Redentor #1500, Zona Norte',
          'Santa Cruz de la Sierra',
          'Santa Cruz',
          'Bolivia',
          -17.7833,
          -63.1821,
          '+591 3 3456789',
          'planta@applanta.com'
        );
      `);
      
      console.log('✅ Tabla planta creada e inicializada correctamente');
    } else {
      console.log('✅ Tabla planta ya existe');
      
      // Verificar si tiene datos
      const countPlanta = await pool.query('SELECT COUNT(*) FROM planta');
      console.log('Registros en planta:', countPlanta.rows[0].count);
      
      if (parseInt(countPlanta.rows[0].count) === 0) {
        console.log('Insertando datos de planta...');
        await pool.query(`
          INSERT INTO planta (nombre, direccion, ciudad, departamento, pais, latitud, longitud, telefono, email)
          VALUES (
            'Planta Central Applanta',
            'Av. Cristo Redentor #1500, Zona Norte',
            'Santa Cruz de la Sierra',
            'Santa Cruz',
            'Bolivia',
            -17.7833,
            -63.1821,
            '+591 3 3456789',
            'planta@applanta.com'
          );
        `);
        console.log('✅ Datos de planta insertados');
      }
    }

    console.log('\n✅ Verificación completada. El sistema está listo para simular rutas.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verificarYCrearTablaSeguimiento();

