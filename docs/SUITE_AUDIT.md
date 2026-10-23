# Revisión de producto y correcciones

Revisión de las nueve aplicaciones de la suite y el núcleo, sobre las revisiones registradas en `apps/sources.json`. Se distingue lo observado en el código de los recorridos ejecutados. No se afirma que toda capacidad histórica de cada producto se haya probado en hardware o que la suite sea una edición comercial certificada.

| Aplicación | Incoherencia encontrada | Corrección en la suite | Verificación |
| --- | --- | --- | --- |
| Entrada general | Repositorios, HTML portables, URLs y lanzadores distintos; tres motores Python no eran HTML autónomos | Un lanzador, catálogo y origen; servicios gestionados; separación Abrir/Exportar | Apertura de las nueve herramientas y recursos de navegador |
| PLC | La demo clásica y el laboratorio tenían CPUs distintas; editor y telemetría podían referirse a ejecuciones diferentes | Entrada centrada en una CPU de servidor; editor KOP y JSON cargan esa CPU; persistencia de configuración | Pruebas de CPU/red y comparación con Modbus |
| KOP | Integración por archivo y restauraciones/importaciones que borraban el historial de edición | Transferencia al PLC y señales HMI; importación y ejemplo recuperables con Deshacer | Ejecución de red real, motor y transferencia |
| SCL | Conversor limitado, sin borrador persistente ni transferencia integrada | Guardado de borrador, verificación previa, exportación/transferencia del KOP y señales HMI | Equivalencia de motor e importación en PLC |
| GRAFCET | Publicación mediante conector aparte; restaurar proyecto descartaba recuperación | Señales de etapas/acciones en navegador e historial al reemplazar proyecto | Motor, etapas publicadas y pruebas del adaptador anterior |
| SCADA | Sinóptico fijo de ocho estaciones, varias sin correspondencia con la telemetría | Editor de pantallas desde vacío; componentes vinculables; calidad, umbrales, tendencias y proyecto versionado | Vinculación a KOP, cambios, caducidad, deshacer, persistencia e importación inválida |
| Modbus | Motor local separado y configuración manual para enlazar con el PLC | Arranque común y botón que configura lecturas de la CPU de la suite; resultado fallido invalidado | Lectura FC03 auténtica y comparación FC01 con CPU |
| Serial | Arranque y sesión independientes | Motor gestionado, misma barra, captura/exportación y contadores para HMI | Captura de laboratorio, decodificación y CSV; pruebas de protocolo/red |
| Vision | Entrada estática podía mostrar funciones IP sin el servicio requerido | Adaptador IP gestionado por el acompañante; inspección local y resultados para HMI | Inspección de imagen, núcleo de visión y pruebas del adaptador HTTP simulado |
| BI | Inicio/reinicio centrado en la demo, único modelo persistente e importación que añadía tablas a ese modelo | Biblioteca de espacios, inicio vacío, importación con destino y transacción, demo/proyectos como espacios nuevos, SQL/expresiones/gráficos propios | Recorrido con CSV propio, SQL, visualización, cambio/reapertura, rechazo de archivo inválido y captura CPU |
| Diseño | Paletas, controles y navegación sin una base única | Sistema visual común, acentos por herramienta, barra, guías y adaptación móvil | Capturas de escritorio/móvil y recorridos funcionales |

## Qué se conserva

Los motores de programación, protocolo, metrología y análisis son los originales, con sus límites documentados. La mejora no reemplaza un motor por gráficos simulados. Las licencias y avisos de terceros permanecen con cada aplicación.

## Límites que siguen siendo explícitos

- SCL es BOOL combinacional; KOP/GRAFCET implementan sus subconjuntos educativos. No son compiladores de fabricantes.
- El HMI nuevo ofrece cuatro componentes, rejilla adaptable, pantallas, propiedades y tendencias; no pretende incluir aún toda una biblioteca de gráficos vectoriales, animaciones o scripting HMI.
- Las señales de navegador requieren origen y almacenamiento comunes. No son un broker industrial distribuido.
- Serial físico, cámaras reales y equipos de red requieren validación específica. Las pruebas aquí usan laboratorio y dobles controlados.
- Los espacios BI se seleccionan en un motor local de un usuario. Una pestaña con otro espacio no puede escribir silenciosamente sobre el activo. No se ofrece colaboración multiusuario.
- Los proyectos de cada disciplina conservan sus propios formatos; no se afirma que exista un archivo único que restaure todos los estados de todos los motores.

Estas restricciones forman parte del producto y de su documentación. Ampliar cada capacidad exige el estándar de creación y una prueba de uso propia, no añadir controles decorativos.
