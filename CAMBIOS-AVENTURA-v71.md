# Herramientas de aventura · v71

- Dados digitales (1–50 dados d3/d4/d6/d8/d10/d12/d20/d100), resultados individuales, total y representación SVG.
- Fuente de magia y Metamagia 2014: contador, gasto, conversiones validadas y espacios temporales que desaparecen tras un descanso largo.
- Campaña > Dirección: propietario y DM seleccionan destinatarios para descanso o nuevo nivel. Los avisos visuales y sonoros se comparten con las cuentas admitidas conectadas.
- Cada personaje aplica las órdenes en una transacción sobre su propia hoja, con identificadores persistentes para evitar repeticiones. Las órdenes pendientes se aplican al abrir la hoja propia; el nuevo nivel deja pendiente la revisión de rasgos, PG y elecciones.
- El descanso recupera PG, espacios, puntos de hechicería y salvaciones. Los recursos personalizados escritos como texto requieren revisión manual. El DM confirma que se cumplen las condiciones del descanso.
- Sonidos de avisos con control independiente. Requieren interacción previa y que el navegador permita audio; el aviso visual permanece disponible.
- Retrato ampliable con teclado o clic. Diálogos conservan el desplazamiento al abrir/cerrar y se cierran tocando fuera.
- Última sección y desplazamiento por cuenta y hoja en el mismo navegador. No cambia datos compartidos.
- Símbolo personal eliminado; cálculos y CA movidos a Configuración, con casillas en el creador. Incluye la hoja histórica de Alak Hul.

## Validación

`node tests/adventure-rules.cjs` comprueba reglas puras, límites de conversión, espacios temporales, descanso y progresión.

Además se verificó con navegador local y Firebase simulado: DM + jugador + segunda pestaña, destinatarios, repetición de eventos, aviso/audio, conversiones, CA/configuración, dados, retrato, pop-ups, navegación al recargar y adaptación a móvil horizontal. La hoja histórica se probó con su adaptador de nube, descanso, nivel y persistencia. No se ejecutaron acciones sobre personajes reales durante las pruebas.
