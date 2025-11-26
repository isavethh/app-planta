# 🤝 Guía de Contribución

¡Gracias por tu interés en contribuir a Applanta! Este documento te guiará a través del proceso.

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [¿Cómo puedo contribuir?](#cómo-puedo-contribuir)
- [Proceso de Desarrollo](#proceso-de-desarrollo)
- [Guía de Estilo](#guía-de-estilo)
- [Commits](#commits)
- [Pull Requests](#pull-requests)

## 📜 Código de Conducta

Este proyecto y todos los participantes están regidos por un código de conducta. Al participar, se espera que mantengas este código. Por favor reporta comportamiento inaceptable.

### Nuestros Estándares

- Usar lenguaje acogedor e inclusivo
- Ser respetuoso con diferentes puntos de vista
- Aceptar crítica constructiva con gracia
- Enfocarse en lo mejor para la comunidad
- Mostrar empatía hacia otros miembros

## 🎯 ¿Cómo puedo contribuir?

### Reportar Bugs

Los bugs se rastrean como issues de GitHub. Cuando crees un issue:

- **Usa un título claro y descriptivo**
- **Describe los pasos exactos para reproducir el problema**
- **Proporciona ejemplos específicos**
- **Describe el comportamiento observado y esperado**
- **Incluye capturas de pantalla si aplica**
- **Incluye detalles del entorno** (OS, versión de Node, etc.)

Ejemplo:
```markdown
**Descripción del bug:**
La app se cierra al intentar marcar un envío como entregado

**Pasos para reproducir:**
1. Login como transportista
2. Ir a un envío en estado "en_transito"
3. Tocar el botón "Marcar como Entregado"
4. Confirmar la acción

**Comportamiento esperado:**
El envío debe cambiar a estado "entregado"

**Comportamiento actual:**
La app se cierra sin mensaje de error

**Entorno:**
- SO: Android 13
- App version: 1.0.0
- Backend: funcionando correctamente
```

### Sugerir Mejoras

Las sugerencias también se rastrean como issues. Incluye:

- **Título descriptivo**
- **Descripción detallada de la mejora**
- **Explica por qué sería útil**
- **Ejemplos de uso**
- **Mockups si es UI/UX** (opcional)

### Tu Primera Contribución

¿No estás seguro por dónde empezar? Busca issues etiquetados como:

- `good-first-issue` - Problemas ideales para principiantes
- `help-wanted` - Problemas que necesitan ayuda
- `documentation` - Mejoras en documentación

## 🔧 Proceso de Desarrollo

### 1. Fork y Clone

```bash
# Fork el repo en GitHub
# Luego clona tu fork
git clone https://github.com/TU_USUARIO/applanta.git
cd applanta
```

### 2. Crear una Rama

```bash
# Crea una rama desde main
git checkout -b feature/nombre-de-tu-feature

# O para bugfixes
git checkout -b fix/descripcion-del-bug
```

### 3. Hacer Cambios

- Escribe código limpio y legible
- Sigue las guías de estilo
- Comenta código complejo
- Actualiza la documentación si es necesario
- Prueba tus cambios

### 4. Commit

```bash
git add .
git commit -m "feat: descripción clara del cambio"
```

### 5. Push

```bash
git push origin feature/nombre-de-tu-feature
```

### 6. Pull Request

Ve a GitHub y crea un Pull Request desde tu rama.

## 🎨 Guía de Estilo

### JavaScript / React Native

- **Indentación**: 2 espacios
- **Quotes**: Single quotes `'`
- **Semicolons**: Sí
- **Naming**:
  - Components: PascalCase (`EnvioCard.js`)
  - Functions: camelCase (`getUserData`)
  - Constants: UPPER_SNAKE_CASE (`API_URL`)
  - Files: camelCase o PascalCase según contenido

**Ejemplo:**

```javascript
// ✅ Bien
const getUserById = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    throw error;
  }
};

// ❌ Mal
const getuserbyid=async(userid)=>{
try{
const response=await api.get("/users/"+userid)
return response.data
}catch(error){
console.log(error)
}
}
```

### SQL / Base de Datos

- **Nombres de tablas**: snake_case plural (`envios`, `usuarios`)
- **Nombres de columnas**: snake_case (`fecha_creacion`, `estado_id`)
- **Índices**: `idx_tabla_columna`
- **Foreign keys**: `fk_tabla_columna`

### Componentes React Native

- Un componente por archivo
- Estilos al final del archivo
- Props bien documentadas
- Hooks al inicio del componente

**Estructura:**

```javascript
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';

export default function MiComponente({ prop1, prop2, onAction }) {
  const [state, setState] = useState(null);

  useEffect(() => {
    // Effect logic
  }, []);

  const handleAction = () => {
    // Handler logic
    onAction?.();
  };

  return (
    <View style={styles.container}>
      <Text>{prop1}</Text>
      <Button onPress={handleAction}>Action</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
```

## 📝 Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/es/):

### Formato

```
<tipo>(<scope>): <descripción>

[cuerpo opcional]

[footer opcional]
```

### Tipos

- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Formato, puntos y comas, etc (no cambia código)
- `refactor`: Refactorización (no cambia funcionalidad)
- `perf`: Mejora de performance
- `test`: Agregar o corregir tests
- `chore`: Cambios en build, herramientas, etc

### Ejemplos

```bash
feat(envios): agregar filtro por fecha
fix(auth): corregir token expiration
docs(readme): actualizar instrucciones de instalación
style(app): formatear código con prettier
refactor(api): simplificar manejo de errores
perf(envios): optimizar query de búsqueda
test(transportistas): agregar tests de disponibilidad
chore(deps): actualizar dependencias
```

## 🔀 Pull Requests

### Checklist antes de enviar

- [ ] El código sigue las guías de estilo
- [ ] He comentado código complejo
- [ ] He actualizado la documentación
- [ ] Mis cambios no generan nuevos warnings
- [ ] He probado en Android/iOS
- [ ] He probado el backend
- [ ] Los commits siguen Conventional Commits

### Template de PR

```markdown
## Descripción
Breve descripción de los cambios

## Tipo de cambio
- [ ] Bug fix
- [ ] Nueva funcionalidad
- [ ] Breaking change
- [ ] Documentación

## ¿Cómo se ha probado?
Describe las pruebas realizadas

## Capturas de pantalla (si aplica)
[screenshots]

## Checklist
- [ ] Mi código sigue las guías de estilo
- [ ] He realizado un self-review
- [ ] He comentado código complejo
- [ ] He actualizado la documentación
- [ ] No hay warnings nuevos
- [ ] Funciona en Android e iOS
```

### Proceso de Review

1. Al menos 1 reviewer debe aprobar
2. Todos los comentarios deben ser resueltos
3. CI/CD debe pasar (cuando se implemente)
4. No debe haber conflictos con main

## 🧪 Testing

### Backend

```bash
cd backend
npm test
```

### Mobile App

```bash
cd mobile-app
npm test
```

## 📚 Recursos

- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [Express.js](https://expressjs.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

## ❓ ¿Preguntas?

Si tienes preguntas:

1. Busca en issues existentes
2. Revisa la documentación
3. Crea un nuevo issue con la etiqueta `question`

## 🙏 Agradecimientos

¡Gracias por contribuir a Applanta! Cada contribución, por pequeña que sea, es valiosa.

---

**Happy Coding!** 🚀

