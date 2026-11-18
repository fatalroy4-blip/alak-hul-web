/* Original image bytes live in private R2; sheets retain only small references. */
(()=>{
 let account=null,session=null,lastToken='',generation=0;
 const valid=value=>typeof value==='string'&&/^\/api\/images\?key=u%2F[a-f0-9]{64}%2F(?:private|combat)%2F[a-f0-9]{64}\.(?:png|jpg|webp)$/.test(value);
 async function request(body){
  if(!account)throw Error('Inicia sesión para subir imágenes.');
  const token=await account.getIdToken();
  const response=await fetch('/api/images',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>({error:'No se pudo conectar con el almacenamiento de imágenes.'}));
  if(!response.ok)throw Error(data.error||'No se pudo guardar la imagen.');return data;
 }
 async function bind(user){
  if(!user){account=null;session=null;lastToken='';generation++;await fetch('/api/images',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})}).catch(()=>{});return;}
  if(account?.uid!==user.uid){generation++;session=null;lastToken='';}account=user;
  const token=await user.getIdToken();if(token===lastToken&&session)return session;
  lastToken=token;const current=generation;
  session=request({action:'session'}).catch(e=>{if(generation===current){session=null;lastToken='';}console.warn('Almacenamiento de imágenes:',e.message);return false;});return session;
 }
 async function upload(file,kind='private',ownerUid){
  if(!file||!/^image\/(png|jpeg|webp)$/.test(file.type))throw Error('Selecciona una imagen PNG, JPG o WebP.');
  if(file.size>3*1024*1024)throw Error('La imagen supera los 3 MB. Elige un archivo más ligero; conservamos su calidad original.');
  if(!file.size)throw Error('El archivo está vacío.');
  const current=generation,uid=account?.uid;
  if(!await bind(account))throw Error('No se pudo conectar R2. Comprueba tu sesión e inténtalo de nuevo.');
  const data=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result.split(',')[1]);r.onerror=()=>no(Error('No se pudo leer la imagen.'));r.readAsDataURL(file);});
  if(current!==generation||uid!==account?.uid)throw Error('La sesión cambió. Vuelve a subir la imagen.');
  const result=await request({action:'upload',kind,data,...(ownerUid?{ownerUid}:{})});
  if(current!==generation)throw Error('La sesión cambió.');return result.url;
 }
 window.alakImages={bind,upload,valid,check:()=>request({action:'check'})};
 setInterval(()=>{if(account)void bind(account).catch(()=>{});},30*60*1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&account)void bind(account).catch(()=>{});});
})();
