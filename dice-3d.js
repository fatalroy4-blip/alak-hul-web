/* Lightweight canvas renderer of real polyhedra; no remote assets or WebGL required. */
(()=>{
 const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,n)=>a.map(v=>v*n),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>mul(a,1/Math.hypot(...a)),mean=a=>mul(a.reduce(add,[0,0,0]),1/a.length);
 function hull(vertices){const faces=[],seen=new Set();for(let a=0;a<vertices.length;a++)for(let b=a+1;b<vertices.length;b++)for(let c=b+1;c<vertices.length;c++){
  let normal=cross(sub(vertices[b],vertices[a]),sub(vertices[c],vertices[a]));if(Math.hypot(...normal)<1e-7)continue;normal=unit(normal);let d=dot(normal,vertices[a]);let distances=vertices.map(v=>dot(normal,v)-d);if(distances.some(v=>v>1e-6)&&distances.some(v=>v<-1e-6))continue;if(d<0){normal=mul(normal,-1);d=-d;distances=distances.map(v=>-v);}
  const ids=distances.map((v,i)=>Math.abs(v)<1e-6?i:-1).filter(i=>i>=0),key=ids.join(',');if(seen.has(key))continue;seen.add(key);const center=mean(ids.map(i=>vertices[i])),u=unit(sub(vertices[ids[0]],center)),v=cross(normal,u);ids.sort((a,b)=>Math.atan2(dot(sub(vertices[a],center),v),dot(sub(vertices[a],center),u))-Math.atan2(dot(sub(vertices[b],center),v),dot(sub(vertices[b],center),u)));faces.push({ids,normal,center,d});
 }return {vertices,faces};}
 function dual(mesh){return hull(mesh.faces.map(f=>mul(f.normal,1/f.d)));}
 const phi=(1+Math.sqrt(5))/2,ico=[];for(const a of [-1,1])for(const b of [-phi,phi])ico.push([0,a,b],[a,b,0],[b,0,a]);
 const cube=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])cube.push([x,y,z]);
 const anti=[];for(let i=0;i<10;i++)anti.push([Math.cos(i*Math.PI/5),Math.sin(i*Math.PI/5),i%2?.55:-.55]);
 const meshes={4:hull([[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]]),6:hull(cube),8:hull([[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]),10:dual(hull(anti)),12:dual(hull(ico)),20:hull(ico)};
 for(const m of Object.values(meshes)){const max=Math.max(...m.vertices.map(v=>Math.hypot(...v)));m.vertices=m.vertices.map(v=>mul(v,1/max));m.faces.forEach((f,i)=>{f.center=mean(f.ids.map(id=>m.vertices[id]));f.label=i+1;});}
 function random(n){const a=new Uint32Array(1),limit=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;}
 function turn(v,axis,angle){const c=Math.cos(angle),s=Math.sin(angle);return add(add(mul(v,c),mul(cross(axis,v),s)),mul(axis,dot(axis,v)*(1-c)));}
 function align(v,n){const axis=cross(n,[0,0,1]),length=Math.hypot(...axis);return length<1e-7?(n[2]>0?v:turn(v,[1,0,0],Math.PI)):turn(v,mul(axis,1/length),Math.acos(Math.max(-1,Math.min(1,n[2]))));}
 const palette=[{name:'amatista',h:275},{name:'rubí',h:350},{name:'zafiro',h:219},{name:'esmeralda',h:155},{name:'ámbar',h:34},{name:'turquesa',h:184},{name:'rosa',h:320},{name:'cobre',h:18}];
 function create(sides,value,kind){const canvas=document.createElement('canvas');canvas.className='die-model';canvas.width=360;canvas.height=360;canvas.setAttribute('role','img');const mesh=meshes[sides===3?6:sides],color=palette[random(palette.length)],target=kind==='tens'?Math.floor((value%100)/10):kind==='units'?value%10:value;
  const labels=mesh.faces.map((_,i)=>sides===3?i%3+1:kind?(i===9?0:i+1):i+1),face=labels.indexOf(target),normal=mesh.faces[face].normal;
  const text=n=>kind==='tens'?String(n*10).padStart(2,'0'):String(n);
  canvas.dataset.result=String(target);canvas.dataset.color=color.name;canvas.setAttribute('aria-label',(kind==='tens'?'Decenas':kind==='units'?'Unidades':'d'+sides)+': '+text(target)+' · '+color.name);
  const targetRight=unit(cross(Math.abs(normal[1])>.95?[1,0,0]:[0,1,0],normal)),alignedRight=align(targetRight,normal),correction=-Math.atan2(alignedRight[1],alignedRight[0]);
  const spin=[Math.PI*(4+random(4)),Math.PI*(4+random(4)),Math.PI*(2+random(3))],angle=(random(30)-15)*Math.PI/180;
  function draw(progress){const ctx=canvas.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,360,360);const t=1-Math.pow(1-progress,3),bounce=progress<1?Math.abs(Math.sin(progress*Math.PI*4))*(1-progress)*30:0;
   const rotate=v=>{let p=turn(align(v,normal),[0,0,1],correction);p=turn(p,[1,0,0],spin[0]*(1-t)-(sides===4?.5:sides>=20?.14:.32));p=turn(p,[0,1,0],spin[1]*(1-t)+(sides>=20?.18:.4));return turn(p,[0,0,1],spin[2]*(1-t)+angle);};
   const project=v=>{const perspective=4/(4-v[2]);return [180+v[0]*116*perspective,174-bounce-v[1]*116*perspective];};
   const shadow=ctx.createRadialGradient(180,310,4,180,310,112);shadow.addColorStop(0,'#0009');shadow.addColorStop(1,'#0000');ctx.fillStyle=shadow;ctx.save();ctx.translate(0,215);ctx.scale(1,.3);ctx.beginPath();ctx.arc(180,310,112,0,Math.PI*2);ctx.fill();ctx.restore();
   const faces=mesh.faces.map((f,i)=>({...f,i,n:rotate(f.normal),c:rotate(f.center),points:f.ids.map(id=>project(rotate(mesh.vertices[id])))})).filter(f=>dot(f.n,sub([0,0,4],f.c))>0).sort((a,b)=>a.c[2]-b.c[2]);
   for(const f of faces){const center=mean(f.points),inner=f.points.map(p=>add(center,mul(sub(p,center),.93))),light=Math.max(0,dot(f.n,unit([-.5,.8,1.4]))),lum=16+light*30;
    const path=points=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();};
    path(f.points);ctx.fillStyle=`hsl(${color.h} 45% ${lum*.7}%)`;ctx.fill();ctx.strokeStyle=`hsl(${color.h} 45% ${lum+17}%)`;ctx.lineWidth=2;ctx.stroke();
    path(inner);const gradient=ctx.createLinearGradient(center[0]-80,center[1]-100,center[0]+70,center[1]+100);gradient.addColorStop(0,`hsl(${color.h} 65% ${lum+18}%)`);gradient.addColorStop(.5,`hsl(${color.h} 65% ${lum}%)`);gradient.addColorStop(1,`hsl(${color.h} 65% ${lum-9}%)`);ctx.fillStyle=gradient;ctx.fill();
    ctx.save();path(inner);ctx.clip();const shine=ctx.createRadialGradient(center[0]-28,center[1]-40,0,center[0]-28,center[1]-40,90);shine.addColorStop(0,'rgba(255,255,255,'+(light*.2)+')');shine.addColorStop(1,'#ffffff00');ctx.fillStyle=shine;ctx.fillRect(center[0]-140,center[1]-140,280,280);ctx.restore();
    ctx.save();path(inner);ctx.clip();ctx.globalAlpha=.12;ctx.strokeStyle='#fff';ctx.lineWidth=1;for(let j=0;j<9;j++){ctx.beginPath();ctx.moveTo(center[0]-90,center[1]-75+j*16);ctx.bezierCurveTo(center[0]-15,center[1]-30+j*7,center[0]+20,center[1]+20+j*4,center[0]+90,center[1]+50+j*9);ctx.stroke();}ctx.restore();
    // Project the face's own tangent basis, so the engraved value rotates with the solid.
    const right=unit(cross(Math.abs(f.normal[1])>.95?[1,0,0]:[0,1,0],f.normal)),up=unit(cross(f.normal,right));const c=project(f.c),r=project(rotate(add(f.center,mul(right,.01)))),u=project(rotate(add(f.center,mul(up,.01))));
    ctx.save();ctx.setTransform((r[0]-c[0])/.01/116,(r[1]-c[1])/.01/116,-(u[0]-c[0])/.01/116,-(u[1]-c[1])/.01/116,c[0],c[1]);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+(sides>=12?24:sides===4?34:30)+'px Georgia';ctx.lineWidth=2;ctx.strokeStyle='#170d1ab0';ctx.strokeText(text(labels[f.i]),0,0);ctx.fillStyle='#ffedbc';ctx.shadowColor='#0009';ctx.shadowBlur=2;ctx.shadowOffsetY=2;ctx.fillText(text(labels[f.i]),0,0);if(labels[f.i]===6||labels[f.i]===9){ctx.fillRect(-5,18,10,1.5);}ctx.restore();
   }
   if(progress===1)canvas.dataset.frontValue=text(labels[faces.reduce((best,f)=>f.n[2]>best.n[2]?f:best,faces[0]).i]);
  }
  return {canvas,draw};
 }
 let audio=null,nodes=[];
 function stopSound(){nodes.forEach(n=>{try{n.stop();}catch{}});nodes=[];}
 function sound(count){stopSound();try{audio??=new(window.AudioContext||window.webkitAudioContext)();void audio.resume();const now=audio.currentTime;for(let i=0;i<Math.min(20,6+count);i++){const time=now+i*.055+random(20)/1000,source=audio.createBufferSource(),buffer=audio.createBuffer(1,Math.floor(audio.sampleRate*.065),audio.sampleRate),data=buffer.getChannelData(0);for(let k=0;k<data.length;k++)data[k]=(Math.random()*2-1)*Math.exp(-k/(audio.sampleRate*.012));source.buffer=buffer;const filter=audio.createBiquadFilter();filter.type='bandpass';filter.frequency.value=900+random(2600);filter.Q.value=.7;const gain=audio.createGain();gain.gain.value=.32*(1-i/30);source.connect(filter);filter.connect(gain);gain.connect(audio.destination);source.start(time);nodes.push(source);}}catch{}}
 window.AlakDice3D={create,random,sound,stopSound,faceCounts:Object.fromEntries(Object.entries(meshes).map(([n,m])=>[n,m.faces.length]))};
})();
