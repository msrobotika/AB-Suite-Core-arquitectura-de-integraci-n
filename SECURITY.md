# Seguridad y divulgación responsable

AB-Suite Core **no controla maquinaria**. Es una infraestructura local de laboratorio para compartir eventos entre aplicaciones. No incluye PLC físico, seguridad funcional ni comunicaciones remotas.

- Enlace exclusivo a 127.0.0.1.
- Credenciales Bearer efímeras de 256 bits para cada aplicación.
- Permisos de publicación por tema, tamaño y formato; monitor solo lectura.
- Validación Host/Origin/Sec-Fetch-Site.
- Sin persistencia ni TLS, no utilizarlo como bus de planta o sistema de decisión de seguridad.
- No exponer el puerto mediante proxy inverso, túnel, Docker público, firewall NAT o port forwarding.
- No pegar tokens ni pantallazos de tokens en incidencias.
- El histórico en memoria contiene datos de eventos y no debe recibir secretos, imágenes originales ni datos personales.
- Cualquier cambio que permita comandos industriales requiere análisis de amenazas y diseño específico de seguridad, fuera del alcance de esta versión.

Para comunicar un fallo de seguridad usa una comunicación privada con el mantenedor a través de GitHub, evitando hacer públicos detalles explotables o credenciales.
