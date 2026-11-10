/* Character choices for the 2014 rules. Racial grants do not consume class choices. */
(function(){
 const tables={
  bardo:[4,5,6,7,8,9,10,11,12,14,15,15,16,18,19,19,20,22,22,22],
  brujo:[2,3,4,5,6,7,8,9,10,11,11,12,12,13,13,14,14,15,15,15],
  hechicero:[2,3,4,5,6,7,8,9,10,11,12,12,13,13,14,14,15,15,15,15],
  explorador:[0,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11],
  third:[0,0,3,4,4,4,5,6,6,7,8,8,9,10,10,11,11,11,12,13]
 };
 function policy(b,scores={}){
  const n=Math.max(1,Math.min(20,Number(b.level)||1)),id=b.classId;
  const third=(id==='guerrero'&&b.subclassId==='eldritchknight')||(id==='picaro'&&b.subclassId==='arcanetrickster');
  const cast=third?n>=3:['bardo','brujo','clerigo','druida','hechicero','mago'].includes(id)||(['paladin','explorador'].includes(id)&&n>=2);
  let cantrips=cast?({bardo:2,brujo:2,clerigo:3,druida:2,hechicero:4,mago:3}[id]||0):0;
  if(cantrips)cantrips+=(n>=4?1:0)+(n>=10?1:0);
  if(third&&n>=3)cantrips=(id==='picaro'?3:2)+(n>=10?1:0);
  let slots=window.ALAK_RULES_2014.spellSlots(id,n);
  if(third)slots=n<3?[]:window.ALAK_RULES_2014.spellSlots('mago',Math.ceil(n/3));
  const stat=id==='paladin'?'cha':id==='mago'?'int':'wis',raw=scores[stat],mod=raw===undefined||raw===null?null:Math.floor((Number(raw)-10)/2);
  let count=cast?(tables[third?'third':id]?.[n-1]??null):0,kind='conjuros conocidos';
  if(['clerigo','druida','paladin','mago'].includes(id)&&cast){kind='conjuros preparados';count=mod===null?null:Math.max(1,(id==='paladin'?Math.floor(n/2):n)+mod);}
  const extras=[];
  const add=(title,level,source)=>extras.push({title,level,source,extra:true});
  if(b.raceId==='gnomo'&&b.subraceId==='bosque')add('Ilusión menor',0,'Gnomo de los bosques');
  if(b.raceId==='tiflin'&&b.subraceId!=='zariel'){add('Taumaturgia',0,'Legado infernal');if(n>=3)add('Reprensión infernal',1,'Legado infernal · 1/descanso largo, a nivel 2');if(n>=5)add('Oscuridad',2,'Legado infernal · 1/descanso largo');}
  if(id==='clerigo'&&b.subclassId==='light')add('Luz',0,'Dominio de la Luz');
  const hints=[];
  if(b.raceId==='elfo'&&b.subraceId==='alto')hints.push('Alto elfo: elige además 1 truco de mago en Conjuros → Raza / linaje; no consume tus trucos de clase.');
  if(id==='druida'&&b.subclassId==='land'&&n>=2)hints.push('Círculo de la Tierra: elige 1 truco adicional de druida y los conjuros de tu terreno; se gestionan con origen Subclase.');
  if(id==='brujo')hints.push('Los conjuros ampliados del patrón son opciones para aprender, no conjuros conocidos gratuitos. '+(n>=3?'Pacto del Tomo permite elegir 3 trucos adicionales de cualquier clase. ':'' )+'Los espacios de pacto se recuperan tras un descanso corto o largo.');
  if(id==='mago')hints.push('Libro: 6 conjuros de nivel 1 al comenzar, más 2 por cada nivel de mago posterior; los copiados son adicionales. Preparados y conjuros del libro son cantidades distintas.');
  if(id==='bardo'&&n>=10)hints.push('Secretos mágicos está incluido en los conocidos; los 2 adicionales del Colegio del Saber a nivel 6 no cuentan en ese límite.');
  if(third)hints.push(id==='picaro'?'Incluye Mano de mago. Conjuros: encantamiento o ilusión, salvo las elecciones libres de niveles 3, 8, 14 y 20.':'Conjuros: abjuración o evocación, salvo las elecciones libres de niveles 3, 8, 14 y 20.');
  if(['clerigo','druida','paladin'].includes(id))hints.push('Los conjuros concedidos como siempre preparados por tu especialización no consumen el límite de preparados.');
  return {cantrips,count,kind,slots,extras,hints,cast,third,stat};
 }
 window.ALAK_PLAYER_GUIDANCE={policy};
})();
