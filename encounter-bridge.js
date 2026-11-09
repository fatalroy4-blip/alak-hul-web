// The left-hand catalog is the source of the owner's encounter.
function encounterEntry(name){
 const c=combatState(name),max=getParticipantMaxHp(name,c);
 return {id:'local:'+name,name,type:participantKind(name)==='main'?'player':participantKind(name),initiative:Number(c.initiative)||0,maxHP:max,hp:max===null?null:Math.max(0,max-(Number(c.damage)||0))};
}
window.alakEncounterParticipants=()=>state.selectionOrder.filter(n=>state.selected[n]&&combatantNames().includes(n)).map(encounterEntry);
window.alakEncounterCatalog=()=>combatantNames().map(encounterEntry);
let sharedTurn=null;
const originalInitiative=renderInitiative;
renderInitiative=function(){
 originalInitiative();
 document.querySelectorAll('#initiativeList .initiative-row').forEach(row=>{
  const name=row.querySelector('.init-name')?.textContent;
  const label=document.createElement('label');label.className='encounter-roll';label.textContent='Inic. ';
  const input=document.createElement('input');input.type='number';input.step='1';input.value=String(Number(combatState(name).initiative)||0);input.setAttribute('aria-label','Tirada de iniciativa de '+name);
  input.onchange=()=>{if(!Number.isFinite(input.valueAsNumber))return;state.combat[name]={...combatState(name),initiative:Math.trunc(input.valueAsNumber)};saveState();};
  label.append(input);row.querySelector('.identity').append(label);
  row.classList.toggle('encounter-current',sharedTurn===name);
  if(sharedTurn===name)row.setAttribute('aria-current','step');
 });
};
window.alakApplyEncounterRoster=(roster,started=false,index=0)=>{
 const names=new Set(combatantNames());
 for(const name of names)state.selected[name]=roster.some(p=>p.name===name);
 state.selectionOrder=roster.map(p=>p.name).filter(n=>names.has(n));
 for(const p of roster)if(names.has(p.name)&&Number.isFinite(p.initiative))state.combat[p.name]={...combatState(p.name),initiative:p.initiative};
 sharedTurn=started?roster[index]?.name:null;
 saveState();renderRoster();renderInitiative();
};
// Preserve the existing list click behaviour; publish the resulting selection afterwards.
document.getElementById('rosterList')?.addEventListener('click',()=>{
 queueMicrotask(()=>window.alakSetEncounterSelection?.(window.alakEncounterParticipants(),window.alakEncounterCatalog()));
});
const rosterPanel=document.querySelector('.roster-panel');
const manage=document.createElement('button');manage.type='button';manage.textContent='Editar lista';manage.title='Agregar un personaje nuevo o quitarlo de la lista';
const catalogDialog=document.createElement('dialog');catalogDialog.className='combat-actions-dialog';catalogDialog.setAttribute('aria-label','Editar lista de participantes');
const close=document.createElement('button');close.type='button';close.textContent='Cerrar';close.onclick=()=>{catalogDialog.close();window.alakSetEncounterSelection?.(window.alakEncounterParticipants(),window.alakEncounterCatalog());};catalogDialog.append(close);
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
