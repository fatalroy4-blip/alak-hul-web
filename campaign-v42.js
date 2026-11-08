
/* Alak Hul V42 — organización de Campaña, diario privado y recorte de retratos.
 * La funcionalidad de invitaciones y roles en Firebase se agregará en una etapa posterior.
 * Por ahora no se exponen las hojas privadas ni se escribe ningún documento compartido.
 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const viewNames=["table","combat","diary","admin"];
let active="table",editingDiaryId=null;
function show(view=null){
 if(view&&viewNames.includes(view))active=view;
 for(const button of document.querySelectorAll("[data-campaign-view]")){
  const selected=button.dataset.campaignView===active;
  button.classList.toggle("active",selected);
  button.setAttribute("aria-selected",String(selected));
 }
 for(const v of viewNames){
  const box=$("campaign-"+v),selected=v===active;
  if(!box)continue;
  box.hidden=!selected;box.classList.toggle("active",selected);
 }
 if(active==="combat")renderInitiative();
 if(active==="table")renderTable();
 if(active==="diary")renderDiary();
}
window.alakShowCampaignView=show;
document.querySelectorAll("[data-campaign-view]").forEach(button=>button.addEventListener("click",()=>show(button.dataset.campaignView)));
$("campaignGoAdmin")?.addEventListener("click",()=>show("admin"));
$("campaignOpenCombat")?.addEventListener("click",()=>show("combat"));
$("campaignNewCombat")?.addEventListener("click",()=>{$("newCombatBtn")?.click();show("combat");});
$("campaignOpenCloud")?.addEventListener("click",()=>$("cloudOpenBtn")?.click());
$("campaignSaveName")?.addEventListener("click",()=>{
 const input=$("campaignNameInput"),status=$("campaignNameStatus");
 const newName=input?.value.trim();
 if(!newName){if(status)status.textContent="Escribe el nombre de la campaña.";return;}
 state.campaignName=newName;saveState();
 if(status)status.textContent="✓ Nombre guardado en tu perfil. Se compartirá cuando se active el multijugador.";
});
const kindLabel={main:"Personaje jugador",ally:"Aliado NPC",enemy:"Enemigo"};
function renderTable(){
 const host=$("campaignTableList"),stats=$("campaignTableSummary");if(!host||!stats)return;
 const campaignName=String(state.campaignName||"Las nieblas de Barovia");
 const nameTag=$("campaignCurrentName");if(nameTag)nameTag.textContent="· "+campaignName;
 const nameInput=$("campaignNameInput");if(nameInput && document.activeElement!==nameInput)nameInput.value=campaignName;
 host.replaceChildren();
 const visible=combatantNames();
 const counts={main:0,ally:0,enemy:0};
 for(const name of visible){const k=participantKind(name);counts[k]=(counts[k]||0)+1;}
 stats.replaceChildren();
 for(const [kind,title] of [["main","Personajes"],["ally","Aliados"],["enemy","Enemigos"]]){
  const chip=document.createElement("span");chip.textContent=title+": "+(counts[kind]||0);stats.appendChild(chip);
 }
 const members=visible.filter(name=>participantKind(name)==="main");
 if(!members.length){
  const empty=document.createElement("p");empty.className="campaign-notice";empty.textContent="Todavía no hay personajes en tu mesa. Agrégalos desde Administración.";
  host.appendChild(empty);return;
 }
 for(const name of members){
  const card=document.createElement("article");card.className="campaign-table-person";
  const avatar=document.createElement("img");avatar.src=getPortrait(name,false);avatar.alt="Retrato de "+name;
  const info=document.createElement("div"),title=document.createElement("strong"),kind=document.createElement("small");
  title.textContent=name;kind.textContent=kindLabel[participantKind(name)]||"Participante";
  info.append(title,kind);card.append(avatar,info);host.appendChild(card);
 }
}
function todayLocal(){
 const d=new Date(),two=v=>String(v).padStart(2,"0");
 return d.getFullYear()+"-"+two(d.getMonth()+1)+"-"+two(d.getDate());
}
function renderDiary(){
 const host=$("campaignDiaryEntries");if(!host)return;
 host.replaceChildren();
 const entries=Array.isArray(state.campaignDiary)?[...state.campaignDiary]:[];
 entries.sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
 if(!entries.length){
  const p=document.createElement("p");p.className="campaign-note";p.textContent="Todavía no has guardado entradas de esta aventura.";host.appendChild(p);return;
 }
 for(const entry of entries){
  const article=document.createElement("article");article.className="campaign-diary-entry";
  const time=document.createElement("time");time.textContent=entry.date||"Sin fecha";
  const h=document.createElement("h5");h.textContent=entry.title||"Sesión";
  const p=document.createElement("p");p.textContent=entry.text||"";
  const edit=document.createElement("button");edit.type="button";edit.textContent="Editar";
  edit.onclick=()=>{
   editingDiaryId=entry.id;
   $("campaignDiaryDate").value=entry.date||todayLocal();
   $("campaignDiaryTitle").value=entry.title||"";
   $("campaignDiaryText").value=entry.text||"";
   $("campaignDiarySave").textContent="Guardar cambios";
   $("campaignDiaryCancel").hidden=false;
   $("campaignDiaryForm").scrollIntoView({block:"start",behavior:"smooth"});
  };
  const del=document.createElement("button");del.type="button";del.textContent="Eliminar";
  del.onclick=()=>{
   if(!confirm("¿Eliminar la entrada «"+entry.title+"» del diario?"))return;
   state.campaignDiary=(state.campaignDiary||[]).filter(e=>e.id!==entry.id);
   if(editingDiaryId===entry.id)resetDiaryForm();
   saveState();
  };
  article.append(time,h,p,edit,del);host.appendChild(article);
 }
}
function resetDiaryForm(){
 editingDiaryId=null;
 $("campaignDiaryForm")?.reset();
 $("campaignDiaryDate").value=todayLocal();
 $("campaignDiarySave").textContent="Guardar entrada";
 $("campaignDiaryCancel").hidden=true;
}
$("campaignDiaryForm")?.addEventListener("submit",event=>{
 event.preventDefault();
 const date=$("campaignDiaryDate").value,title=$("campaignDiaryTitle").value.trim(),notes=$("campaignDiaryText").value.trim();
 const status=$("campaignDiaryMessage");
 if(!date||!title||!notes){if(status)status.textContent="Completa la fecha, el título y las notas.";return;}
 const list=Array.isArray(state.campaignDiary)?state.campaignDiary:[];
 const id=editingDiaryId||(crypto.randomUUID?.()||String(Date.now()));
 const entry={id,date,title,text:notes};
 if(editingDiaryId){
  const idx=list.findIndex(x=>x.id===editingDiaryId);
  if(idx>=0)list[idx]=entry;else list.push(entry);
 }else list.push(entry);
 state.campaignDiary=list;
 try{saveState();resetDiaryForm();if(status)status.textContent="✓ Entrada guardada en tu diario.";}
 catch(err){if(status)status.textContent="No se pudo guardar esta entrada: "+(err.message||err);}
});
$("campaignDiaryCancel")?.addEventListener("click",resetDiaryForm);
if($("campaignDiaryDate"))$("campaignDiaryDate").value=todayLocal();
window.alakCampaignRefresh=()=>{renderTable();renderDiary();};
function buildCrop(){
 const dialog=$("campaignPortraitDialog"),canvas=$("campaignPortraitCanvas"),slider=$("campaignPortraitZoom");
 if(!dialog||!canvas||!slider)return;
 const ctx=canvas.getContext("2d",{alpha:false});
 if(!ctx)return;
 let subject=null,image=null,url=null,panX=0,panY=0,zoom=1,drag=null;
 function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
 function geometry(side){
  const base=Math.max(side/image.naturalWidth,side/image.naturalHeight)*zoom;
  const width=image.naturalWidth*base,height=image.naturalHeight*base;
  const step=side/320;
  panX=clamp(panX,-(width/step-320)/2,(width/step-320)/2);
  panY=clamp(panY,-(height/step-320)/2,(height/step-320)/2);
  return {width,height,x:(side-width)/2+panX*step,y:(side-height)/2+panY*step};
 }
 function paint(target,size){
  if(!image)return;
  const context=target.getContext("2d",{alpha:false});
  context.fillStyle="#180f21";context.fillRect(0,0,size,size);
  const g=geometry(size);
  context.drawImage(image,g.x,g.y,g.width,g.height);
 }
 function redraw(){paint(canvas,320);}
 function cleanup(){
  if(url)URL.revokeObjectURL(url);
  url=null;image=null;subject=null;drag=null;
 }
 window.alakOpenPortraitCrop=(file,name)=>{
  if(!/^image\/(?:png|jpeg|webp)$/.test(file.type)){alert("Selecciona una imagen JPG, PNG o WebP.");return;}
  if(file.size>12*1024*1024){alert("Selecciona una imagen menor de 12 MB.");return;}
  cleanup();
  subject=name;zoom=1;panX=0;panY=0;slider.value="1";
  $("campaignPortraitTitle").textContent="Retrato de "+name;
  $("campaignPortraitMessage").textContent="Preparando imagen…";
  const img=new Image();url=URL.createObjectURL(file);
  img.onload=()=>{
   if(!url)return;
   image=img;
   $("campaignPortraitMessage").textContent="Arrastra para centrar la cara y ajusta el zoom.";
   redraw();
  };
  img.onerror=()=>{$("campaignPortraitMessage").textContent="No se pudo abrir la imagen. Intenta con otra."};
  img.src=url;
  if(!dialog.open)dialog.showModal();
 };
 slider.addEventListener("input",()=>{zoom=Number(slider.value);redraw();});
 canvas.addEventListener("pointerdown",event=>{
  if(!image)return;
  canvas.setPointerCapture(event.pointerId);
  drag={pointerId:event.pointerId,x:event.clientX,y:event.clientY,panX,panY};
 });
 canvas.addEventListener("pointermove",event=>{
  if(!drag||drag.pointerId!==event.pointerId||!image)return;
  const rect=canvas.getBoundingClientRect(),factor=320/rect.width;
  panX=drag.panX+(event.clientX-drag.x)*factor;
  panY=drag.panY+(event.clientY-drag.y)*factor;
  redraw();
 });
 const end=event=>{if(drag&&drag.pointerId===event.pointerId)drag=null;};
 canvas.addEventListener("pointerup",end);
 canvas.addEventListener("pointercancel",end);
 $("campaignPortraitCenter")?.addEventListener("click",()=>{panX=0;panY=0;zoom=1;slider.value="1";redraw();});
 $("campaignPortraitCancel")?.addEventListener("click",()=>dialog.close());
 dialog.addEventListener("close",cleanup);
 $("campaignPortraitSave")?.addEventListener("click",()=>{
  if(!image||!subject)return;
  const out=document.createElement("canvas");out.width=256;out.height=256;
  paint(out,256);
  const data=out.toDataURL("image/jpeg",.76);
  if(data.length>200000){$("campaignPortraitMessage").textContent="La imagen todavía es demasiado grande.";return;}
  const previous=state.portraits?.[subject];
  state.portraits=state.portraits||{};state.portraits[subject]=data;
  try{
   saveState();renderCombatAdmin();renderRoster();renderInitiative();renderTable();
   dialog.close();
  }catch(err){
   if(previous)state.portraits[subject]=previous;else delete state.portraits[subject];
   $("campaignPortraitMessage").textContent="No se pudo guardar: "+(err.message||err);
  }
 });
}
buildCrop();
renderTable();renderDiary();
})();
