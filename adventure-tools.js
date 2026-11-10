(()=>{
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const button=(text,fn)=>{const b=make('button',text);b.type='button';b.onclick=fn;return b;};
 const nav=document.querySelector('.topnav')||document.querySelector('.tabs');
 const dice=make('dialog',null,'adventure-dialog');dice.id='diceDialog';dice.setAttribute('aria-label','Dados digitales');
 dice.innerHTML='<h2>Dados digitales</h2><form><label>Cantidad<input name="count" type="number" min="1" max="50" value="2" required></label><label>Tipo de dado<select name="sides"></select></label><button type="submit">Lanzar dados</button></form><p role="status" data-result></p><div class="digital-dice"></div>';
 for(const sides of [3,4,6,8,10,12,20,100])dice.querySelector('select').add(new Option('d'+sides,sides));
 dice.append(button('Cerrar',()=>dice.close()));document.body.append(dice);
 const openDice=button('⚄ Dados',()=>dice.showModal());openDice.id='openDigitalDice';(nav||document.querySelector('.character-intro')||document.body).append(openDice);
 let rolling=null,frame=null,soundEnabled=true;
 try{soundEnabled=localStorage.getItem('alak-dice-sound')!=='off';}catch{}
 const mute=button('',()=>{soundEnabled=!soundEnabled;try{localStorage.setItem('alak-dice-sound',soundEnabled?'on':'off');}catch{}if(!soundEnabled)window.AlakDice3D.stopSound();updateMute();});
 function updateMute(){mute.textContent='♪ Sonido de dados: '+(soundEnabled?'activado':'desactivado');mute.setAttribute('aria-pressed',String(soundEnabled));}updateMute();dice.querySelector('form').after(mute);
 function finish(){if(!rolling)return;cancelAnimationFrame(frame);const {models,summary}=rolling;models.forEach(m=>m.draw(1));dice.querySelector('[data-result]').textContent=summary;dice.querySelector('form').querySelectorAll('input,select,button').forEach(e=>e.disabled=false);dice.removeAttribute('data-rolling');dice.querySelector('form').removeAttribute('aria-busy');rolling=null;}
 dice.addEventListener('close',()=>{finish();window.AlakDice3D.stopSound();});
 dice.querySelector('form').onsubmit=e=>{e.preventDefault();if(rolling)return;const count=Number(dice.querySelector('input').value),sides=Number(dice.querySelector('select').value);if(!Number.isInteger(count)||count<1||count>50)return;
  const values=Array.from({length:count},()=>window.AlakDice3D.random(sides)+1),host=dice.querySelector('.digital-dice');host.replaceChildren();const models=[];
  values.forEach((value,i)=>{const face=make('div',null,'digital-die');face.dataset.result=String(value);const group=make('div',null,'die-model-group');const diceModels=sides===100?[window.AlakDice3D.create(10,value,'tens'),window.AlakDice3D.create(10,value,'units')]:[window.AlakDice3D.create(sides,value)];diceModels.forEach(model=>{models.push(model);group.append(model.canvas);});face.append(group,make('small','Dado '+(i+1)+' · d'+sides),make('strong',String(value),'die-result'));host.append(face);});
  const summary=count+'d'+sides+' → '+values.join(' + ')+' = '+values.reduce((a,b)=>a+b,0)+(sides===3?' · d6 numerado del 1 al 3, dos veces':sides===100?' · Decenas + unidades; 00 y 0 = 100':'');
  rolling={models,summary};dice.setAttribute('data-rolling','true');dice.querySelector('form').setAttribute('aria-busy','true');dice.querySelector('[data-result]').textContent='Lanzando '+count+'d'+sides+'…';dice.querySelector('form').querySelectorAll('input,select,button').forEach(e=>e.disabled=true);
  if(soundEnabled)window.AlakDice3D.sound(count);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
  const start=performance.now();function animate(now){if(!rolling)return;const p=Math.min(1,(now-start)/1150);models.forEach(m=>m.draw(p));if(p>=1)finish();else frame=requestAnimationFrame(animate);}frame=requestAnimationFrame(animate);
 };
 const resource=make('section',null,'adventure-card');resource.id='sorceryTools';
 resource.innerHTML='<h3>Puntos de hechicería · Metamagia</h3><p>Desde nivel 2 de hechicero: máximo igual a tu nivel de hechicero. Recuperas los puntos tras un descanso largo. Crear o convertir un espacio requiere una acción adicional; los espacios creados desaparecen al terminar el descanso largo.</p><p data-points></p><table><caption>Conversión de puntos y espacios</caption><thead><tr><th>Nivel del espacio</th><th>Coste para crearlo</th><th>Puntos al convertirlo</th></tr></thead><tbody></tbody></table><div class="resource-controls"><label>Nivel del espacio<select data-convert-level></select></label><button type="button" data-create-slot>Crear espacio</button><button type="button" data-convert-slot>Convertir espacio a puntos</button><label>Puntos de Metamagia a gastar<input data-spend-amount type="number" min="1" max="20" value="1"></label><button type="button" data-spend>Gastar puntos</button></div><p>Metamagia 2014: cuidadoso, distante, potenciado, extendido y sutil cuestan 1; acelerado 2; intensificado 3; duplicado cuesta el nivel del conjuro (1 para trucos). Comprueba que conoces la opción y que el conjuro cumple sus requisitos.</p><p data-resource-status role="status"></p>';
 for(let n=1;n<=9;n++){const row=make('tr');for(const value of [n,n<=5?window.ALAK_ADVENTURE_RULES.cost[n]:'No se puede crear',n])row.append(make('td',String(value)));resource.querySelector('tbody').append(row);resource.querySelector('select').add(new Option('Nivel '+n,n));}
 (document.querySelector('#traitsView')||document.querySelector('#settings')).append(resource);
 async function act(action){const status=resource.querySelector('[data-resource-status]');try{await window.alakAdventureSheet.act(action);status.textContent='Guardado en tu hoja.';refresh();}catch(e){status.textContent=e.message;}}
 resource.querySelector('[data-create-slot]').onclick=()=>act({type:'create',level:Number(resource.querySelector('select').value)});
 resource.querySelector('[data-convert-slot]').onclick=()=>act({type:'convert',level:Number(resource.querySelector('select').value)});
 resource.querySelector('[data-spend]').onclick=()=>act({type:'spend',amount:Number(resource.querySelector('input').value)});
 const review=make('aside',null,'adventure-card');review.hidden=true;review.id='levelReviewNotice';review.append(make('p','Tu DM ha actualizado tu nivel. Revisa tus nuevos rasgos, elecciones, PG y mejoras de característica.'),button('Revisar subida de nivel',()=>document.querySelector('#openRulesWizard')?.click()));document.querySelector('.character-intro')?.after(review);
 function refresh(){const model=window.alakAdventureSheet?.get();if(!model)return;const p=window.ALAK_ADVENTURE_RULES.points(model);resource.querySelector('[data-points]').textContent='Disponibles: '+p.available+' · Usados: '+(p.max-p.available)+' · Máximo: '+p.max;resource.querySelectorAll('button,input,select').forEach(e=>e.disabled=!p.max);review.hidden=!model.levelReviewPending;}
 window.alakRefreshAdventureTools=refresh;refresh();
})();
