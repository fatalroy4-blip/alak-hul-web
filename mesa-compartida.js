import "./combat-actions.js?v=58";
/* V49: Mesa compartida de Alak Hul.
   MISMA interfaz y MISMO documento Firestore en owner, DM y jugadores.
   Permisos reales requieren reglas Firestore publicadas para campaigns/main. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth,onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore,doc,collection,getDoc,setDoc,updateDoc,onSnapshot,runTransaction,serverTimestamp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
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
 let hasCampaign=false,cancelAccess=null,accessStops=[];const memberStates=new Map(),accountRoles=new Map();
 const admitted=id=>memberStates.has(id)?memberStates.get(id).active===true:accountRoles.get(id)==='player';
 function clearCampaign(){if(cancelCampaign){cancelCampaign();cancelCampaign=null;}hasCampaign=false;info=defaults();for(const stop of portraitSubscriptions.values())stop();portraitSubscriptions.clear();portraitProfiles.clear();Object.values(element).forEach(p=>p.replaceChildren());nav.hidden=true;}
 const portraitProfiles=new Map(),portraitSubscriptions=new Map();
 const participant=name=>[...info.roster,...(info.participantCatalog||[])].find(p=>p.name===name);
 window.alakParticipantUid=name=>participant(name)?.uid||null;
 window.alakCombatPortrait=name=>{const p=participant(name);return p?.uid?(portraitProfiles.get(p.uid)?.thumbnail||portraitProfiles.get(p.uid)?.portrait||'assets/hero.svg'):null;};
 window.alakCombatFullPortrait=name=>{const p=participant(name);return p?.uid?(portraitProfiles.get(p.uid)?.portrait||'assets/hero.svg'):null;};
 function watchPortraits(){
  const ids=new Set([...info.roster,...(info.participantCatalog||[])].map(p=>p.uid).filter(Boolean));
  for(const [id,stop] of portraitSubscriptions)if(!ids.has(id)){stop();portraitSubscriptions.delete(id);portraitProfiles.delete(id);}
  for(const id of ids)if(!portraitSubscriptions.has(id)){
   portraitSubscriptions.set(id,()=>{});
   const stop=onSnapshot(doc(db,'combatPortraits',id),snap=>{portraitProfiles.set(id,snap.exists()?snap.data():{});render();},()=>{portraitProfiles.set(id,{});});
   portraitSubscriptions.set(id,stop);
  }
 }
 function renderPlayerLinks(){
  if(!isAdmin)return;
  const host=document.querySelector('dialog[aria-label="Editar lista de participantes"]')||element.manage;
  host.querySelector('.mc-player-links')?.remove();
  const section=create('section','mc-player-links');section.append(create('h3','','Vincular retratos de jugadores'),create('p','','Vincula cada participante con su ficha. Su jugador controla la imagen; los enemigos y aliados sin ficha conservan sus retratos de mesa.'));
  for(const entry of info.participantCatalog||info.roster){
   if(entry.type!=='player')continue;
   const label=create('label','',entry.name+' '),select=create('select');select.setAttribute('aria-label','Ficha de '+entry.name);
   const empty=create('option','','Sin vincular');empty.value='';select.append(empty);
   for(const player of players){const id=player.ownerUid;if(!id)continue;const option=create('option','',(player.fields?.name||player.accountName||'Jugador')+' · '+(player.accountName||id));option.value=id;select.append(option);}
   select.value=entry.uid||'';
   select.onchange=()=>{const id=select.value;void edit(s=>{const link=rows=>(rows||[]).map(p=>p.id===entry.id?{...p,uid:id}:p);return {...s,participantCatalog:link(s.participantCatalog),roster:link(s.roster)};});};label.append(select);section.append(label);
  }host.append(section);
 }
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
  active=name;if(navigate)window.alakNavigation?.campaign(name);
  nav.querySelectorAll("[data-mc-view]").forEach(btn=>btn.setAttribute("aria-pressed",String(btn.dataset.mcView===name)));
  Object.values(element).forEach(p=>p.classList.toggle("active",p.dataset.mcPane===name));
  if(combatBoard&&name==='combat'&&navigate){
   document.querySelector('.legacy-campaign').open=true;
   window.alakShowCampaignView?.('combat');
  }
 }
 window.alakRestoreCampaignView=name=>{if(name)select(name);};
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
 let patchQueue=Promise.resolve();
 window.alakPatchEncounter=patches=>{
  patchQueue=patchQueue.then(async()=>{
   while(saving)await new Promise(resolve=>setTimeout(resolve,30));
   if(!isAdmin)return;
   const merge=rows=>(rows||[]).map(p=>({...p,...patches.find(x=>x.id===p.id)}));
   await edit(s=>({...s,roster:merge(s.roster),participantCatalog:merge(s.participantCatalog)}));
  });return patchQueue;
 };
 function renderTable(){
  const box=element.table;box.replaceChildren();
  const top=panel("✦ Mi mesa · "+info.title,box);
  const summary=create("div","mc-summary");
  for(const [label,value] of [["Personajes",info.roster.filter(x=>x.type==="player").length],["Aliados",info.roster.filter(x=>x.type==="ally").length],["Enemigos",info.roster.filter(x=>x.type==="enemy").length],["Ronda",info.round||1]]){
   const stat=create("div","mc-stat"),n=create("strong","",String(value));
   stat.append(create("small","",label),n);summary.append(stat)
  }
  top.append(summary);
  top.append(combatList());
 }
 function portrait(entry,full=false){
  if(entry.uid){const profile=portraitProfiles.get(entry.uid);return (!full&&profile?.thumbnail)||profile?.portrait||'assets/hero.svg';}
  const value=entry.portrait||info.participantCatalog?.find(p=>p.id===entry.id)?.portrait;
  return typeof value==='string'&&(/^(data:image\/(jpeg|png|webp);base64,|assets\/)/i.test(value))?value:entry.type==='enemy'?'assets/enemy.svg':entry.type==='ally'?'assets/ally.svg':'assets/hero.svg';
 }
 function combatList(){
  const list=create('div','mc-combat-list');
  if(!info.roster.length){empty(list,'No hay participantes seleccionados.');return list;}
  info.roster.forEach((entry,i)=>{
   const enemy=(entry.side||entry.type)==='enemy';
   const card=create('article','mc-combat-row'+(enemy?' enemy':' ally')+(info.started&&info.turnIndex===i?' is-current':'')+(entry.dead?' is-dead':''));
   if(info.started&&info.turnIndex===i)card.setAttribute('aria-current','step');
   card.append(create('span','mc-order',String(i+1)));
   const photo=makeBtn('',()=>window.alakViewPortrait?.(entry.name,portrait(entry,true),photo));photo.className='mc-portrait';photo.setAttribute('aria-label','Ver retrato de '+entry.name);
   const img=create('img');img.src=portrait(entry);img.alt='Retrato de '+entry.name;photo.append(img);card.append(photo);
   const identity=create('div','mc-identity');identity.append(create('strong','',entry.name),create('small','mc-badge',enemy?'ENEMIGO':entry.type==='player'?'JUGADOR':'ALIADO'));
   if(isAdmin){
    const roll=field('Inic.','initiative',entry.initiative??0,'number');const input=roll.querySelector('input');input.min='-99';input.setAttribute('aria-label','Tirada de iniciativa de '+entry.name);
    input.onchange=()=>{const value=input.valueAsNumber;if(Number.isFinite(value))void edit(s=>{
     const currentId=s.roster[s.turnIndex]?.id;
     const roster=s.roster.map(p=>p.id===entry.id?{...p,initiative:Math.trunc(value)}:p).sort((a,b)=>(b.initiative||0)-(a.initiative||0));
     return {...s,roster,turnIndex:Math.max(0,roster.findIndex(p=>p.id===currentId))};
    });};identity.append(roll);
   }else identity.append(create('small','','Inic. '+(entry.initiative??0)));
   if(entry.dead)identity.append(create('small','','Caído'));
   card.append(identity);
   const damage=Math.max(0,Number(entry.damage??(entry.maxHP!=null&&entry.hp!=null?entry.maxHP-entry.hp:0))||0);
   const max=Number(entry.maxHP)>0?Number(entry.maxHP):null, hp=max===null?null:Math.max(0,max-damage),ratio=max?Math.min(100,100*hp/max):100;
   const health=create('div','mc-health');health.append(create('div','','Vida '+(hp??'—')+' / '+(max??'—')+(max?' · '+Math.round(ratio)+'%':' · PG sin definir')));
   const bar=create('div','mc-life-track');bar.setAttribute('role','meter');bar.setAttribute('aria-label','Vida de '+entry.name);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(max||100));bar.setAttribute('aria-valuenow',String(hp??100));bar.setAttribute('aria-valuetext',max?hp+' de '+max:'PG sin definir');const fill=create('span');fill.style.width=ratio+'%';bar.append(fill);health.append(bar);card.append(health);
   const damages=create('div','mc-damage');damages.append(create('small','','DAÑO'),create('strong','',String(damage)));card.append(damages);
   if(isAdmin){const actions=create('div','mc-actions');actions.append(makeBtn('⚔ Daño',()=>void changeHP(entry.id,-1)),makeBtn('✚ Curar',()=>void changeHP(entry.id,1)));card.append(actions);}
   list.append(card);
  });return list;
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
 window.alakResetEncounter=async()=>{while(saving)await new Promise(resolve=>setTimeout(resolve,50));return editCombat(s=>({...s,roster:[],started:false,round:0,turnIndex:0,selectionInitialized:true}));};
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
  const round=create("div","mc-stat");round.append(create("small","","Ronda actual"),create("strong","",info.started===false?"—":String(info.round||1)));summary.append(round);
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
  surface.append(combatList());
  if(!isAdmin)surface.append(create("p","mc-info","Los cambios de vida, turnos y rondas se actualizan automáticamente desde la cuenta del DM o del propietario."));
 }
 async function changeHP(entryId,direction){
  const delta=Number(prompt(direction<0?"¿Cuántos puntos de daño?":"¿Cuántos puntos de curación?","1"));
  if(!Number.isFinite(delta)||delta<=0||delta>9999)return;
  const m=info.roster.find(x=>x.id===entryId);if(!m)return;
  const damage=Math.max(0,Number(m.damage??(m.maxHP!=null&&m.hp!=null?m.maxHP-m.hp:0))-direction*delta);
  const newHp=m.maxHP==null?null:Math.max(0,Number(m.maxHP)-damage);
  await edit(s=>({...s,roster:s.roster.map(x=>x.id===entryId?{...x,hp:newHp,damage}:x)}));
  // Mantener sincronizada también la hoja de personaje individual; nunca editar su retrato.
  if(m.uid&&newHp!==null){
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
  window.alakCampaignControls?.render({host:box,players,roles:accountRoles,admitted,current,send:edit});
  const surface=panel("⚙ Dirección de campaña",box);
  const titleForm=create("form","mc-form"),title=field("Nombre de la campaña","title",info.title);
  const btn=create("button","","Guardar nombre");btn.type="submit";
  titleForm.append(title,btn);titleForm.onsubmit=e=>{e.preventDefault();const name=title.querySelector("input").value.trim();if(name)void edit(s=>({...s,title:name.slice(0,80)}))};surface.append(titleForm);
  const open=makeBtn('Agregar / quitar participantes',()=>select('combat',true));surface.append(open);
  const members=panel('Jugadores registrados',box);members.append(create('p','','Quienes se registran pueden preparar su hoja. Solo el propietario y el DM deciden quién entra a esta aventura.'));
  if(!players.length)empty(members,'Todavía no hay hojas registradas.');
  for(const player of players){const id=player.ownerUid;if(id===current?.uid||['owner','dm'].includes(accountRoles.get(id)))continue;
   const row=create('div','mc-member-row'),name=player.fields?.name||player.accountName||'Nuevo jugador';row.append(create('strong','',name),create('span','',player.accountName||'Cuenta registrada'));
   const activeMember=admitted(id);row.append(create('small','',activeMember?'En la aventura':'Pendiente de admisión'));
   const button=makeBtn(activeMember?'Retirar acceso':'Agregar a la aventura',async()=>{button.disabled=true;try{
    await runTransaction(db,async tx=>{const snapshot=await tx.get(ref),data=parse(snapshot.exists()?snapshot.data():{});const catalog=[...(data.participantCatalog||[])];
     if(!activeMember&&!catalog.some(p=>p.uid===id)){const existing=catalog.find(p=>p.name===name&&!p.uid&&p.type==='player');if(existing)existing.uid=id;else{let label=name;let suffix=2;while(catalog.some(p=>p.name===label))label=name+' ('+(suffix++)+')';catalog.push({id:'local:'+label,name:label,uid:id,type:'player',side:'ally',initiative:0,damage:0,dead:false,maxHP:null,hp:null});}}
     tx.set(doc(db,'adventureMembers',id),{active:!activeMember,updatedBy:current.uid,updatedAt:serverTimestamp()});
     tx.set(ref,{...data,participantCatalog:catalog,roster:data.roster.map(entry=>{const linked=catalog.find(c=>c.id===entry.id);return linked?.uid?{...entry,uid:linked.uid}:entry;}),updatedBy:current.uid,updatedAt:serverTimestamp()});
    });memberStates.set(id,{active:!activeMember});renderManage();warn(activeMember?'Acceso retirado. Su hoja personal se conserva.':'Jugador admitido. Ya puede ver la aventura y aparece en Participantes.');
   }catch(e){warn('No se pudo cambiar el acceso: '+(e.code||e.message));button.disabled=false;}});row.append(button);members.append(row);
  }

 }
 function render(){if(!hasCampaign)return;nav.hidden=false;watchPortraits();if(info.selectionInitialized)window.alakApplyEncounterRoster?.(info.roster,info.started,info.turnIndex);renderTable();renderCombat();renderDiary();renderManage();renderPlayerLinks();select(window.alakNavigation?.get()?.campaign||active)}
 async function activate(account){
  const localCatalog=window.alakEncounterCatalog?.();
  current=account;warn("⏳ Verificando acceso…");
  try{
   const roleDoc=await getDoc(doc(db,"appRoles",account.uid));
   role=roleDoc.exists()?roleDoc.data().role:"player";
   if(!["owner","dm","player"].includes(role)){warn("Tu cuenta necesita un rol para ver la campaña.");return}
   isAdmin=role==="owner"||role==="dm";
   nav.querySelector('[data-mc-view="manage"]').hidden=!isAdmin;
   if(!isAdmin&&active==="manage")active="table";
   if(cancelCampaign)cancelCampaign();
   const connectCampaign=()=>{if(hasCampaign)return;hasCampaign=true;
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
    window.alakCampaignControls?.receive(info,current.uid);window.alakCampaignControls?.mountAudio(header);
    render();
   },e=>{warn("Sin acceso a Campaña: revisa las reglas Firestore ('campaigns/main'). "+(e.code||""))});
   };
   if(isAdmin)connectCampaign();else cancelAccess=onSnapshot(doc(db,'adventureMembers',account.uid),snap=>{if(current?.uid!==account.uid)return;const allowed=snap.exists()?snap.data().active===true:roleDoc.exists()&&role==='player';if(allowed)connectCampaign();else{clearCampaign();warn('Tu hoja está lista. El propietario o el DM te agregará a la aventura.');}},()=>{clearCampaign();warn('No se pudo consultar tu acceso a la aventura.');});
   if(cancelPlayers)cancelPlayers();
   if(isAdmin){
    cancelPlayers=onSnapshot(collection(db,"players"),snap=>{
     players=snap.docs.map(d=>({...d.data(),ownerUid:d.id||d.data().ownerUid}));renderManage();renderPlayerLinks();
    },e=>warn("Mesa disponible; no se pueden consultar personajes: "+(e.code||"")));
    accessStops.push(onSnapshot(collection(db,'adventureMembers'),snap=>{memberStates.clear();snap.docs.forEach(d=>memberStates.set(d.id,d.data()));renderManage();}));
    accessStops.push(onSnapshot(collection(db,'appRoles'),snap=>{accountRoles.clear();snap.docs.forEach(d=>accountRoles.set(d.id,d.data().role));renderManage();}));
   }else players=[];
   if(isAdmin&&window.alakEncounterCatalog){
    const catalog=localCatalog||window.alakEncounterCatalog(),selected=window.alakEncounterParticipants();
    await edit(s=>{
     const migrate=p=>{const local=catalog.find(c=>c.id===p.id||c.name===p.name);return local?{...local,...p,portrait:p.portrait||local.portrait}:p;};
     return {...s,participantCatalog:(s.participantCatalog?.length?s.participantCatalog:catalog).map(migrate),roster:(s.selectionInitialized||s.roster.length?s.roster:selected).map(migrate),selectionInitialized:true};
    });
   }
   render();
  }catch(e){warn("No se pudo verificar rol: "+(e.code||e.message))}
 }
 onAuthStateChanged(auth,account=>{
  clearCampaign();
  if(cancelAccess){cancelAccess();cancelAccess=null;}accessStops.forEach(stop=>stop());accessStops=[];memberStates.clear();accountRoles.clear();hasCampaign=false;nav.hidden=true;
  if(cancelCampaign){cancelCampaign();cancelCampaign=null}
  if(cancelPlayers){cancelPlayers();cancelPlayers=null}
  for(const stop of portraitSubscriptions.values())stop();portraitSubscriptions.clear();portraitProfiles.clear();
  current=null;players=[];info=defaults();role="player";isAdmin=false;
  if(account)void activate(account);
  else{warn("Inicia sesión con Google para acceder a la mesa.");render()}
 });
 select("table");
}




