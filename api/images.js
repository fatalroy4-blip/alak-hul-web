const {S3Client,PutObjectCommand,GetObjectCommand,ListObjectsV2Command,HeadObjectCommand}=require('@aws-sdk/client-s3');
const {createHash}=require('node:crypto');
const MAX=3*1024*1024, QUOTA=100*1024*1024, PROJECT='alak-hul-web';
const hash=x=>createHash('sha256').update(x).digest('hex');
let client,jwks,healthUntil=0;
function storage(){
 const {R2_ACCOUNT_ID:id,R2_BUCKET_NAME:bucket,R2_ACCESS_KEY_ID:accessKeyId,R2_SECRET_ACCESS_KEY:secretAccessKey}=process.env;
 if(!/^[a-f0-9]{32}$/.test(id||'')||!bucket||!accessKeyId||!secretAccessKey)throw Object.assign(Error('El almacenamiento de imágenes todavía no está configurado.'),{status:503});
 client ||= new S3Client({region:'auto',endpoint:`https://${id}.r2.cloudflarestorage.com`,credentials:{accessKeyId,secretAccessKey},requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'});
 return {client,bucket};
}
async function identity(token){
 if(!token)throw Object.assign(Error('Inicia sesión para acceder a las imágenes.'),{status:401});
 const {createRemoteJWKSet,jwtVerify}=await import('jose');
 jwks ||= createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
 try{const {payload}=await jwtVerify(token,jwks,{issuer:`https://securetoken.google.com/${PROJECT}`,audience:PROJECT,algorithms:['RS256']});
 if(!payload.sub||payload.sub.length>128||!payload.auth_time||payload.auth_time>Date.now()/1000)throw Error();
 return payload;
 }catch{throw Object.assign(Error('Tu sesión ha caducado. Vuelve a iniciar sesión.'),{status:401});}
}
async function permissions(token,uid){
 const read=async path=>{const r=await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${path}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(8000)});if(r.status===404||r.status===403)return null;if(!r.ok)throw Error('No se pudieron comprobar los permisos.');return (await r.json()).fields;};
 const [role,member]=await Promise.all([read('appRoles/'+encodeURIComponent(uid)),read('adventureMembers/'+encodeURIComponent(uid))]);
 const name=role?.role?.stringValue,admin=name==='owner'||name==='dm';
 return {admin,member:admin||(member?member.active?.booleanValue===true:name==='player')};
}
function imageType(bytes){
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return ['image/png','png'];
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return ['image/jpeg','jpg'];
 if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return ['image/webp','webp'];
 throw Object.assign(Error('El archivo debe ser una imagen PNG, JPG o WebP.'),{status:400});
}
async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).end();}
  if(req.method==='GET'&&req.query.health==='1'){
   const {client:s3,bucket}=storage();
   if(Date.now()>healthUntil){await s3.send(new ListObjectsV2Command({Bucket:bucket,Prefix:'connection-check/',MaxKeys:1}));healthUntil=Date.now()+60000;}
   res.setHeader('Cache-Control','public, max-age=60');return res.status(200).json({ready:true});
  }
  const bearer=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('alak_image_session='))?.slice(19);
  if(req.method==='POST'&&req.headers.origin!==`https://${req.headers.host}`)return res.status(403).json({error:'Origen no permitido.'});
  if(req.method==='POST'&&req.body?.action==='logout'){res.setHeader('Set-Cookie','alak_image_session=; HttpOnly; Secure; SameSite=Strict; Path=/api/images; Max-Age=0');return res.status(200).json({ready:false});}
  const token=bearer||(req.method==='GET'?cookie:null),user=await identity(token);let owner=hash(user.sub);
  const {client:s3,bucket}=storage();
  if(req.method==='GET'){
   const key=req.query.key;
   if(typeof key!=='string'||!/^u\/[a-f0-9]{64}\/(private|combat)\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(key))return res.status(400).json({error:'Imagen no válida.'});
   if(key.split('/')[1]!==owner){const access=await permissions(token,user.sub);if(!access.admin&&!(access.member&&key.split('/')[2]==='combat'))return res.status(403).json({error:'No tienes acceso a esta imagen.'});}
   const obj=await s3.send(new GetObjectCommand({Bucket:bucket,Key:key}));
   if(obj.ContentLength>MAX)throw Error('Imagen demasiado grande.');
   res.setHeader('Content-Type',obj.ContentType||'application/octet-stream');res.setHeader('Content-Security-Policy',"default-src 'none'");
   return res.status(200).send(Buffer.from(await obj.Body.transformToByteArray()));
  }
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const access=await permissions(token,user.sub);if(body?.ownerUid&&body.ownerUid!==user.sub){if(!access.admin||typeof body.ownerUid!=='string'||body.ownerUid.length>128)return res.status(403).json({error:'No puedes subir imágenes para esta cuenta.'});owner=hash(body.ownerUid);}if(!access.member)return res.status(403).json({error:'Tu cuenta no tiene acceso a esta mesa.'});
  const cookieValue=`alak_image_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/images; Max-Age=${Math.max(0,Math.floor(user.exp-Date.now()/1000))}`;
  if(body?.action==='session'){res.setHeader('Set-Cookie',cookieValue);return res.status(200).json({ready:true,maxBytes:MAX});}
  if(body?.action==='check'){await s3.send(new ListObjectsV2Command({Bucket:bucket,Prefix:'u/'+owner+'/',MaxKeys:1}));return res.status(200).json({ready:true});}
  if(body?.action!=='upload'||!['private','combat'].includes(body.kind)||typeof body.data!=='string'||body.data.length>4*MAX/3||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.data))return res.status(400).json({error:'Carga de imagen no válida (máximo 3 MB).'});
  const bytes=Buffer.from(body.data,'base64');if(!bytes.length||bytes.length>MAX)return res.status(413).json({error:'La imagen supera los 3 MB. No se ha comprimido.'});
  const [mime,ext]=imageType(bytes),prefix='u/'+owner+'/',key=prefix+body.kind+'/'+hash(bytes)+'.'+ext;
  let exists=false;try{await s3.send(new HeadObjectCommand({Bucket:bucket,Key:key}));exists=true;}catch(e){if(e.$metadata?.httpStatusCode!==404)throw e;}
  if(!exists){let total=0,next;do{const page=await s3.send(new ListObjectsV2Command({Bucket:bucket,Prefix:prefix,ContinuationToken:next}));total+=(page.Contents||[]).reduce((s,o)=>s+(o.Size||0),0);next=page.IsTruncated?page.NextContinuationToken:undefined;if(total+bytes.length>QUOTA)return res.status(413).json({error:'Has alcanzado los 100 MB de imágenes de tu cuenta.'});}while(next);
   await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:bytes,ContentType:mime}));
  }
  res.setHeader('Set-Cookie',cookieValue);return res.status(200).json({url:'/api/images?key='+encodeURIComponent(key),bytes:bytes.length});
 }catch(e){const status=e.status|| (e.$metadata?.httpStatusCode===404?404:502);return res.status(status).json({error:e.status?e.message:status===404?'No se encontró la imagen.':'No se pudo acceder a R2. Revisa las credenciales del contenedor e inténtalo otra vez.'});}
}
module.exports=handler;
module.exports.imageType=imageType;
