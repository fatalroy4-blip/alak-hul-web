// Snapshot the visible initiative order when starting the shared encounter.
window.alakEncounterParticipants=()=>state.selectionOrder.filter(n=>state.selected[n]&&combatantNames().includes(n)).map(name=>{
 const c=combatState(name),max=getParticipantMaxHp(name,c);
 return {id:'local:'+name,name,type:isEnemyCombatant(name,c)?'enemy':'ally',maxHP:max,hp:max===null?null:Math.max(0,max-(Number(c.damage)||0))};
});
