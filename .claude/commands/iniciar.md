---
description: Inicializa la sesión, lee el último estado guardado y propone con qué continuar
---

# /iniciar — Apertura de sesión y sincronización de estado

Al iniciar una nueva sesión (cuando el usuario escriba `/iniciar`, `/abrir` o al comenzar un nuevo hilo), realiza los siguientes pasos en orden:

## 1. Leer el estado vivo y la memoria del proyecto

1. Abre y lee el archivo `estado-catalogo.md` para entender en qué quedó la última sesión.
2. Consulta el log de Git (`git log -1`) para verificar el último commit y compararlo con el ancla del último cierre.
3. Revisa la base de datos si es necesario para confirmar el estado de los productos (tiendas, marcas y categorías).

## 2. Reportar resumen de la última sesión

Presenta al usuario un resumen directo con:
- La fecha del último cierre registrado y el commit de referencia.
- Qué se completó en la sesión anterior.
- Estado actual de las memorias clave si aplica.

## 3. Recomendaciones y Siguientes Pasos

Propón una lista priorizada de 2 o 3 tareas concretas para continuar hoy, ordenadas por relevancia:
- Ej. Si quedaron scripts pendientes de testear o auditar.
- Ej. Si el catálogo tiene gaps o marcas sin clasificar según `estado-catalogo.md`.
- Ej. Validaciones pendientes de commits o builds.

---

*Este comando ayuda a retomar el contexto rápidamente y evitar duplicar esfuerzos entre sesiones.*
