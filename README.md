# 🏆 Chess Puzzle Trainer - Interfaz Profesional

Un entrenador de puzzles de ajedrez completamente renovado con una **interfaz profesional, moderna y totalmente responsive**. Practica mates en uno y mates en dos con la mejor experiencia de usuario.

## 🌟 Demo Online

**¡Prueba la aplicación ahora!** 👉 [Chess Puzzle Trainer - Demo](https://magaiden.github.io/Chess-Puzzle-Trainer/)

## 🎨 Nueva Interfaz Profesional

La aplicación ha sido **completamente rediseñada** con una interfaz moderna y profesional:

### ✨ Características de Diseño:
- **🎯 Diseño Moderno**: Interfaz limpia con gradientes elegantes y sombras profesionales
- **📱 Totalmente Responsive**: Funciona perfectamente en móviles, tablets y desktop
- **🎮 Tablero Mejorado**: Tablero de ajedrez con efectos visuales profesionales
- **🚀 Micro-animaciones**: Transiciones suaves y efectos de hover elegantes
- **🎨 Sistema de Colores**: Paleta de colores profesional con variables CSS
- **📊 Estadísticas Visuales**: Barras de progreso animadas y tarjetas de estadísticas
- **⌨️ Navegación por Teclado**: Soporte completo para navegación con teclado
- **♿ Accesibilidad**: Diseño inclusivo con soporte para lectores de pantalla

### 🔧 Mejoras Técnicas:
- **Inter Font**: Tipografía profesional para mejor legibilidad
- **CSS Grid/Flexbox**: Layout moderno y flexible
- **CSS Custom Properties**: Variables CSS para fácil mantenimiento
- **Optimización de Performance**: Carga optimizada y transiciones suaves
- **Mobile-First**: Diseño responsive desde móvil hacia escritorio

## ✅ Correcciones Realizadas

Además de la nueva interfaz, se han corregido todos los errores técnicos:

### 🔧 Errores Críticos Solucionados:

1. **Manejo de Promociones Asíncrono**: 
   - Corregido el manejo de promociones de peones con async/await
   - Mejorado el diálogo de promoción con mejor UX

2. **Sincronización de Movimientos del Oponente**:
   - Fixed timing issues en mates en dos
   - Mejor manejo de errores en movimientos automáticos

3. **Parseo de PGN Robusto**:
   - Implementados múltiples patrones de regex para diferentes formatos
   - Mejor limpieza de comentarios y espacios

4. **Manejo de Errores Mejorado**:
   - Validación de movimientos extraídos del PGN
   - Mensajes de error informativos para el usuario

## 🌟 Características

* **Soporte para múltiples tipos de puzzles:**
  * ✅ Mate en uno - Completamente funcional
  * ✅ Mate en dos - Con respuesta automática del oponente
  * ✅ Promociones especiales - Con selector de pieza mejorado

* **Interfaz moderna:**
  * Tablero interactivo con arrastrar y soltar
  * Verificación automática de movimientos
  * Seguimiento del progreso del usuario
  * Navegación por páginas de puzzles

## 🚀 Cómo usar

### Uso Online (Recomendado):
Puedes usar la aplicación directamente desde GitHub Pages: **[Demo Online](https://magaiden.github.io/Chess-Puzzle-Trainer/)**

### Instalación Local:

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/MaGaiDeN/Chess-Puzzle-Trainer.git
   cd Chess-Puzzle-Trainer
   ```

2. **Inicia un servidor local:**
   ```bash
   # Con Python
   python -m http.server 8000
   
   # Con Node.js
   npx http-server
   ```

3. **Abre en el navegador:**
   ```
   http://localhost:8000
   ```

### Instrucciones de Juego:

1. **Al iniciar:**
   - Elige si quieres guardar tu progreso introduciendo tu nombre
   - O continúa en modo invitado sin guardado

2. **Resolviendo puzzles:**
   - Arrastra las piezas para hacer tu movimiento
   - Para promociones, selecciona la pieza deseada en el diálogo
   - En mates en dos, el programa realizará automáticamente la respuesta del oponente

3. **Navegación:**
   - Usa los botones de navegación para cambiar de página
   - Los puzzles resueltos aparecen marcados con ✓
   - Tu progreso se guarda automáticamente (si activaste el guardado)

## 📋 Tipos de Puzzles

### Mate en Uno
* Encuentra el movimiento único que da mate
* Incluye puzzles con promociones especiales
* Verificación inmediata del mate

### Mate en Dos
* Realiza el primer movimiento correcto
* El programa responde automáticamente
* Encuentra el mate en el siguiente movimiento

## 🛠 Tecnologías utilizadas

* **Frontend:**
  * HTML5 - Estructura semántica
  * CSS3 - Estilos modernos y responsive
  * JavaScript ES6+ - Lógica de la aplicación

* **Librerías:**
  * [chess.js](https://github.com/jhlywa/chess.js) - Motor de ajedrez
  * [chessboard.js](https://chessboardjs.com/) - Interfaz del tablero
  * jQuery - Manipulación del DOM

## 📁 Estructura del Proyecto

```
Chess-Puzzle-Trainer/
├── index.html              # Aplicación principal
├── README.md               # Este archivo
├── css/
│   └── styles.css          # Estilos de la aplicación
├── js/
│   └── script.js           # Lógica principal
├── images/
│   └── logo.webp           # Logo de la aplicación
├── Mate_en_Dos.pgn         # Base de datos de puzzles
└── Mate_en_Dos.pgi         # Archivo de índice de puzzles
```

## 🎯 Características Técnicas

* **Responsive Design**: Funciona en desktop, tablet y móvil
* **Progressive Enhancement**: Funciona sin JavaScript (básico)
* **Error Handling**: Manejo robusto de errores
* **Performance**: Carga rápida y navegación fluida
* **Accessibility**: Controles por teclado y navegación clara

## 🤝 Contribuir

Las contribuciones son bienvenidas. Para contribuir:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🙏 Créditos

Puzzles basados en la colección de László Polgár