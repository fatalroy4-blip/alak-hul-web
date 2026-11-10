import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import {getFirestore,doc,getDoc,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
const app=initializeApp(window.ALAK_FIREBASE_CONFIG),auth=getAuth(app),db=getFirestore(app);
const host=document.querySelector('#designView')||document.querySelector('#settings');
if(host){
 const section=document.createElement('section');section.className='new-sheet-section';section.hidden=true;
 section.innerHTML='<h3>Nueva hoja de personaje</h3><p>Empieza otro personaje en tu cuenta. Tu hoja anterior será reemplazada.</p><button type="button">Crear nueva hoja de personaje</button>';
 host.append(section);let account=null,busy=false,dialog=null;
 const own=()=>account&&(!new URLSearchParams(location.search).get('uid')||new URLSearchParams(location.search).get('uid')===account.uid)&&window.alakSheetLifecycle?.own();
 onAuthStateChanged(auth,u=>{account=u;section.hidden=!u||!!(new URLSearchParams(location.search).get('uid')&&new URLSearchParams(location.search).get('uid')!==u.uid);if(dialog?.open&&!busy)dialog.close();});
 section.querySelector('button').onclick=()=>{
  if(!own()){alert('Abre tu propia hoja y espera a que termine de cargar.');return;}
  const capturedUid=account.uid;
  dialog=document.createElement('dialog');dialog.className='new-sheet-dialog';dialog.setAttribute('aria-labelledby','newSheetTitle');
  dialog.innerHTML='<h2 id="newSheetTitle">¿Crear una nueva hoja?</h2><p><strong>Se perderá toda la información guardada en tu hoja anterior:</strong> personaje, características, conjuros, rasgos, notas, imágenes y personalización. No podrás recuperarla desde la página.</p><p>Esto afecta únicamente a tu cuenta. Las hojas de los demás, los permisos y la aventura compartida se conservan.</p><p>Puedes descargar una copia completa en formato JSON antes de continuar. Descargarla es opcional y no elimina nada.</p><div class="new-sheet-actions"><button type="button" data-download>Descargar hoja anterior (.json)</button></div><label class="new-sheet-confirm"><input type="checkbox"> Entiendo que mi hoja anterior se eliminará y quiero empezar una nueva.</label><p role="status" aria-live="polite"></p><div class="new-sheet-actions"><button type="button" data-cancel>Cancelar</button><button type="button" data-create disabled>Eliminar hoja anterior y crear nueva</button></div>';
  const message=dialog.querySelector('[role=status]'),create=dialog.querySelector('[data-create]'),check=dialog.querySelector('input');
  check.onchange=()=>create.disabled=!check.checked||busy;
  dialog.querySelector('[data-cancel]').onclick=()=>{if(!busy)dialog.close();};
  dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  dialog.addEventListener('click',e=>{if(e.target!==dialog||busy)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
  dialog.addEventListener('close',()=>dialog.remove());
  dialog.querySelector('[data-download]').onclick=async()=>{
   if(!own()||account.uid!==capturedUid)return;const button=dialog.querySelector('[data-download]');button.disabled=true;
   try{const [player,legacy]=await Promise.all([getDoc(doc(db,'players',capturedUid)),getDoc(doc(db,'users',capturedUid,'characters','alak-hul'))]);if(account?.uid!==capturedUid)throw Error('La cuenta cambió. Vuelve a abrir tu hoja.');
    const backup={schemaVersion:1,exportedAt:new Date().toISOString(),ownerUid:capturedUid,player:player.exists()?player.data():null,legacy:legacy.exists()?legacy.data():null,currentSheet:window.alakSheetLifecycle.export()};
    const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='hoja-personaje-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);message.textContent='Descarga iniciada. Comprueba que el archivo se guardó antes de eliminar la hoja.';
   }catch(e){message.textContent='No se pudo descargar: '+e.message;}finally{button.disabled=false;}
  };
  create.onclick=async()=>{
   if(!check.checked||busy||!own()||account.uid!==capturedUid)return;
   busy=true;dialog.setAttribute('aria-busy','true');dialog.querySelectorAll('button,input').forEach(e=>e.disabled=true);message.textContent='Creando tu nueva hoja…';
   try{
    await window.alakSheetLifecycle.pause();if(account?.uid!==capturedUid)throw Error('La cuenta cambió; no se borró la hoja.');
    const generation=crypto.randomUUID();
    await runTransaction(db,async tx=>{
     const playerRef=doc(db,'players',capturedUid),legacyRef=doc(db,'users',capturedUid,'characters','alak-hul'),legacy=await tx.get(legacyRef);
     tx.set(playerRef,{ownerUid:capturedUid,accountName:account.displayName||'',accountEmail:account.email||'',updatedBy:capturedUid,updatedAt:serverTimestamp(),sheetGeneration:generation,sheetResetAt:Date.now(),fields:{},sheet:{},stats:{},traits:[],spells:[],slots:{},extras:[],ruleBuild:null,portrait:'',combatImage:'',combatThumbnail:'',combatCrop:null,spellPhrases:{},tileImages:{},tileLabels:{},coverImage:'',pageBackground:''});
     tx.set(doc(db,'combatPortraits',capturedUid),{portrait:'',thumbnail:'',name:'',updatedAt:serverTimestamp()});
     if(legacy.exists())tx.set(legacyRef,{newSheetActive:true,sheetGeneration:generation,state:{},character:{},updatedAt:serverTimestamp()});
    });
    try{localStorage.removeItem('aventurero-respaldo-'+capturedUid);localStorage.removeItem('alakHulLocalBackup_'+capturedUid);
    if(document.querySelector('#settings'))for(const key of ['alakHulCharacterV7','alakHulV5State','alakHulCloudPendingV1'])localStorage.removeItem(key);}catch{}
    location.replace('jugador.html');
   }catch(e){busy=false;dialog.removeAttribute('aria-busy');window.alakSheetLifecycle.resume();message.textContent='No se pudo crear la hoja: '+e.message;dialog.querySelectorAll('button,input').forEach(e=>e.disabled=false);create.disabled=!check.checked;}
  };
  document.body.append(dialog);dialog.showModal();
 };
}
