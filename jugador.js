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
const blank=(uid,account)=>({ownerUid:uid,accountName:account?.displayName||"",accountEmail:account?.email||"",updatedBy:uid,fields:{},stats:{},spells:[],traits:[],sheet:{},slots:{},traitsButtonName:"Rasgos",combatNotes:"",pageTheme:"purple",pageBackground:"",coverTheme:"aurora",coverImage:"",portrait:"",combatImage:"",combatThumbnail:"",combatCrop:null,spellPhrases:{},tileImages:{},tileLabels:{},extras:[],ruleBuild:null});
const normalize=d=>({...blank(targetUid,user),...d,ownerUid:targetUid,combatImage:d.combatImage??(targetUid===user?.uid?d.portrait:"")??"",combatThumbnail:d.combatThumbnail??d.combatImage??(targetUid===user?.uid?d.portrait:"")??"",combatCrop:d.combatCrop||null,spellPhrases:{...(d.spellPhrases||{})},fields:{...(d.fields||{})},stats:{...(d.stats||{})},sheet:{...(d.sheet||{})},slots:{...(d.slots||{})},traitsButtonName:d.traitsButtonName||"Rasgos",spells:Array.isArray(d.spells)?d.spells:[],traits:Array.isArray(d.traits)?d.traits:[],extras:Array.isArray(d.extras)?d.extras:[],tileImages:{...(d.tileImages||{})},tileLabels:{...(d.tileLabels||{})},ruleBuild:d.ruleBuild||null});
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
  if(user.uid===targetUid)await publishMyPortrait();
  pending=false;status("✓ Guardado en nube");
  try{localStorage.setItem("aventurero-respaldo-"+targetUid,JSON.stringify({...model,updatedAt:null}))}catch{}
 }catch(e){pending=true;status("Guardado pendiente: "+(e?.code||"error"))}
 finally{saving=false;if(queued){queued=false;change()}}
}
let publishedPortraitSignature='';
async function publishMyPortrait(){
 if(user?.uid!==targetUid)return;
 const portrait=model.combatImage||'',thumbnail=model.combatThumbnail||portrait,name=String(model.fields.name||'').slice(0,200),signature=targetUid+'|'+name+'|'+portrait+'|'+thumbnail;
 if(signature===publishedPortraitSignature)return;
 await setDoc(doc(db,'combatPortraits',targetUid),{portrait,thumbnail,name,updatedAt:serverTimestamp()});publishedPortraitSignature=signature;
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
function renderPageBackground(){
 if(!model)return;const src=model.pageBackground||({purple:'assets/barovia-purple.png',night:'assets/player-home-night.svg',aurora:'assets/player-home-aurora.svg'}[model.pageTheme]||'assets/barovia-purple.png');
 document.body.style.setProperty('--player-page-art','url("'+src+'")');
 if($('pageBackgroundPreview'))$('pageBackgroundPreview').src=src;
 if($('pageTheme'))$('pageTheme').value=model.pageTheme||'purple';
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
  const title=document.createElement("strong");title.textContent=model.tileLabels?.[item.id]?.name||(item.id==="traits"?(model.traitsButtonName||"Rasgos"):item.name);
  const summary=document.createElement("small");summary.textContent=model.tileLabels?.[item.id]?.subtitle||item.subtitle||item.description||"Sección personal";
  b.append(icon,title,summary);b.onclick=()=>switchView(item.target,item.target==="extras"?item.id:null);host.append(b);
 }
 updateSummary();
}
function canChangePortrait(){return !!user && user.uid===targetUid;}
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
   change();renderPrepared();
  };
  tin.onchange=update;uin.onchange=update;total.append(tin);used.append(uin);wrap.append(title,total,used);host.append(wrap);
 }
}
const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function spellBuild(){
 const book=window.ALAK_RULES_2014, b=model.ruleBuild||{};
 const klass=b.classId||Object.keys(book?.classes||{}).find(id=>normalized(model.fields.className).includes(normalized(book.classes[id].name)))||'';
 const level=Math.max(1,Math.min(20,Number(model.fields.level||b.level)||1));
 return {...b,classId:klass,level};
}
function spellMaxLevel(b){
 if(['eldritchknight','arcanetrickster'].includes(b.subclassId))return b.level<3?0:b.level<7?1:b.level<13?2:b.level<19?3:4;
 const slots=window.ALAK_RULES_2014?.spellSlots(b.classId,b.level)||[];
 return slots.reduce((max,n,i)=>n?i+1:max,0);
}
function racialSpells(b){
 if(b.raceId==='elfo'&&b.subraceId==='alto')return x=>x.level===0&&x.classes.includes('mago');
 const grants=b.raceId==='elfo'&&b.subraceId==='oscuro'?{'dancing-lights':1,'faerie-fire':3,darkness:5}:b.raceId==='gnomo'&&b.subraceId==='bosque'?{'minor-illusion':1}:b.raceId==='tiflin'&&(!b.subraceId||b.subraceId==='basico')?{thaumaturgy:1,'hellish-rebuke':3,darkness:5}:null;
 return grants?x=>grants[x.index]&&b.level>=grants[x.index]:null;
}
function spellInSpanish(item){
 const catalog=spellLibrary.find(s=>s.index===(item.catalogId||item.index)||normalized(s.title)===normalized(item.title));
 if(catalog?.pdfPage&&(item.catalogId||item.index||item.language==='en'))return catalog.description;
 return item.language==='en'||(catalog?.language==='en'&&item.description===catalog.description)?'Descripción en español pendiente. Se añadirá el texto de la mesa.':item.description||'Descripción en español pendiente. Se añadirá el texto de la mesa.';
}
function spellGlyph(title){const glyph=document.createElement('span');glyph.className='spell-thumb theme-light';glyph.setAttribute('aria-hidden','true');glyph.textContent=/curar|sanar|auxilio/i.test(title)?'✚':/fuego|llama|ardiente/i.test(title)?'✹':/escudo|protecci/i.test(title)?'◇':'✦';return glyph;}
function showSpellDetails(original){
 const catalog=spellLibrary.find(s=>s.index===(original.catalogId||original.index)||normalized(s.title)===normalized(original.title));
 const item=catalog?.pdfPage&&(original.catalogId||original.index||original.language==='en')?{...original,...catalog,title:original.title}:original;

 let dialog=$('playerSpellDetails');if(!dialog){dialog=document.createElement('dialog');dialog.id='playerSpellDetails';dialog.className='spell-details';dialog.setAttribute('aria-labelledby','playerSpellDetailsTitle');document.body.append(dialog);}
 dialog.replaceChildren();const banner=document.createElement('div');banner.className='spell-modal-banner';const glyph=document.createElement('span');glyph.className='modal-glyph';glyph.append(spellGlyph(item.title));const eyebrow=document.createElement('p');eyebrow.className='eyebrow';eyebrow.textContent=Number(item.level)?'NIVEL '+item.level:'TRUCO';const h=document.createElement('h2');h.id='playerSpellDetailsTitle';h.textContent=item.title;banner.append(glyph,eyebrow,h);
 const close=document.createElement('button');close.type='button';close.className='dialog-close';close.setAttribute('aria-label','Cerrar');close.textContent='×';close.onclick=()=>dialog.close();
 const text=document.createElement('div');text.className='fulltext spell-formatted';const classNames={bardo:'bardo',brujo:'brujo',clerigo:'clérigo',druida:'druida',explorador:'explorador',hechicero:'hechicero',mago:'mago',paladin:'paladín'};
 const description=item.pdfPage?[item.summary,item.kind,'Origen: '+item.originText,'Componentes: '+item.components,'Tiempo de lanzamiento: '+item.castingTime,'Alcance: '+item.range,'Duración: '+item.duration,'Listas de conjuros: '+item.classes.map(c=>'Conjuros de '+(classNames[c]||c)).join(', '),item.body].join('\n'):spellInSpanish(item);
 for(const [i,line] of description.split('\n').entries()){if(!line.trim())continue;const p=document.createElement('p');if(i===0)p.className='spell-summary';const key=line.match(/^(Origen|Componentes|Tiempo de lanzamiento|Alcance|Duración|Listas de conjuros|Tirada de salvación|Ataque):/i);if(key){const label=document.createElement('strong');label.textContent=key[0];p.append(label,document.createTextNode(line.slice(key[0].length)));}else p.textContent=line;text.append(p);}
 dialog.append(close,banner,text);
 const phraseKey=original.catalogId||original.index||original.id||normalized(original.title),phrase=model.spellPhrases?.[phraseKey]||'';
 if(phrase){const card=document.createElement('aside');card.className='player-spell-phrase';const label=document.createElement('p');label.className='eyebrow';label.textContent='FRASE VERBAL DE '+(model.fields.name||'MI PERSONAJE');const quote=document.createElement('blockquote');quote.textContent='“'+phrase+'”';card.append(label,quote);dialog.append(card);}
 if(user?.uid===targetUid){const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent=phrase?'Editar mi frase de lanzamiento':'Añadir mi frase de lanzamiento (opcional)';const label=document.createElement('label');label.textContent='Mi frase de lanzamiento';const input=document.createElement('textarea');input.maxLength=500;input.rows=2;input.value=phrase;label.append(input);const save=document.createElement('button');save.type='button';save.textContent='Guardar frase';save.onclick=()=>{if(user?.uid!==targetUid)return;model.spellPhrases??={};if(input.value.trim())model.spellPhrases[phraseKey]=input.value.trim();else delete model.spellPhrases[phraseKey];change();dialog.close();showSpellDetails(original);};details.append(summary,label,save);dialog.append(details);}
 dialog.showModal();
}
async function loadSpellCatalog(){
 try{const response=await fetch('player-spells-2014.json?v=63');if(!response.ok)throw Error();const data=await response.json();spellLibrary=data.spells;}
 catch{spellLibrary=[];}
 renderSpellCatalog();renderPrepared();
}
function renderSpellCatalog(){
 const host=$('playerSpellCatalog');if(!host||!model)return;host.replaceChildren();
 $('playerGrimoireName').textContent='de '+(model.fields.name?.trim()||'mi personaje');
 const b=spellBuild(),query=normalized($('playerSpellSearch').value),level=$('playerSpellLevelFilter').value,origin=$('playerSpellOrigin').value,show=$('playerSpellShow').value;
 let klass=$('playerSpellClass').value;if(klass==='auto')klass=b.classId;
 let classFilter=klass;if(['guerrero','picaro'].includes(klass)&&['eldritchknight','arcanetrickster'].includes(b.subclassId))classFilter='mago';
 const raceFilter=racialSpells(b),max=spellMaxLevel(b);
 $('spellBuildSummary').textContent=[window.ALAK_RULES_2014?.classes[b.classId]?.name||'Configura tu clase para filtrar tus conjuros','Nivel '+b.level,model.fields.race,model.fields.background].filter(Boolean).join(' · ');
 const messages={class:'Lista de clase. Los conocidos y preparados dependen de tu nivel y rasgos; las selecciones son manuales.',race:raceFilter?'Magia racial según tu raza, subraza y nivel. Sus usos no gastan necesariamente espacios de clase.':'Elige únicamente la magia que conceda tu linaje. Configura raza y subraza para ver las opciones básicas de 2014.',subclass:'Elige solo los conjuros que conceda tu subclase. Un dominio puede tener conjuros siempre preparados; un patrón de brujo amplía opciones, no los aprende automáticamente.',background:'Los trasfondos básicos de 2014 no conceden conjuros por defecto. Usa este origen solo si tu trasfondo específico lo permite.',feat:'Elige los conjuros permitidos por tu dote y respeta sus límites y usos.',other:'Registra aquí una opción concedida por un rasgo o acordada con tu DM.'};
 $('spellCatalogNotice').textContent=messages[origin]+' Catálogo de la mesa en español; las elecciones dependen de tu personaje.';
 const chosen=x=>model.spells.some(s=>s.catalogId===x.index||normalized(s.title)===normalized(x.title));
 const items=spellLibrary.filter(x=>
  (level==='all'||String(x.level)===level)&&(!query||normalized(x.title+' '+(x.aliases||[]).join(' ')+' '+x.originalName+' '+x.description).includes(query))&&
  (show!=='chosen'||chosen(x))&&
  (origin!=='class'||!klass||klass==='all'||x.classes.includes(classFilter))&&
  (origin!=='race'||!raceFilter||raceFilter(x))&&
  (show!=='available'||origin!=='class'||!b.classId||x.level<=max));
 if(!items.length){const hint=document.createElement('p');hint.textContent=spellLibrary.length?'No hay conjuros para estos filtros. Revisa tu clase y nivel o cambia el origen.':'No se pudo cargar el catálogo. Puedes añadir conjuros manualmente.';host.append(hint);}
 for(let level=0;level<=9;level++){
  const atLevel=items.filter(x=>x.level===level);if(!atLevel.length)continue;
  const section=document.createElement('section');section.className='spell-section';const heading=document.createElement('div');heading.className='section-title';const eyebrow=document.createElement('p');eyebrow.className='eyebrow';eyebrow.textContent=level?'CONJUROS':'TRUCOS';const h=document.createElement('h2');h.textContent=level?'Nivel '+level:'Trucos';heading.append(eyebrow,h);section.append(heading);const list=document.createElement('div');list.className='spell-list';section.append(list);
  for(const item of atLevel.sort((a,b)=>a.title.localeCompare(b.title,'es'))){
   const row=document.createElement('div');row.className='spell-row';const open=document.createElement('button');open.type='button';open.className='spell-open';const label=document.createElement('span');label.textContent=item.title;open.append(spellGlyph(item.title),label);open.onclick=()=>showSpellDetails(item);
   const selected=model.spells.find(x=>x.catalogId===item.index||normalized(x.title)===normalized(item.title));const active=!!selected&&(item.level===0||selected.prepared);
   const pick=document.createElement('button');pick.type='button';pick.className='prepare-btn'+(active?' active':'');pick.textContent=active?(item.level===0?'✓ Conocido':'✓ Preparado'):(item.level===0?'Elegir truco':'Preparar');pick.setAttribute('aria-pressed',String(active));pick.setAttribute('aria-label',(active?'Quitar selección de ':'Elegir ')+item.title);
   pick.onclick=()=>{if(selected){if(item.level===0)model.spells=model.spells.filter(x=>x.id!==selected.id);else selected.prepared=!selected.prepared;}else model.spells.push({...item,id:genId(),catalogId:item.index,level:String(item.level),prepared:item.level>0,origin,source:origin==='class'?(window.ALAK_RULES_2014?.classes[klass]?.name||'Clase'):({race:'Raza / linaje',subclass:'Subclase',background:'Trasfondo',feat:'Dote',other:'Otro rasgo'}[origin])});populateSelectedSpellsOnSheet();change();renderEntries('spells');renderSpellCatalog();};row.append(open,pick);list.append(row);
  }host.append(section);
 }
 let credit=$('srdCredit');if(!credit){credit=document.createElement('p');credit.id='srdCredit';credit.className='hint';credit.innerHTML='Referencia: <a href="https://www.dndbeyond.com/srd" target="_blank" rel="noopener">SRD 5.1 · Wizards of the Coast</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Datos originales de 5e-bits. Descripciones en español del PDF proporcionado por la mesa.';host.after(credit);}
}
function renderPrepared(){
 const host=$('playerPrepared');if(!host||!model)return;host.replaceChildren();
 for(let level=0;level<=9;level++){
  const items=model.spells.filter(s=>Number(s.level)===level&&(level===0||s.prepared||s.alwaysPrepared));
  
  const group=document.createElement('section');group.className='prepared-box';const heading=document.createElement('div');heading.className='prepared-box-heading';const h=document.createElement('h3');h.textContent=level?'Nivel '+level:'Trucos';heading.append(h);group.append(heading);
  if(level){const dots=document.createElement('div');dots.className='prepared-heading-slots';const slot=model.slots[level]||{total:0,used:0};
   for(let i=0;i<Math.min(30,slot.total);i++){const button=document.createElement('button');button.type='button';button.className='slot'+(i<slot.used?' used':'');button.setAttribute('aria-label','Espacio '+(i+1)+' de nivel '+level);button.setAttribute('aria-pressed',String(i<slot.used));button.onclick=()=>{slot.used=i<slot.used?slot.used-1:slot.used+1;model.slots[level]=slot;model.sheet['spell_slots'+level+'_spent']=String(slot.used);change();renderSpellSlots();renderSheet();renderPrepared();};dots.append(button);}heading.append(dots);}
  for(const item of items){const button=document.createElement('button');button.type='button';button.className='prepared-chip themed-spell';const label=document.createElement('span');label.className='spell-mini-label';label.textContent=item.title;const star=document.createElement('span');star.className='spell-mini-star';star.textContent='✦';button.append(spellGlyph(item.title),label,star);button.onclick=()=>showSpellDetails({...spellLibrary.find(s=>s.index===item.catalogId),...item});group.append(button);}
  if(!items.length){const p=document.createElement('p');p.className='empty-note';p.textContent='Nada preparado.';group.append(p);}host.append(group);
 }
}

function renderCombat(){
 for(const [id,field] of [["combatHP","hp"],["combatMax","maxHP"],["combatInitiative","initiative"],["combatAC","ac"]])$(id).textContent=model.fields[field]||"—";
 if(document.activeElement!==$("combatNotes"))$("combatNotes").value=model.combatNotes||"";
}
function renderEntries(type){
 if(type==="traits"){$("clearAllTraits").disabled=!model.traits.length;$("undoClearTraits").hidden=!model.traitsTrash?.traits?.length;}
 if(type==="spells")renderPrepared();
 const host=$(type==="spells"?"spellList":"traitList");host.replaceChildren();
 if(!model[type].length){const p=document.createElement("p");p.className="hint";p.textContent="Todavía no has añadido "+(type==="spells"?"conjuros.":"rasgos.");host.append(p);return}
 for(const item of model[type]){
  const card=document.createElement("article");card.className="entry";
  const h=document.createElement("h3");h.textContent=item.title;if(type==="spells"){const detail=document.createElement("button");detail.type="button";detail.textContent="Ver conjuro";detail.onclick=()=>showSpellDetails({...spellLibrary.find(s=>s.index===item.catalogId),...item});card.append(detail);}
  const small=document.createElement("small");small.textContent=type==="spells"?(Number(item.level)===0?"Truco":"Nivel "+item.level):item.type;
  const p=document.createElement("p");p.textContent=type==="spells"?spellInSpanish(item).slice(0,180):item.description||"Sin descripción";
  if(type==="spells"){
   const source=document.createElement("label");source.className="spell-source";source.textContent="Origen / rasgo: ";const input=document.createElement("input");input.value=item.source||item.origin||"Clase";input.onchange=()=>{item.source=input.value;change();};source.append(input);card.append(source);
   const prep=document.createElement("button");prep.type="button";prep.textContent=Number(item.level)===0?"✓ Truco conocido":item.prepared?"✓ Preparado / disponible":"Preparar / disponible";prep.disabled=Number(item.level)===0;prep.onclick=()=>{item.prepared=!item.prepared;populateSelectedSpellsOnSheet();change();renderEntries("spells")};card.append(prep);
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
 if(!model)return;renderPageBackground();
 for(const btn of all("[data-theme]"))btn.classList.toggle("selected",btn.dataset.theme===model.coverTheme);
 $("portraitPreview").src=model.portrait||"assets/hero.svg";
 $('combatImagePreview').src=model.combatImage||'assets/hero.svg';$('combatThumbnailPreview').src=model.combatThumbnail||model.combatImage||'assets/hero.svg';
 $('combatImageUpload').disabled=!canChangePortrait();$('adjustCombatThumbnail').disabled=!canChangePortrait()||!model.combatImage;
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
  const nameLabel=document.createElement('label');nameLabel.textContent='Nombre del botón';const nameInput=document.createElement('input');nameInput.maxLength=40;nameInput.value=model.tileLabels?.[item.id]?.name||item.name;nameInput.setAttribute('aria-label','Nombre del botón '+item.name);
  const descLabel=document.createElement('label');descLabel.textContent='Descripción del botón';const descInput=document.createElement('input');descInput.maxLength=80;descInput.value=model.tileLabels?.[item.id]?.subtitle||item.subtitle||item.description||'';
  const rename=()=>{model.tileLabels=model.tileLabels||{};model.tileLabels[item.id]={name:nameInput.value.trim(),subtitle:descInput.value.trim()};change();renderHome();};nameInput.oninput=rename;descInput.oninput=rename;nameLabel.append(nameInput);descLabel.append(descInput);
  wrapper.append(title,nameLabel,descLabel,label,clear);host.append(wrapper);
 }
 const extraHost=$("extraEditors");extraHost.replaceChildren();
 for(const item of model.extras){
  const wrap=document.createElement("div");wrap.className="entry";const strong=document.createElement("strong");strong.textContent=item.name;
  const remove=document.createElement("button");remove.textContent="Eliminar botón";
  remove.onclick=()=>{if(!confirm("¿Eliminar «"+item.name+"» y sus notas?"))return;model.extras=model.extras.filter(x=>x.id!==item.id);delete model.tileImages[item.id];change();renderExtraNav();renderDesign();renderHome()};
  wrap.append(strong,document.createTextNode(" "),remove);extraHost.append(wrap);
 }
}
function openCombatCrop(src,initial){
 if(!canChangePortrait())return;const owner=targetUid;
 const dialog=document.createElement('dialog');dialog.className='combat-crop-dialog';dialog.setAttribute('aria-labelledby','combatCropTitle');
 dialog.innerHTML='<h2 id="combatCropTitle">Encuadrar miniatura</h2><p>Arrastra la imagen y ajusta el zoom para centrar el rostro. Al abrir el retrato se mostrará la imagen completa.</p><canvas width="280" height="280" aria-label="Vista previa del encuadre"></canvas><label>Zoom<input type="range" min="1" max="5" step="0.01" value="1"></label><div class="crop-actions"><button type="button" data-center>Centrar</button><button type="button" data-cancel>Cancelar</button><button type="button" data-save>Guardar encuadre</button></div>';
 const canvas=dialog.querySelector('canvas'),zoom=dialog.querySelector('input'),save=dialog.querySelector('[data-save]'),img=new Image();let z=initial?.zoom||1,x=initial?.x||0,y=initial?.y||0,drag=null,ready=false;zoom.value=z;save.disabled=true;
 const geometry=()=>{const scale=Math.max(280/img.naturalWidth,280/img.naturalHeight)*z;const w=img.naturalWidth*scale,h=img.naturalHeight*scale;x=Math.max(-(w-280)/2,Math.min((w-280)/2,x));y=Math.max(-(h-280)/2,Math.min((h-280)/2,y));return {w,h,left:(280-w)/2+x,top:(280-h)/2+y};};
 const draw=()=>{if(!ready)return;const g=geometry(),ctx=canvas.getContext('2d');ctx.fillStyle='#21142d';ctx.fillRect(0,0,280,280);ctx.drawImage(img,g.left,g.top,g.w,g.h);};
 img.onload=()=>{if(!dialog.open)return;ready=true;save.disabled=false;draw();};img.onerror=()=>{save.disabled=true;dialog.querySelector('p').textContent='No se pudo abrir la imagen. Selecciona otra.';};
 zoom.oninput=()=>{z=Number(zoom.value);draw();};canvas.style.touchAction='none';
 canvas.onpointerdown=e=>{if(!ready)return;canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,px:x,py:y};};
 canvas.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;const factor=280/canvas.getBoundingClientRect().width;x=drag.px+(e.clientX-drag.x)*factor;y=drag.py+(e.clientY-drag.y)*factor;draw();};canvas.onpointerup=canvas.onpointercancel=()=>{drag=null;};
 dialog.querySelector('[data-center]').onclick=()=>{x=0;y=0;z=1;zoom.value='1';draw();};dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
 save.onclick=()=>{if(!ready||!canChangePortrait()||targetUid!==owner)return;model.combatImage=src;model.combatThumbnail=canvas.toDataURL('image/jpeg',.82);model.combatCrop={zoom:z,x,y};change();renderDesign();dialog.close();};
 dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();img.src=src;
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
  renderAll();void loadSpellCatalog();if(user.uid===targetUid)void publishMyPortrait().catch(()=>status("Retrato de combate pendiente de sincronizar"));
  if(unsubscribe)unsubscribe();
  unsubscribe=onSnapshot(ref,snap=>{
   if(!snap.exists()||snap.metadata.hasPendingWrites||pending||saving)return;
   const data=snap.data();
   const signature=x=>JSON.stringify({fields:x.fields||{},sheet:x.sheet||{},stats:x.stats||{},spells:x.spells||[],traits:x.traits||[],traitsTrash:x.traitsTrash||null,portrait:x.portrait||"",combatImage:x.combatImage,combatThumbnail:x.combatThumbnail,combatCrop:x.combatCrop,spellPhrases:x.spellPhrases||{},tileImages:x.tileImages||{},tileLabels:x.tileLabels||{},extras:x.extras||[],coverTheme:x.coverTheme||"",coverImage:x.coverImage||"",pageTheme:x.pageTheme||"purple",pageBackground:x.pageBackground||"",slots:x.slots||{},traitsButtonName:x.traitsButtonName||"Rasgos",ruleBuild:x.ruleBuild||null});
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
  if(model.ruleBuild&&model.traits.some(t=>t.rulesId)&&['classId','subclassId','raceId','subraceId'].some(key=>model.ruleBuild[key]&&(model.ruleBuild[key]||'')!==(choice[key]||'')))return {ok:false,message:'Esta ficha ya tiene rasgos de otra configuración. En Rasgos, usa «Eliminar todos los rasgos» antes de aplicar otra raza, clase o especialización.'};
  const race=cat.races[choice.raceId],klass=cat.classes[choice.classId];
  const features=cat.featuresFor(choice.raceId,choice.subraceId,choice.classId,choice.subclassId,choice.level);
  const bg=window.ALAK_RULE_BACKGROUNDS?.[choice.background];
  if(bg)features.push({id:"background:"+choice.background,level:1,kind:"trasfondo",title:bg.feature,note:bg.note,source:choice.background});

  const info=cat.levelInfo(choice.classId,choice.level);
  let added=0,fieldsAdded=0;
  const newDescriptions=[];
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
    newDescriptions.push(f.title+" — "+f.note);
    added++;
   }
  }
  for(const special of choice.specialTraits||[]){
   if(!model.traits.some(x=>x.rulesId===special.id||String(x.title).toLowerCase()===special.title.toLowerCase())){
    model.traits.push({id:genId(),title:special.title,description:special.note,type:"Elección de clase · Manual 2014",level:special.level,rulesId:special.id});newDescriptions.push(special.title+" — "+special.note);added++;
   }
  }
  if(newDescriptions.length){
   const existing=String(model.sheet.features||"");
   const unique=newDescriptions.filter(x=>!existing.toLowerCase().includes(x.split(" — ")[0].toLowerCase()));
   if(unique.length)model.sheet.features=(existing.trim()?existing.trimEnd()+"\n\n":"")+
     "[Manual del Jugador 2014 · rasgos incorporados]\n"+unique.map(x=>"• "+x).join("\n");
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
    let filledAbilities=0;
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
      model.sheet[field]=String(finalScore);model.stats[attrs[i]]=String(finalScore);fieldsAdded++;filledAbilities++;
     }
    }
   }
  }
  if(choice.computeHP&&klass?.die&&!String(model.fields.maxHP||"").trim()&&!String(model.sheet.hpMax||"").trim()){
   const constitution=Number(model.sheet.ability_2);
   if(Number.isFinite(constitution)&&constitution>0){
    const conMod=Math.floor((constitution-10)/2);
    const n=Math.max(1,Math.min(20,Number(choice.level)||1));
    const average=Math.floor(klass.die/2)+1;
    const total=Math.max(n,klass.die+conMod+(n-1)*(average+conMod));
    add("maxHP",total);addSheet("hpMax",total);
    add("hp",total);addSheet("hpCurrent",total);
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
  change();renderAll();if(filledAbilities===6){recalculatePlayerSkills();change()}if(choice.selectedSpells?.length)populateSelectedSpellsOnSheet();
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
 if(normalized(model.fields.className)!==normalized(catalog.classes[build.classId]?.name))return;
 const fresh=catalog.featuresFor(build.raceId,build.subraceId,build.classId,build.subclassId,n).filter(x=>x.level>Number(build.level||0)).map(x=>x.id);
 const selected=[...new Set([...(build.selectedFeatureIds||[]),...fresh])];
 window.alakRuleBridge.apply({...build,level:n,selectedFeatureIds:selected,updateSlots:true});
});
function bind(){
 $('clearAllTraits').onclick=()=>{
  if(!model?.traits.length||!confirm('¿Eliminar todos los rasgos de esta ficha? Se pausará la incorporación automática al subir de nivel. Podrás deshacerlo.'))return;
  const generated=new Set(model.traits.filter(t=>t.rulesId).map(t=>'• '+t.title+' — '+t.description));
  const lines=String(model.sheet.features||'').split('\n'),removed=lines.filter(line=>generated.has(line));
  model.traitsTrash={traits:structuredClone(model.traits),lines:removed};model.traits=[];
  model.sheet.features=lines.filter(line=>!generated.has(line)).join('\n').replace(/\[Manual del Jugador 2014 · rasgos incorporados\]\s*(?=\[Manual del Jugador 2014 · rasgos incorporados\]|$)/g,'').trim();
  if(model.ruleBuild){model.ruleBuild.autoProgress=false;model.ruleBuild.selectedFeatureIds=[];}
  change();renderEntries('traits');renderSheet();$('traitBulkStatus').textContent='Rasgos eliminados. La incorporación automática está pausada; revisa tu raza y clase antes de añadir nuevos rasgos.';
 };
 $('undoClearTraits').onclick=()=>{
  const backup=model?.traitsTrash;if(!backup?.traits?.length)return;
  for(const trait of backup.traits)if(!model.traits.some(t=>t.id===trait.id||(trait.rulesId&&t.rulesId===trait.rulesId)))model.traits.push(trait);
  const lines=String(model.sheet.features||'').split('\n'),missing=(backup.lines||[]).filter(line=>!lines.includes(line));
  if(missing.length)model.sheet.features=(model.sheet.features?model.sheet.features+'\n\n':'')+'[Manual del Jugador 2014 · rasgos incorporados]\n'+missing.join('\n');
  delete model.traitsTrash;change();renderEntries('traits');renderSheet();$('traitBulkStatus').textContent='Rasgos restaurados. La incorporación automática continúa pausada.';
 };

 $('combatImageUpload').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file||!canChangePortrait())return;try{openCombatCrop(await optimize(file),null);}catch(error){status(error.message);}};
 $('adjustCombatThumbnail').onclick=()=>{if(canChangePortrait()&&model.combatImage)openCombatCrop(model.combatImage,model.combatCrop);};
 $('viewCombatImage').onclick=()=>window.alakViewPortrait?.(model.fields.name||'Mi personaje',model.combatImage||'assets/hero.svg',$('viewCombatImage'));

 $('pageTheme').onchange=e=>{model.pageTheme=e.target.value;model.pageBackground='';change();renderPageBackground();};
 $('clearPageBackground').onclick=()=>{model.pageBackground='';change();renderPageBackground();};
 $('pageBackgroundUpload').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(file)await changeImage(file,value=>model.pageBackground=value,true);};
 $('playerLongRest').onclick=()=>{for(const [level,slots] of Object.entries(model.slots)){slots.used=0;model.sheet['spell_slots'+level+'_spent']='0';}change();renderSpellSlots();renderSheet();renderPrepared();};
 $('spellRulesSetup').onclick=()=>document.getElementById('openRulesWizardHome')?.click();
 for(const id of ['playerSpellClass','playerSpellOrigin','playerSpellShow'])$(id).addEventListener('change',renderSpellCatalog);
 for(const [id,klass] of Object.entries(window.ALAK_RULES_2014?.classes||{})){const opt=document.createElement('option');opt.value=id;opt.textContent=klass.name;$('playerSpellClass').append(opt);}

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
