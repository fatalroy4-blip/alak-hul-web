/* Pure sheet operations. Shared by personal controls and idempotent campaign events. */
(()=>{
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const cost=[0,2,3,5,6,7];
 function level(m){return Math.max(1,Math.min(20,Number(m.fields?.level||m.ruleBuild?.level||String(m.sheet?.classLevel||'').match(/\d+/)?.[0])||1));}
 function sorcerer(m){const k=norm(m.fields?.className||m.sheet?.classLevel);return /hechicero/.test(k)||m.ruleBuild?.classId==='hechicero'?level(m):0;}
 function points(m){const n=sorcerer(m),max=n>=2?n:0;return {max,available:Math.max(0,Math.min(max,Number(m.sorcery?.available??max)))};}
 function apply(original,action){
  const m=structuredClone(original);m.fields??={};m.sheet??={};m.slots??={};m.sorcery??={};
  const p=points(m),lv=Number(action.level),slot=m.slots[lv]||{total:0,used:0};
  if(['spend','create','convert'].includes(action.type)){
   if(!p.max)throw Error('Fuente de magia está disponible desde el nivel 2 de hechicero.');
   if(action.type==='spend'){const n=Number(action.amount);if(!Number.isInteger(n)||n<1||n>p.available)throw Error('No tienes suficientes puntos disponibles.');m.sorcery.available=p.available-n;}
   if(action.type==='create'){
    if(!Number.isInteger(lv)||lv<1||lv>5||cost[lv]>p.available)throw Error('No puedes crear ese espacio con tus puntos disponibles.');
    if(slot.total>=30)throw Error('El contador admite hasta 30 espacios por nivel.');
    m.sorcery.available=p.available-cost[lv];m.sorcery.temporary??={};m.sorcery.temporary[lv]=(m.sorcery.temporary[lv]||0)+1;m.slots[lv]={total:slot.total+1,used:slot.used};
   }
   if(action.type==='convert'){
    if(!Number.isInteger(lv)||lv<1||lv>9||slot.total-slot.used<1)throw Error('No tienes un espacio disponible de ese nivel.');
    if(p.available+lv>p.max)throw Error('La conversión superaría tu máximo de puntos de hechicería.');
    m.sorcery.available=p.available+lv;m.slots[lv]={...slot,used:slot.used+1};
   }
  }
  if(action.type==='rest'){
   for(const [n,s] of Object.entries(m.slots)){s.total=Math.max(0,s.total-(Number(m.sorcery.temporary?.[n])||0));s.used=0;}
   m.sorcery={available:p.max,temporary:{}};
   const hp=m.sheet.hpMax??m.fields.maxHP;if(String(hp??'').trim()&&Number(hp)>0){m.sheet.hpCurrent=String(hp);m.fields.hp=String(hp);}
   m.sheet.hpTemp='0';m.fields.tempHP='0';m.sheet.deathSuccess='0';m.sheet.deathFail='0';
   if(m.sheet.hitDiceUsed!==undefined)m.sheet.hitDiceUsed=String(Math.max(0,Number(m.sheet.hitDiceUsed)-Math.max(1,Math.floor(level(m)/2))));
   if(m.sheet.exhaustion!==undefined)m.sheet.exhaustion=String(Math.max(0,Number(m.sheet.exhaustion)-1));
   m.restReview='Descanso aplicado: PG, espacios, puntos de hechicería y salvaciones. Revisa los recursos personalizados y las condiciones de tu mesa.';
  }
  if(action.type==='level'){
   const n=Number(action.target);if(!Number.isInteger(n)||n<1||n>20)throw Error('Nivel inválido.');
   if(n>level(m)){
    m.fields.level=String(n);m.sheet.classLevel=String(m.sheet.classLevel||m.fields.className||'').replace(/\s*(?:nivel|n)?\s*\d+\s*$/i,'').trim()+' N'+n;
    m.sheet.profBonus='+'+(2+Math.floor((n-1)/4));m.fields.proficiency=m.sheet.profBonus;
    const b=m.ruleBuild||{},catalog=window.ALAK_RULES_2014,klass=catalog?.classes[b.classId];
    if(klass){m.sheet.hitDice=n+'d'+klass.die;const totals=window.ALAK_PLAYER_GUIDANCE.policy({...b,level:n}).slots;
     totals.forEach((total,i)=>{if(total){const old=m.slots[i+1]||{used:0};m.slots[i+1]={total:total+(Number(m.sorcery.temporary?.[i+1])||0),used:old.used};}});
    }
    m.levelReviewPending=true;
   }
  }
  for(const [n,s] of Object.entries(m.slots)){m.sheet['spell_slots'+n+'_total']=String(s.total);m.sheet['spell_slots'+n+'_spent']=String(s.used);}
  return m;
 }
 window.ALAK_ADVENTURE_RULES={apply,points,level,cost};
})();
