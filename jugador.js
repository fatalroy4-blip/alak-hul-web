/* Hoja individual v47: ningún dato de Alak Hul se comparte con este editor. */
import {initializeApp} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {getFirestore,doc,getDoc,setDoc,onSnapshot,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
const $=id=>document.getElementById(id), all=sel=>[...document.querySelectorAll(sel)];
const auth=getAuth(initializeApp(window.ALAK_FIREBASE_CONFIG)),db=getFirestore();
const stats={strength:"Fuerza",dexterity:"Destreza",constitution:"Constitución",intelligence:"Inteligencia",wisdom:"Sabiduría",charisma:"Carisma"};
const builtins=[{id:"sheet",name:"Personaje",subtitle:"Mi hoja",symbol:"♟",target:"sheet"},{id:"spells",name:"Trucos y conjuros",subtitle:"Grimorio personal",symbol:"✧",target:"spells"},{id:"traits",name:"Rasgos",subtitle:"Dotes y habilidades",symbol:"✦",target:"traits"},{id:"combat",name:"Combate",subtitle:"Mis recursos",symbol:"⚔",target:"combat"}];
let user=null,targetUid=null,model=null,unsubscribe=null,pending=false,saving=false,queued=false,timer=null,editingExtra=null,administrator=false;
const genId=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(36).slice(2);
const blank=(uid,account)=>({ownerUid:uid,accountName:account?.displayName||"",accountEmail:account?.email||"",updatedBy:uid,fields:{},stats:{},spells:[],traits:[],combatNotes:"",coverTheme:"aurora",coverImage:"",portrait:"",tileImages:{},extras:[]});
const normalize=d=>({...blank(targetUid,user),...d,ownerUid:targetUid,fields:{...(d.fields||{})},stats:{...(d.stats||{})},spells:Array.isArray(d.spells)?d.spells:[],traits:Array.isArray(d.traits)?d.traits:[],extras:Array.isArray(d.extras)?d.extras:[],tileImages:{...(d.tileImages||{})}});
const role=async uid=>{try{const snap=await getDoc(doc(db,"appRoles",uid));return snap.exists()?snap.data().role:"player"}catch{return "player"}};
const status=message=>$("saveIndicator").textContent=message;
function change(){if(!model)return;pending=true;status("Cambios pendientes");clearTimeout(timer);timer=setTimeout(save,850);updateSummary()}
async function save(){
 if(!model||!user)return;
 if(saving){queued=true;return}
 clearTimeout(timer);timer=null;saving=true;status("Guardando en nube…");
 const payload={...model,ownerUid:targetUid,updatedBy:user.uid,updatedAt:serverTimestamp()};
 if(JSON.stringify({...payload,updatedAt:null}).length>760000){status("Demasiadas imágenes. Reduce su tamaño.");saving=false;return}
 try{
  await setDoc(doc(db,"players",targetUid),payload);
  pending=false;status("✓ Guardado en nube");
  try{localStorage.setItem("aventurero-respaldo-"+targetUid,JSON.stringify({...model,updatedAt:null}))}catch{}
 }catch(e){pending=true;status("Guardado pendiente: "+(e?.code||"error"))}
 finally{saving=false;if(queued){queued=false;change()}}
}
function switchView(view,extraId){
 for(const panel of all(".screen"))panel.classList.toggle("active",panel.id===view+"View");
 for(const b of all("[data-view]"))b.classList.toggle("active",b.dataset.view===view);
 if(view==="extras"&&extraId){editingExtra=extraId;const e=model.extras.find(x=>x.id===extraId);$("extrasTitle").textContent=e?.name||"Mi rasgo";$("extraNotes").value=e?.notes||""}
 if(view==="design")renderDesign();if(view==="home")renderHome();if(view==="combat")renderCombat();
 window.scrollTo({top:0,behavior:"instant"});
}
function updateSummary(){
 if(!model)return;
 const n=Object.values(model.fields).filter(x=>String(x??"").trim()).length+Object.values(model.stats).filter(x=>String(x??"").trim()).length+model.spells.length+model.traits.length;
 $("homeProgress").textContent="Progreso: "+n+" campos y registros completados";
 $("heroName").textContent=model.fields.name?.trim()||"Mi personaje";
 $("heroSubtitle").textContent=[model.fields.race,model.fields.className,model.fields.level?"Nivel "+model.fields.level:""].filter(Boolean).join(" · ")||"Tu historia aún está por escribirse";
}
function renderHome(){
 if(!model)return;
 const cover=model.coverImage?'url("'+model.coverImage+'")':model.coverTheme==="night"?"url('assets/player-home-night.svg')":model.coverTheme==="violet"?"url('assets/barovia-purple.png')":"url('assets/player-home-aurora.svg')";
 $("playerHome").style.setProperty("--personal-cover",cover);
 const host=$("homeTiles");host.replaceChildren();
 for(const item of [...builtins,...model.extras.map(x=>({...x,target:"extras",symbol:"✹"}))]){
  const b=document.createElement("button");b.type="button";b.className="tile";
  const image=model.tileImages[item.id];if(image)b.style.setProperty("--tile-image",'url("'+image+'")');
  const icon=document.createElement("span");icon.className="tile-icon";icon.textContent=item.symbol;
  const title=document.createElement("strong");title.textContent=item.name;
  const summary=document.createElement("small");summary.textContent=item.subtitle||item.description||"Sección personal";
  b.append(icon,title,summary);b.onclick=()=>switchView(item.target,item.target==="extras"?item.id:null);host.append(b);
 }
 updateSummary();
}
function renderSheet(){
 for(const el of all("[data-field]"))el.value=model.fields[el.dataset.field]??"";
 for(const el of all("[data-stat]"))el.value=model.stats[el.dataset.stat]??"";
 $("sheetPortrait").src=model.portrait||"assets/hero.svg";
}
function renderCombat(){
 for(const [id,field] of [["combatHP","hp"],["combatMax","maxHP"],["combatInitiative","initiative"],["combatAC","ac"]])$(id).textContent=model.fields[field]||"—";
 if(document.activeElement!==$("combatNotes"))$("combatNotes").value=model.combatNotes||"";
}
function renderEntries(type){
 const host=$(type==="spells"?"spellList":"traitList");host.replaceChildren();
 if(!model[type].length){const p=document.createElement("p");p.className="hint";p.textContent="Todavía no has añadido "+(type==="spells"?"conjuros.":"rasgos.");host.append(p);return}
 for(const item of model[type]){
  const card=document.createElement("article");card.className="entry";
  const h=document.createElement("h3");h.textContent=item.title;
  const small=document.createElement("small");small.textContent=type==="spells"?(Number(item.level)===0?"Truco":"Nivel "+item.level):item.type;
  const p=document.createElement("p");p.textContent=item.description||"Sin descripción";
  const remove=document.createElement("button");remove.textContent="Eliminar";remove.onclick=()=>{if(!confirm("¿Eliminar "+item.title+"?"))return;model[type]=model[type].filter(x=>x.id!==item.id);change();renderEntries(type)};
  card.append(h,small,p,remove);host.append(card);
 }
}
function renderExtraNav(){
 const host=$("extraTabLinks");host.replaceChildren();
 for(const item of model.extras){const b=document.createElement("button");b.type="button";b.textContent="✹ "+item.name;b.onclick=()=>switchView("extras",item.id);host.append(b)}
}
function renderDesign(){
 if(!model)return;
 for(const btn of all("[data-theme]"))btn.classList.toggle("selected",btn.dataset.theme===model.coverTheme);
 $("portraitPreview").src=model.portrait||"assets/hero.svg";
 const host=$("tileEditors");host.replaceChildren();
 for(const item of [...builtins,...model.extras]){
  const wrapper=document.createElement("div");wrapper.className="tile-editor";
  const title=document.createElement("strong");title.textContent=item.name;
  const label=document.createElement("label");label.textContent="Imagen del botón";
  const input=document.createElement("input");input.type="file";input.accept="image/png,image/jpeg,image/webp";
  input.onchange=async()=>{const file=input.files?.[0];input.value="";if(file)await changeImage(file,value=>model.tileImages[item.id]=value,true)};
  label.append(input);
  const clear=document.createElement("button");clear.type="button";clear.className="ghost";clear.textContent="Quitar imagen";
  clear.onclick=()=>{delete model.tileImages[item.id];change();renderHome()};
  wrapper.append(title,label,clear);host.append(wrapper);
 }
 const extraHost=$("extraEditors");extraHost.replaceChildren();
 for(const item of model.extras){
  const wrap=document.createElement("div");wrap.className="entry";const strong=document.createElement("strong");strong.textContent=item.name;
  const remove=document.createElement("button");remove.textContent="Eliminar botón";
  remove.onclick=()=>{if(!confirm("¿Eliminar «"+item.name+"» y sus notas?"))return;model.extras=model.extras.filter(x=>x.id!==item.id);delete model.tileImages[item.id];change();renderExtraNav();renderDesign();renderHome()};
  wrap.append(strong,document.createTextNode(" "),remove);extraHost.append(wrap);
 }
}
async function optimize(file){
 if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>20000000)throw Error("Elige un JPG, PNG o WebP menor de 20 MB");
 return new Promise((resolve,reject)=>{
  const image=new Image(),url=URL.createObjectURL(file);
  image.onerror=()=>{URL.revokeObjectURL(url);reject(Error("Imagen no válida"))};
  image.onload=()=>{
   URL.revokeObjectURL(url);
   try{
    const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d",{alpha:false});
    let width=Math.min(1350,image.naturalWidth);
    for(let step=0;step<8;step++){
     canvas.width=Math.max(1,width);canvas.height=Math.max(1,Math.round(width*image.naturalHeight/image.naturalWidth));
     ctx.fillStyle="#24142d";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
     for(const quality of [.75,.53,.35,.2,.12]){
      let value=canvas.toDataURL("image/webp",quality);
      if(!value.startsWith("data:image/webp"))value=canvas.toDataURL("image/jpeg",quality);
      if(value.length<82000){resolve(value);return}
     }width=Math.max(350,Math.floor(width*.77));
    }reject(Error("No se pudo optimizar"));
   }catch(e){reject(e)}
  };image.src=url;
 });
}
async function changeImage(file,callback,refresh=false){
 status("Preparando imagen…");
 try{callback(await optimize(file));change();renderHome();renderSheet();if(refresh)renderDesign()}catch(e){status("Error de imagen: "+e.message)}
}
function renderAll(){if(!model)return;renderSheet();renderHome();renderEntries("spells");renderEntries("traits");renderExtraNav();renderDesign();renderCombat()}
async function activate(account){
 user=account;const requested=new URLSearchParams(location.search).get("uid");
 administrator=["owner","dm"].includes(await role(account.uid));
 if(requested&&requested!==account.uid&&!administrator){$("loginStatus").textContent="Esta hoja pertenece a otra persona.";return}
 targetUid=requested||account.uid;
 $("authWall").hidden=true;$("workspace").hidden=false;$("logoutBtn").hidden=false;
 $("identityLine").textContent=account.displayName||account.email||"Cuenta Google";
 const ref=doc(db,"players",targetUid);
 try{
  const snapshot=await getDoc(ref);
  if(snapshot.exists())model=normalize(snapshot.data());
  else if(targetUid===account.uid){model=blank(targetUid,account);await setDoc(ref,{...model,updatedAt:serverTimestamp()})}
  else {status("El jugador todavía no ha creado su hoja.");return}
  renderAll();
  if(unsubscribe)unsubscribe();
  unsubscribe=onSnapshot(ref,snap=>{
   if(!snap.exists()||snap.metadata.hasPendingWrites||pending||saving)return;
   const data=snap.data();
   if(data.updatedBy!==user.uid){model=normalize(data);renderAll();status("✓ Hoja actualizada por otro usuario")}
  },e=>status("Sincronización: "+(e.code||"error")));
  status("✓ Hoja cargada y sincronizada");
 }catch(e){$("workspace").hidden=true;$("authWall").hidden=false;$("loginStatus").textContent="No pude cargar la hoja: "+(e.code||e.message)+". Revisa las reglas de Firebase."}
}
function bind(){
 const grid=$("statsGrid");for(const [key,title] of Object.entries(stats)){
  const label=document.createElement("label");label.textContent=title;
  const input=document.createElement("input");input.dataset.stat=key;input.type="number";input.min=1;input.max=30;input.placeholder="—";label.append(input);grid.append(label);
 }
 all("[data-view]").forEach(b=>b.onclick=()=>switchView(b.dataset.view));
 $("homeEdit").onclick=()=>switchView("design");
 all("[data-open-design]").forEach(b=>b.onclick=()=>switchView("design"));
 $("logoutBtn").onclick=()=>signOut(auth);
 $("loginBtn").onclick=async()=>{try{$("loginStatus").textContent="Abriendo Google…";await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){$("loginStatus").textContent="Error al iniciar sesión: "+(e.code||e.message)}};
 all("[data-field]").forEach(el=>el.oninput=()=>{if(!model)return;model.fields[el.dataset.field]=el.value;change();renderCombat()});
 all("[data-stat]").forEach(el=>el.oninput=()=>{if(!model)return;model.stats[el.dataset.stat]=el.value;change()});
 $("combatNotes").oninput=()=>{model.combatNotes=$("combatNotes").value;change()};
 for(const [button,direction] of [["takeDamage",-1],["receiveHeal",1]]){
  $(button).onclick=()=>{
   const amount=Math.max(1,Math.min(9999,Number($("combatAmount").value)||1));
   const current=Number(model.fields.hp)||0,max=Number(model.fields.maxHP)||9999;
   model.fields.hp=String(Math.max(0,Math.min(max,current+direction*amount)));change();renderSheet();renderCombat();
  };
 }
 for(const kind of ["spells","traits"]){
  $(kind==="spells"?"spellForm":"traitForm").onsubmit=event=>{
   event.preventDefault();const f=event.currentTarget,fd=new FormData(f);
   const title=String(fd.get("title")||"").trim();if(!title)return;
   model[kind].push({id:genId(),title:title.slice(0,90),description:String(fd.get("description")||"").slice(0,3500),...(kind==="spells"?{level:String(fd.get("level"))}:{type:String(fd.get("type"))})});
   f.reset();change();renderEntries(kind);
  };
 }
 for(const b of all("[data-theme]"))b.onclick=()=>{model.coverTheme=b.dataset.theme;model.coverImage="";change();renderHome();renderDesign()};
 $("clearCover").onclick=()=>{model.coverImage="";change();renderHome()};
 $("coverUpload").onchange=async event=>{const file=event.target.files?.[0];event.target.value="";if(file)await changeImage(file,value=>model.coverImage=value)};
 $("portraitUpload").onchange=async event=>{const file=event.target.files?.[0];event.target.value="";if(file)await changeImage(file,value=>model.portrait=value,true)};
 $("extraForm").onsubmit=event=>{
  event.preventDefault();if(model.extras.length>=10){alert("Límite de 10 botones adicionales.");return}
  const fd=new FormData(event.currentTarget),name=String(fd.get("name")||"").trim();
  if(!name)return;
  model.extras.push({id:genId(),name:name.slice(0,30),description:String(fd.get("description")||"").trim().slice(0,75),notes:""});
  event.currentTarget.reset();change();renderHome();renderExtraNav();renderDesign();
 };
 $("extraNotes").oninput=()=>{const e=model.extras.find(x=>x.id===editingExtra);if(e){e.notes=$("extraNotes").value;change()}};
}
bind();
onAuthStateChanged(auth,account=>{
 if(unsubscribe){unsubscribe();unsubscribe=null}clearTimeout(timer);model=null;user=null;targetUid=null;pending=false;
 if(account)void activate(account);
 else{$("workspace").hidden=true;$("authWall").hidden=false;$("logoutBtn").hidden=true;status("Sin conectar");$("loginStatus").textContent=""}
});
window.addEventListener("beforeunload",()=>{if(model&&pending){try{localStorage.setItem("aventurero-respaldo-"+targetUid,JSON.stringify(model))}catch{}}});
