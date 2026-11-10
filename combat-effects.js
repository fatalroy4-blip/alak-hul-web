/* Temporary encounter effects. Base character values are never persisted with bonuses. */
(()=>{
 const durations={shield:1,dodge:1,reckless:1,'ray-frost':1,asleep:10,resistance:10,'shield-faith':100,inspiration:100,rage:10,'hunters-mark':600};
 const concentration=new Set(['shield-faith','resistance','hunters-mark']);
 const incapacitating=['incapacitated','unconscious','asleep','paralyzed','petrified','stunned'];
 const disabled=p=>p.dead||p.downed||(p.conditions||[]).some(k=>incapacitating.includes(k));
 const ids=p=>Array.isArray(p?.conditions)?p.conditions:[];
 function normalize(next,old){
  const n=structuredClone(next);n.effectTurns={...(n.effectTurns||{})};
  const newConcentration=[];
  n.roster=(n.roster||[]).map(p=>{
   const prev=(old.roster||[]).find(x=>x.id===p.id)||{},prior=ids(prev);p.conditions=[...new Set(ids(p))];p.effectTiming={...(p.effectTiming||{})};
   for(const id of p.conditions){if(!prior.includes(id)||!p.effectTiming[id]){const source=p.conditionSources?.[id]||p.id;const count=durations[id];p.effectTiming[id]={source,...(count?{endTurn:(n.effectTurns[source]||0)+count}:{} )};if(!prior.includes(id)&&concentration.has(id))newConcentration.push({target:p.id,id,source});}}
   const hurt=Number(p.damage||0)>Number(prev.damage||0);
   if(hurt)p.conditions=p.conditions.filter(k=>k!=='asleep');
   if(Number(p.hp)>0)p.downed=false;
   if(p.dead||p.downed)p.conditions=p.conditions.filter(k=>!['concentration','rage'].includes(k));
   if(disabled(p))p.conditions=p.conditions.filter(k=>k!=='concentration');if(p.dead||p.downed||p.conditions.some(k=>['unconscious','asleep'].includes(k)))p.conditions=p.conditions.filter(k=>k!=='rage');
   return p;
  });
  // Starting another concentration effect replaces the previous linked effect.
  for(const effect of newConcentration){for(const p of n.roster){p.conditions=p.conditions.filter(id=>!concentration.has(id)||p.effectTiming[id]?.source!==effect.source||(p.id===effect.target&&id===effect.id));}const caster=n.roster.find(p=>p.id===effect.source);if(caster&&!disabled(caster)&&!caster.conditions.includes('concentration'))caster.conditions.push('concentration');}
  for(const p of n.roster){p.conditions=p.conditions.filter(id=>{const timing=p.effectTiming[id];if(!timing)return true;if(timing.endTurn!==undefined&&(n.effectTurns[timing.source]||0)>=timing.endTurn)return false;if(concentration.has(id)){const caster=n.roster.find(x=>x.id===timing.source);if(!caster||disabled(caster)||!ids(caster).includes('concentration'))return false;}return true;});for(const key of Object.keys(p.effectTiming))if(!p.conditions.includes(key))delete p.effectTiming[key];}
  n.participantCatalog=(n.participantCatalog||[]).map(p=>{const active=n.roster.find(x=>x.id===p.id);return active?{...p,conditions:active.conditions,effectTiming:active.effectTiming,conditionSources:active.conditionSources||{},downed:active.downed||false}:p;});return n;
 }
 function values(base,conditions){const set=new Set(conditions),ac=Number(base.ac),speed=Number(base.speed);const out={};
  if(String(base.ac??'').trim()&&Number.isFinite(ac))out.ac=ac+(set.has('shield')?5:0)+(set.has('shield-faith')?2:0);
  if(String(base.speed??'').trim()&&Number.isFinite(speed)){const zero=['grappled','restrained','stunned','paralyzed','petrified','unconscious','asleep'].some(k=>set.has(k));out.speed=zero?0:Math.max(0,speed-(set.has('ray-frost')?10:0));}
  return out;
 }
 let campaign=null,accountUid=null;const originals=new Map();let applying=false;
 function restore(){for(const [input,base] of originals){input.value=base;input.removeAttribute('data-effect-value');}originals.clear();document.querySelectorAll('.effect-base-note').forEach(e=>e.remove());}
 function refresh(){if(applying)return;applying=true;try{restore();const root=document.querySelector('#character');if(!root)return;const player=window.alakRuleBridge?.get?.();const uid=player?.ownerUid||accountUid;const matches=(campaign?.roster||[]).filter(p=>p.uid===uid);let banner=document.getElementById('sheetActiveEffects');if(!banner){banner=document.createElement('section');banner.id='sheetActiveEffects';banner.className='adventure-card';root.prepend(banner);}const conditions=[...new Set(matches.flatMap(p=>ids(p).concat(p.downed?['unconscious']:[])))];banner.hidden=!conditions.length;banner.replaceChildren();
   if(!conditions.length)return;
   const title=document.createElement('h3');title.textContent='Efectos temporales activos';banner.append(title);
   const notice=document.createElement('p');notice.textContent='Los valores de combate incluyen estos efectos. Al editar un campo verás su valor base; al terminar el efecto se restaura automáticamente.';banner.append(notice);
   const list=document.createElement('p');list.textContent=conditions.map(id=>window.ALAK_COMBAT_STATES?.[id]?.name||id).join(' · ');banner.append(list);
   const base={};for(const key of ['ac','speed'])base[key]=root.querySelector('[data-char="'+key+'"]')?.value;
   const effective=values(base,conditions);
   for(const [key,value] of Object.entries(effective)){const input=root.querySelector('[data-char="'+key+'"]');if(!input||Number(base[key])===value||document.activeElement===input)continue;originals.set(input,input.value);input.value=String(value);input.dataset.effectValue='true';const note=document.createElement('small');note.className='effect-base-note';note.textContent=(key==='ac'?'CA: ':'Velocidad: ')+'base '+base[key]+' → actual '+value;banner.append(note);}
   const hints=[];if(conditions.includes('poisoned'))hints.push('Envenenado: desventaja en ataques y pruebas.');if(conditions.includes('frightened'))hints.push('Asustado: desventaja si ves la fuente del miedo.');if(conditions.includes('rage'))hints.push('Furia: resistencia a contundente, perforante y cortante; ventaja en Fuerza. Añade el daño de Furia solo a ataques cuerpo a cuerpo con Fuerza.');if(conditions.includes('hunters-mark'))hints.push('Marca del cazador: +1d6 al daño de los ataques del lanzador.');if(conditions.includes('resistance'))hints.push('Resistencia: +1d4 a una salvación; retira el efecto después de usarlo.');if(conditions.includes('inspiration'))hints.push('Inspiración: añade el dado concedido a una tirada y retira el efecto al gastarlo.');if(conditions.some(k=>incapacitating.includes(k)))hints.push('Revisa las limitaciones de acciones, movimiento y salvaciones del estado.');if(hints.length){const p=document.createElement('p');p.textContent=hints.join(' ');banner.append(p);}
  }finally{applying=false;}}
 document.addEventListener('focusin',e=>{if(e.target.matches?.('[data-char]'))restore();});
 document.addEventListener('input',e=>{if(e.target.matches?.('[data-char]')){restore();queueMicrotask(refresh);}},true);
 document.addEventListener('focusout',e=>{if(e.target.matches?.('[data-char]'))queueMicrotask(refresh);});
 window.alakCombatEffects={normalize,values,durations,restore,refresh,set:(value,uid)=>{campaign=value;accountUid=uid;refresh();},get:()=>campaign};
})();
