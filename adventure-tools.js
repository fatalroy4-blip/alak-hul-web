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
 resource.innerHTML='<h3>Puntos de hechicería · Metamagia</h3><p>Desde nivel 2 de hechicero: máximo igual a tu nivel de hechicero. Recuperas los puntos tras un descanso largo. Crear o convertir un espacio requiere una acción adicional; los espacios creados desaparecen al terminar el descanso largo.</p><p data-points></p><table><caption>Conversión de puntos y espacios</caption><thead><tr><th>Nivel del espacio</th><th>Coste para crearlo</th><th>Puntos al convertirlo</th></tr></thead><tbody></tbody></table><div class="resource-controls"><label>Nivel del espacio<select data-convert-level></select></label><button type="button" data-create-slot>Crear espacio</button><button type="button" data-convert-slot>Convertir espacio a puntos</button></div><p>Metamagia 2014: cuidadoso, distante, potenciado, extendido y sutil cuestan 1; acelerado 2; intensificado 3; duplicado cuesta el nivel del conjuro (1 para trucos). Comprueba que conoces la opción y que el conjuro cumple sus requisitos.</p><p data-resource-status role="status"></p>';
 for(let n=1;n<=9;n++){const row=make('tr');for(const value of [n,n<=5?window.ALAK_ADVENTURE_RULES.cost[n]:'No se puede crear',n])row.append(make('td',String(value)));resource.querySelector('tbody').append(row);resource.querySelector('select').add(new Option('Nivel '+n,n));}
 const isPlayer=!!document.querySelector('#traitsView');
 const metaView=make('section',null,isPlayer?'screen':'panel');metaView.id=isPlayer?'metamagicView':'metamagic';metaView.hidden=true;resource.hidden=true;
 (document.querySelector(isPlayer?'#traitsView':'#settings')).after(metaView);metaView.append(resource);
 const metaTab=button('Metamagia',()=>window.alakNavigate(isPlayer?'metamagic':'metamagic'));metaTab.id='metamagicTab';metaTab.hidden=true;
 if(isPlayer)metaTab.dataset.view='metamagic';else{metaTab.className='tab';metaTab.dataset.tab='metamagic';}nav?.append(metaTab);
 const metaControls=make('div',null,'resource-controls');
 metaControls.innerHTML='<label>Metamagia conocida<select data-meta-option></select></label><label>Nivel de lanzamiento<select data-meta-level></select></label><button type="button" data-use-meta>Usar Metamagia</button><button type="button" data-reset-points>Restablecer puntos</button><p data-meta-help></p>';
 resource.querySelector('[data-points]').after(metaControls);
 const hints={careful:'Las criaturas elegidas superan su salvación; esto no elimina todo el daño automáticamente.',distant:'Duplica un alcance de al menos 5 pies; toque pasa a 30 pies.',empowered:'Repite dados de daño hasta tu modificador de Carisma (mínimo uno). Puede combinarse con otra Metamagia.',extended:'Duplica una duración de al menos 1 minuto, hasta un máximo de 24 horas.',heightened:'Un objetivo tiene desventaja en su primera salvación contra el conjuro.',quickened:'Requiere un tiempo de lanzamiento de 1 acción. Se convierte en acción adicional; siguen aplicándose las restricciones de conjuros de acción adicional.',subtle:'Elimina componentes verbales y somáticos; conserva los materiales.',twinned:'Solo para conjuros capaces de afectar a una única criatura al nivel de lanzamiento y sin alcance personal. Añade un segundo objetivo válido.'};
 for(let n=0;n<=9;n++)metaControls.querySelector('[data-meta-level]').add(new Option(n?'Nivel '+n:'Truco',n));
 function metaHelp(){const option=window.ALAK_ADVENTURE_RULES.metamagic.find(o=>o.id===metaControls.querySelector('[data-meta-option]').value);const n=Number(metaControls.querySelector('[data-meta-level]').value);metaControls.querySelector('[data-meta-help]').textContent=option?'Coste: '+(option.cost??Math.max(1,n))+' punto(s). '+hints[option.id]:'Elige tus opciones de Metamagia en Forja tu personaje. Las opciones conocidas se leen de tus rasgos.';metaControls.querySelector('[data-use-meta]').disabled=!option;}
 metaControls.querySelectorAll('select').forEach(e=>e.onchange=metaHelp);
 metaControls.querySelector('[data-use-meta]').onclick=()=>act({type:'metamagic',option:metaControls.querySelector('[data-meta-option]').value,level:Number(metaControls.querySelector('[data-meta-level]').value)});
 metaControls.querySelector('[data-reset-points]').onclick=()=>{if(confirm('¿Restablecer los puntos de hechicería al máximo? Los espacios y demás recursos no cambian.'))act({type:'resetPoints'});};
 const paper=make('section',null,'adventure-card');paper.id='sheetPaperSettings';
 paper.innerHTML='<h3>Fondo de la hoja de personaje</h3><p>Cambia únicamente el papel de tu ficha.</p><div class="paper-choices"></div><p role="status"></p>';
 for(const [style,label] of [['parchment','Pergamino antiguo'],['worn','Hoja desgastada · borrones de goma'],['notebook','Hoja de cuaderno gastada'],['textured','Hoja texturizada'],['current','Hoja actual']]){const b=button(label,async()=>{try{await window.alakAdventureSheet.act({type:'paper',style});paper.querySelector('[role="status"]').textContent='Fondo guardado en tu hoja.';refresh();}catch(e){paper.querySelector('[role="status"]').textContent=e.message;}});b.dataset.paperChoice=style;b.className='paper-swatch paper-'+style;const caption=make('span',label);b.replaceChildren(caption);paper.querySelector('.paper-choices').append(b);}
 document.querySelector(isPlayer?'#designView':'#settings').append(paper);
 async function act(action){const status=resource.querySelector('[data-resource-status]');try{await window.alakAdventureSheet.act(action);status.textContent='Guardado en tu hoja.';refresh();}catch(e){status.textContent=e.message;}}
 resource.querySelector('[data-create-slot]').onclick=()=>act({type:'create',level:Number(resource.querySelector('[data-convert-level]').value)});
 resource.querySelector('[data-convert-slot]').onclick=()=>act({type:'convert',level:Number(resource.querySelector('[data-convert-level]').value)});

 const review=make('aside',null,'adventure-card');review.hidden=true;review.id='levelReviewNotice';review.append(make('p','Tu DM ha actualizado tu nivel. Revisa tus nuevos rasgos, elecciones, PG y mejoras de característica.'),button('Revisar subida de nivel',()=>document.querySelector('#openRulesWizard')?.click()));document.querySelector('.character-intro')?.after(review);
 function refresh(){const model=window.alakAdventureSheet?.get();if(!model)return;const rules=window.ALAK_ADVENTURE_RULES,p=rules.points(model),eligible=rules.hasMetamagic(model);
 metaTab.hidden=!eligible;metaView.hidden=!eligible;resource.hidden=!eligible;
 if(!eligible&&metaView.classList.contains('active'))window.alakNavigate(isPlayer?'sheet':'character');
 const select=metaControls.querySelector('[data-meta-option]'),previous=select.value;select.replaceChildren();
 const known=rules.knownMetamagic(model);for(const option of rules.metamagic)if(known.includes(option.id))select.add(new Option(option.name,option.id));if(known.includes(previous))select.value=previous;
 const style=model.sheet?.paperStyle||'current';document.querySelectorAll('.dnd-sheet').forEach(e=>e.dataset.paperStyle=style);paper.querySelectorAll('[data-paper-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.paperChoice===style)));
 resource.querySelector('[data-points]').textContent='Disponibles: '+p.available+' · Usados: '+(p.max-p.available)+' · Máximo: '+p.max;resource.querySelectorAll('button,input,select').forEach(e=>e.disabled=!p.max);metaHelp();review.hidden=!model.levelReviewPending;}
 window.alakRefreshAdventureTools=refresh;refresh();
})();


