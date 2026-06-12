---
description: Guarda el contexto de la sesión en la memoria persistente y reporta resumen + pendientes
---

# /cerrar — Cierre de sesión y actualización de memoria

Al ejecutar este comando, realiza los siguientes pasos en orden:

## 1. Resumen de la sesión

Genera un resumen breve de lo que se hizo en esta sesión:
- Qué archivos se crearon o modificaron
- Qué scripts se ejecutaron y cuál fue el resultado
- Qué decisiones técnicas se tomaron y por qué
- Estado actual del catálogo (productos por tiendas si se ran scripts de matching)
- Qué quedó pendiente

## 2. Actualizar el estado vivo del catálogo

Actualiza `estado-catalogo.md` **en el mismo archivo** (nunca crear uno nuevo con fecha en el nombre):
- Primera línea del cuerpo: `Último cierre: <fecha>, commit <hash corto de git log -1>` — este ancla permite detectar memoria desactualizada al abrir.
- Distribución actual de productos por tiendas (si corrieron scripts de matching, consultar la BD viva).
- Pendientes vigentes; eliminar los ya completados.

## 3. Actualizar otras memorias relevantes

Revisa si alguna de las siguientes categorías de memoria debe crearse o actualizarse en `C:\Users\joseu\.claude\projects\E--soloWeed\memory\`:

- **feedback**: Si el usuario corrigió un enfoque, aprobó una decisión no obvia, o pidió no repetir algo
- **project**: Si cambió el estado del catálogo, se completó una fase, o hay nueva información sobre el proyecto
- **user**: Si se reveló algo nuevo sobre las preferencias o conocimiento técnico del usuario
- **reference**: Si se identificó un archivo, script o recurso externo nuevo que vale recordar

Para cada memoria nueva o actualizada:
1. Escribe el archivo `.md` en la carpeta de memoria con el frontmatter correcto (name, description, metadata.type)
2. Agrega o actualiza la línea correspondiente en `C:\Users\joseu\.claude\projects\E--soloWeed\memory\MEMORY.md`

Antes de crear una memoria nueva, revisa si una existente ya cubre el tema — en ese caso **actualízala** en lugar de duplicar. Si una memoria quedó obsoleta o resultó incorrecta, elimínala (archivo + línea del índice).

## 4. Verificar MEMORY.md

Asegúrate de que `MEMORY.md` esté actualizado, tenga máximo 200 líneas, que cada línea apunte a un archivo que existe, y que cada entrada sea concisa con el formato:
```
- [Título](archivo.md) — descripción de una línea
```

## 5. Reportar al usuario

Muestra al usuario:
- Un resumen de 3-5 bullets de lo que se hizo en la sesión
- Qué memorias se crearon o actualizaron (con el nombre del archivo)
- Cualquier tarea pendiente para la próxima sesión

---

*Este comando es de lectura obligatoria al iniciar cada sesión si existe trabajo en curso.*
