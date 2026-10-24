# Evaluación de una distribución sin instalar runtimes

Estado: investigación y criterios de aceptación. No se entrega ni se anuncia todavía un `.exe`, AppImage o instalador nativo de toda la suite.

## Decisión técnica

La suite actual necesita **Node y Python**, además del navegador. PyInstaller puede incluir intérprete y dependencias de los motores Python, pero no empaqueta por sí solo el coordinador Node, las aplicaciones web y su ciclo de vida.

La ruta a evaluar es un paquete por sistema operativo con runtimes incluidos, assets propios y un lanzador único. Empezar por carpeta autocontenida facilita revisar archivos y dependencias; un solo ejecutable exige después comprobar extracción temporal, permisos y antivirus. PyInstaller requiere construir en cada plataforma: no es un compilador cruzado.

Referencias oficiales: [funcionamiento de PyInstaller](https://www.pyinstaller.org/en/stable/operating-mode.html) y [plataformas soportadas](https://pyinstaller.org/en/stable/).

## Trabajo necesario antes de distribuir

1. Separar recursos de solo lectura y datos modificables. Ubicar proyectos y registros fuera de la carpeta de extracción temporal; probar actualización y recuperación.
2. Empaquetar el coordinador Node y los cuatro servicios Python, incluyendo imports dinámicos, assets BI y licencias de todas las dependencias.
3. Un lanzador debe comprobar puertos, iniciar ambos runtimes, esperar los servicios, abrir navegador y detener todos los procesos al cerrar.
4. Construir en Windows/Linux/macOS. Probar en equipos limpios sin Python ni Node, sin privilegios de administrador, con rutas con espacios, primera ejecución sin red y antivirus.
5. Repetir pruebas de motores, contratos, seguridad y navegador sobre el paquete final. Verificar huella, inventario de dependencias, tamaño y tiempos reales; evaluar firma de los binarios antes de recomendar instalación pública.

No se da por cierta la reducción del 90 % de fricción sugerida en la auditoría: requeriría medir instalaciones con usuarios. El ZIP de código y sus requisitos siguen documentados mientras esta vía no tenga evidencia propia.
