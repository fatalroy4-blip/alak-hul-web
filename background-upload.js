
/* V41: fondos propios; las imágenes optimizadas se guardan junto al progreso. */
(function(){
const titles={solar:"",arcane:""};
const assets={solar:"assets/theme-santuario-solar.png",celestial:"assets/theme-templo-celestial.png",arcane:"assets/theme-biblioteca-arcana.png",violetvale:"assets/theme-valle-violeta.png"};
const valid=v=>window.alakImages?.valid(v)||typeof v==="string"&&v.length<160000&&/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(v);
const host=document.getElementById("backgroundChoiceGrid");
if(!host)return;
const styles=document.createElement("style");
styles.textContent=[
'#settings .background-theme-card{display:flex;flex-direction:column;gap:8px;min-width:0}',
'#settings .background-theme-card>.background-choice{width:100%;flex:1}',
'#settings .background-upload-label{display:flex;justify-content:center;align-items:center;cursor:pointer;border:1px solid #b48ba9;background:#342044;color:#fce6b6;border-radius:10px;padding:10px 12px;font:700 12px system-ui,sans-serif}',
'#settings .background-upload-label:hover{background:#563368;border-color:#ffdc9f}',
'#settings .background-choice img.preview-missing{visibility:hidden}',
'#settings #themeUploadStatus{font:700 12px/1.5 system-ui,sans-serif;color:#f3dba9;min-height:20px;margin:12px 0 0}',
'body[data-page-theme="solar"]:not(.home-active)::before{background:linear-gradient(90deg,#1c100cc2,#180a0d9e),var(--alak-custom-background,url("assets/theme-santuario-solar.png")) center/cover no-repeat!important}',
'body[data-page-theme="celestial"]:not(.home-active)::before{background:linear-gradient(90deg,#0d0b1bc2,#0d0b1894),var(--alak-custom-background,url("assets/theme-templo-celestial.png")) center/cover no-repeat!important}',
'body[data-page-theme="arcane"]:not(.home-active)::before{background:linear-gradient(90deg,#130b1dc7,#0b07129e),var(--alak-custom-background,url("assets/theme-biblioteca-arcana.png")) center/cover no-repeat!important}',
'body[data-page-theme="violetvale"]:not(.home-active)::before{background:linear-gradient(90deg,#130a1ec7,#0c08188a),var(--alak-custom-background,url("assets/theme-valle-violeta.png")) center/cover no-repeat!important}'
].join("\n");
document.head.appendChild(styles);
const notice=document.createElement("p");notice.id="themeUploadStatus";
notice.setAttribute("role","status");notice.setAttribute("aria-live","polite");host.after(notice);
for(const [key,title] of Object.entries(titles)){
 const btn=host.querySelector('[data-theme-choice="'+key+'"]');
 if(!btn)continue;
 const wrap=document.createElement("div");wrap.className="background-theme-card";
 btn.parentNode.insertBefore(wrap,btn);wrap.appendChild(btn);
 const label=document.createElement("label");label.className="background-upload-label";label.textContent="⬆ Subir imagen";
 const input=document.createElement("input");input.type="file";input.accept="image/png,image/jpeg,image/webp";input.hidden=true;
 label.appendChild(input);wrap.appendChild(label);
 input.addEventListener("change",async()=>{
  const file=input.files&&input.files[0];input.value="";if(!file)return;
  notice.textContent="Preparando imagen…";
  try{
   const picture=await compact(file);
   const before=state.customBackgrounds?.[key],previous=state.pageTheme;
   state.customBackgrounds={...(state.customBackgrounds||{}),[key]:picture};
   const wasRemoved=state.removedBackgrounds?.[key];state.removedBackgrounds={...state.removedBackgrounds,[key]:false};
   state.pageTheme=key;
   try{
    let c={};try{c=JSON.parse(localStorage.getItem("alakHulCharacterV7")||"{}");}catch(_){}
    if(new Blob([JSON.stringify({state:state,character:c})]).size>800000)
     throw Error("Tu guardado de Firebase está cerca del límite. Quita otro fondo o usa una imagen más pequeña.");
    saveState();
   }catch(e){
    if(before)state.customBackgrounds[key]=before;else delete state.customBackgrounds[key];
    state.removedBackgrounds[key]=wasRemoved||false;state.pageTheme=previous;throw e;
   }
   refresh();
   notice.textContent="✓ Fondo guardado y activo. Se sincronizará con Firebase si has iniciado sesión.";
  }catch(e){notice.textContent="No se pudo guardar: "+(e.message||String(e));}
 });
}
for(const btn of host.querySelectorAll('[data-theme-choice]')){
 const key=btn.dataset.themeChoice;let wrap=btn.closest('.background-theme-card');if(!wrap){wrap=document.createElement('div');wrap.className='background-theme-card';btn.before(wrap);wrap.append(btn);}
 for(const remove of [true]){const control=document.createElement('button');control.type='button';control.textContent=remove?'Eliminar imagen':'Restaurar imagen';control.dataset.themeImage=remove?'remove':'restore';control.onclick=()=>{state.customBackgrounds=state.customBackgrounds||{};delete state.customBackgrounds[key];state.removedBackgrounds={...state.removedBackgrounds,[key]:remove};saveState();refresh();notice.textContent=remove?'Imagen eliminada de tu configuración.':'Imagen original restaurada.';};wrap.append(control);}
}
styles.textContent+='\nbody[data-background-empty="true"]:not(.home-active)::before{background:none!important}';
const baseApply=applyAlakBackground,baseRender=renderAlakBackgroundChoices;
applyAlakBackground=function(){
 baseApply();
 document.body.dataset.backgroundEmpty=String(!!state.removedBackgrounds?.[state.pageTheme]);
 const picture=state.customBackgrounds?.[state.pageTheme];
 if(state.pageTheme!=="purple"&&valid(picture))document.body.style.setProperty("--alak-custom-background",'url("'+picture+'")');
 else document.body.style.removeProperty("--alak-custom-background");
};
renderAlakBackgroundChoices=function(){
 baseRender();
 for(const key of Object.keys(titles)){
  const btn=host.querySelector('[data-theme-choice="'+key+'"]'),img=btn?.querySelector("img");
  if(!btn||!img)continue;
  const picture=state.customBackgrounds?.[key],uploaded=valid(picture);
  if(uploaded&&img.getAttribute("src")!==picture)img.src=picture;
  if(!uploaded&&img.getAttribute("src")!==assets[key])img.src=assets[key];
  const ready=state.removedBackgrounds?.[key]||uploaded||Boolean(img.complete&&img.naturalWidth);
  btn.disabled=!ready;
  img.classList.toggle("preview-missing",!ready);
  const caption=btn.querySelector("small");
  if(caption)caption.textContent=uploaded?"Imagen subida · disponible":ready?"Disponible":"Sube una imagen para activarlo";
 }
};
const renderImages=renderAlakBackgroundChoices;
renderAlakBackgroundChoices=function(){renderImages();for(const btn of host.querySelectorAll('[data-theme-choice]')){const key=btn.dataset.themeChoice,removed=!!state.removedBackgrounds?.[key],img=btn.querySelector('img');if(img){img.hidden=removed;img.style.display=removed?'none':'';}if(removed){btn.disabled=false;btn.querySelector('small').textContent='Sin imagen';}else if(key==='purple')btn.querySelector('small').textContent='Fondo original';const wrap=btn.closest('.background-theme-card');wrap.querySelector('[data-theme-image="remove"]').disabled=removed;}};
const renderFinal=renderAlakBackgroundChoices;
renderAlakBackgroundChoices=function(){
 renderFinal();
 const status=document.getElementById("themeSelectionStatus");
 if(status)status.textContent="";
 for(const btn of host.querySelectorAll('[data-theme-choice]')){
  const removed=!!state.removedBackgrounds?.[btn.dataset.themeChoice];
  btn.setAttribute('aria-label',removed?'Fondo sin imagen':'Seleccionar este fondo');
  btn.disabled=removed;
  const label=btn.closest('.background-theme-card').querySelector('.background-upload-label');
  label.firstChild.textContent=removed?'⬆ Subir nuevo fondo':'⬆ Cambiar imagen';
 }
};
function refresh(){applyAlakBackground();renderAlakBackgroundChoices();}
window.alakBgRefresh=refresh;
function compact(file){return window.alakImages.upload(file);}
refresh();
})();
