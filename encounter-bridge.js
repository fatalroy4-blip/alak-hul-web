// The left-hand catalog is the source of the owner's encounter.
function encounterEntry(name){
 const c=combatState(name),max=getParticipantMaxHp(name,c);
 return {id:'local:'+name,name,...(window.alakParticipantUid?.(name)?{uid:window.alakParticipantUid(name)}:{}),type:participantKind(name)==='main'?'player':participantKind(name),initiative:Number(c.initiative)||0,damage:Math.max(0,Number(c.damage)||0),dead:!!c.dead,downed:!!c.downed,conditions:c.conditions||[],conditionSources:c.conditionSources||{},side:isEnemyCombatant(name,c)?'enemy':'ally',portrait:getPortrait(name,isEnemyCombatant(name,c)),maxHP:max,hp:max===null?null:Math.max(0,max-(Number(c.damage)||0))};
}
window.alakEncounterParticipants=()=>state.selectionOrder.filter(n=>state.selected[n]&&combatantNames().includes(n)).map(encounterEntry);
window.alakEncounterCatalog=()=>combatantNames().map(encounterEntry);
const localPortrait=getPortrait;
getPortrait=function(name,isEnemy){return window.alakCombatPortrait?.(name)||localPortrait(name,isEnemy);};
let sharedTurn=null,applyingShared=false;
let lastPublished=new Map();
const baseSaveState=saveState;
saveState=function(){baseSaveState();if(!applyingShared)queueMicrotask(publishCombatDetails);};
function publishCombatDetails(){
 if(!window.alakPatchEncounter)return;
 const patches=[];
 for(const entry of window.alakEncounterCatalog()){
  const previous=lastPublished.get(entry.id)||{};const changes={};
  for(const key of ['damage','dead','downed','conditions','conditionSources','side','portrait','maxHP','hp','initiative'])if(JSON.stringify(entry[key])!==JSON.stringify(previous[key]))changes[key]=entry[key];
  if(Object.keys(changes).length)patches.push({id:entry.id,...changes});
  lastPublished.set(entry.id,entry);
 }
 if(patches.length)window.alakPatchEncounter(patches);
}
const originalInitiative=renderInitiative;
renderInitiative=function(){
 originalInitiative();
 document.querySelectorAll('#initiativeList .initiative-row').forEach(row=>{
  const name=row.querySelector('.init-name')?.textContent;
  const label=document.createElement('label');label.className='encounter-roll';label.textContent='Inic. ';
  const input=document.createElement('input');input.type='number';input.step='1';input.value=String(Number(combatState(name).initiative)||0);input.setAttribute('aria-label','Tirada de iniciativa de '+name);
  input.onchange=()=>{if(!Number.isFinite(input.valueAsNumber))return;state.combat[name]={...combatState(name),initiative:Math.trunc(input.valueAsNumber)};state.selectionOrder.sort((a,b)=>(Number(combatState(b).initiative)||0)-(Number(combatState(a).initiative)||0));saveState();renderInitiative();window.alakSetEncounterSelection?.(window.alakEncounterParticipants(),window.alakEncounterCatalog());};
  window.alakCombatStatus?.mount(row,encounterEntry(name),row.querySelector('.damage-box'),row.querySelector('.identity'),async patch=>{state.combat[name]={...combatState(name),...patch};saveState();renderInitiative();});
  label.append(input);row.querySelector('.identity').append(label);
  row.classList.toggle('encounter-current',sharedTurn===name);
  if(sharedTurn===name)row.setAttribute('aria-current','step');
 });
};
window.alakApplyEncounterRoster=(roster,started=false,index=0)=>{
 applyingShared=true;
 const names=new Set(combatantNames());
 for(const name of names)state.selected[name]=roster.some(p=>p.name===name);
 state.selectionOrder=roster.map(p=>p.name).filter(n=>names.has(n));
 for(const p of roster)if(names.has(p.name)){
  const c={...combatState(p.name)};
  if(Number.isFinite(p.initiative))c.initiative=p.initiative;
  if(p.maxHP!==undefined)c.maxHp=p.maxHP;
  if(p.damage!==undefined)c.damage=p.damage;
  else if(p.hp!=null&&p.maxHP!=null)c.damage=Math.max(0,p.maxHP-p.hp);
  if(p.dead!==undefined)c.dead=p.dead;
  c.downed=!!p.downed;c.conditions=Array.isArray(p.conditions)?p.conditions:[];c.conditionSources=p.conditionSources||{};
  if(p.side)c.side=p.side;
  if(p.portrait?.startsWith('data:image/'))state.portraits[p.name]=p.portrait;
  state.combat[p.name]=c;
  if(p.name==='Roger'&&typeof hpInput==='function'){const field=hpInput('hpMax');if(field&&p.maxHP!=null)field.value=String(p.maxHP);syncRogerHpFromCombat();}
 }
 sharedTurn=started?roster[index]?.name:null;
 saveState();renderRoster();renderInitiative();
 lastPublished=new Map(window.alakEncounterCatalog().map(p=>[p.id,p]));applyingShared=false;
};
// Preserve the existing list click behaviour; publish the resulting selection afterwards.
document.getElementById('rosterList')?.addEventListener('click',()=>{
 queueMicrotask(()=>window.alakSetEncounterSelection?.(window.alakEncounterParticipants(),window.alakEncounterCatalog()));
});
const rosterPanel=document.querySelector('.roster-panel');
const manage=document.createElement('button');manage.type='button';manage.textContent='Editar lista';manage.title='Agregar un personaje nuevo o quitarlo de la lista';
const catalogDialog=document.createElement('dialog');catalogDialog.className='combat-actions-dialog combat-catalog-dialog';catalogDialog.setAttribute('aria-label','Editar lista de participantes');
catalogDialog.addEventListener('close',()=>window.alakSetEncounterSelection?.(window.alakEncounterParticipants(),window.alakEncounterCatalog()));
const close=document.createElement('button');close.type='button';close.textContent='Cerrar';close.onclick=()=>catalogDialog.close();catalogDialog.append(close);
const editor=document.getElementById('combatAdmin');if(editor)catalogDialog.append(editor);
document.body.append(catalogDialog);manage.onclick=()=>catalogDialog.showModal();rosterPanel?.insertBefore(manage,document.getElementById('rosterList'));
renderInitiative();
window.alakApplyEncounterCatalog=catalog=>{
 if(!Array.isArray(catalog)||!catalog.length)return;
 const listed=new Set(catalog.map(p=>p.name));
 state.hiddenCombatants=[...new Set([...(state.hiddenCombatants||[]),...combatantNames().filter(n=>!listed.has(n))])].filter(n=>!listed.has(n));
 state.customCombatants=state.customCombatants||[];
 for(const p of catalog)if(!DATA.combatants.includes(p.name)&&!state.customCombatants.some(c=>c.name===p.name))state.customCombatants.push({name:p.name,kind:p.type==='player'?'main':p.type});
 renderRoster();renderCombatAdmin();
};

// Manual initiative arrows also publish the visible order without resetting the actor.
document.getElementById('initiativeList')?.addEventListener('click',event=>{if(event.target.closest('.move-up,.move-down'))queueMicrotask(()=>window.alakSetEncounterSelection?.(window.alakEncounterParticipants(),window.alakEncounterCatalog()));},true);
// A new encounter resets both the legacy board and its shared turn tracker.
document.getElementById('newCombatBtn').onclick=async()=>{
 if(!confirm('¿Iniciar un nuevo combate? Se quitarán todos los participantes y el daño volverá a 0.'))return;
 await window.alakResetEncounter?.();
 state.selected={};state.selectionOrder=[];
 state.combat=Object.fromEntries(Object.entries(state.combat||{}).map(([name,c])=>[name,{maxHp:c.maxHp,side:c.side,kind:c.kind,damage:0,dead:false}]));
 sharedTurn=null;saveState();renderRoster();renderInitiative();renderCombatAdmin();
};
