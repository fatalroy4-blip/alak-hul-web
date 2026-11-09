// Snapshot the visible initiative order when starting the shared encounter.
window.alakEncounterParticipants=()=>state.selectionOrder.filter(n=>state.selected[n]&&combatantNames().includes(n)).map(name=>{
 const c=combatState(name),max=getParticipantMaxHp(name,c);
 return {id:'local:'+name,name,type:isEnemyCombatant(name,c)?'enemy':'ally',maxHP:max,hp:max===null?null:Math.max(0,max-(Number(c.damage)||0))};
});

window.alakEncounterCatalog=()=>combatantNames().map(name=>{
 const c=combatState(name),max=getParticipantMaxHp(name,c);
 return {id:'local:'+name,name,type:isEnemyCombatant(name,c)?'enemy':'ally',maxHP:max,hp:max===null?null:Math.max(0,max-(Number(c.damage)||0))};
});
window.alakApplyEncounterRoster=roster=>{
 const names=new Set(combatantNames());
 for(const name of names)state.selected[name]=roster.some(p=>p.name===name);
 state.selectionOrder=roster.map(p=>p.name).filter(n=>names.has(n));
 saveState();renderRoster();renderInitiative();
};
// Capture before the legacy button handler: both managers edit the shared roster.
document.getElementById('rosterList')?.addEventListener('click',event=>{
 const button=event.target.closest('.roster-btn');if(!button||!window.alakToggleParticipant)return;
 event.preventDefault();event.stopImmediatePropagation();
 window.alakToggleParticipant(button.querySelector('span')?.textContent);
},true);
