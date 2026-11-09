import "./combat-actions.js?v=52";
/* V49: Mesa compartida de Alak Hul.
   MISMA interfaz y MISMO documento Firestore en owner, DM y jugadores.
   Permisos reales requieren reglas Firestore publicadas para campaigns/main. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth,onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore,doc,collection,getDoc,updateDoc,onSnapshot,runTransaction,serverTimestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
const mountPoints=[...document.querySelectorAll("[data-shared-campaign]")];
if(mountPoints.length){
 const app=initializeApp(window.ALAK_FIREBASE_CONFIG),auth=getAuth(app),db=getFirestore(app);
 const ref=doc(db,"campaigns","main");
 const $=id=>document.getElementById(id);
 const create=(tag,cl="",value)=>{const node=document.createElement(tag);if(cl)node.className=cl;if(value!==undefined)node.textContent=value;return node};
 const makeBtn=(caption,callback)=>{const b=create("button","",caption);b.type="button";b.addEventListener("click",callback);return b};
 const defaults=()=>({title:"Las nieblas de Barovia",round:1,turnIndex:0,roster:[],diary:[],started:false});
 const parse=d=>({...defaults(),...(d||{}),roster:Array.isArray(d?.roster)?d.roster:[],diary:Array.isArray(d?.diary)?d.diary:[]});
 const uid=()=>crypto.randomUUID?.()||String(Date.now())+"-"+Math.random().toString(36).slice(2);
 let current=null,role="player",isAdmin=false,info=defaults(),players=[],cancelCampaign=null,cancelPlayers=null,active="table",saving=false;
 const element={};
 const root=create("div","mc-root");
 const header=create("header","mc-header");
 header.append(create("div","mc-eyebrow","EL CAMINO ES COMPARTIDO"),create("h2","","Campaña"),create("p","mc-subtitle","Multijugador · La misma mesa para los participantes"));
 const signal=create("span","mc-sync","⏳ Conectando mesa…");header.append(signal);
 const nav=create("div","mc-nav"),main=create("div","mc-body");
 for(const [key,label] of [["table","✦ Mi mesa"],["combat","⚔ Combate"],["diary","📖 Diario"],["manage","⚙ Dirección"]]){
  const b=makeBtn(label,()=>select(key,true));b.dataset.mcView=key;nav.append(b);
  const pane=create("div","mc-pane");pane.dataset.mcPane=key;main.append(pane);element[key]=pane;
 }
 root.append(header,nav,main);mountPoints.forEach((mount,i)=>{if(i===0)mount.append(root);else mount.append(root.cloneNode(true))});
 // Move the actual pane, including its live listeners and controls; never clone it.
 const combatBoard=document.querySelector('#combat .initiative-head');
 if(combatBoard){
  const dock=create('div','mesa-compartida mc-combat-dock');
  combatBoard.append(dock);dock.append(element.combat);
 }
 document.querySelector('[data-campaign-view="combat"]')?.addEventListener('click',()=>select('combat'));
 // Normally one mount exists per page; the shared component is instantiated identically in each page.
 const warn=t=>{signal.textContent=t;document.querySelectorAll('.mc-combat-status').forEach(el=>{el.textContent=t;el.hidden=!/local:|No se pudo|guardado en curso|Sin acceso/.test(t)});};
 function select(name,navigate=false){
  if(name==="manage"&&!isAdmin)return;
  active=name;
  nav.querySelectorAll("[data-mc-view]").forEach(btn=>btn.setAttribute("aria-pressed",String(btn.dataset.mcView===name)));
  Object.values(element).forEach(p=>p.classList.toggle("active",p.dataset.mcPane===name));
  if(combatBoard&&name==='combat'&&navigate){
   document.querySelector('.legacy-campaign').open=true;
   window.alakShowCampaignView?.('combat');
  }
 }
 function panel(title,parent){
  const outer=create("section","mc-surface");outer.append(create("h3","",title));parent.append(outer);return outer
 }
 function empty(parent,msg){parent.append(create("p","mc-empty",msg))}
 function field(label,name,value="",type="text"){
  const wrap=create("label","",label),input=create("input");
  input.type=type;input.name=name;input.value=value;input.required=Boolean(name==="name");
  if(type==="number"){input.min="0";input.max="9999"}
  wrap.append(input);return wrap
 }
 function formatDate(value){
  try{const d=value?.toDate?.();return d?d.toLocaleString("es-MX"):"Fecha sin registrar"}catch{return "Fecha sin registrar"}
 }
 async function edit(changeFn){
  if(!current||!isAdmin)return false;
  saving=true;warn("⏳ Guardando cambios…");
  try{
   let committed;
   await runTransaction(db,async transaction=>{
    const old=await transaction.get(ref);
    const data=parse(old.exists()?old.data():{});
    const next=changeFn(data);
    if(!next)return;
    committed=next;
    transaction.set(ref,{...next,updatedAt:serverTimestamp(),updatedBy:current.uid});
   });
   if(committed){info=parse(committed);render();}
   warn("✓ Campaña sincronizada");return true;
  }catch(e){warn("No se pudo guardar en la mesa: "+(e.code||e.message));return false;}
  finally{saving=false}
 }
 // Combat remains usable locally when Firebase rejects or cannot save the write.
 let localCombat=false;
 async function editCombat(changeFn){
  if(!current||!isAdmin)return;
  if(saving){warn('Hay un guardado en curso. Espera un momento y vuelve a pulsar.');return;}
  const next=changeFn(info);if(!next)return;
  info=parse(next);localCombat=true;
  window.alakApplyEncounterRoster?.(info.roster,info.started,info.turnIndex);render();
  const saved=await edit(s=>({...s,roster:next.roster,round:next.round,turnIndex:next.turnIndex,started:next.started,selectionInitialized:true,...(next.participantCatalog?{participantCatalog:next.participantCatalog}:{})}));
  if(saved){localCombat=false;window.alakApplyEncounterRoster?.(info.roster,info.started,info.turnIndex);render();}
  else{warn('Combate local: el cambio NO se sincronizó con el DM. Revisa la conexión o los permisos de Firebase.');}
 }
 function renderTable(){
  const box=element.table;box.replaceChildren();
  const top=panel("✦ Mi mesa · "+info.title,box);
  const summary=create("div","mc-summary");
  for(const [label,value] of [["Personajes",info.roster.filter(x=>x.type==="player").length],["Aliados",info.roster.filter(x=>x.type==="ally").length],["Enemigos",info.roster.filter(x=>x.type==="enemy").length],["Ronda",info.round||1]]){
   const stat=create("div","mc-stat"),n=create("strong","",String(value));
   stat.append(create("small","",label),n);summary.append(stat)
  }
  top.append(summary);
  const roster=create("div","mc-roster");
  if(!info.roster.length)empty(top,"Tu DM todavía no ha agregado participantes. Cuando lo haga, aparecerán aquí para todos.");
  else {
   info.roster.forEach((member,i)=>{
    const card=create("article","mc-figure"+(info.turnIndex===i?" is-active":""));
    card.append(create("small","mc-type",member.type==="enemy"?"Enemigo":member.type==="ally"?"Aliado":"Jugador"));
    card.append(create("strong","",member.name||"Sin nombre"));
    card.append(create("small","",member.classInfo||"Participante"));
    card.append(create("div","mc-hp","PG: "+(member.hp??"—")+" / "+(member.maxHP??"—")+" · CA "+(member.ac??"—")+" · Inic. "+(member.initiative??"—")));
    if(info.turnIndex===i)card.append(create("small","", "✦ Turno actual"));
    roster.append(card);
   });top.append(roster);
  }
 }
 function toggleParticipant(name){
  if(!isAdmin)return;
  void edit(s=>{
   const catalog=s.participantCatalog||[];
   const entry=catalog.find(p=>p.name===name)||s.roster.find(p=>p.name===name);if(!entry)return null;
   const currentId=s.roster[s.turnIndex]?.id;
   const roster=s.roster.some(p=>p.id===entry.id)?s.roster.filter(p=>p.id!==entry.id):[...s.roster,entry];
   const index=roster.findIndex(p=>p.id===currentId);
   return {...s,roster,selectionInitialized:true,turnIndex:index>=0?index:Math.min(s.turnIndex||0,Math.max(0,roster.length-1)),started:roster.length?s.started:false};
  });
 }
 window.alakToggleParticipant=toggleParticipant;
 window.alakSetEncounterSelection=(roster,catalog)=>void editCombat(s=>{
  const currentId=s.roster[s.turnIndex]?.id;
  const index=roster.findIndex(p=>p.id===currentId);
  return {...s,roster,participantCatalog:catalog,selectionInitialized:true,turnIndex:index>=0?index:0,started:roster.length?s.started:false};
 });
 function renderCombat(){
  const box=element.combat;box.replaceChildren();
  if(!combatBoard&&isAdmin){
   const picker=panel('Participantes',box);
   const list=create('div','mc-participant-picker');
   for(const entry of info.participantCatalog||info.roster){
    const selected=info.roster.some(p=>p.id===entry.id);
    const button=makeBtn((selected?'✓ ':'+ ')+entry.name,()=>toggleParticipant(entry.name));
    button.setAttribute('aria-pressed',String(selected));list.append(button);
   }
   if(!list.childElementCount)empty(picker,'La lista se sincronizará cuando el propietario abra la campaña.');
   const add=makeBtn('Nuevo personaje',()=>{const name=prompt('Nombre del nuevo personaje')?.trim();if(!name)return;void edit(s=>{const catalog=s.participantCatalog||[];if(catalog.some(p=>p.name.toLowerCase()===name.toLowerCase()))return null;return {...s,participantCatalog:[...catalog,{id:'local:'+name,name,type:'player',initiative:0,hp:null,maxHP:null}]};});});picker.append(list,add);
  }
  const surface=panel("⚔ Iniciativa y combate",box);
  const help=makeBtn('Acciones',()=>window.alakCombatActions?.open(help));
  help.className='mc-actions-help';help.setAttribute('aria-haspopup','dialog');
  help.setAttribute('aria-controls','combatActionsDialog');surface.querySelector('h3').append(help);
  const status=create('p','mc-combat-status',signal.textContent);status.setAttribute('role','status');status.hidden=!/local:|No se pudo|guardado en curso|Sin acceso/.test(signal.textContent);surface.append(status);
  const summary=create("div","mc-summary");
  const round=create("div","mc-stat");round.append(create("small","","Ronda actual"),create("strong","",String(info.started===false?0:(info.round||1))));summary.append(round);
  const turn=create("div","mc-stat");turn.append(create("small","","Turno de"),create("strong","",info.started===false?"—":(info.roster[info.turnIndex]?.name||"—")));summary.append(turn);surface.append(summary);
  const controls=create("div","mc-actions");
  if(isAdmin){
   controls.append(
    makeBtn("▶",()=>{const selected=window.alakEncounterParticipants?.()||[];if(!selected.length&&!info.roster.length){warn("Selecciona participantes antes de iniciar el combate.");return}if(info.started&& !confirm("¿Reiniciar el combate desde el primer participante?"))return;void editCombat(s=>({...s,roster:(selected.length?selected.map(p=>({...s.roster.find(old=>old.id===p.id||old.name===p.name),...p})):s.roster).slice(),selectionInitialized:true,started:true,round:1,turnIndex:0}))}),
    makeBtn("Siguiente turno",()=>void editCombat(s=>{
     if(!s.roster.length||s.started===false)return null;
     const next=(Number(s.turnIndex||0)+1)%Math.max(1,s.roster.length);
     return {...s,turnIndex:next,round:next===0?Number(s.round||1)+1:Number(s.round||1)};
    }))
   );
  }
  if(controls.childElementCount){const play=controls.firstElementChild;play.title="Iniciar / reiniciar combate";play.setAttribute("aria-label","Iniciar / reiniciar combate");controls.lastElementChild.disabled=!info.roster.length||info.started===false;surface.append(controls);}
  if(!info.roster.length&&!window.alakEncounterParticipants?.().length){empty(surface,"Selecciona participantes de la lista para iniciar el combate.");return}
  const list=create("div","mc-roster");
  info.roster.forEach((entry,i)=>{
   const card=create("article","mc-figure"+(info.turnIndex===i?" is-active":""));
   card.append(create("small","mc-type",entry.type==="enemy"?"Enemigo":entry.type==="ally"?"Aliado":"Jugador"));
   card.append(create("strong","",entry.name||"Sin nombre"));
   card.append(create("div","mc-hp","PG "+(entry.hp??"—")+" / "+(entry.maxHP??"—")+" · Iniciativa "+(entry.initiative??"—")));
   if(isAdmin){
    const roll=field('Tirada de iniciativa','initiative',entry.initiative??0,'number');const input=roll.querySelector('input');input.min='-99';input.onchange=()=>{const value=input.valueAsNumber;if(Number.isFinite(value))void edit(s=>({...s,roster:s.roster.map(p=>p.id===entry.id?{...p,initiative:Math.trunc(value)}:p)}))};card.append(roll);
    const actions=create("div","mc-actions");
    actions.append(makeBtn("− Daño",()=>void changeHP(entry.id,-1)),makeBtn("+ Curación",()=>void changeHP(entry.id,1)),makeBtn("Quitar",()=>{if(confirm("¿Retirar a "+entry.name+" del combate?"))void edit(s=>({...s,roster:s.roster.filter(x=>x.id!==entry.id),turnIndex:0}))}));
    card.append(actions);
   }
   list.append(card);
  });surface.append(list);
  if(!isAdmin)surface.append(create("p","mc-info","Los cambios de vida, turnos y rondas se actualizan automáticamente desde la cuenta del DM o del propietario."));
 }
 async function changeHP(entryId,direction){
  const delta=Number(prompt(direction<0?"¿Cuántos puntos de daño?":"¿Cuántos puntos de curación?","1"));
  if(!Number.isFinite(delta)||delta<=0||delta>9999)return;
  const m=info.roster.find(x=>x.id===entryId);if(!m)return;
  const newHp=Math.max(0,Math.min(Number(m.maxHP)||9999,(Number(m.hp)||0)+direction*delta));
  await edit(s=>({...s,roster:s.roster.map(x=>x.id===entryId?{...x,hp:newHp}:x)}));
  // Mantener sincronizada también la hoja de personaje individual; nunca editar su retrato.
  if(m.uid){
   try{await updateDoc(doc(db,"players",m.uid),{"fields.hp":String(newHp),"sheet.hpCurrent":String(newHp),"updatedBy":current.uid,"updatedAt":serverTimestamp()})}
   catch(e){warn("Mesa guardada; no se pudo sincronizar la hoja individual: "+(e.code||"error"))}
  }
 }
 function renderDiary(){
  const box=element.diary;box.replaceChildren();
  const surface=panel("📖 Diario de campaña",box);
  if(isAdmin){
   const form=create("form","mc-form");
   const title=field("Título","title");const date=field("Fecha","date",new Date().toISOString().slice(0,10),"date");
   const note=create("label","","Crónica");const area=create("textarea");area.name="text";area.rows=3;area.maxLength=4000;note.append(area);
   const add=create("button","","Añadir al diario");add.type="submit";form.append(date,title,note,add);
   form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form),name=String(fd.get("title")||"").trim(),text=String(fd.get("text")||"").trim();if(!name||!text)return;
    void edit(s=>({...s,diary:[{id:uid(),date:String(fd.get("date")),title:name.slice(0,80),text:text.slice(0,4000),author:current.displayName||"Dirección"},...s.diary].slice(0,45)}));form.reset()};
   surface.append(form);
  }
  const entries=create("div","mc-diary-entries");
  if(!info.diary.length)empty(entries,"Aún no hay entradas de campaña.");
  for(const item of info.diary){
   const block=create("article","mc-diary-item");block.append(create("h4","",item.title),create("small","",item.date+" · "+(item.author||"Dirección")),create("p","",item.text));entries.append(block);
  }surface.append(entries);
 }
 function renderManage(){
  const box=element.manage;box.replaceChildren();if(!isAdmin)return;
  const surface=panel("⚙ Dirección de campaña",box);
  const titleForm=create("form","mc-form"),title=field("Nombre de la campaña","title",info.title);
  const btn=create("button","","Guardar nombre");btn.type="submit";
  titleForm.append(title,btn);titleForm.onsubmit=e=>{e.preventDefault();const name=title.querySelector("input").value.trim();if(name)void edit(s=>({...s,title:name.slice(0,80)}))};surface.append(titleForm);
  const open=makeBtn('Agregar / quitar participantes',()=>select('combat',true));surface.append(open);

 }
 function render(){renderTable();renderCombat();renderDiary();renderManage();select(active)}
 async function activate(account){
  current=account;warn("⏳ Verificando acceso…");
  try{
   const roleDoc=await getDoc(doc(db,"appRoles",account.uid));
   role=roleDoc.exists()?roleDoc.data().role:"player";
   if(!["owner","dm","player"].includes(role)){warn("Tu cuenta necesita un rol para ver la campaña.");return}
   isAdmin=role==="owner"||role==="dm";
   nav.querySelector('[data-mc-view="manage"]').hidden=!isAdmin;
   if(!isAdmin&&active==="manage")active="table";
   if(cancelCampaign)cancelCampaign();
   cancelCampaign=onSnapshot(ref,async snap=>{
    if(localCombat)return;
    if(!snap.exists()){
     info=defaults();if(isAdmin){
      try{await runTransaction(db,async transaction=>{const saved=await transaction.get(ref);if(!saved.exists())transaction.set(ref,{...defaults(),createdBy:current.uid,updatedBy:current.uid,updatedAt:serverTimestamp()})})}
      catch(e){warn("No se pudo crear la mesa: "+(e.code||"error"))}
     }else warn("Tu DM aún no ha iniciado la campaña.");
    }else{info=parse(snap.data());warn("✓ Mesa conectada · actualizada en tiempo real")}
    window.alakApplyEncounterCatalog?.(info.participantCatalog);
    if(info.selectionInitialized)window.alakApplyEncounterRoster?.(info.roster,info.started,info.turnIndex);
    render();
   },e=>{warn("Sin acceso a Campaña: revisa las reglas Firestore ('campaigns/main'). "+(e.code||""))});
   if(cancelPlayers)cancelPlayers();
   if(isAdmin){
    cancelPlayers=onSnapshot(collection(db,"players"),snap=>{
     players=snap.docs.map(d=>d.data());if(active==="manage")renderManage()
    },e=>warn("Mesa disponible; no se pueden consultar personajes: "+(e.code||"")));
   }else players=[];
   if(isAdmin&&window.alakEncounterCatalog){
    const catalog=window.alakEncounterCatalog(),selected=window.alakEncounterParticipants();
    await edit(s=>({...s,participantCatalog:s.participantCatalog?.length?s.participantCatalog:catalog,roster:s.selectionInitialized||s.roster.length?s.roster:selected,selectionInitialized:true}));
   }
   render();
  }catch(e){warn("No se pudo verificar rol: "+(e.code||e.message))}
 }
 onAuthStateChanged(auth,account=>{
  if(cancelCampaign){cancelCampaign();cancelCampaign=null}
  if(cancelPlayers){cancelPlayers();cancelPlayers=null}
  current=null;players=[];info=defaults();role="player";isAdmin=false;
  if(account)void activate(account);
  else{warn("Inicia sesión con Google para acceder a la mesa.");render()}
 });
 select("table");
}
