# Alak Hul — Fase 1: campaña multijugador (diseño de implementación)

Estado: diseño inicial en rama `multijugador-fase-1`. **No está habilitado en producción.** La versión `main` y su guardado de Firebase continúan sin cambios.

## Objetivo

Convertir la web actual `alak-hul-web.vercel.app` en una aplicación multijugador para una mesa de unas seis personas. Cada participante inicia sesión con Google, mantiene hoja/conjuros/rasgos/fondo privados y participa en un combate compartido con actualizaciones en tiempo real. El propietario de la campaña y su Dungeon Master administran los datos compartidos. El DM no adquiere acceso automático a las hojas privadas.

## Separación obligatoria de datos

- `users/{uid}/characters/{characterId}`: ficha privada del usuario. Solo `uid` puede leer/escribir.
- `users/{uid}/preferences/visuals`: preferencias privadas de apariencia, fondo y portada; solo `uid`. No emitirlas a listeners de combate.
- `campaigns/{campaignId}`: metadatos mínimos, `ownerUid`, título, estado. ID no secuencial.
- `campaigns/{campaignId}/members/{uid}`: `role=owner|dm|player`, `status=active`. Solo owner puede conceder `dm` o quitar un administrador. Ningún usuario se asciende a sí mismo.
- `campaigns/{campaignId}/joinRequests/{uid}`: solicitud de acceso de usuario autenticado; pendiente hasta aprobación. Conocer el enlace no da lectura de combate.
- `campaigns/{campaignId}/battles/{battleId}`: combate compartido, turno actual, estado. Legible por miembros activos, editable por owner/DM.
- `campaigns/{campaignId}/battles/{battleId}/participants/{participantId}`: información visible: alias, retrato público opcional, iniciativa, PG visibles, daño, curación, estado y orden. No copiar atributos/conjuros privados.

## Permisos

| Función | Jugador | Owner / DM |
| --- | --- | --- |
| Ver y editar su propia hoja | Sí | Solo la propia |
| Ver las hojas ajenas | No | No, salvo consentimiento explícito en una fase posterior |
| Cambiar su fondo | Sí | Solo el propio |
| Solicitar acceso a una campaña | Sí | Sí |
| Ver combate y participantes | Sí, si es miembro aprobado | Sí |
| Editar combate, enemigos, iniciativa, PG compartidos | No | Sí |
| Aprobar solicitudes | No | Sí |
| Nombrar o revocar DM | No | Solo propietario |

## Compatibilidad con la versión existente

- Mantener intacto `users/{uid}/characters/alak-hul` hasta comprobar migración.
- El documento de personaje actual mezcla `state.combat`, `state.selected` y `state.selectionOrder` con el resto de la ficha. El sistema multijugador NO debe emitir ese objeto íntegro al resto de jugadores ni escribir encima de la ficha local cuando llega un evento compartido.
- Mantener la pestaña de Personaje, Conjuros, Canalizar Divinidad, Configuración y portada inicial; añadir pestaña `Campañas` y el combate compartido solo cuando las reglas estén verificadas.
- Revisar referencias fijas al personaje `Roger` y reemplazarlas por un ID de personaje del usuario en el contexto multijugador. La hoja antigua de Alak Hul debe seguir funcionando.
- Sincronizar fondos por usuario, no por campaña. Imágenes grandes pueden agotar el límite de documento; evaluar almacenamiento de imágenes separado de Firestore para producción.

## Orden de implementación

1. Crear una rama segura de desarrollo y especificar permisos (esta fase).
2. Crear reglas nuevas de Firestore combinadas con las reglas actuales, nunca sustituir las actuales sin revisar su contenido. Probar que un usuario no acceda a fichas ni campañas ajenas, que un jugador no se asigne rol DM y que owner/DM sí puedan operar el combate.
3. Crear interfaz de Campañas: crear, solicitar ingreso, aprobar miembros, asignar DM.
4. Separar la persistencia del combate de los datos de la hoja y enlazarla con Firestore `onSnapshot`. Resolver ediciones simultáneas con transacciones o escrituras por documento.
5. Probar con dos cuentas Google distintas antes de invitar al grupo; verificar también reconexiones y recuperación de datos.
6. Integrar en `main` y desplegar con Vercel solo después de publicar reglas seguras en Firebase.

## Aclaraciones

- La conexión a GitHub permite modificar el código de la web. El rol `dm` permite administrar la campaña **dentro de la aplicación**; no otorga permisos de edición del repositorio en GitHub.
- Las reglas Firestore existentes se publican desde Firebase o Firebase CLI, no por el mero hecho de actualizar GitHub/Vercel.
- En esta fase no hay cambios visibles de producción. Es deliberado: evitar exposición de fichas y preservar el progreso actual.
