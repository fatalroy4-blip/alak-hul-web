/* Alak Hul Web V50: asistente aditivo según Manual del Jugador 5e (2014).
   Nunca elimina características preexistentes, ni cambia automáticamente Alak Hul.
 */
(function(){
"use strict";
const book=window.ALAK_RULES_2014;if(!book)return;
const $=id=>document.getElementById(id);
const owner=document.body.classList.contains("landscape-only");
const norm=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const getInput=key=>document.querySelector('[data-char="'+key+'"]');
const existingOwner=()=>{
 const features=getInput("features")?.value||"";
 const classText=getInput("classLevel")?.value||"";
 const raceText=getInput("race")?.value||"";
 return {features,classText,raceText,background:getInput("background")?.value||"",level:Number((classText.match(/(?:nivel|n)\s*(\d+)/i)||[])[1])||3}
};
const nameToId=(name,collection)=>{
 const input=norm(name);
 if(!input)return"";
 const alias={tiefling:"tiflin",tiflin:"tiflin",clerigo:"clerigo",picaro:"picaro",barbaro:"barbaro",draconido:"draconido",semielfo:"semielfo",semiorco:"semiorco"};
 for(const [key,obj] of Object.entries(collection)){
  if(input.includes(norm(obj.name))||input.includes(key)||Object.entries(alias).some(([from,to])=>to===key&&input.includes(from)))return key
 }
 return "";
};
const print=(tag,cl="",label="")=>{const el=document.createElement(tag);if(cl)el.className=cl;if(label)el.textContent=label;return el};
const launch=print("button","rw-launch","✦ Crear / revisar con Manual 2014");
launch.id="openRulesWizard";launch.type="button";
launch.title="Asistente de creación, progresión y revisión del Manual del Jugador de 2014";
const intro=document.querySelector(".character-intro");
if(intro){intro.append(launch)}else{document.body.append(launch)}
const dlg=document.createElement("dialog");dlg.id="rulesWizard2014";
dlg.innerHTML='<div class="rw-modal"><div class="rw-top"><div><p class="rw-kicker">MANUAL DEL JUGADOR · D&D 5E 2014</p><h2>Forja tu personaje</h2><p class="rw-note">Asistente guiado. Solo completa huecos y añade rasgos que falten; nunca sustituye datos existentes.</p></div><button id="rwClose" aria-label="Cerrar" type="button">✕</button></div><div class="rw-fields"><label>Raza<select id="rwRace"></select></label><label>Subraza / variante<select id="rwSubrace"></select></label><label>Clase<select id="rwClass"></select></label><label>Subclase / origen / dominio<select id="rwSubclass"></select></label><label>Nivel (1–20)<input id="rwLevel" type="number" min="1" max="20" value="1"></label><label>Trasfondo<select id="rwBackground"></select></label></div><div id="rwReferences" class="rw-reference"></div><section class="rw-stats"><div class="rw-titleline"><h3>Características iniciales</h3><button id="rwStandard" type="button">Usar array estándar</button></div><p>Elige cómo distribuir 15, 14, 13, 12, 10 y 8. Si ya completaste alguna casilla, el asistente no la modificará. Los modificadores raciales se incluyen solo al rellenar casillas vacías.</p><div id="rwAttributes" class="rw-attrs"></div><p id="rwBonuses" class="rw-bonuses"></p></section><section class="rw-feature-section"><h3>Rasgos que corresponde revisar</h3><p>Marca qué rasgos quieres incorporar. Las características ya presentes no se duplican.</p><div id="rwFeatures" class="rw-feature-list"></div></section><section class="rw-feature-section"><h3>Opciones iniciales de conjuros</h3><p>Selección orientativa del capítulo 11; no reemplaza la lista completa del manual. Para ver más conjuros, consulta tu libro.</p><div id="rwSpells" class="rw-feature-list rw-spells"></div></section><div class="rw-options"><label><input id="rwAutoProgress" type="checkbox" checked> Al subir de nivel, añadir los nuevos rasgos automáticamente a mi ficha de jugador</label><label><input id="rwUpdateSlots" type="checkbox"> Recalcular el total de espacios de conjuro (conservando los gastados)</label></div><p class="rw-safety">Alak Hul mantiene su linaje de Zariel y su dominio de la Luz. Zariel procede de material adicional y no se sustituirá por el linaje básico del Manual 2014. Las elecciones que requieren DM quedan pendientes de su aprobación.</p><div class="rw-actions"><button id="rwReview" type="button">Actualizar revisión</button><button id="rwApply" type="button">Añadir sin sobrescribir</button></div><p id="rwResult" role="status" aria-live="polite"></p></div>';
document.body.append(dlg);
const specialSection=document.createElement("section");
specialSection.className="rw-feature-section";
specialSection.innerHTML='<h3>Elecciones de clase y especialización</h3><p>Elige los estilos, metamagias o pactos que correspondan. Puedes dejar decisiones pendientes para el DM.</p><div id="rwSpecials" class="rw-feature-list"></div>';
const spellSection=dlg.querySelector(".rw-spells")?.closest(".rw-feature-section");
if(spellSection)spellSection.before(specialSection);
const raceSel=$("rwRace"),subSel=$("rwSubrace"),classSel=$("rwClass"),subclassSel=$("rwSubclass"),level=$("rwLevel"),background=$("rwBackground"),featuresHost=$("rwFeatures"),spellsHost=$("rwSpells");
function option(value,name){const opt=new Option(name,value);return opt}
function fill(select,items,placeholder){select.replaceChildren(option("",placeholder));for(const [id,label] of items)select.add(option(id,label))}
fill(raceSel,Object.entries(book.races).map(([key,item])=>[key,item.name]),"Seleccionar raza");
fill(classSel,Object.entries(book.classes).map(([key,item])=>[key,item.name]),"Seleccionar clase");
fill(background,book.backgrounds.map(x=>[x,x]),"Conservar o elegir trasfondo");
const attrs=["str","dex","con","int","wis","cha"],inputs=[];
for(const key of attrs){
 const label=print("label","",book.keys[key]);const select=document.createElement("select");select.dataset.attr=key;select.add(option("","Sin asignar"));for(const n of [8,10,12,13,14,15])select.add(option(String(n),String(n)));
 label.append(select);$("rwAttributes").append(label);inputs.push(select);
}
function dependency(){
 const race=book.races[raceSel.value],klass=book.classes[classSel.value];
 const prevSub=subSel.value,prevClass=subclassSel.value;
 fill(subSel,Object.entries(race?.sub||{}).map(([key,item])=>[key,item.name]),race?"Sin variante / linaje adicional":"Primero raza");
 fill(subclassSel,Object.entries(klass?.subs||{}).map(([key,name])=>[key,name]),klass?"Pendiente de elegir":"Primero clase");
 if([...subSel.options].some(x=>x.value===prevSub))subSel.value=prevSub;
 if([...subclassSel.options].some(x=>x.value===prevClass))subclassSel.value=prevClass;
}
function initial(){
 const data=owner?existingOwner():window.alakRuleBridge?.get?.();
 if(!data&&!owner){$("rwResult").textContent="Inicia sesión en el portal con Google antes de crear una ficha.";return false}
 const build=data?.ruleBuild;
 const raceId=build?.raceId||nameToId(owner?data.raceText:data.fields?.race,book.races);
 const classId=build?.classId||nameToId(owner?data.classText:data.fields?.className,book.classes);
 raceSel.value=raceId||"";classSel.value=classId||"";dependency();
 if(build?.subraceId)subSel.value=build.subraceId;
 if(build?.subclassId)subclassSel.value=build.subclassId;
 if(owner&&classId==="clerigo"&&norm(data.features).includes("dominio de la luz"))subclassSel.value="light";
 const rawLevel=owner?data.level:Number(data.fields?.level||((String(data.sheet?.classLevel||"").match(/(\d+)/)||[])[1]));
 level.value=Number(build?.level||rawLevel||1);
 background.value=build?.background||data?.fields?.background||data?.background||"";
 inputs.forEach(x=>x.value="");
 if(owner){
  // En la hoja histórica Alak Hul se revisa LO QUE YA EXISTE, nunca se redefine
  // su raza, clase, nivel ni linaje. Solo se permiten adiciones confirmadas.
  raceSel.disabled=Boolean(raceId);
  classSel.disabled=Boolean(classId);
  level.disabled=Boolean(rawLevel);
  background.disabled=Boolean(data.background);
  if(classId==="clerigo"&&subclassSel.value==="light")subclassSel.disabled=true;
  const isZariel=/zariel/i.test(data.raceText);
  if(isZariel){subSel.value="";subSel.disabled=true}
 }else{
  raceSel.disabled=false;classSel.disabled=false;level.disabled=false;
  background.disabled=false;subclassSel.disabled=false;subSel.disabled=false;
 }
  $("rwAutoProgress").checked=build?.autoProgress!==false;
 $("rwResult").textContent="";
 review();
 return true
}
function bonuses(){
 const race=book.races[raceSel.value],sub=race?.sub?.[subSel.value];
 let bonus=Object.assign({},race?.bonus||{});
 if(raceSel.value==="humano"&&subSel.value==="variante")bonus={};
 for(const [key,n] of Object.entries(sub?.bonus||{}))bonus[key]=(bonus[key]||0)+n;
 return bonus
}
function recordExists(feature){
 if(owner){
  const old=existingOwner();
  const corpus=norm(old.features+"\n"+(getInput("additional")?.value||"")+"\n"+(getInput("proficiencies")?.value||""));
  return corpus.includes(norm(feature.title));
 }
 const data=window.alakRuleBridge?.get?.();
 return (data?.traits||[]).some(x=>x.rulesId===feature.id||norm(x.title)===norm(feature.title));
}
function spellExists(spell){
 if(owner){
  return [...document.querySelectorAll('#character [data-char^="spell"]')].some(x=>x.type!=="checkbox"&&norm(x.value)===norm(spell.title))
 }
 const data=window.alakRuleBridge?.get?.();
 return (data?.spells||[]).some(x=>norm(x.title)===norm(spell.title)&&Number(x.level)===spell.level)
}
const specialLibrary={
 hechicero:[
  ["meta-careful","Conjuro cuidadoso","Protege a algunas criaturas de tus áreas de efecto"],
  ["meta-distant","Conjuro distante","Aumenta el alcance de tus conjuros"],
  ["meta-empowered","Conjuro potenciado","Repite algunos dados de daño"],
  ["meta-extended","Conjuro extendido","Prolonga la duración de un conjuro"],
  ["meta-heightened","Conjuro intensificado","Dificulta una salvación del objetivo"],
  ["meta-quickened","Conjuro acelerado","Convierte el lanzamiento en acción adicional"],
  ["meta-subtle","Conjuro sutil","Puede evitar componentes verbales o somáticos"],
  ["meta-twinned","Conjuro duplicado","Afecta otro objetivo válido con el mismo conjuro"]
 ],
 barbaro:[["totem-bear","Tótem del oso","Defensa superior durante Furia"],["totem-eagle","Tótem del águila","Movilidad mejorada durante Furia"],["totem-wolf","Tótem del lobo","Ayuda a aliados en ataques cercanos"]],
 brujo:[["pact-blade","Pacto de la hoja","Convoca un arma de pacto"],["pact-chain","Pacto de la cadena","Obtiene familiar especial"],["pact-tome","Pacto del tomo","Accede a conjuros adicionales"]],
 guerrero:[["style-archery","Estilo: A distancia","Bonificación para atacar a distancia"],["style-defense","Estilo: Defensa","Bonificación de CA con armadura"],["style-dueling","Estilo: Duelo","Daño mayor con una sola arma"],["style-great","Estilo: Armas grandes","Mejora daño con arma a dos manos"],["style-two","Estilo: Dos armas","Mejora combate con dos armas"],["style-protect","Estilo: Protección","Reacción defensiva para un aliado"]],
 paladin:[["style-defense","Estilo: Defensa","Más protección con armadura"],["style-dueling","Estilo: Duelo","Ataque con arma a una mano"],["style-great","Estilo: Armas grandes","Arma a dos manos"],["style-protect","Estilo: Protección","Defiende aliados"]],
 explorador:[["style-archery","Estilo: A distancia","Ataque a distancia"],["style-defense","Estilo: Defensa","Más CA"],["style-dueling","Estilo: Duelo","Una arma"],["style-two","Estilo: Dos armas","Combate con dos armas"]]
};
function possibleSpecials(){
 const id=classSel.value,n=Number(level.value)||1;
 if(id==="hechicero"&&n>=3)return {limit:n>=17?4:n>=10?3:2,items:specialLibrary.hechicero};
 if(id==="barbaro"&&n>=3&&subclassSel.value==="totem")return {limit:1,items:specialLibrary.baro||specialLibrary.barbaro};
 if(id==="brujo"&&n>=3)return {limit:1,items:specialLibrary.brujo};
 if(id==="guerrero"&&n>=1)return {limit:1,items:specialLibrary.guerrero};
 if(id==="paladin"&&n>=2)return {limit:1,items:specialLibrary.paladin};
 if(id==="explorador"&&n>=2)return {limit:1,items:specialLibrary.explorador};
 return {limit:0,items:[]};
}
function specialExists(id,title){
 if(owner)return norm(existingOwner().features).includes(norm(title));
 const data=window.alakRuleBridge?.get?.();
 return (data?.traits||[]).some(x=>x.rulesId==="special:"+id||norm(x.title)===norm(title));
}
function renderSpecials(){
 const host=$("rwSpecials");if(!host)return;
 const previous=new Map([...host.querySelectorAll("input[data-special]")].map(x=>[x.dataset.special,x.checked]));
 const spec=possibleSpecials();host.replaceChildren();
 if(!spec.items.length){host.append(print("p","rw-muted","No hay decisiones adicionales de este grupo en el nivel seleccionado."));return}
 const limit=print("p","rw-muted","Selecciona hasta "+spec.limit+" opción(es). Las decisiones restantes podrán agregarse después.");host.append(limit);
 for(const [id,title,note] of spec.items){
  const existing=specialExists(id,title),wrap=print("label","rw-check"+(existing?" exists":""));
  const cb=document.createElement("input");cb.type="checkbox";cb.dataset.special=id;cb.checked=!existing&&previous.get(id)===true;cb.disabled=existing;
  const content=print("span");content.append(print("strong","",title),print("small","",(existing?"✓ Ya registrado · ":"")+note));wrap.append(cb,content);host.append(wrap);
 }
}
function selectedSpecials(){
 const lookup=possibleSpecials().items;
 return [...document.querySelectorAll("#rwSpecials input[data-special]:checked")].map(cb=>{
  const entry=lookup.find(x=>x[0]===cb.dataset.special);
  return entry?{id:"special:"+entry[0],title:entry[1],note:entry[2],level:Number(level.value)||1}:null
 }).filter(Boolean)
}

function desiredSpells(){
 const id=classSel.value,c=book.classes[id],n=Number(level.value)||1;
 let key=id;
 if((id==="guerrero"&&subclassSel.value!=="eldritchknight")||(id==="picaro"&&subclassSel.value!=="arcanetrickster"))return [];
 let rows=window.ALAK_RULE_SPELLS?.[key]||"";
 const canCast=id==="paladin"||id==="explorador"?n>=2:id==="guerrero"||id==="picaro"?n>=3:c?.casting!=="none";
 if(!canCast)return [];
 const slots=book.spellSlots(id,n);
 const top=slots.findLastIndex?.(x=>x>0)+1||1;
 return rows.split(";").filter(Boolean).map(s=>{const sep=s.indexOf("|");return {level:Number(s.slice(0,sep)),title:s.slice(sep+1)}}).filter(x=>x.level===0||x.level<=top).slice(0,40);
}
function previewFeature(feature,checked,label,existing=false){
 const wrap=print("label","rw-check"+(existing?" exists":"")),box=document.createElement("input");box.type="checkbox";box.checked=checked;box.dataset.feature=feature.id;
 const txt=print("span",""),title=print("strong","",feature.title),small=print("small","",label+" · Nivel "+feature.level+" · "+feature.note);
 if(existing){box.checked=false;box.disabled=true;small.textContent="✓ Ya registrado · "+small.textContent}
 txt.append(title,small);wrap.append(box,txt);return wrap
}
function review(){
 const race=book.races[raceSel.value],klass=book.classes[classSel.value],n=Math.max(1,Math.min(20,Number(level.value)||1));
 const subclass=klass?.subs?.[subclassSel.value],subrace=race?.sub?.[subSel.value];
 const info=book.levelInfo(classSel.value,n),scores=bonuses(),reference=$("rwReferences");
 const lines=[];
 if(race)lines.push("Raza: p. "+race.page);
 if(klass)lines.push("Clase: p. "+klass.page);
 if(klass)lines.push("Dados de golpe: "+info.hitDice);
 if(klass)lines.push("Competencia: +"+info.proficiency);
 if(klass&&klass.casting!=="none")lines.push("Espacios por nivel: "+info.slots.map((v,i)=>v?"N"+(i+1)+": "+v:"").filter(Boolean).join(" · "));
 if(info.resource)lines.push(info.resource);
 if(klass?.subLevel<=n&&!subclass)lines.push("⚠ Necesitas elegir "+klass.subName);
 if(raceSel.value==="tiflin"&&!subSel.value)lines.push("⚠ No se añadirá el legado básico al linaje de Zariel");
 if(raceSel.value==="humano"&&subSel.value==="variante")lines.push("⚠ La variante humana exige distribuir dos aumentos y elegir una dote");
 if(raceSel.value==="semielfo")lines.push("⚠ Selecciona manualmente dos aumentos de atributo +1");
 reference.textContent=lines.join("  ·  ")||"Elige raza y clase para revisar las reglas correspondientes";
 $("rwBonuses").textContent=Object.entries(scores).map(([key,val])=>book.keys[key]+" +"+val).join(" · ")||"Sin bonificadores automáticos";
 const oldChecked=new Map([...featuresHost.querySelectorAll('input[data-feature]')].map(x=>[x.dataset.feature,x.checked]));
 featuresHost.replaceChildren();
 const fs=book.featuresFor(raceSel.value,subSel.value,classSel.value,subclassSel.value,n);
 for(const f of fs){const exists=recordExists(f);featuresHost.append(previewFeature(f,!exists&&(oldChecked.has(f.id)?oldChecked.get(f.id):true),f.kind,exists))}
 if(!fs.length)featuresHost.append(print("p","rw-muted","Elige al menos una raza o clase."));
 const oldSpell=new Map([...spellsHost.querySelectorAll('input[data-spell]')].map(x=>[x.dataset.spell,x.checked]));
 spellsHost.replaceChildren();
 const spells=desiredSpells();
 if(!spells.length)spellsHost.append(print("p","rw-muted","No hay sugerencias para esta clase y nivel, o no hay subclase lanzadora seleccionada."));
 renderSpecials();
  for(const spell of spells){
  const exists=spellExists(spell),key=spell.level+"|"+spell.title;
  const wrap=print("label","rw-check"+(exists?" exists":""));const cb=document.createElement("input");cb.type="checkbox";cb.dataset.spell=key;cb.checked=!exists&&(oldSpell.get(key)===true);if(exists){cb.disabled=true;cb.checked=false}
  const line=print("span","","");line.append(print("strong","",spell.title),print("small","",spell.level===0?"Truco":"Nivel "+spell.level));
  if(exists)line.append(print("small","","✓ Ya aprendido"));
  wrap.append(cb,line);spellsHost.append(wrap);
 }
}
function selectedFeatures(){return [...featuresHost.querySelectorAll('input[data-feature]:checked')].map(x=>x.dataset.feature)}
function selectedSpells(){return [...spellsHost.querySelectorAll('input[data-spell]:checked')].map(x=>{const [n,...name]=x.dataset.spell.split("|");return {level:Number(n),title:name.join("|")}})}
function ownerApply(choice){
 const corpus=getInput("features"),extras=getInput("additional");if(!corpus)return {ok:false,message:"No se encontró el campo de rasgos de Alak Hul"};
 const all=book.featuresFor(choice.raceId,choice.subraceId,choice.classId,choice.subclassId,choice.level);
 const remaining=all.filter(f=>choice.selectedFeatureIds.includes(f.id)&&!recordExists(f));
 const addedSpecials=(choice.specialTraits||[]).filter(f=>!specialExists(f.id.replace(/^special:/,""),f.title));
 remaining.push(...addedSpecials);

 let added=0,addedSpells=0;
 if(remaining.length){
  const suffix=remaining.map(f=>"• "+f.title+" — "+f.note).join("\n");
  corpus.value=corpus.value.trimEnd()+"\n\n[Revisión complementaria · Manual del Jugador 2014]\n"+suffix;added=remaining.length;
  corpus.dispatchEvent(new Event("input",{bubbles:true}));
 }
 for(const spell of choice.selectedSpells||[]){
  if(spellExists(spell))continue;
  const blanks=[...document.querySelectorAll('#character input[data-char^="spell'+spell.level+'_"]')].filter(x=>/^spell\d+_\d+$/.test(x.dataset.char)&&!String(x.value).trim());
  if(blanks.length){blanks[0].value=spell.title;blanks[0].dispatchEvent(new Event("input",{bubbles:true}));addedSpells++}
 }
 return {ok:true,message:"Alak Hul: "+added+" rasgos complementarios y "+addedSpells+" conjuros añadidos en casillas vacías. No se modificó ningún dato anterior."}
}
function apply(){
 review();
 const raceId=raceSel.value,classId=classSel.value,subraceId=subSel.value,subclassId=subclassSel.value;
 if(!raceId||!classId){$("rwResult").textContent="Elige una raza y una clase.";return}
 const n=Number(level.value);
 if(!Number.isInteger(n)||n<1||n>20){$("rwResult").textContent="El nivel debe estar entre 1 y 20.";return}
 const klass=book.classes[classId];
 if(klass?.subLevel<=n&&!subclassId){$("rwResult").textContent="Elige primero la subclase / origen / dominio para este nivel.";return}
 const specials=selectedSpecials(),maximum=possibleSpecials().limit;
 if(specials.length>maximum){$("rwResult").textContent="Seleccionaste más opciones de clase de las permitidas para este nivel ("+maximum+").";return}
 const abilities=inputs.map(x=>x.value===""?null:Number(x.value)),selected=abilities.filter(v=>v!==null);
 if(selected.length&&selected.length!==6){$("rwResult").textContent="Asigna las seis características, o deja todas sin completar.";return}
 if(selected.length&&[...selected].sort((a,b)=>a-b).join(",")!=="8,10,12,13,14,15"){$("rwResult").textContent="El array estándar debe contener exactamente 8, 10, 12, 13, 14 y 15 una sola vez.";return}
 const choice={edition:"2014",raceId,subraceId,classId,subclassId,level:n,background:background.value,abilities,bonuses:bonuses(),selectedFeatureIds:selectedFeatures(),selectedSpells:selectedSpells(),specialTraits:specials,updateSlots:$("rwUpdateSlots").checked,autoProgress:$("rwAutoProgress").checked};
 if(owner&&!confirm("¿Agregar únicamente rasgos y conjuros que faltan a Alak Hul? Sus valores actuales no se reemplazarán."))return;
 if(!owner&&!confirm("¿Agregar las opciones elegidas a tu propia hoja sin sobrescribir campos existentes?"))return;
 const result=owner?ownerApply(choice):window.alakRuleBridge?.apply?.(choice);
 $("rwResult").textContent=result?.message||"No se pudo guardar. Verifica tu sesión de Google.";review();
}
launch.onclick=()=>{if(initial()&&!dlg.open)dlg.showModal()};
$("rwClose").onclick=()=>dlg.close();
const homeLaunch=$("openRulesWizardHome");
if(homeLaunch)homeLaunch.onclick=()=>{
 const sheet=document.querySelector('[data-view="sheet"]');
 if(sheet)sheet.click();
 launch.click();
};
$("rwReview").onclick=review;
$("rwApply").onclick=apply;
for(const select of [raceSel,classSel])select.onchange=()=>{dependency();review()};
for(const select of [subSel,subclassSel,level,background])select.onchange=review;
$("rwStandard").onclick=()=>{
 // Reparte los seis valores de mayor a menor con la prioridad sugerida de cada clase.
 const priority={barbaro:["str","con","dex"],bardo:["cha","dex","con"],brujo:["cha","con","dex"],clerigo:["wis","con","str"],druida:["wis","con","dex"],explorador:["dex","wis","con"],guerrero:["str","con","dex"],hechicero:["cha","con","dex"],mago:["int","con","dex"],monje:["dex","wis","con"],paladin:["str","cha","con"],picaro:["dex","int","cha"]};
 const order=(priority[classSel.value]||attrs).concat(attrs).filter((x,i,a)=>a.indexOf(x)===i);
 const values=[15,14,13,12,10,8];
 for(const sel of inputs){const pos=order.indexOf(sel.dataset.attr);sel.value=String(values[pos]);}
 $("rwResult").textContent="Array estándar distribuido como sugerencia. Puedes cambiarlo antes de guardar.";
 review();
};
})();
