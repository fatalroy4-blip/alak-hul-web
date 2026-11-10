/* v48 — Control del santuario privado de Alak Hul.
   La autorización real de los datos está en reglas de Firestore;
   este control impide cargar/editar la interfaz antigua desde cuentas de jugador.
   Los archivos estáticos del sitio siguen siendo públicos en un alojamiento estático. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const gate = document.getElementById("ownerAccessGate");
const status = document.getElementById("ownerGateStatus");
const login = document.getElementById("ownerGateLogin");
const changeAccount = document.getElementById("ownerGateSwitch");
let loaded = false, verifying = 0, auth;

function message(text) { if (status) status.textContent = text; }
function lock() {
 document.documentElement.classList.add("owner-locked");
 gate?.removeAttribute("hidden");
}
function unlocked() {
 document.documentElement.classList.remove("owner-locked");
 gate?.setAttribute("hidden","");
}
function insertScript(src, isModule = false) {
 return new Promise((resolve, reject) => {
  const el = document.createElement("script");
  el.src = src;
  if (isModule) el.type = "module";
  el.onload = resolve;
  el.onerror = () => reject(Error("No se pudo cargar " + src));
  document.body.appendChild(el);
 });
}
async function startApp() {
 unlocked();
 if (loaded) return;
 loaded = true;
 try {
  // El código y los controles de la ficha antigua solo se inicializan después
  // de comprobar que la sesión autenticada es la propietaria.
  await insertScript("cleric-grimoire-2014.js?v=51");
  await insertScript("script.js?v=62");
  await insertScript("campaign-v42.js?v=42");
  await insertScript("background-upload.js?v=41");
  await insertScript("cloud-sync.js?v=48", true);
  await insertScript("encounter-bridge.js?v=60");
  await insertScript("mesa-compartida.js?v=62", true);
  await insertScript("rules-2014-catalog.js?v=50");
  await insertScript("rules-2014-subclasses.js?v=50");
  await insertScript("rules-2014-backgrounds.js?v=50");
  await insertScript("rules-2014-spells.js?v=50");
  await insertScript("rules-2014-wizard.js?v=50");
 } catch (err) {
  lock();
  message("No se pudo iniciar la hoja de Alak Hul: " + err.message);
 }
}
try {
 const config = window.ALAK_FIREBASE_CONFIG;
 if (!config?.apiKey || !config?.projectId || !config?.appId) throw Error("Firebase no está configurado");
 const app = initializeApp(config);
 auth = getAuth(app);
 const db = getFirestore(app);
 login.addEventListener("click", async () => {
  try {
   login.disabled = true;
   message("Abriendo Google…");
   await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
   message("No se pudo iniciar sesión: " + (err.code || err.message));
  } finally { login.disabled = false; }
 });
 changeAccount.addEventListener("click", async () => {
  try {
   await signOut(auth);
   message("Elige la cuenta propietaria para entrar.");
   login.hidden = false;
   changeAccount.hidden = true;
  } catch (err) { message("No se pudo cambiar de cuenta: " + (err.code || err.message)); }
 });
 onAuthStateChanged(auth, async user => {
  const attempt = ++verifying;
  if (!user) {
   lock();
   message("Inicia sesión con la cuenta propietaria de Alak Hul.");
   login.hidden = false;
   changeAccount.hidden = true;
   return;
  }
  lock();
  login.hidden = true;
  changeAccount.hidden = false;
  message("Comprobando permisos en Firebase…");
  try {
   const roleSnapshot = await getDoc(doc(db,"appRoles",user.uid));
   if (attempt !== verifying || auth.currentUser?.uid !== user.uid) return;
   if (roleSnapshot.exists() && roleSnapshot.data().role === "owner") {
    await startApp();
   } else {
    message("Esta cuenta no tiene permiso para abrir Alak Hul. Abre tu hoja individual en el portal de jugadores.");
   }
  } catch (err) {
   if (attempt !== verifying) return;
   message("No se pudieron verificar los permisos. Por seguridad, la hoja está bloqueada. " + (err.code || ""));
  }
 }, () => {
  lock();
  message("No se pudo verificar la sesión de Google. Alak Hul permanece bloqueado.");
 });
} catch (err) {
 lock();
 message("No es posible comprobar los permisos: " + err.message);
}






