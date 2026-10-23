# SCADA Studio · AB Suite

Abre la herramienta desde el [catálogo de AB Suite](../../README.md). La distribución integrada usa `/apps/scada/`; abrir no descarga código.

Editor de pantallas HMI sobre un lienzo libre. Biblioteca de 14 tipos: rectángulo, elipse, línea, texto, tubería, depósito, bomba, válvula, motor, indicador, valor, tendencia, alarma y navegación entre pantallas.

Permite arrastrar, redimensionar, editar coordenadas, dimensiones, colores y trazo, ordenar capas, duplicar y deshacer/rehacer. Rejilla opcional de 10 px, zoom y ajuste al área disponible. El inspector y la biblioteca son plegables; en móvil se abren como paneles.

Los componentes de supervisión leen señales de otras pestañas de AB Suite. El depósito visualiza un valor según su escala; no simula un proceso hidráulico. Una señal desconocida o caducada nunca se convierte en cero. Probar conserva la composición y permite utilizar la navegación; no escribe sobre hardware.

Los proyectos `.hmi.json` guardan pantallas, objetos, capas y enlaces. Los proyectos v1 anteriores reciben geometría predeterminada al abrirse. Límite: 12 pantallas, 30 objetos por pantalla y 120 por proyecto; lienzos de hasta 3840 × 2160. No incluye scripting, grupos, importación de SVG externo ni conexiones automáticas entre tuberías.

Consulta la [guía de edición](../../docs/EDITORS.md) y las [pruebas reproducibles](../../docs/VALIDATION.md).

MIT · MS ROBOTIKA. El [documento histórico independiente](docs/LEGACY_README.md) conserva el alcance y las capturas anteriores; no describe esta interfaz.
