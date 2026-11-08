/* Panel de supervisión por roles. Requiere appRoles/{uid} en Firestore. */
import {initializeApp} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {getFirestore,doc,getDoc,setDoc,collection,onSnapshot} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
const $=id=>document.getElementById(id);
const db=getFirestore(initializeApp(window.ALAK_FIREBASE_CONFIG)),auth=getAuth();
let signedUser=null,role="player",list=[],unlisten=null;
const msg=s=>$("adminStatus").textContent=s;
const safeDate=value=>{try{const d=value?.toDate?.();return d?d.toLocaleString("es-MX"):"Sin actualizaciones"}catch{return "No disponible"}};
function render(){
 const host=$("adminPlayers");host.replaceChildren();
 const search=$("playerSearch").value.trim().toLowerCase();
 const filtered=list.filter(p=>([p.fields?.name,p.accountName,p.accountEmail,p.fields?.className].join(" ").toLowerCase()).includes(search));
 $("playerCount").textContent=filtered.length+" de "+list.length+" jugadores";
 if(!filtered.length){const p=document.createElement("p");p.textContent=list.length?"No se encontraron coincidencias.":"Aún no hay jugadores registrados. Comparte el enlace a jugador.html para que creen su hoja.";host.append(p);return}
 for(const p of filtered){
  const card=document.createElement("article");card.className="player-card";
  const portrait=document.createElement("img");portrait.className="avatar";portrait.alt="Retrato de "+(p.fields?.name||"nuevo jugador");portrait.src=p.portrait||"assets/hero.svg";
  const title=document.createElement("h3");title.textContent=p.fields?.name?.trim()||"Personaje sin nombre";
  const who=document.createElement("p");who.textContent=p.accountName||p.accountEmail||"Cuenta Google";
  const details=document.createElement("p");details.textContent=[p.fields?.race,p.fields?.className,p.fields?.level?"Nivel "+p.fields.level:""].filter(Boolean).join(" · ")||"Hoja en blanco";
  const progress=document.createElement("div");progress.className="progress";
  const filledSheet=Object.entries(p.sheet||{}).filter(([key,value])=>!key.endsWith("__auto")&&String(value??"").trim()!=="").length;
  const filledBasic=Object.values(p.fields||{}).filter(x=>String(x??"").trim()).length;
  const filledAttributes=Object.values(p.stats||{}).filter(x=>String(x??"").trim()).length;
  const width=Math.min(100,Math.round(100*(filledSheet||filledBasic+filledAttributes)/70));
  const fill=document.createElement("span");fill.style.width=width+"%";progress.append(fill);
  const percent=document.createElement("small");percent.textContent=(filledSheet||filledBasic+filledAttributes)+" campos completados · "+width+"% orientativo · "+(p.spells?.length||0)+" conjuros · "+(p.traits?.length||0)+" rasgos";
  const update=document.createElement("p");update.textContent="Último cambio: "+safeDate(p.updatedAt);
  const actions=document.createElement("div");actions.className="actions";
  const view=document.createElement("a");view.className="primary";view.textContent="Ver / editar hoja";view.href="jugador.html?uid="+encodeURIComponent(p.ownerUid);
  actions.append(view);
  if(role==="owner"&&p.ownerUid!==signedUser.uid){
   const roleBtn=document.createElement("button");roleBtn.type="button";roleBtn.textContent="Administrar rol de DM";
   roleBtn.onclick=()=>void adjustRole(p,roleBtn);actions.append(roleBtn)
  }
  card.append(portrait,title,who,details,progress,percent,update,actions);host.append(card);
 }
}
async function adjustRole(p,button){
 try{
  const ref=doc(db,"appRoles",p.ownerUid),result=await getDoc(ref),current=result.exists()?result.data().role:"player";
  if(current==="owner"){alert("El propietario no puede modificarse desde aquí.");return}
  const next=current==="dm"?"player":"dm";
  if(!confirm("¿Asignar a "+(p.accountName||p.accountEmail)+" el rol «"+(next==="dm"?"Dungeon Master":"Jugador")+"»?"))return;
  button.disabled=true;
  await setDoc(ref,{role:next});
  $("adminFeedback").textContent="Rol actualizado para "+(p.accountName||"jugador")+".";
 }catch(e){$("adminFeedback").textContent="No se pudo actualizar el rol: "+(e.code||e.message)}finally{button.disabled=false}
}
async function activate(account){
 signedUser=account;msg("Verificando permisos…");$("adminLogin").hidden=true;$("adminLogout").hidden=false;
 const self=await getDoc(doc(db,"appRoles",account.uid)).catch(()=>null);
 role=self?.exists()?self.data().role:"player";
 if(!["owner","dm"].includes(role)){
  $("adminAccessDenied").hidden=false;$("adminWorkspace").hidden=true;$("adminUid").textContent=account.uid;msg("Sin permisos administrativos");return
 }
 $("adminAccessDenied").hidden=true;$("adminWorkspace").hidden=false;
 $("adminRoleTitle").textContent="Mesa de aventureros · "+(role==="owner"?"Propietario":"Dungeon Master");
 if(unlisten)unlisten();
 unlisten=onSnapshot(collection(db,"players"),snapshot=>{
  list=snapshot.docs.map(x=>x.data());render();msg("✓ Mesa sincronizada");
 },error=>{msg("No se pudieron consultar las hojas: "+(error.code||error.message));$("adminFeedback").textContent="Comprueba que publicaste las reglas multijugador de Firestore."});
}
$("adminLoginBtn").onclick=async()=>{try{$("adminLoginMessage").textContent="Iniciando sesión…";await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){$("adminLoginMessage").textContent="Error: "+(e.code||e.message)}};
$("adminLogout").onclick=()=>signOut(auth);
$("copyUid").onclick=()=>{if(signedUser)navigator.clipboard.writeText(signedUser.uid).then(()=>$("adminDeniedMessage").textContent="UID copiado").catch(()=>$("adminDeniedMessage").textContent="Selecciona y copia el UID mostrado.")};
$("playerSearch").oninput=render;
$("adminReload").onclick=render;
onAuthStateChanged(auth,account=>{
 if(unlisten){unlisten();unlisten=null}list=[];signedUser=null;
 if(account)void activate(account);
 else{$("adminLogin").hidden=false;$("adminWorkspace").hidden=true;$("adminAccessDenied").hidden=true;$("adminLogout").hidden=true;msg("Sin conectar")}
});
