/* Shared dismissal for existing and dynamically-created native dialogs. */
(() => {
 if(window.alakDialogsReady)return;
 window.alakDialogsReady=true;
 let pressed=null;
 const outside=(d,e)=>{const r=d.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
 document.addEventListener('pointerdown',e=>{pressed=e.target instanceof HTMLDialogElement&&outside(e.target,e)?e.target:null;},true);
 document.addEventListener('pointercancel',()=>{pressed=null;},true);
 document.addEventListener('click',e=>{const d=pressed;pressed=null;if(d?.open&&d.getAttribute("aria-busy")!=="true"&&e.target===d&&outside(d,e))d.close();},true);
 const d=document.createElement('dialog');d.className='portrait-viewer';d.setAttribute('aria-labelledby','portraitViewerTitle');
 const title=document.createElement('h2');title.id='portraitViewerTitle';
 const close=document.createElement('button');close.type='button';close.textContent='Cerrar';close.onclick=()=>d.close();
 const img=document.createElement('img');
 const edit=document.createElement('button');edit.type='button';edit.textContent='Cambiar retrato';
 d.append(title,close,img,edit);document.body.append(d);
 let opener=null;
 d.addEventListener('close',()=>{if(opener?.isConnected)opener.focus();});
 window.alakViewPortrait=(name,src,button,onEdit)=>{
  opener=button;title.textContent=name;img.alt='Retrato de '+name;img.src=src;
  edit.hidden=!onEdit;edit.onclick=()=>{d.close();onEdit?.();};
  if(!d.open)d.showModal();
 };
})();
