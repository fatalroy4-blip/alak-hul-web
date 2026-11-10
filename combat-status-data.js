/* Descripciones procedentes de estados.pdf aportado por el usuario. */
window.ALAK_COMBAT_STATES={
  "grappled": {
    "name": "Agarrado",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "La velocidad de una criatura agarrada es 0 y no puede aumentar por encima de ese valor.",
      "Este estado termina si quien agarra queda incapacitado (consulta Incapacitado).",
      "Este estado también termina si algún efecto aleja a la criatura de quien (o lo que) la tiene agarrada, como cuando el conjuro ola atronadora hace salir despedida a una criatura."
    ],
    "image": "assets/status-icons/grappled.svg"
  },
  "restrained": {
    "name": "Apresado",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "La velocidad de una criatura apresada es 0 y no puede aumentar por encima de este valor.",
      "Las tiradas de ataque contra la criatura tienen ventaja y las tiradas de ataque hechas por la criatura tienen desventaja.",
      "La criatura tiene desventaja en las tiradas de salvación de Destreza."
    ],
    "image": "assets/status-icons/restrained.svg"
  },
  "frightened": {
    "name": "Asustado",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "Una criatura asustada tiene desventaja en las pruebas de característica y tiradas de ataque mientras pueda ver a la fuente de su miedo.",
      "La criatura no puede acercarse a la fuente de su miedo voluntariamente."
    ],
    "image": "assets/status-icons/frightened.svg"
  },
  "stunned": {
    "name": "Aturdido",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "Una criatura aturdida está incapacitada (consulta el estado), no puede moverse y solo es capaz de hablar con voz entrecortada.",
      "La criatura falla automáticamente las tiradas de salvación de Fuerza y Destreza.",
      "Las tiradas de ataque contra la criatura tienen ventaja."
    ],
    "image": "assets/status-icons/stunned.svg"
  },
  "reckless": {
    "name": "Bárbaro: Ataque temerario",
    "origin": "Reglas básicas",
    "effect": "Neutral",
    "paragraphs": [
      "Tienes ventaja en las tiradas de ataque con armas cuerpo a cuerpo utilizando Fuerza, pero, a cambio, las tiradas de ataque que se hagan contra ti tienen ventaja hasta tu siguiente turno."
    ],
    "image": "assets/status-icons/reckless.svg"
  },
  "rage": {
    "name": "Bárbaro: Furia",
    "origin": "Reglas básicas",
    "effect": "Ventaja",
    "paragraphs": [
      "Consigues ventaja en las pruebas y TS de Fuerza. Al hacer ataques cuerpo a cuerpo usando Fuerza, consigues un bonificador al daño según tu nivel. Tienes resistencia al daño contundente, perforante y cortante. No puedes lanzar conjuros ni concentrarte."
    ],
    "image": "assets/status-icons/rage.svg"
  },
  "inspiration": {
    "name": "Bardo: Inspiración de bardo",
    "origin": "Reglas básicas",
    "effect": "Ventaja",
    "paragraphs": [
      "En los 10 minutos siguientes, puedes sumar el dado de inspiración a una prueba de característica, tirada de ataque o TS."
    ],
    "image": "assets/status-icons/inspiration.svg"
  },
  "exhaustion": {
    "name": "Cansancio",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "El documento proporcionado no incluye una descripción de este estado."
    ],
    "image": "assets/status-icons/exhaustion.svg"
  },
  "blinded": {
    "name": "Cegado",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "No puedes ver.",
      "Una criatura cegada no puede ver y falla automáticamente todas las pruebas de característica que requieran vista.",
      "Las tiradas de ataque contra la criatura tienen ventaja y las tiradas de ataque hechas por la criatura tienen desventaja."
    ],
    "image": "assets/status-icons/blinded.svg"
  },
  "concentration": {
    "name": "Concentración",
    "origin": "Reglas básicas",
    "effect": "Neutral",
    "paragraphs": [
      "Estás manteniendo la concentración para mantener los efectos de un conjuro. La concentración termina si: lanzas otro conjuro que requiera concentración, recibes daño (TS de Constitución CD 10 o mitad del daño recibido, lo que sea mayor) o si quedas incapacitado o mueres.",
      "Algunos conjuros exigen mantener la concentración si se quiere que su magia permanezca activa. Los conjuros de este tipo terminan si el personaje pierde la concentración.",
      "La actividad habitual de un combate, como moverse o atacar, no interfiere con la concentración, pero los siguientes sucesos sí que pueden romperla:",
      "Lanzar otro conjuro que necesite concentración. Dejarás de estar concentrado en un conjuro si lanzas otro que también requiera concentración. Por tanto, no puedes concentrarte en dos conjuros a la vez.",
      "Recibir daño. Cada vez que sufras daño mientras te concentras en un conjuro tendrás que hacer una tirada de salvación de Constitución para mantener la concentración. La CD será de 10 o la mitad del daño sufrido, lo que sea mayor. Si recibes daño de varios orígenes, como una flecha y el aliento de un dragón, deberás hacer una tirada de salvación por separado para cada fuente de daño.",
      "Quedar incapacitado o morir. Perderás la concentración si quedas incapacitado o mueres."
    ],
    "image": "assets/status-icons/concentration.svg"
  },
  "asleep": {
    "name": "Conjuro: Dormir",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "Permaneces inconsciente hasta que el conjuro termina, hasta que reciba daño o hasta que alguien la zarandee para que se despierte"
    ],
    "image": "assets/status-icons/asleep.svg"
  },
  "shield": {
    "name": "Conjuro: Escudo",
    "origin": "Reglas básicas",
    "effect": "Ventaja",
    "paragraphs": [
      "Obtienes +5 a la CA hasta tu próximo tu turno"
    ],
    "image": "assets/status-icons/shield.svg"
  },
  "shield-faith": {
    "name": "Conjuro: Escudo de fe",
    "origin": "Reglas básicas",
    "effect": "Ventaja",
    "paragraphs": [
      "Obtienes +2 a la Clase de Armadura"
    ],
    "image": "assets/status-icons/shield-faith.svg"
  },
  "hunters-mark": {
    "name": "Conjuro: Marca del cazador",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "Los ataques del lanzador del conjuro contra ti infligen 1d6 puntos de daño adicional y tiene ventaja en las pruebas de Sabiduría (Percepción y Supervivencia) para encontrarte."
    ],
    "image": "assets/status-icons/hunters-mark.svg"
  },
  "ray-frost": {
    "name": "Conjuro: Rayo de escarcha",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "Reduce tu velocidad en 10 pies hasta el siguiente turno del lanzador"
    ],
    "image": "assets/status-icons/ray-frost.svg"
  },
  "resistance": {
    "name": "Conjuro: Resistencia",
    "origin": "Reglas básicas",
    "effect": "Ventaja",
    "paragraphs": [
      "Una vez antes de que el conjuro termine, puedes tirar 1d4 y añadir el resultado a una tirada de salvación de su elección. Puede tirar el dado antes o después de hacer la TS. Entonces, termina el conjuro."
    ],
    "image": "assets/status-icons/resistance.svg"
  },
  "prone": {
    "name": "Derribado",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "Una criatura derribada solo podrá moverse arrastrándose, a no ser que se levante, terminando así el estado.",
      "La criatura tiene desventaja en las tiradas de ataque.",
      "Las tiradas de ataque contra la criatura tienen ventaja si el atacante está a 5 pies o menos de ella. Sin embargo, tienen desventaja si el atacante está a más distancia."
    ],
    "image": "assets/status-icons/prone.svg"
  },
  "deafened": {
    "name": "Ensordecido",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "Una criatura ensordecida no puede oír y falla automáticamente todas las pruebas de característica que requieran el oído."
    ],
    "image": "assets/status-icons/deafened.svg"
  },
  "poisoned": {
    "name": "Envenenado",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "Una criatura envenenada tiene desventaja en las tiradas de ataque y las pruebas de característica."
    ],
    "image": "assets/status-icons/poisoned.svg"
  },
  "dodge": {
    "name": "Esquiva",
    "origin": "Reglas básicas",
    "effect": "Ventaja",
    "paragraphs": [
      "Al realizar la acción de Esquivar, estás concentrándote únicamente en evitar los ataques.",
      "Hasta el principio de tu siguiente turno, todas las tiradas de ataque que te tengan como objetivo, y cuyo atacante puedas ver, tendrán desventaja. Además, realizarás las tiradas de salvación de Destreza con ventaja. Perderás estos beneficios si quedas incapacitado o si tu velocidad baja hasta 0."
    ],
    "image": "assets/status-icons/dodge.svg"
  },
  "charmed": {
    "name": "Hechizado",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "Una criatura hechizada no puede atacar ni elegir como objetivo de efectos dañinos o mágicos a quien la hechizó.",
      "Quien hechizó a la criatura tiene ventaja en las pruebas de característica para interactuar socialmente con ella."
    ],
    "image": "assets/status-icons/charmed.svg"
  },
  "incapacitated": {
    "name": "Incapacitado",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "Una criatura incapacitada no puede llevar a cabo acciones ni reacciones."
    ],
    "image": "assets/status-icons/incapacitated.svg"
  },
  "unconscious": {
    "name": "Inconsciente",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "Una criatura inconsciente está incapacitada (consulta el estado), no puede moverse o hablar y no es consciente de su entorno.",
      "La criatura deja caer cualquier cosa que esté sujetando y cae derribada.",
      "La criatura falla automáticamente las tiradas de salvación de Fuerza y Destreza.",
      "Las tiradas de ataque contra la criatura tienen ventaja.",
      "Todos los ataques que impacten a la criatura son críticos si el atacante está a 5 pies o menos de ella."
    ],
    "image": "assets/status-icons/unconscious.svg"
  },
  "invisible": {
    "name": "Invisible",
    "origin": "Reglas básicas",
    "effect": "Ventaja",
    "paragraphs": [
      "Es imposible ver a una criatura invisible sin la ayuda de magia o sentidos especiales. En lo que a esconderse respecta, se considera que la criatura se encuentra en una zona muy oscura, aunque se puede determinar su ubicación si esta hace algún ruido o deja huellas.",
      "Las tiradas de ataque contra la criatura tienen desventaja y las tiradas de ataque hechas por la criatura tienen ventaja."
    ],
    "image": "assets/status-icons/invisible.svg"
  },
  "dying": {
    "name": "Muriendo",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "Si el daño que no te mata te reduce a 0 puntos de golpe, caes inconsciente y comienzas a morir.",
      "Si recibes sanación, inmediatamente recuperas la consciencia y dejas de morir.",
      "Cuando estás muriendo, al inicio de cada uno de tus turnos realizas una tirada de salvación contra muerte. Tira un d20 sin sumar ningún modificador.",
      "Si sacas 10 o más es un éxito, 9 o menos es un fallo.",
      "En tu tercer éxito te estabilizas.",
      "En tu tercer fallo mueres.",
      "Sacar 1 en la tirada cuenta como 2 fallos.",
      "Sacar 20 en la tirada inmediatamente te recupera 1 punto de golpe.",
      "Pueden estabilizarte utilizando la acción de Estabilizar y superando una prueba de Sabiduría (Medicina) CD 10.",
      "Una vez estable recuperas 1 punto de golpe después de 1d4 horas."
    ],
    "image": "assets/status-icons/dying.svg"
  },
  "paralyzed": {
    "name": "Paralizado",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "No puedes hacer nada.",
      "Una criatura paralizada está incapacitada (consulta Incapacitado) y no puede moverse ni hablar.",
      "La criatura falla automáticamente las tiradas de salvación de Fuerza y Destreza.",
      "Las tiradas de ataque contra la criatura tienen ventaja.",
      "Todos los ataques que impacten a la criatura son críticos si el atacante está a 5 pies o menos de ella."
    ],
    "image": "assets/status-icons/paralyzed.svg"
  },
  "petrified": {
    "name": "Petrificado",
    "origin": "Reglas básicas",
    "effect": "Desventaja",
    "paragraphs": [
      "Una criatura petrificada es transformada, junto con todos los objetos no mágicos que lleve encima o tenga puestos, en una sustancia sólida e inanimada (normalmente piedra). Su peso se multiplica por diez y deja de envejecer.",
      "La criatura está incapacitada (consulta el estado), no puede moverse o hablar y no es consciente de su entorno.",
      "La criatura falla automáticamente las tiradas de salvación de Fuerza y Destreza.",
      "Las tiradas de ataque contra la criatura tienen ventaja.",
      "La criatura tiene resistencia contra todo el daño.",
      "La criatura es inmune al veneno y la enfermedad. Sin embargo. cualquier enfermedad o veneno que ya estuviera presente en su cuerpo queda suspendido, pero no neutralizado."
    ],
    "image": "assets/status-icons/petrified.svg"
  },
  "downed": {
    "name": "Caído · 0 PG",
    "origin": "Indicador de combate",
    "effect": "Desventaja",
    "paragraphs": [
      "Tiene 0 puntos de golpe, pero no está muerto. Puede estar muriendo o estabilizado; revisa su situación antes de realizar salvaciones contra muerte. Recuperar puntos de golpe retira esta marca."
    ],
    "image": "assets/status-icons/dying.svg"
  }
};
