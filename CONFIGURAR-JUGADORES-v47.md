# Alak Hul — Activación multijugador (V47)

Esta etapa incluye las interfaces, hojas individuales y panel administrativo. GitHub no publica las reglas de Firestore automáticamente. Hasta publicar las reglas y registrar el propietario, el guardado de jugadores y el panel pueden mostrar errores de permisos.

## 1. Publicar las reglas

En Firebase Console, proyecto alak-hul-web, abre Firestore Database → Reglas. Revisa las reglas existentes y combina con el archivo firestore-multijugador.rules, preservando otras rutas legítimas. Publica las reglas resultantes. No sustituyas reglas desconocidas sin revisión.

- users/{uid}/characters/{characterId}: hoja original privada de Alak Hul
- players/{uid}: hoja personal nueva, editable por su dueño o administradores
- appRoles/{uid}: propietario, DM, jugador

## 2. Otorgar tu rol de propietario (obligatorio una sola vez)

1. Visita https://alak-hul-web.vercel.app/admin-jugadores.html y entra con Google.
2. Copia el UID que aparece en la pantalla si faltan permisos.
3. En Firestore → Datos, crea la colección appRoles y documento ID exactamente ese UID.
4. Añade campo de tipo string llamado role, valor owner.
5. Actualiza admin-jugadores.html para ver la mesa.

La primera cuenta owner debe establecerse desde la consola de Firebase. Permitir autoasignación desde la web sería inseguro.

## 3. Compartir con jugadores

Envía https://alak-hul-web.vercel.app/jugador.html. Cada persona entra con Google y crea una hoja completamente vacía. Puede personalizar portada, retrato y botones, agregar Trucos y conjuros, Metamagia y otras habilidades y administrar su combate personal. Los datos se separan por UID y nunca reescriben la hoja existente de Alak Hul.

## 4. Supervisar

Abre Configuración → Panel de jugadores en Alak Hul. Verás los jugadores registrados, nombre, clase, progreso aproximado, conjuros, rasgos y fecha de última modificación. Pulsa Ver / editar hoja para revisar campos. Solo propietario puede asignar o quitar DM; el DM puede ver y editar las hojas, no otorgar permisos.

## Limitaciones

- El combate personal funciona, pero el combate simultáneo compartido aún no está habilitado.
- El progreso es una referencia aproximada, no la validación completa de las reglas de D&D.
- La compresión de imágenes permite guardar retratos y fondos compactos, sujetos al límite de documento de Firestore.
- Las reglas de seguridad deben publicarse y probarse con dos cuentas antes de invitar a toda la mesa.
