/*
 * Alak Hul — sincronización opcional de la v27.
 * Guardado local siempre disponible; Firebase solo se usa si lo configuras.
 * Regla Firestore: users/{uid}/characters/alak-hul, accesible exclusivamente al uid.
 */
const el = id => document.getElementById(id);
const CLOUD_PENDING = 'alakHulCloudPendingV1';
const CLIENT_KEY = 'alakHulCloudClientV1';
const PROFILE_KEY = 'alakHulCharacterV7';
const GAME_KEY = 'alakHulV5State';
const documentId = 'alak-hul';
const config = window.ALAK_FIREBASE_CONFIG || {};
const configured = ['apiKey', 'authDomain', 'projectId', 'appId'].every(k =>
  typeof config[k] === 'string' && config[k].trim() && !/TU_|YOUR_|REEMPLAZ/i.test(config[k]));

let auth, firestore, api, account = null, ref = null;
let unlisten = null;
let ready = false, applying = false, dirty = false;
let loading = false, conflictData = null, queue = null;
let editCounter = 0, isWriting = false, retryNeeded = false;
let lastCloudSignature = '';
let lastEditSignature='';
const storedClient = sessionStorage.getItem(CLIENT_KEY);
const clientId = storedClient || (crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random()}`);
if (!storedClient) sessionStorage.setItem(CLIENT_KEY, clientId);

function status(msg, tone='') {
  el('cloudStatus').textContent = msg;
  el('cloudStatus').dataset.tone = tone;
  const btn = el('cloudOpenBtn');
  if (btn) {
    btn.dataset.cloudState = tone === 'ok' ? 'online' : tone === 'warn' ? 'pending' : '';
    el('cloudBtnText').textContent = tone === 'ok' ? 'Sincronizado' : 'Nube';
  }
  window.alakHomeCloudState = tone === 'error' ? 'error' : account && ready && tone === 'ok' ? 'saved' : account && /Guardando en la nube/.test(msg) ? 'saving' : account && tone === 'warn' ? 'pending' : 'local';
  window.alakHomeCloudStatus = {saved:'Guardado en nube',saving:'Guardando…',pending:'Cambios pendientes',error:'Error al sincronizar',local:'Guardado local'}[window.alakHomeCloudState];
  window.dispatchEvent(new CustomEvent('alak-home-cloud-status'));
}
function setHelp(message) { el('cloudHelpText').textContent = message; }
function refreshAccountUI() {
  const user = Boolean(account);
  el('cloudLoginBtn').hidden = !configured || user;
  el('cloudLogoutBtn').hidden = !user;
  el('cloudUploadBtn').hidden = !user || !ready;
  el('cloudAccount').hidden = !user;
  el('cloudAccount').textContent = user ? `Cuenta: ${account.displayName || account.email || 'Google'} (${account.email || 'sin correo'})` : '';
  el('cloudSetupHelp').hidden = configured;
}
function getLocal() {
  let game = null, character = null;
  try { game = JSON.parse(localStorage.getItem(GAME_KEY) || 'null'); } catch {}
  try { character = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); } catch {}
  return {state:game || {}, character:character || {}};
}
function signature(value) { return JSON.stringify({state:value?.state || {}, character:value?.character || {}}); }
function pendingFor(uid) {
  try { const p = JSON.parse(localStorage.getItem(CLOUD_PENDING)); return p && p.uid === uid; } catch { return false; }
}
function setPending() {
  if (!account) return;
  try { localStorage.setItem(CLOUD_PENDING,JSON.stringify({uid:account.uid,at:new Date().toISOString()})); } catch {}
}
function clearPending() { localStorage.removeItem(CLOUD_PENDING); }
function backupLocal() {
  const saved = getLocal();
  const key = `alakHulLocalBackup_${account?.uid || 'sin-usuario'}`;
  if (!Object.keys(saved.state).length && !Object.keys(saved.character).length) return;
  try { localStorage.setItem(key,JSON.stringify({backupAt:new Date().toISOString(),...saved})); }
  catch { /* Si no hay espacio, el usuario puede descargar la copia con el botón. */ }
}
function repaintLocal() {
  // No volver a ejecutar init() ni bindCharacter(): duplicarían los listeners.
  if (typeof loadState === 'function') loadState();
  if (typeof loadCharacter === 'function') loadCharacter();
  if (typeof recalculateSkillBonuses === 'function') recalculateSkillBonuses();
  if (typeof renderPreparedGroups === 'function') renderPreparedGroups();
  if (typeof renderSlots === 'function') renderSlots();
  if (typeof renderSpellSections === 'function') renderSpellSections();
  if (typeof renderChannels === 'function') renderChannels();
  if (typeof renderSheetPreparedSpells === 'function') renderSheetPreparedSpells();
  if (typeof renderCombatAdmin === 'function') renderCombatAdmin();
  if (typeof renderCustomSpellAdmin === 'function') renderCustomSpellAdmin();
  if (typeof renderCustomChannelAdmin === 'function') renderCustomChannelAdmin();
  if (typeof renderRoster === 'function') renderRoster();
  if (typeof renderInitiative === 'function') renderInitiative();
  if (typeof renderDeathSaves === 'function') renderDeathSaves();
  if (typeof updateSoundButton === 'function') updateSoundButton();
  if (typeof updateHomeIndicators === 'function') updateHomeIndicators();
  if (typeof window.alakBgRefresh === "function") window.alakBgRefresh();
  window.alakHomeDesignRefresh?.();
  if (typeof window.alakCampaignRefresh === 'function') window.alakCampaignRefresh();window.alakRefreshAdventureTools?.();
}
function useRemote(data, doBackup=true) {
  if (!data || !data.state || !data.character || typeof data.state !== 'object' || typeof data.character !== 'object') {
    throw new Error('El guardado de la nube está incompleto; no se modificaron los datos locales.');
  }
  applying = true;
  window.alakCloud.isApplying = true;
  try {
    if (doBackup && signature(data) !== signature(getLocal())) backupLocal();
    localStorage.setItem(GAME_KEY,JSON.stringify(data.state));
    localStorage.setItem(PROFILE_KEY,JSON.stringify(data.character));
    repaintLocal();
    lastCloudSignature = signature(data);lastEditSignature=lastCloudSignature;
  } finally {
    applying = false;
    window.alakCloud.isApplying = false;
  }
}
function exportJson() {
  const contents = JSON.stringify({schemaVersion:1,exportedAt:new Date().toISOString(),...getLocal()},null,2);
  const link = document.createElement('a');
  const url = URL.createObjectURL(new Blob([contents],{type:'application/json'}));
  link.href = url;link.download=`alak-hul-respaldo-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function compressPortrait(dataUrl) {
  if (typeof dataUrl !== 'string' || dataUrl.length <= 110000) return dataUrl;
  if (!dataUrl.startsWith('data:image/')) return dataUrl;
  return await new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      try {
        const scale=Math.min(1,420/Math.max(img.naturalWidth,img.naturalHeight));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
        canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#15121a';ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        const result=canvas.toDataURL('image/jpeg',.73);
        resolve(result);
      } catch(err) { reject(err); }
    };
    img.onerror=()=>reject(new Error('No se pudo optimizar la foto para sincronizar.'));
    img.src=dataUrl;
  });
}
async function payload() {
  const local=getLocal();
  local.character={...local.character};
  if(local.character.portrait) local.character.portrait=await compressPortrait(local.character.portrait);
  const size=new Blob([JSON.stringify(local)]).size;
  if(size>820000) throw new Error('El guardado supera el tamaño permitido. Reduce el tamaño de la foto antes de sincronizar.');
  return local;
}
function docRef() { return api.doc(firestore,'users',account.uid,'characters',documentId); }
function debounceSave(ms=1300) {
  clearTimeout(queue);queue=setTimeout(()=>{void flush();},ms);
}
function onLocalChange() {
  if(applying || resettingSheet || !account) return;
  const nextSignature=signature(getLocal());if(nextSignature===lastEditSignature)return;lastEditSignature=nextSignature;
  ++editCounter;dirty=true;setPending();
  status(ready?'Guardando cambios…':'Cambios locales pendientes de sincronizar','warn');
  if(ready) debounceSave();
}
let resettingSheet=false;
window.alakCloud={onLocalChange,isApplying:false};
window.alakSheetLifecycle={own:()=>!!account&&ready,export:()=>getLocal(),pause:async()=>{resettingSheet=true;clearTimeout(queue);while(isWriting)await new Promise(r=>setTimeout(r,50));dirty=false;retryNeeded=false;},resume:()=>{resettingSheet=false;lastEditSignature='';onLocalChange();}};

window.alakAdventureSheet={
 get:()=>window.alakLegacyAdventure?.toModel(getLocal()),
 act:action=>legacyActions([action]),
 receive:events=>legacyActions(events,true)
};
async function legacyActions(actions,events=false){
 if(!ready||!account||resettingSheet)throw Error('Espera a que tu hoja termine de sincronizar.');
 if(events&&actions.every(e=>getLocal().character?.appliedCampaignEvents?.[e.type]===e.id))return;
 while(isWriting)await new Promise(r=>setTimeout(r,50));if(dirty)await flush(true);if(dirty)throw Error('Guarda tus cambios antes de continuar.');
 resettingSheet=true;clearTimeout(queue);document.querySelector('main')?.setAttribute('inert','');
 try{let next;await api.runTransaction(firestore,async tx=>{const snap=await tx.get(ref);if(!snap.exists()||snap.data().newSheetActive)throw Error('Abre tu hoja actual.');next=snap.data();
  for(const action of [...actions].sort((a,b)=>(a.at||0)-(b.at||0))){const model=window.alakLegacyAdventure.toModel(next);if(events&&model.appliedCampaignEvents?.[action.type]===action.id)continue;let updated=window.ALAK_ADVENTURE_RULES.apply(model,action);if(events)updated.appliedCampaignEvents={...model.appliedCampaignEvents,[action.type]:action.id};next=window.alakLegacyAdventure.fromModel(next,updated,action);}
  tx.set(ref,{...next,clientId,updatedAt:api.serverTimestamp()});
 });useRemote(next,false);window.alakRefreshAdventureTools?.();}
 finally{resettingSheet=false;document.querySelector('main')?.removeAttribute('inert');}
}

async function flush(force=false) {
  if(resettingSheet)return;
  if (!account || !ready || applying || loading) return;
  if(!dirty && !force) return;
  if(isWriting) { retryNeeded=true;return; }
  clearTimeout(queue);queue=null;
  isWriting=true;
  const currentEdit=editCounter;
  try {
    status('Guardando en la nube…','warn');
    const data=await payload();
    await api.runTransaction(firestore,async tx=>{const snap=await tx.get(ref);if(snap.exists()&&snap.data().newSheetActive)throw Error('Esta hoja fue reemplazada. Abre tu nueva hoja.');if(snap.exists()&&['rest','level'].some(k=>snap.data().character?.appliedCampaignEvents?.[k]!==data.character?.appliedCampaignEvents?.[k]))throw Error('Actualización del DM recibida en otra pestaña. Recarga la hoja.');tx.set(ref,{...data,schemaVersion:1,clientId,updatedAt:api.serverTimestamp()});});
    lastCloudSignature=signature(data);
    if(currentEdit===editCounter){dirty=false;clearPending();status('✓ Guardado en la nube','ok');}
    else {status('Hay cambios nuevos por subir…','warn');}
  } catch(err) {
    dirty=true;setPending();
    status('No se pudo subir: '+friendlyError(err),'error');
  } finally {
    isWriting=false;if(!dirty)window.alakCampaignControls?.ready();
    if(retryNeeded || dirty && currentEdit!==editCounter){retryNeeded=false;debounceSave(1700);}
  }
}
function friendlyError(err) {
  const code=err?.code || '';
  if(code.includes('permission-denied')) return 'revisa las reglas de Firestore.';
  if(code.includes('unauthorized-domain')) return 'autoriza tu dominio de Vercel en Authentication.';
  if(code.includes('popup-blocked')) return 'el navegador bloqueó la ventana de Google.';
  if(code.includes('network') || code.includes('unavailable')) return 'revisa Internet; los datos siguen guardados localmente.';
  if(code.includes('invalid-api-key')||code.includes('invalid-app')) return 'revisa firebase-config.js.';
  return (err?.message || 'Intenta de nuevo.').slice(0,200);
}
function subscribe() {
  if (unlisten) unlisten();
  unlisten=api.onSnapshot(ref,snap=>{
    if(!snap.exists() || snap.metadata.hasPendingWrites) return;
    const value=snap.data();
    if(value.newSheetActive){if(resettingSheet)return;resettingSheet=true;clearTimeout(queue);dirty=false;location.replace("jugador.html");return;}
    if(value.clientId===clientId || signature(value)===lastCloudSignature) return;
    if(dirty || applying || !ready) return; // No pisar una edición local todavía sin enviar.
    try {
      useRemote(value);
      status('✓ Actualizado desde otro dispositivo','ok');
    } catch(err) { status('Error al recibir cambios: '+friendlyError(err),'error'); }
  },err=>status('Sincronización detenida: '+friendlyError(err),'error'));
}
async function connectForUser(user) {
  if(unlisten){unlisten();unlisten=null;}
  account=user;ref=docRef();dirty=false;ready=false;loading=true;conflictData=null;
  el('cloudConflict').hidden=true;
  refreshAccountUI();status('Buscando tu hoja en la nube…','warn');
  try {
    const first=await api.getDoc(ref);
    if(account?.uid!==user.uid)return;
    loading=false;
    if(first.exists()){
      const value=first.data();
      if(value.newSheetActive){location.replace("jugador.html");return;}
      if(pendingFor(user.uid) && signature(value)!==signature(getLocal())){
        conflictData=value;
        el('cloudConflict').hidden=false;
        status('Hay datos locales pendientes: elige qué copia usar','warn');
        el('cloudDialog').showModal?.();
        return;
      }
      useRemote(value);
      clearPending();
      ready=true;subscribe();window.alakCampaignControls?.ready();status('✓ Hoja cargada y sincronizada','ok');
    }else{
      // Primer dispositivo: convertir su guardado local en el primer guardado cloud.
      ready=true;dirty=true;setPending();
      await flush(true);
      subscribe();
      if(!dirty)status('✓ Primer guardado creado en Firebase','ok');
    }
    refreshAccountUI();
  }catch(err){loading=false;ready=false;status('No se pudo conectar: '+friendlyError(err),'error');}
}
async function chooseRemote() {
  if(!conflictData)return;
  try {
    useRemote(conflictData);
    conflictData=null;clearPending();dirty=false;ready=true;
    el('cloudConflict').hidden=true;subscribe();refreshAccountUI();
    status('✓ Copia de la nube restaurada','ok');
  }catch(err){status(friendlyError(err),'error');}
}
async function chooseLocal() {
  if(!conflictData)return;
  if(!window.confirm('¿Sobrescribir la copia de la nube con los datos de ESTE navegador? Esta acción reemplaza el progreso guardado en otros dispositivos.'))return;
  conflictData=null;el('cloudConflict').hidden=true;
  ready=true;dirty=true;setPending();++editCounter;
  await flush(true);subscribe();refreshAccountUI();
}
async function manualUpload() {
  if(!account || !ready)return;
  if(!window.confirm('¿Enviar esta hoja local a Firebase? Reemplazará el guardado de la nube para tu cuenta de Google.'))return;
  dirty=true;setPending();++editCounter;await flush(true);
}
function openDialog(){ const d=el('cloudDialog'); if(!d.open)d.showModal(); }
el('cloudOpenBtn').addEventListener('click',openDialog);
el('cloudCloseBtn').addEventListener('click',()=>el('cloudDialog').close());
el('cloudDownloadBtn').addEventListener('click',exportJson);
el('cloudUseRemoteBtn').addEventListener('click',()=>void chooseRemote());
el('cloudUseLocalBtn').addEventListener('click',()=>void chooseLocal());
el('cloudUploadBtn').addEventListener('click',()=>void manualUpload());
el('cloudImportFile').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  try {
    if(file.size>6_000_000)throw new Error('El archivo JSON es demasiado grande.');
    const parsed=JSON.parse(await file.text());
    if(!parsed.state || !parsed.character || typeof parsed.state!=='object'||typeof parsed.character!=='object')throw new Error('Esta copia no contiene una hoja válida.');
    if(!confirm('¿Reemplazar los datos de ESTE navegador con los del archivo? Después se sincronizarán con tu cuenta si está conectada.'))return;
    useRemote(parsed);
    if(account && ready){dirty=true;setPending();++editCounter;debounceSave(300);}
    status(account?'Copia importada; guardando en la nube…':'Copia importada en este navegador',account?'warn':'ok');
  }catch(err){status('No se pudo importar: '+friendlyError(err),'error');}
});
window.addEventListener('online',()=>{if(account && ready && dirty)debounceSave(100);});

refreshAccountUI();
if(!configured){
  setHelp('La página funciona normalmente en este navegador. Para activar la sincronización, configura el proyecto gratuito en Firebase y completa firebase-config.js.');
  status('Modo local · Firebase sin configurar');
}else if(location.protocol==='file:'){
  setHelp('Publica la página en Vercel con HTTPS para iniciar sesión con Google; abrir index.html directamente no permite esta configuración.');
  status('Publica la página en Vercel para usar la nube','warn');
}else{
  setHelp('Inicia sesión con tu cuenta de Google para usar la misma hoja en cualquier dispositivo. Se seguirá guardando localmente como respaldo.');
  status('Preparando Firebase…','warn');
  try {
    // Importación solo después de configurar el proyecto: no afecta el modo sin conexión.
    const version='12.4.0';
    const [appModule,authModule,dbModule]=await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`)
    ]);
    api={...authModule,...dbModule};
    const app=appModule.initializeApp(config);
    auth=authModule.getAuth(app);firestore=dbModule.getFirestore(app);
    el('cloudLoginBtn').addEventListener('click',async()=>{
      try {
        el('cloudLoginBtn').disabled=true;
        await authModule.signInWithPopup(auth,new authModule.GoogleAuthProvider());
      }catch(err){status('Inicio de sesión: '+friendlyError(err),'error');}
      finally{el('cloudLoginBtn').disabled=false;}
    });
    el('cloudLogoutBtn').addEventListener('click',async()=>{
      try {if(dirty && ready)await flush();await authModule.signOut(auth);}catch(err){status('Error al salir: '+friendlyError(err),'error');}
    });
    authModule.onAuthStateChanged(auth,user=>{
      if(!user){
        if(unlisten){unlisten();unlisten=null;}
        account=null;ref=null;ready=false;dirty=false;conflictData=null;
        el('cloudConflict').hidden=true;refreshAccountUI();
        status('Modo local · Entra con Google para sincronizar');
      }else{void connectForUser(user);}
    },err=>status('Sesión de Google: '+friendlyError(err),'error'));
    status('Entra con Google para sincronizar');
  }catch(err){status('No se pudieron cargar los módulos de Firebase: '+friendlyError(err),'error');}
}
