/* Hoja individual v47: ningún dato de Alak Hul se comparte con este editor. */
import {initializeApp} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {getFirestore,doc,getDoc,setDoc,onSnapshot,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
const $=id=>document.getElementById(id), all=sel=>[...document.querySelectorAll(sel)];
const auth=getAuth(initializeApp(window.ALAK_FIREBASE_CONFIG)),db=getFirestore();
const stats={strength:"Fuerza",dexterity:"Destreza",constitution:"Constitución",intelligence:"Inteligencia",wisdom:"Sabiduría",charisma:"Carisma"};
const builtins=[{id:"sheet",name:"Personaje",subtitle:"Mi hoja",symbol:"♟",target:"sheet"},{id:"spells",name:"Trucos y conjuros",subtitle:"Grimorio personal",symbol:"✧",target:"spells"},{id:"traits",name:"Rasgos",subtitle:"Dotes y habilidades",symbol:"✦",target:"traits"},{id:"campaign",name:"Campaña",subtitle:"Multijugador",symbol:"⚔",target:"campaign"}];
let currentRole="player",spellLibrary=[],user=null,targetUid=null,model=null,unsubscribe=null,pending=false,saving=false,queued=false,timer=null,editingExtra=null,administrator=false;
const genId=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(36).slice(2);
const blank=(uid,account)=>({ownerUid:uid,accountName:account?.displayName||"",accountEmail:account?.email||"",updatedBy:uid,fields:{},stats:{},spells:[],traits:[],sheet:{},slots:{},traitsButtonName:"Rasgos",combatNotes:"",coverTheme:"aurora",coverImage:"",portrait:"",tileImages:{},extras:[],ruleBuild:null});
const normalize=d=>({...blank(targetUid,user),...d,ownerUid:targetUid,fields:{...(d.fields||{})},stats:{...(d.stats||{})},sheet:{...(d.sheet||{})},slots:{...(d.slots||{})},traitsButtonName:d.traitsButtonName||"Rasgos",spells:Array.isArray(d.spells)?d.spells:[],traits:Array.isArray(d.traits)?d.traits:[],extras:Array.isArray(d.extras)?d.extras:[],tileImages:{...(d.tileImages||{})},ruleBuild:d.ruleBuild||null});
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
  const icon=document.createElement("span");icon.className="tile-icon";if(item.id==="sheet"&&model.portrait){const img=document.createElement("img");img.className="miniature-portrait";img.src=model.portrait;img.alt="Retrato de mi personaje";icon.append(img)}else icon.textContent=item.symbol;
  const title=document.createElement("strong");title.textContent=item.id==="traits"?(model.traitsButtonName||"Rasgos"):item.name;
  const summary=document.createElement("small");summary.textContent=item.subtitle||item.description||"Sección personal";
  b.append(icon,title,summary);b.onclick=()=>switchView(item.target,item.target==="extras"?item.id:null);host.append(b);
 }
 updateSummary();
}
function canChangePortrait(){return !!user && (user.uid===targetUid || currentRole==="owner");}
const legacyFieldMap={name:"name",name2:"name",race:"race",background:"background",alignment:"alignment",xp:"xp",classLevel:"className",hpCurrent:"hp",hpMax:"maxHP",hpTemp:"tempHP",ac:"ac",initiative:"initiative",speed:"speed",backstory:"story",equipment:"equipment",personality:"personality",ideals:"ideals",profBonus:"proficiency"};
function sheetFieldValue(key){
 if(Object.prototype.hasOwnProperty.call(model.sheet||{},key))return model.sheet[key];
 if(key==="classLevel")return [model.fields.className,model.fields.level?"N"+model.fields.level:""].filter(Boolean).join(" ");
 if(legacyFieldMap[key])return model.fields[legacyFieldMap[key]]??"";
 if(/^ability_\d$/.test(key)){const ability=["strength","dexterity","constitution","intelligence","wisdom","charisma"][Number(key.slice(-1))];return model.stats?.[ability]??""}
 return "";
}
function renderSheet(){
 if(!model)return;
 const scope=$("character");
 scope.querySelectorAll("[data-char]").forEach(el=>{
  const key=el.dataset.char,value=sheetFieldValue(key);
  if(el.type==="checkbox")el.checked=value===true||value==="true";
  else if(document.activeElement!==el)el.value=String(value??"");
 });
 const image=model.portrait||"assets/hero.svg";
 $("characterPortrait").src=image;
 $("sheetPortrait").src=image;
 const uploader=$("playerReplicaPortraitUpload");if(uploader){uploader.disabled=!canChangePortrait();uploader.closest("label")?.classList.toggle("portrait-forbidden",!canChangePortrait())}
 $("portraitUpload").disabled=!canChangePortrait();
 renderPlayerDeathSaves();
 const status=$("charSaveStatus");if(status)status.textContent=canChangePortrait()?"Ficha personal · guardado en la nube":"Vista de DM · retrato protegido";
}
// Cálculo de modificadores, salvaciones y habilidades como en la hoja de Alak Hul.
const PLAYER_SKILL_ABILITIES=[1,4,3,0,5,3,4,5,3,4,3,4,5,5,3,1,1,4];
function recalculatePlayerSkills(){
 const root=$("character");if(!root||!model)return;
 const ability=Array.from({length:6},(_,i)=>{
  const el=root.querySelector('[data-char="ability_'+i+'"]');
  return el&&String(el.value).trim()!==""?Math.floor((Number(el.value)-10)/2):null;
 });
 const bonus=Number(root.querySelector('[data-char="profBonus"]')?.value)||0;
 const setField=(name,num)=>{
  const el=root.querySelector('[data-char="'+name+'"]');
  if(!el)return;
  const value=num===null?"":(num>=0?"+":"")+num;
  el.value=value;model.sheet[name]=value;
 };
 ability.forEach((value,i)=>setField("abilitymod_"+i,value));
 const saves=["str","dex","con","int","wis","cha"];
 saves.forEach((key,i)=>{
  const enabled=root.querySelector('[data-char="saveprof_'+key+'"]')?.checked===true;
  setField("save_"+key,ability[i]===null?null:ability[i]+(enabled?bonus:0));
 });
 PLAYER_SKILL_ABILITIES.forEach((index,i)=>{
  const enabled=root.querySelector('[data-char="skillprof_'+i+'"]')?.checked===true;
  setField("skill_"+i,ability[index]===null?null:ability[index]+(enabled?bonus:0));
 });
}
function renderPlayerDeathSaves(){
 const sheet=$("character");if(!sheet)return;
 for(const host of sheet.querySelectorAll("[data-death]")){
  const key=host.dataset.death;
  const field=sheet.querySelector('[data-char="'+key+'"]');
  if(!field)continue;
  const count=Math.max(0,Math.min(3,Number(field.value)||0));host.replaceChildren();
  for(let i=1;i<=3;i++){
   const btn=document.createElement("button");btn.type="button";
   btn.className="death-dot"+(i<=count?" filled":"");
   btn.setAttribute("aria-pressed",String(i<=count));
   btn.setAttribute("aria-label",(key==="deathSuccess"?"Éxitos":"Fallos")+": "+i);
   btn.onclick=()=>{
    const amount=i===count?i-1:i;field.value=String(amount);
    model.sheet[key]=String(amount);change();renderPlayerDeathSaves();
   };
   host.append(btn);
  }
 }
}
function syncSheetField(el){
 const key=el.dataset.char;if(!key||!model)return;
 model.sheet[key]=el.type==="checkbox"?el.checked:el.value;
 if(/^spell\d+_\d+$/.test(key))delete model.sheet[key+"__auto"];
 if(key==="name"||key==="name2"){
  model.fields.name=el.value;
  const other=$("character").querySelector('[data-char="'+(key==="name"?"name2":"name")+'"]');
  if(other){other.value=el.value;model.sheet[other.dataset.char]=el.value}
 }else if(key==="classLevel"){
  const raw=String(el.value||"");
  model.fields.className=raw.replace(/\s*(?:nivel|n)\s*\d+\s*$/i,"").trim();
  const level=raw.match(/(?:nivel|n)\s*(\d+)/i);if(level)model.fields.level=level[1];
 }else if(legacyFieldMap[key])model.fields[legacyFieldMap[key]]=el.value;
 else if(/^ability_\d$/.test(key)){const ability=["strength","dexterity","constitution","intelligence","wisdom","charisma"][Number(key.slice(-1))];model.stats[ability]=el.value}
 if(/^(ability_[0-5]|profBonus|saveprof_(str|dex|con|int|wis|cha)|skillprof_(\d|1\d))$/.test(key))recalculatePlayerSkills();
 if(key==="deathSuccess"||key==="deathFail")renderPlayerDeathSaves();
 if(/^spell_slots(\d+)_(total|spent)$/.test(key)){
  const match=key.match(/^spell_slots(\d+)_(total|spent)$/),level=Number(match[1]),kind=match[2];
  model.slots[level]=model.slots[level]||{total:0,used:0};
  model.slots[level][kind==="total"?"total":"used"]=Math.max(0,Number(el.value)||0);
  renderSpellSlots();
 }
 change();if(key==="classLevel")window.dispatchEvent(new Event("alak:player-level-changed"));if(["hpCurrent","hpMax","ac","initiative"].includes(key))renderCombat();
}
function populateSelectedSpellsOnSheet(){
 if(!model)return;
 const scope=$("character");if(!scope)return;
 for(let level=0;level<=9;level++){
  const items=model.spells.filter(x=>Number(x.level)===level);
  const inputs=[...scope.querySelectorAll('input[data-char^="spell'+level+'_"]')];
  const used=new Set();
  // Mantener intactas las casillas que el usuario escribió por su cuenta.
  for(const el of inputs){
   const key=el.dataset.char,existing=String(model.sheet[key]||"").trim();
   if(!existing||model.sheet[key+"__auto"])continue;
   const item=items.find(x=>!used.has(x.id)&&String(x.title).toLowerCase()===existing.toLowerCase());
   if(item)used.add(item.id);
  }
  // Actualizar solo las casillas administradas anteriormente por la lista automática.
  for(const el of inputs){
   const key=el.dataset.char;
   if(!model.sheet[key+"__auto"])continue;
   const existing=String(model.sheet[key]||"").trim();
   const item=items.find(x=>!used.has(x.id)&&String(x.title).toLowerCase()===existing.toLowerCase());
   const index=Number((key.match(/_(\d+)$/)||[])[1])||1;
   if(item){
    used.add(item.id);
    model.sheet["spell"+level+"prep_"+index]=item.prepared===true;
   }else{
    model.sheet[key]="";delete model.sheet[key+"__auto"];
    model.sheet["spell"+level+"prep_"+index]=false;
   }
  }
  // Añadir nuevos conjuros solo a espacios realmente vacíos.
  for(const item of items){
   if(used.has(item.id))continue;
   const el=inputs.find(x=>!String(model.sheet[x.dataset.char]||"").trim());
   if(!el)break;
   const key=el.dataset.char,index=Number((key.match(/_(\d+)$/)||[])[1])||1;
   model.sheet[key]=item.title;model.sheet[key+"__auto"]=true;
   model.sheet["spell"+level+"prep_"+index]=item.prepared===true;
   used.add(item.id);
  }
 }
 renderSheet();
}
function renderSpellSlots(){
 if(!model)return;
 const host=$("playerSpellSlots");if(!host)return;host.replaceChildren();
 for(let level=1;level<=9;level++){
  const values=model.slots[level]||{total:0,used:0},wrap=document.createElement("div");wrap.className="player-slot";
  const title=document.createElement("h4");title.textContent="Nivel "+level;
  const total=document.createElement("label");total.textContent="Total";
  const tin=document.createElement("input");tin.type="number";tin.min=0;tin.max=30;tin.value=values.total||"";tin.placeholder="—";
  const used=document.createElement("label");used.textContent="Gastados";
  const uin=document.createElement("input");uin.type="number";uin.min=0;uin.max=30;uin.value=values.used||"";uin.placeholder="0";
  const update=()=>{
   const t=Math.max(0,Math.min(30,Number(tin.value)||0)),u=Math.min(t,Math.max(0,Math.min(30,Number(uin.value)||0)));
   model.slots[level]={total:t,used:u};
   const totalField=$("character")?.querySelector('[data-char="spell_slots'+level+'_total"]'),usedField=$("character")?.querySelector('[data-char="spell_slots'+level+'_spent"]');
   if(totalField){totalField.value=String(t);model.sheet[totalField.dataset.char]=String(t)}
   if(usedField){usedField.value=String(u);model.sheet[usedField.dataset.char]=String(u)}
   change();
  };
  tin.onchange=update;uin.onchange=update;total.append(tin);used.append(uin);wrap.append(title,total,used);host.append(wrap);
 }
}
async function loadSpellCatalog(){
 try{
  const response=await fetch("data.json",{cache:"force-cache"});if(!response.ok)throw Error("Sin catálogo");
  const data=await response.json();
  spellLibrary=Array.isArray(data.spells)?data.spells.filter(x=>typeof x.name==="string").map(x=>({title:x.name,level:Number(x.level)||0,description:x.description||""})):[];
 }catch(e){spellLibrary=[]}
 renderSpellCatalog();
}
function renderSpellCatalog(){
 const host=$("playerSpellCatalog");if(!host||!model)return;host.replaceChildren();
 const query=($("playerSpellSearch")?.value||"").toLowerCase().trim(),level=$("playerSpellLevelFilter")?.value||"all";
 const items=spellLibrary.filter(x=>(level==="all"||String(x.level)===level)&&(!query||(x.title+" "+x.description).toLowerCase().includes(query))).slice(0,70);
 if(!items.length){const p=document.createElement("p");p.className="hint";p.textContent=spellLibrary.length?"No hay coincidencias. Puedes añadir un conjuro personalizado abajo.":"El catálogo no está disponible; puedes agregar conjuros manualmente.";host.append(p)}
 for(const item of items){
  const selected=model.spells.find(x=>x.title.toLowerCase()===item.title.toLowerCase()&&Number(x.level)===item.level);
  const card=document.createElement("article");card.className="spell-choice";
  const title=document.createElement("strong");title.textContent=item.title;
  const meta=document.createElement("small");meta.textContent=item.level===0?"Truco":"Nivel "+item.level;
  const info=document.createElement("p");info.textContent=item.description.slice(0,330)+(item.description.length>330?"…":"");
  const button=document.createElement("button");button.type="button";button.textContent=selected?"✓ Elegido":"✦ Elegir";button.disabled=Boolean(selected);
  button.onclick=()=>{model.spells.push({id:genId(),title:item.title,level:String(item.level),description:item.description,prepared:false});populateSelectedSpellsOnSheet();change();renderEntries("spells");renderSpellCatalog()};
  card.append(title,meta,info,button);host.append(card);
 }
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
  if(type==="spells"){
   const prep=document.createElement("button");prep.type="button";prep.textContent=item.prepared?"✓ Preparado":"Preparar";prep.onclick=()=>{item.prepared=!item.prepared;populateSelectedSpellsOnSheet();change();renderEntries("spells")};card.append(prep);
  }
  const remove=document.createElement("button");remove.textContent="Eliminar";remove.onclick=()=>{if(!confirm("¿Eliminar "+item.title+"?"))return;model[type]=model[type].filter(x=>x.id!==item.id);change();renderEntries(type);if(type==="spells"){populateSelectedSpellsOnSheet();renderSpellCatalog()}};
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
 $("portraitUpload").disabled=!canChangePortrait();
 $("traitsButtonName").value=model.traitsButtonName||"Rasgos";
 const host=$("tileEditors");host.replaceChildren();
 for(const item of [...builtins,...model.extras]){
  const wrapper=document.createElement("div");wrapper.className="tile-editor";
  const title=document.createElement("strong");title.textContent=item.name;
  const label=document.createElement("label");label.textContent="Imagen del botón";
  const input=document.createElement("input");input.type="file";input.accept="image/png,image/jpeg,image/webp";
  input.disabled=item.id==="sheet"&&!canChangePortrait();
  input.onchange=async()=>{const file=input.files?.[0];input.value="";if(!file||item.id==="sheet"&&!canChangePortrait())return;await changeImage(file,value=>model.tileImages[item.id]=value,true)};
  label.append(input);
  const clear=document.createElement("button");clear.type="button";clear.className="ghost";clear.textContent="Quitar imagen";
  clear.disabled=item.id==="sheet"&&!canChangePortrait();
  clear.onclick=()=>{if(item.id==="sheet"&&!canChangePortrait())return;delete model.tileImages[item.id];change();renderHome()};
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
function renderAll(){if(!model)return;
 const newLabel=model.traitsButtonName||"Rasgos";
 const tab=document.querySelector('[data-view="traits"]');if(tab)tab.textContent="✦ "+newLabel;
 const heading=document.querySelector("#traitsView h2");if(heading)heading.textContent=newLabel;
 renderSheet();renderHome();renderEntries("spells");renderEntries("traits");renderExtraNav();renderDesign();renderCombat();renderSpellSlots();renderSpellCatalog()}
async function activate(account){
 user=account;const requested=new URLSearchParams(location.search).get("uid");
 currentRole=await role(account.uid);
 administrator=["owner","dm"].includes(currentRole);
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
  renderAll();void loadSpellCatalog();
  if(unsubscribe)unsubscribe();
  unsubscribe=onSnapshot(ref,snap=>{
   if(!snap.exists()||snap.metadata.hasPendingWrites||pending||saving)return;
   const data=snap.data();
   const signature=x=>JSON.stringify({fields:x.fields||{},sheet:x.sheet||{},stats:x.stats||{},spells:x.spells||[],traits:x.traits||[],portrait:x.portrait||"",tileImages:x.tileImages||{},extras:x.extras||[],coverTheme:x.coverTheme||"",coverImage:x.coverImage||"",slots:x.slots||{},traitsButtonName:x.traitsButtonName||"Rasgos",ruleBuild:x.ruleBuild||null});
   if(signature(data)!==signature(model)){model=normalize(data);renderAll();status("✓ Hoja sincronizada desde Firebase")}
  },e=>status("Sincronización: "+(e.code||"error")));
  status("✓ Hoja cargada y sincronizada");
 }catch(e){$("workspace").hidden=true;$("authWall").hidden=false;$("loginStatus").textContent="No pude cargar la hoja: "+(e.code||e.message)+". Revisa las reglas de Firebase."}
}
// Puente controlado para el asistente del Manual del Jugador 2014.
// La aplicación realiza únicamente fusiones aditivas y preserva campos ya llenados.
window.alakRuleBridge={
 get:()=>model?{...model,editable:Boolean(user),role:currentRole,ownSheet:targetUid===user.uid}:null,
 apply:(choice)=>{
  if(!model||!user||!choice)return {ok:false,message:"Abre primero tu ficha con Google"};
  const cat=window.ALAK_RULES_2014;if(!cat)return {ok:false,message:"Catálogo sin cargar"};
  const race=cat.races[choice.raceId],klass=cat.classes[choice.classId];
  const features=cat.featuresFor(choice.raceId,choice.subraceId,choice.classId,choice.subclassId,choice.level);
  const bg=window.ALAK_RULE_BACKGROUNDS?.[choice.background];
  if(bg)features.push({id:"background:"+choice.background,level:1,kind:"trasfondo",title:bg.feature,note:bg.note,source:choice.background});

  const info=cat.levelInfo(choice.classId,choice.level);
  let added=0,fieldsAdded=0;
  const add=(key,val)=>{
   if(val===undefined||val===null||String(val).trim()==="")return;
   if(model.fields[key]===undefined||String(model.fields[key]).trim()===""){model.fields[key]=String(val);fieldsAdded++}
  };
  const addSheet=(key,val)=>{
   if(val===undefined||val===null||String(val).trim()==="")return;
   if(model.sheet[key]===undefined||String(model.sheet[key]).trim()===""){model.sheet[key]=String(val);fieldsAdded++}
  };
  add("race",race?race.name+(race.sub?.[choice.subraceId]?" · "+race.sub[choice.subraceId].name:""):"");
  add("className",klass?.name);
  add("level",choice.level);
  // Una subida de nivel confirmada en el asistente sí puede actualizar el nivel
  // previo si es el mismo personaje y la misma clase, sin tocar otros valores.
  const oldLevel=Number(model.fields.level)||0;
  if(model.ruleBuild?.classId===choice.classId&&oldLevel>0&&Number(choice.level)>oldLevel){
   model.fields.level=String(choice.level);
   const classLevel=String(model.sheet.classLevel||"");
   if(/(?:nivel|n)s*d+$/i.test(classLevel)){
    model.sheet.classLevel=classLevel.replace(/(?:nivel|n)s*d+$/i,"N"+choice.level);
   }
  }
  add("background",choice.background);
  add("speed",race?.sub?.[choice.subraceId]?.speed||race?.speed);
  add("proficiency",info.proficiency);
  addSheet("race",model.fields.race);
  addSheet("classLevel",klass?klass.name+" N"+choice.level:"");
  addSheet("background",model.fields.background);
  addSheet("speed",model.fields.speed);
  addSheet("profBonus",info.proficiency>=0?"+"+info.proficiency:"");
  addSheet("hitDice",info.hitDice);
  if(klass?.casting!=="none"&&klass?.casting){
   addSheet("spell_class",klass.name);
   if(klass.casting==="pact"||klass.casting==="full"||klass.casting==="half"){
    const castAbility=({bardo:"cha",brujo:"cha",clerigo:"wis",druida:"wis",explorador:"wis",hechicero:"cha",mago:"int",paladin:"cha"})[choice.classId];
    if(castAbility)addSheet("spell_ability",cat.keys[castAbility]);
   }
  }
  const saves={str:"str",dex:"dex",con:"con",int:"int",wis:"wis",cha:"cha"};
  for(const index of bg?.skills||[]){
   if(model.sheet["skillprof_"+index]===undefined)model.sheet["skillprof_"+index]=true;
  }
    for(const key of klass?.saves||[]){
   if(model.sheet["saveprof_"+saves[key]]===undefined)model.sheet["saveprof_"+saves[key]]=true;
  }
  for(const f of features.filter(x=>!choice.selectedFeatureIds||choice.selectedFeatureIds.includes(x.id))){
   if(!model.traits.some(x=>x.rulesId===f.id||(x.title||"").toLowerCase().trim()===f.title.toLowerCase().trim())){
    model.traits.push({id:genId(),title:f.title,description:f.note,type:"Manual 2014 · "+f.kind,level:f.level,rulesId:f.id});
    added++;
   }
  }
  for(const special of choice.specialTraits||[]){
   if(!model.traits.some(x=>x.rulesId===special.id||String(x.title).toLowerCase()===special.title.toLowerCase())){
    model.traits.push({id:genId(),title:special.title,description:special.note,type:"Elección de clase · Manual 2014",level:special.level,rulesId:special.id});added++;
   }
  }
  const classShortcuts={
   barbaro:[1,"Furia"],hechicero:[3,"Metamagia"],guerrero:[1,"Recursos de guerrero"],
   clerigo:[2,"Canalizar divinidad"],druida:[2,"Forma salvaje"],
   monje:[2,"Ki"],paladin:[1,"Imposición de manos"],brujo:[2,"Invocaciones"],
   picaro:[1,"Ataque furtivo"],bardo:[1,"Inspiración bárdica"]
  };
  const shortcut=classShortcuts[choice.classId];
  if(shortcut&&Number(choice.level)>=shortcut[0]&&model.extras.length<10&&!model.extras.some(x=>String(x.name).toLowerCase()===shortcut[1].toLowerCase())){
   model.extras.push({id:genId(),name:shortcut[1],description:"Recurso de "+klass.name+" · Manual 2014",notes:"Consulta los rasgos y recursos de tu hoja."});
  }
    const previousResource=model.traits.find(x=>x.rulesId==="resources:"+choice.classId);
  if(previousResource&&info.resource&&previousResource.description===model.ruleBuild?.resourceText)previousResource.description=info.resource;
    if(info.resource&&!model.traits.some(x=>x.rulesId==="resources:"+choice.classId)){
   model.traits.push({id:genId(),title:"Recursos de clase",description:info.resource,type:"Progresión",rulesId:"resources:"+choice.classId});
   added++;
  }
  for(const spell of choice.selectedSpells||[]){
   if(!model.spells.some(x=>String(x.title||"").toLowerCase()===String(spell.title||"").toLowerCase()&&Number(x.level)===Number(spell.level))){
    model.spells.push({id:genId(),title:spell.title,level:String(spell.level),description:"Conjuro elegido con Manual del Jugador 2014. Consulta el capítulo 11 para su descripción completa.",prepared:false,source:"Manual 2014"});
   }
  }
  const klassProf=({"barbaro":"Armadura ligera y media; escudos. Armas simples y marciales.",
   "bardo":"Armadura ligera. Instrumentos musicales. Competencias de bardo.",
   "brujo":"Armadura ligera. Armas simples.",
   "clerigo":"Armadura ligera y media; escudos. Armas simples.",
   "druida":"Armadura ligera y media; escudos no metálicos. Equipo druídico.",
   "explorador":"Armadura ligera y media; escudos. Armas simples y marciales.",
   "guerrero":"Todas las armaduras y escudos. Armas simples y marciales.",
   "hechicero":"Sin armaduras iniciales. Competencias sencillas de clase.",
   "mago":"Sin armaduras iniciales. Competencias sencillas de clase.",
   "monje":"Sin armaduras iniciales. Armas simples y espada corta.",
   "paladin":"Todas las armaduras y escudos. Armas simples y marciales.",
   "picaro":"Armadura ligera. Herramientas de ladrón y armas de pícaro."})[choice.classId];
  addSheet("proficiencies",klassProf+(bg?"\nTrasfondo "+choice.background+": "+bg.extra:""));
    if(Array.isArray(choice.abilities)){
   const attrs=["strength","dexterity","constitution","intelligence","wisdom","charisma"];
   for(let i=0;i<attrs.length;i++){
    const value=choice.abilities[i];
    if(value!==null&&value!==undefined&&value!==""){
     const field="ability_"+i;
     if(model.sheet[field]===undefined||String(model.sheet[field]).trim()===""){
      // El usuario asigna las puntuaciones base. Los bonificadores raciales se muestran
      // por separado para evitar aumentarlos dos veces en una hoja existente.
      const abilityKey=["str","dex","con","int","wis","cha"][i];
      const racialIncrease=Number(choice.bonuses?.[abilityKey])||0;
      const finalScore=Number(value)+racialIncrease;
      model.sheet[field]=String(finalScore);model.stats[attrs[i]]=String(finalScore);fieldsAdded++;
     }
    }
   }
  }
  for(let i=0;i<(info.slots||[]).length;i++){
   const level=i+1,total=info.slots[i];if(!total)continue;
   const previous=model.slots[level];
   if(previous===undefined||choice.updateSlots===true){
    const used=Math.min(total,Math.max(0,Number(previous?.used)||0));
    model.slots[level]={total,used};
    if(choice.updateSlots||model.sheet["spell_slots"+level+"_total"]===undefined){
     model.sheet["spell_slots"+level+"_total"]=String(total);
     model.sheet["spell_slots"+level+"_spent"]=String(used);
    }
   }
  }
  if(klass?.casting!=="none"&&klass?.casting){
   const castAbility=({bardo:"cha",brujo:"cha",clerigo:"wis",druida:"wis",explorador:"wis",hechicero:"cha",mago:"int",paladin:"cha"})[choice.classId];
   const scoreKey=({str:"strength",dex:"dexterity",con:"constitution",int:"intelligence",wis:"wisdom",cha:"charisma"})[castAbility];
   const score=Number(model.stats?.[scoreKey]);
   if(Number.isFinite(score)&&score>0){
    const modifier=Math.floor((score-10)/2);
    addSheet("spell_save_dc",8+info.proficiency+modifier);
    addSheet("spell_attack_bonus",(info.proficiency+modifier>=0?"+":"")+(info.proficiency+modifier));
   }
  }
    model.ruleBuild={
   edition:"2014",raceId:choice.raceId,subraceId:choice.subraceId||"",
   classId:choice.classId,subclassId:choice.subclassId||"",level:Number(choice.level),
   background:choice.background||"",autoProgress:choice.autoProgress!==false,
   selectedFeatureIds:choice.selectedFeatureIds||features.map(x=>x.id),
   resourceText:info.resource||"",updatedAt:new Date().toISOString()
  };
  change();renderAll();if(choice.selectedSpells?.length)populateSelectedSpellsOnSheet();
  return {ok:true,added,fieldsAdded,message:"Se añadieron "+added+" rasgos y se completaron "+fieldsAdded+" campos vacíos. Lo existente quedó intacto."};
 }
};
window.addEventListener("alak:player-level-changed",()=>{
 if(!model?.ruleBuild?.autoProgress||!window.ALAK_RULES_2014)return;
 const raw=String(model.fields.level||"");
 const n=Math.min(20,Math.max(1,Number(raw)||0));
 if(!n||n<=Number(model.ruleBuild.level||0))return;
 const build=model.ruleBuild;
 const catalog=window.ALAK_RULES_2014;
 const fresh=catalog.featuresFor(build.raceId,build.subraceId,build.classId,build.subclassId,n).filter(x=>x.level>Number(build.level||0)).map(x=>x.id);
 const selected=[...new Set([...(build.selectedFeatureIds||[]),...fresh])];
 window.alakRuleBridge.apply({...build,level:n,selectedFeatureIds:selected,updateSlots:true});
});
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
 $("character").querySelectorAll("[data-char]").forEach(el=>el.addEventListener("input",()=>syncSheetField(el)));
 $("playerReplicaPortraitUpload").addEventListener("change",async e=>{
  const file=e.target.files?.[0];e.target.value="";if(!file||!canChangePortrait())return;
  await changeImage(file,value=>model.portrait=value,true);
 });
 $("traitsButtonName").oninput=e=>{model.traitsButtonName=e.target.value.slice(0,30)||"Rasgos";change();renderHome();
  const tab=document.querySelector('[data-view="traits"]');if(tab)tab.textContent="✦ "+model.traitsButtonName;
  const heading=document.querySelector("#traitsView h2");if(heading)heading.textContent=model.traitsButtonName;};
 $("playerSpellSearch").addEventListener("input",renderSpellCatalog);
 $("playerSpellLevelFilter").addEventListener("change",renderSpellCatalog);
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
   f.reset();change();renderEntries(kind);if(kind==="spells"){populateSelectedSpellsOnSheet();renderSpellCatalog()}
  };
 }
 for(const b of all("[data-theme]"))b.onclick=()=>{model.coverTheme=b.dataset.theme;model.coverImage="";change();renderHome();renderDesign()};
 $("clearCover").onclick=()=>{model.coverImage="";change();renderHome()};
 $("coverUpload").onchange=async event=>{const file=event.target.files?.[0];event.target.value="";if(file)await changeImage(file,value=>model.coverImage=value)};
 $("portraitUpload").onchange=async event=>{const file=event.target.files?.[0];event.target.value="";if(file&&canChangePortrait())await changeImage(file,value=>model.portrait=value,true)};
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
