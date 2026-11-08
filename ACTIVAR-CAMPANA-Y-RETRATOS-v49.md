# Alak Hul V49 — Hoja D&D, campaña compartida y protección de retratos

Esta versión lleva los cambios a GitHub/Vercel, pero **una parte requiere activar manualmente nuevas reglas de seguridad en Firebase Console**. El archivo firestore-multijugador.rules NO se publica por sí solo desde GitHub.

## Qué cambia

- Cada cuenta conserva su documento individual en Firestore: players/{UID}. No comparte la hoja de Alak Hul.
- La ficha de Personaje reutiliza la estructura visual original de la hoja D&D de Alak Hul, con 246 campos vacíos. Los valores quedan separados por UID.
- Se conserva la portada genérica personalizada por usuario. El botón Personaje muestra el retrato propio.
- En Trucos y conjuros hay un catálogo de los 65 conjuros disponibles actualmente en la aplicación de Alak Hul, con búsqueda, selección, preparación y espacios configurables de niveles 1 a 9. También admite conjuros personalizados. El catálogo completo de todas las clases de D&D no está incorporado todavía.
- Se puede cambiar el nombre del botón Rasgos desde Personalizar.
- El botón Combate del nuevo portal se sustituye por **Campaña · Multijugador**.
- Propietario, DM y jugador usan la misma interfaz de Mesa compartida: participantes, rondas, iniciativa, PG y crónica. Datos comunes en campaigns/main; los jugadores pueden ver y propietario/DM editar.
- El propietario sigue viendo su combate histórico como sección local contraída; sus controles anteriores no se fusionan automáticamente con el nuevo documento de campaña.
- En el portal de jugador, la imagen del retrato y del botón Personaje solo puede cambiarla la cuenta propietaria del personaje o la cuenta con rol owner. El DM ve el control bloqueado.

## Paso obligatorio: publicar reglas de seguridad V49

1. Entra a https://console.firebase.google.com/project/alak-hul-web/firestore/databases/-default-/security/rules .
2. Haz copia local de las reglas que estén publicadas.
3. Abre https://github.com/fatalroy4-blip/alak-hul-web/blob/main/firestore-multijugador.rules cuando esta versión se publique, o usa el archivo de la rama de desarrollo.
4. Sustituye las reglas por el archivo completo revisado y confirma que conserva:
   - users/{uid}/characters/{characterId}: lectura/escritura solo por el mismo UID, para alak-hul
   - players/{uid}: solo el titular y owner pueden cambiar portrait y tileImages.sheet; el DM puede ajustar los demás datos
   - campaigns/main: lectura de roles autorizados; edición solo de DM y owner
   - appRoles/{uid}: solo owner administra roles
5. Comprueba la sintaxis y publica.
6. Abre el portal con la cuenta de Rogelio y comprueba que la ficha carga, pero que la página original de Alak Hul permanece bloqueada.
7. Como owner, abre Campaña. Si campaigns/main no existe, la app debe crearla automáticamente.
8. Desde admin-jugadores.html entra a la mesa y agrega a los jugadores registrados.
9. Verifica con dos cuentas distintas: un jugador debe ver la misma ronda/PG que el propietario, pero sin botones para alterar la campaña o el retrato de otro personaje.

## Seguridad y datos

El documento original de Alak Hul NO se modifica. Las reglas deben publicarse para que el bloqueo del retrato sea efectivo en el servidor; deshabilitar el selector en HTML no basta.

La miniatura usa el campo portrait o tileImages.sheet del documento personal; para impedir que DM la sustituya, las reglas comparan el valor previo y posterior de ambos campos. El propietario puede actualizarla.

Los cambios en el sitio se guardan en una rama antes de publicar. La publicación web por GitHub/Vercel y la publicación de reglas Firestore son dos procedimientos diferentes.

## Limitaciones

- La Mesa compartida es una primera implementación funcional. No sincroniza automáticamente las herramientas de combate históricas de Alak Hul, conservadas como vista local.
- El catálogo integrado se basa en los 65 conjuros ya disponibles, no todas las clases y expansiones de D&D.
- No se han realizado pruebas de integración con cuentas ajenas (Hugo y Arely aún sin registrar).
- La protección privada de los datos en Firestore no impide que se inspeccionen recursos estáticos de una web pública, que siguen siendo públicos.
