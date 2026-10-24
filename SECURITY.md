# Seguridad y divulgación responsable

Esta política cubre la distribución integrada de AB Suite. El Core aislado es un bus en memoria; la suite incluye además proyectos persistentes, CPU virtual, BI, comunicaciones y cámaras opcionales. No es un controlador certificado ni un servicio de planta.

## Reportar de forma privada

Usa [Report a vulnerability de GitHub](https://github.com/msrobotika/AB-Suite-Core-arquitectura-de-integraci-n/security/advisories/new) cuando esté habilitado. Si GitHub no ofrece esa opción, abre una incidencia **Solicitud de canal privado de seguridad**, sin detalles explotables, y acuerda con el mantenedor un canal privado antes de enviar la reproducción. No se anuncia un correo inexistente ni un plazo de respuesta sin respaldo.

Incluye versión/commit, sistema, pasos mínimos, impacto y datos sintéticos por el canal acordado. Nunca envíes tokens, contraseñas, imágenes privadas ni direcciones de instalaciones reales en una incidencia pública.

## Controles y límites

- Servicios en loopback; APIs protegidas con secretos efímeros; validación Host/Origin y bloqueo cross-site. No exponer mediante túnel, proxy o redirección de puertos.
- Core valida identidad, tema, tipos, profundidad y tamaño; el monitor no publica. Los tipos compartidos no sustituyen la validación de JSON recibido.
- Modbus usa IPv4 literal o localhost, sin DNS/IPv6. RFC1918 requiere permiso explícito; bloquea IP pública y link-local. Solo FC01–04, sin PDU arbitrarias ni escritura remota; plazo total y recursos acotados. Editar memoria del laboratorio afecta únicamente al simulador local.
- Vision exige IPv4 RFC1918 y aprobación. Bloquea loopback, link-local, IP pública, DNS, URLs arbitrarias y rutas inválidas. No sigue redirects. JPEG/MJPEG con tamaño limitado y timeout de socket. HTTPS valida certificados; HTTP Basic sin TLS no cifra credenciales LAN.
- Autorizar una IP privada no demuestra que sea una cámara ni elimina el abuso de un destino autorizado. No hay aislamiento frente a procesos del mismo usuario o extensiones maliciosas. Vision aún necesita endurecimiento del plazo total frente a goteo de datos y del límite de manejadores HTTP; no afirmar protección completa contra denegación de servicio.

## Persistencia y privacidad

`.suite-data` guarda espacios BI y programa de CPU. El navegador conserva documentos y ocho puntos de vuelta por herramienta. Vision puede guardar la imagen/receta en su documento local: no afirmar que todas las imágenes permanecen solo en RAM. Los proyectos no incluyen contraseñas de cámara ni permisos LAN. Una captura Serial recuperada es un archivo de lectura.

El histórico del Core permanece en memoria. No publicar secretos, imágenes originales ni datos personales como eventos. Una señal ausente/caducada es desconocida, nunca cero. Los resultados de visión no autorizan rechazo de piezas ni decisiones de seguridad.

Los tests de cada motor están en `apps/<id>/tests`. La [revisión de auditoría](docs/AUDIT_FOLLOWUP.md) distingue controles existentes y pendientes. No hay auditoría externa de seguridad ni certificación industrial.
