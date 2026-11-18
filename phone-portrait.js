/* Phone app portrait editor: keep the original, publish the same crop to combat. */
(()=>{
 if(!window.alakPhoneApp?.())return;
 window.alakEditPhonePortrait=()=>{
  const api=window.alakPhonePortrait;if(!api?.canEdit())return;
  const profile=api.get(),src=profile.source;if(!src)return;
  const dialog=document.createElement('dialog');dialog.className='phone-portrait-dialog';
  dialog.setAttribute('aria-label','Ajustar rostro');
  dialog.innerHTML='<h2>Ajustar rostro</h2><p>Arrastra la imagen y ajusta el zoom. Este rostro aparecerá en tu ficha y en combate; tu ilustración completa se conserva.</p><canvas width="280" height="280" aria-label="Encuadre del rostro"></canvas><label>Zoom<input type="range" min="1" max="5" step="0.01"></label><div class="phone-crop-position"><label>Horizontal<input data-x type="range" min="-100" max="100" value="0"></label><label>Vertical<input data-y type="range" min="-100" max="100" value="0"></label></div><p data-status role="status"></p><div class="crop-actions"><button data-center>Centrar</button><button data-cancel>Cancelar</button><button data-save disabled>Guardar rostro</button></div>';
  const canvas=dialog.querySelector('canvas'),zoom=dialog.querySelector('input'),sx=dialog.querySelector('[data-x]'),sy=dialog.querySelector('[data-y]'),save=dialog.querySelector('[data-save]'),status=dialog.querySelector('[data-status]'),img=new Image();
  let z=profile.crop?.zoom||1,x=profile.crop?.x||0,y=profile.crop?.y||0,drag=null,ready=false;zoom.value=z;
  function draw(){if(!ready)return;const scale=Math.max(280/img.naturalWidth,280/img.naturalHeight)*z,w=img.naturalWidth*scale,h=img.naturalHeight*scale;
   x=Math.max(-(w-280)/2,Math.min((w-280)/2,x));y=Math.max(-(h-280)/2,Math.min((h-280)/2,y));
   const c=canvas.getContext('2d');c.fillStyle='#21142d';c.fillRect(0,0,280,280);c.drawImage(img,(280-w)/2+x,(280-h)/2+y,w,h);
   sx.value=w===280?0:x*200/(w-280);sy.value=h===280?0:y*200/(h-280);
  }
  img.onload=()=>{ready=true;save.disabled=false;draw();};img.onerror=()=>status.textContent='No se pudo abrir el retrato. Revisa tu conexión.';
  zoom.oninput=()=>{z=Number(zoom.value);draw();};
  for(const [slider,axis] of [[sx,'x'],[sy,'y']])slider.oninput=()=>{if(!ready)return;const scale=Math.max(280/img.naturalWidth,280/img.naturalHeight)*z;const value=Number(slider.value)*((axis==='x'?img.naturalWidth:img.naturalHeight)*scale-280)/200;if(axis==='x')x=value;else y=value;draw();};
  canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,px:x,py:y};};
  canvas.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;const factor=280/canvas.getBoundingClientRect().width;x=drag.px+(e.clientX-drag.x)*factor;y=drag.py+(e.clientY-drag.y)*factor;draw();};
  canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
  dialog.querySelector('[data-center]').onclick=()=>{z=1;x=y=0;zoom.value=1;draw();};
  dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
  save.onclick=async()=>{if(!ready||!api.canEdit())return;save.disabled=true;status.textContent='Guardando rostro…';
   try{let thumbnail=canvas.toDataURL('image/webp',.9);
    for(const quality of [.8,.65,.5]){if(thumbnail.length<=80000)break;thumbnail=canvas.toDataURL('image/webp',quality);}
    if(thumbnail.length>80000)throw Error('El encuadre supera el tamaño permitido.');
    const source=src.startsWith('data:')&&src.length>80000?await window.alakImages.upload(await (await fetch(src)).blob(),'combat'):src;
    await api.save({source,thumbnail,crop:{zoom:z,x,y},identity:profile.identity});document.dispatchEvent(new Event('change'));dialog.close();}
   catch(e){status.textContent='No se pudo guardar: '+e.message;save.disabled=false;}
  };
  dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();img.src=src;
 };
})();
