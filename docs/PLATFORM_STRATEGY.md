# Estrategia de plataforma y contraste de la segunda auditoría

24 de octubre de 2026. Criterio: completar recorridos útiles y verificables antes de ampliar tecnologías o difusión. La etiqueta «premium» no sustituye pruebas ni observación con usuarios.

La entrada de la plataforma presenta las nueve herramientas como productos independientes. Cada persona puede utilizar solo las que necesita. Los ejercicios portables y las conexiones son capacidades opcionales; no son requisitos para abrir una herramienta ni una ruta obligatoria.

## Orden de trabajo

| Prioridad | Entrega | Criterio de aceptación |
| --- | --- | --- |
| 1. Fiabilidad del trabajo propio | Nuevo, edición, ejecución, resultado y recuperación en las nueve herramientas | Un usuario completa una práctica sin cargar ejemplos ni perder el trabajo anterior |
| 2. Integración residente | Una CPU; PLC, Modbus, HMI y captura BI observan el mismo estado | Cerrar la vista PLC no detiene la CPU; SCADA sigue viendo nuevos ciclos y cambios. Si falla el servicio, muestra caducidad y no datos prefijados |
| 3. Documento conjunto e históricos | Diseñar `.absuite` e historial persistente de tendencias | Validar todos los componentes antes de aplicar; recuperación completa; no exportar tokens ni contraseñas; distinguir configuración, ejecución y muestras |
| 4. Distribución sencilla | Runtimes incluidos y un lanzador por sistema | Arrancar en equipo limpio sin Node/Python instalados; comprobar permisos, actualización, cierre y recuperación |
| 5. Adopción | Prácticas breves y evaluación con usuarios nuevos | Instalan, crean y explican un resultado sin ayuda. Después se decide difusión con el propietario |

Las prioridades 1 y parte de 2 ya tienen evidencia. La revisión 0.4.2 completa la lectura residente de PLC desde SCADA. La revisión 0.5.0 añade ejercicios portables `.absuite` mediante copias explícitas y apertura recuperable por componente; no restaura las nueve herramientas en una única operación. Históricos persistentes, instalación con runtimes y evaluación con usuarios continúan pendientes.

## Afirmaciones que requieren corrección

- **La CPU ya reside en el servidor.** El fallo real era que su telemetría HMI se republicaba desde la pestaña PLC. SCADA ahora lee `/suite/signals/plc`, con sesión, Host/Origin y proyección de la misma CPU. No se crea un segundo motor. KOP/SCL/GRAFCET de navegador conservan su alcance de pestaña.
- **KOP/SCL ya envían al PLC.** La transferencia se valida y requiere aceptación del destinatario; no conviene reemplazarla por un POST sin recuperación. GRAFCET no se puede presentar como código PLC equivalente sin diseñar esa conversión.
- **Host/Origin, estados de motores y contratos ya existen.** Se amplían pruebas y documentación; no se inventan nuevos nombres de eventos que rompan v1 ni otro repositorio de protocolo sin necesidad. El submódulo `@msrobotika/ab-suite-core/contracts` es la entrada compartida actual.
- **La suite integrada ya es la fuente de desarrollo conjunta.** `apps/sources.json` registra antecedentes, no un mecanismo de actualización automática. Un fallo corregido en un repositorio histórico necesita una incorporación explícita y probada. Añadir workspaces no elimina esa responsabilidad ni convierte motores Python en paquetes npm. La migración futura debe definir propiedad, versiones y consumidores antes de cambiar el gestor.
- **OpenCV.js no garantiza 10–50 veces más rendimiento.** Antes de cambiar el motor se necesita medir latencia, memoria y exactitud sobre las mismas imágenes y tamaños, con y sin alternativas. Una migración que cambie detecciones o calibración exige pruebas de equivalencia. Se mantiene el motor propio mientras no exista esa evidencia.
- **Los porcentajes de crecimiento, mejoras de SEO y «cero fricción» no están medidos.** No sirven como evidencia ni justifican un lanzamiento.

## Próximas especificaciones concretas

### Documento `.absuite`

Entregado en 0.5.0: biblioteca transaccional del navegador, componentes completos de las nueve herramientas, importación en una entrada nueva y apertura individual con recuperación previa. [Contrato y límites](EXERCISES.md). La sincronización automática y la restauración simultánea son operaciones distintas, todavía no implementadas.

Criterios para futuras ampliaciones:

Definir un manifiesto versionado que identifique documentos nativos, capacidades y límites. Incluir programa/escenario PLC, pantallas HMI, recetas y datos opcionales de Vision y contenido portable de BI, no solo el identificador de su espacio. Separar datos sensibles, imágenes opcionales e históricos voluminosos. No reanudar automáticamente RUN, cámaras o permisos LAN al importar.

La importación debe preparar y validar todo antes de sustituir, conservar una copia del conjunto anterior y explicar cualquier incompatibilidad. Un ZIP que solo reúne referencias de localStorage no equivale a guardar toda la suite. La URL de compartir es una función aparte, con límites de tamaño y contenido; no debe confundirse con un enlace público que otro equipo pueda abrir sin instalar la suite.

### Tendencias y reproducción

El HMI actual conserva muestras acotadas en sesión. Un histórico persistente necesita retención, origen/calidad/tiempo/unidad y consultas acotadas. Exportar CSV por gráfica es útil, pero no equivale a implantar un SCADA industrial. La reproducción de tráfico debe empezar como análisis de archivos, con velocidades y timestamps explícitos; no retransmitir paquetes a equipos bajo la apariencia de reproducir una captura.

### Coherencia de lenguajes

SCL debe seguir explicando sus restricciones junto al código y permitir localizar el error. BI debe mostrar las funciones que realmente admite su motor; una lista genérica de funciones conocidas no acredita semántica compatible. Ampliar la ayuda no autoriza anunciar ST completo ni DAX completo.

## Nombres y difusión

Recomendación: renombrar primero solo el repositorio principal a `ab-suite-core`, actualizando remotos, descargas, procedencia, consumidores y enlaces. La decisión de ejecutar cambios de URLs se consulta al propietario; la recomendación no equivale a que estén renombrados. Los repositorios anteriores deben identificarse como antecedentes o distribuciones independientes, según su mantenimiento real.

Se mantienen aplazados los anuncios, vídeos promocionales, publicaciones y ofertas de consultoría no definidas por el propietario. Una grabación de documentación debe enseñar la ejecución real, sin tokens ni conexiones fingidas.

## Evidencia nueva

`tests/resident-signals.test.mjs` verifica proyección, autenticación, Origin, método de solo lectura, 503 y conservación de timestamps ante errores. `verify-resident-browser.cjs` cierra la pestaña PLC, comprueba ciclos y salida desde SCADA, simula pérdida del servicio con datos falsos recientes en otra pestaña y verifica caducidad y recuperación sin recurrir a esa caché.
