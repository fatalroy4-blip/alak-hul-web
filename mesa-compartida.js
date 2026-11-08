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
 const defaults=()=>({title:"Las nieblas de Barovia",round:1,turnIndex:0,roster:[],diary:[]});
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
  const b=makeBtn(label,()=>select(key));b.dataset.mcView=key;nav.append(b);
  const pane=create("div","mc-pane");pane.dataset.mcPane=key;main.append(pane);element[key]=pane;
 }
 root.append(header,nav,main);mountPoints.forEach((mount,i)=>{if(i===0)mount.append(root);else mount.append(root.cloneNode(true))});
 // Normally one mount exists per page; the shared component is instantiated identically in each page.
 const warn=t=>{signal.textContent=t};
 function select(name){
  if(name==="manage"&&!isAdmin)return;
  active=name;
  nav.querySelectorAll("[data-mc-view]").forEach(btn=>btn.setAttribute("aria-pressed",String(btn.dataset.mcView===name)));
  main.querySelectorAll("[data-mc-pane]").forEach(p=>p.classList.toggle("active",p.dataset.mcPane===name));
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
  if(!current||!isAdmin)return;
  saving=true;warn("⏳ Guardando cambios…");
  try{
   await runTransaction(db,async transaction=>{
    const old=await transaction.get(ref);
    const data=parse(old.exists()?old.data():{});
    const next=changeFn(data);
    if(!next)return;
    transaction.set(ref,{...next,updatedAt:serverTimestamp(),updatedBy:current.uid});
   });
   warn("✓ Campaña sincronizada");
  }catch(e){warn("No se pudo guardar en la mesa: "+(e.code||e.message))}
  finally{saving=false}
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
 function renderCombat(){
  const box=element.combat;box.replaceChildren();
  const surface=panel("⚔ Iniciativa y combate",box);
  const summary=create("div","mc-summary");
  const round=create("div","mc-stat");round.append(create("small","","Ronda actual"),create("strong","",String(info.round||1)));summary.append(round);
  const turn=create("div","mc-stat");turn.append(create("small","","Turno de"),create("strong","",info.roster[info.turnIndex]?.name||"—"));summary.append(turn);surface.append(summary);
  const controls=create("div","mc-actions");
  if(isAdmin){
   controls.append(
    makeBtn("Iniciar / reiniciar combate",()=>{if(confirm("¿Reiniciar la ronda y el orden de iniciativa?"))void edit(s=>({...s,round:1,turnIndex:0}))}),
    makeBtn("Siguiente turno",()=>void edit(s=>{
     const next=(Number(s.turnIndex||0)+1)%Math.max(1,s.roster.length);
     return {...s,turnIndex:next,round:next===0?Number(s.round||1)+1:Number(s.round||1)};
    }))
   );
  }
  if(controls.childElementCount)surface.append(controls);
  if(!info.roster.length){empty(surface,"El DM añadirá primero los personajes desde Dirección.");return}
  const list=create("div","mc-roster");
  info.roster.forEach((entry,i)=>{
   const card=create("article","mc-figure"+(info.turnIndex===i?" is-active":""));
   card.append(create("small","mc-type",entry.type==="enemy"?"Enemigo":entry.type==="ally"?"Aliado":"Jugador"));
   card.append(create("strong","",entry.name||"Sin nombre"));
   card.append(create("div","mc-hp","PG "+(entry.hp??"—")+" / "+(entry.maxHP??"—")+" · Iniciativa "+(entry.initiative??"—")));
   if(isAdmin){
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
  const members=panel("Añadir participante a la mesa",box);
  const form=create("form","mc-form"),selectWrap=create("label","","Jugador registrado");
  const select=create("select");select.name="selectedPlayer";const none=create("option","","Crear NPC o enemigo");none.value="";select.append(none);
  for(const p of players.filter(x=>x.ownerUid)){
   const option=create("option","",p.fields?.name||p.accountName||p.accountEmail||"Personaje sin nombre");option.value=p.ownerUid;select.append(option);
  }selectWrap.append(select);
  const name=field("Nombre","name");const typeWrap=create("label","","Tipo");const type=create("select");
  for(const [value,display] of [["player","Jugador"],["ally","Aliado / NPC"],["enemy","Enemigo"]]){const opt=create("option","",display);opt.value=value;type.append(opt)}
  typeWrap.append(type);
  const hp=field("PG máximos","maxHP","","number"),ac=field("CA","ac","","number"),initiative=field("Iniciativa","initiative","","number");
  const add=create("button","","+ Añadir participante");add.type="submit";form.append(selectWrap,name,typeWrap,hp,ac,initiative,add);
  select.onchange=()=>{
   const player=players.find(x=>x.ownerUid===select.value);
   if(!player)return;
   name.querySelector("input").value=player.fields?.name||"";
   hp.querySelector("input").value=player.fields?.maxHP||player.sheet?.hpMax||"";
   ac.querySelector("input").value=player.fields?.ac||player.sheet?.ac||"";
   initiative.querySelector("input").value=player.fields?.initiative||player.sheet?.initiative||"";
   type.value="player";
  };
  form.onsubmit=e=>{
   e.preventDefault();
   const fd=new FormData(form),display=String(fd.get("name")||"").trim(),playerUid=String(fd.get("selectedPlayer")||"");
   if(!display)return;
   const maxHP=Math.max(0,Math.min(9999,Number(fd.get("maxHP"))||0));
   const entry={id:uid(),uid:playerUid||null,type:type.value,name:display.slice(0,80),classInfo:players.find(x=>x.ownerUid===playerUid)?.fields?.className||"",hp:maxHP,maxHP,ac:Number(fd.get("ac"))||0,initiative:Number(fd.get("initiative"))||0};
   void edit(s=>({...s,roster:[...s.roster,entry].slice(0,40)}));
   form.reset();
  };
  members.append(form,create("p","mc-info","El DM puede ajustar vida y turnos desde Combate. Los jugadores verán los cambios en la misma mesa."));
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
    if(!snap.exists()){
     info=defaults();if(isAdmin){
      try{await runTransaction(db,async transaction=>{const saved=await transaction.get(ref);if(!saved.exists())transaction.set(ref,{...defaults(),createdBy:current.uid,updatedBy:current.uid,updatedAt:serverTimestamp()})})}
      catch(e){warn("No se pudo crear la mesa: "+(e.code||"error"))}
     }else warn("Tu DM aún no ha iniciado la campaña.");
    }else{info=parse(snap.data());warn("✓ Mesa conectada · actualizada en tiempo real")}
    render();
   },e=>{warn("Sin acceso a Campaña: revisa las reglas Firestore ('campaigns/main'). "+(e.code||""))});
   if(cancelPlayers)cancelPlayers();
   if(isAdmin){
    cancelPlayers=onSnapshot(collection(db,"players"),snap=>{
     players=snap.docs.map(d=>d.data());if(active==="manage")renderManage()
    },e=>warn("Mesa disponible; no se pueden consultar personajes: "+(e.code||"")));
   }else players=[];
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
