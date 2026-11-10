(()=>{
 let latest=null,processing=false,again=false,audio=null,enabled=true,accountId=null,lastSignal=null;
 const el=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 const banner=el('aside');banner.className='campaign-event-banner';banner.hidden=true;banner.setAttribute('role','status');document.body.append(banner);
 function notice(text){banner.replaceChildren(el('span',text));const close=el('button','Cerrar');close.type='button';close.onclick=()=>banner.hidden=true;banner.append(close);banner.hidden=false;}
 function unlock(){if(!enabled)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();void audio.resume();}catch{}}
 document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock);
 function sound(type){if(!enabled||!audio||audio.state!=='running')return;const notes=type==='rest'?[392,330,262]:[392,494,587,784];notes.forEach((hz,i)=>{const tone=audio.createOscillator(),gain=audio.createGain(),start=audio.currentTime+i*.18;tone.frequency.value=hz;tone.type='sine';gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.12,start+.025);gain.gain.exponentialRampToValueAtTime(.001,start+.38);tone.connect(gain);gain.connect(audio.destination);tone.start(start);tone.stop(start+.4);});}
 async function process(){if(processing){again=true;return;}if(!latest||!window.alakAdventureSheet)return;const entries=Object.values(latest.data.sheetCommands?.[latest.uid]||{}).filter(e=>['rest','level'].includes(e.type)&&e.id&&e.at>=(window.alakAdventureSheet.get()?.sheetResetAt||0));if(!entries.length)return;processing=true;
  try{await window.alakAdventureSheet.receive(entries);}catch(e){notice('Acción del DM pendiente: '+e.message);}
  finally{processing=false;if(again){again=false;void process();}}
 }
 window.alakCampaignControls={
  receive(data,uid){latest={data,uid};
   if(accountId!==uid){accountId=uid;try{enabled=localStorage.getItem('alak-campaign-audio:'+uid)!=='off';lastSignal=localStorage.getItem('alak-campaign-signal:'+uid);}catch{}}
   const signal=data.campaignSignal;if(signal?.id&&signal.id!==lastSignal){lastSignal=signal.id;try{localStorage.setItem('alak-campaign-signal:'+uid,signal.id);}catch{}if(Date.now()-signal.at<90000){notice(signal.text);sound(signal.type);}}
   void process();
  },
  ready:()=>void process(),
  mountAudio(host){if(host.querySelector('[data-campaign-audio]'))return;const b=el('button','♪ Sonido de avisos: '+(enabled?'activado':'desactivado'));b.type='button';b.dataset.campaignAudio='';b.className='adventure-audio';b.onclick=()=>{enabled=!enabled;try{localStorage.setItem('alak-campaign-audio:'+accountId,enabled?'on':'off');}catch{}b.textContent='♪ Sonido de avisos: '+(enabled?'activado':'desactivado');if(enabled)unlock();};host.append(b);},
  render({host,players,roles,admitted,current,send}){
   const section=el('section');section.className='adventure-card';section.append(el('h3','Descanso y progresión de la aventura'),el('p','Selecciona los personajes antes de confirmar. Los avisos y sonidos llegan a los participantes conectados. Las acciones pendientes se aplican cuando cada jugador abre su propia hoja.'));
   for(const [type,label] of [['rest','☾ Descanso largo'],['level','✦ Subir nivel']]){const b=el('button',label);b.type='button';b.onclick=()=>{
    const dialog=el('dialog');dialog.className='adventure-dialog';dialog.setAttribute('aria-label',label);dialog.append(el('h2',label));
    dialog.append(el('p',type==='rest'?'Confirma que el descanso es válido. Recupera PG, espacios y puntos de hechicería; revisa aparte recursos personalizados y condiciones.':'Indica el nuevo nivel. Cada jugador revisará los rasgos, PG y elecciones que le correspondan. Nunca se reduce un nivel existente.'));
    const candidates=new Map(players.filter(p=>admitted(p.ownerUid)||['owner','dm'].includes(roles.get(p.ownerUid))).map(p=>[p.ownerUid,p.fields?.name||p.accountName||'Jugador']));
    for(const [id,role] of roles)if(role==='owner'&&!candidates.has(id))candidates.set(id,'Alak Hul · propietario');
    if(!candidates.has(current.uid))candidates.set(current.uid,current.displayName||'Mi personaje');
    const choices=[];for(const [id,name] of candidates){const label=el('label',name);label.className='campaign-event-target';const input=el('input');input.type='checkbox';input.value=id;label.prepend(input);dialog.append(label);choices.push({input,name});}
    const target=el('input');target.type='number';target.min=1;target.max=20;target.value='';if(type==='level'){const label=el('label','Nuevo nivel (1–20)');label.append(target);dialog.append(label);}
    const status=el('p');status.setAttribute('role','status');dialog.append(status);const confirm=el('button','Confirmar '+(type==='rest'?'descanso':'subida de nivel'));confirm.type='button';confirm.onclick=async()=>{
     const selected=choices.filter(c=>c.input.checked);if(!selected.length){status.textContent='Selecciona al menos un personaje.';return;}
     const n=Number(target.value);if(type==='level'&&(!Number.isInteger(n)||n<1||n>20)){status.textContent='Escribe un nivel entre 1 y 20.';return;}
     confirm.disabled=true;dialog.setAttribute('aria-busy','true');const id=crypto.randomUUID(),at=Date.now(),command={id,at,type,...(type==='level'?{target:n}:{})};
     const ok=await send(s=>{const sheetCommands=structuredClone(s.sheetCommands||{});for(const c of selected)sheetCommands[c.input.value]={...(sheetCommands[c.input.value]||{}),[type]:command};const restore=rows=>(rows||[]).map(p=>type==='rest'&&selected.some(c=>c.input.value===p.uid)?{...p,hp:p.maxHP??p.hp,damage:0,dead:false}:p);return {...s,sheetCommands,...(type==='rest'?{roster:restore(s.roster),participantCatalog:restore(s.participantCatalog)}:{}),campaignSignal:{id,at,type,text:(type==='rest'?'☾ Descanso largo: ':'✦ Nivel '+n+': ')+selected.map(c=>c.name).join(', ')}};});
     dialog.removeAttribute('aria-busy');if(ok)dialog.close();else{status.textContent='No se pudo guardar. Revisa tu conexión y permisos.';confirm.disabled=false;}
    };const cancel=el('button','Cancelar');cancel.type='button';cancel.onclick=()=>{if(dialog.getAttribute('aria-busy')!=='true')dialog.close();};dialog.addEventListener('cancel',e=>{if(dialog.getAttribute('aria-busy')==='true')e.preventDefault();});dialog.append(confirm,cancel);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
   };section.append(b);}host.append(section);
  }
 };
})();
