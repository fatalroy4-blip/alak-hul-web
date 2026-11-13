(()=>{
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const button=(text,fn)=>{const b=make('button',text);b.type='button';b.onclick=fn;return b;};
 const nav=document.querySelector('.topnav')||document.querySelector('.tabs');
 const dice=make('dialog',null,'adventure-dialog');dice.id='diceDialog';dice.setAttribute('aria-label','Dados digitales');
 dice.innerHTML='<h2>Dados digitales</h2><form><label>Cantidad<input name="count" type="number" min="1" max="50" value="2" required></label><label>Tipo de dado<select name="sides"></select></label><fieldset class="dice-roll-modes" hidden><legend>Tirada de d20</legend><label><input type="radio" name="rollMode" value="normal" checked>Normal</label><label class="dice-advantage"><input type="radio" name="rollMode" value="advantage">Ventaja</label><label class="dice-disadvantage"><input type="radio" name="rollMode" value="disadvantage">Desventaja</label></fieldset><button type="submit">Lanzar dados</button></form><p role="status" data-result></p><div class="digital-dice"></div>';
 for(const sides of [3,4,6,8,10,12,20,100])dice.querySelector('select').add(new Option('d'+sides,sides));
 const countInput=dice.querySelector('[name="count"]'),sidesInput=dice.querySelector('[name="sides"]'),modeField=dice.querySelector('.dice-roll-modes');let normalCount=countInput.value;
 const getMode=()=>Number(sidesInput.value)===20?dice.querySelector('[name="rollMode"]:checked').value:'normal';
 function syncMode(){const d20=Number(sidesInput.value)===20;modeField.hidden=!d20;if(!d20)dice.querySelector('[value="normal"]').checked=true;const paired=getMode()!=='normal';if(paired){if(countInput.dataset.paired!=='true')normalCount=countInput.value;countInput.value='2';}else if(countInput.dataset.paired==='true')countInput.value=normalCount;countInput.dataset.paired=String(paired);countInput.disabled=paired;}
 sidesInput.addEventListener('change',syncMode);modeField.addEventListener('change',syncMode);
 dice.append(button('Cerrar',()=>dice.close()));document.body.append(dice);
 const openDice=button('⚄ Dados',()=>dice.showModal());openDice.id='openDigitalDice';(nav||document.querySelector('.character-intro')||document.body).append(openDice);
 let rolling=null,frame=null,soundEnabled=true;
 try{soundEnabled=localStorage.getItem('alak-dice-sound')!=='off';}catch{}
 const mute=button('',()=>{soundEnabled=!soundEnabled;try{localStorage.setItem('alak-dice-sound',soundEnabled?'on':'off');}catch{}if(!soundEnabled)window.AlakDice3D.stopSound();updateMute();});
 function updateMute(){mute.textContent='♪ Sonido de dados: '+(soundEnabled?'activado':'desactivado');mute.setAttribute('aria-pressed',String(soundEnabled));}updateMute();dice.querySelector('form').after(mute);
 function finish(){if(!rolling)return;cancelAnimationFrame(frame);const {models,summary}=rolling;models.forEach(m=>m.draw(1));dice.querySelector('[data-result]').textContent=summary;dice.querySelector('form').querySelectorAll('input,select,button').forEach(e=>e.disabled=false);dice.removeAttribute('data-rolling');dice.querySelector('form').removeAttribute('aria-busy');rolling=null;syncMode();}
 dice.addEventListener('close',()=>{finish();window.AlakDice3D.stopSound();});
 dice.querySelector('form').onsubmit=e=>{e.preventDefault();if(rolling)return;const mode=getMode(),paired=mode!=='normal',count=paired?2:Number(countInput.value),sides=Number(sidesInput.value);if(!Number.isInteger(count)||count<1||count>50)return;
  const values=Array.from({length:count},()=>window.AlakDice3D.random(sides)+1),host=dice.querySelector('.digital-dice');host.replaceChildren();const models=[];const kept=paired?values.indexOf(mode==='advantage'?Math.max(...values):Math.min(...values)):-1;
  values.forEach((value,i)=>{const face=make('div',null,'digital-die');face.dataset.result=String(value);face.dataset.mode=mode;if(paired)face.dataset.kept=String(i===kept);const group=make('div',null,'die-model-group');const diceModels=sides===100?[window.AlakDice3D.create(10,value,'tens'),window.AlakDice3D.create(10,value,'units')]:[window.AlakDice3D.create(sides,value,undefined,mode)];diceModels.forEach(model=>{models.push(model);group.append(model.canvas);});face.append(group,make('small','Dado '+(i+1)+' · d'+sides),make('strong',String(value),'die-result'));if(paired)face.append(make('small',i===kept?'Se conserva':'Se descarta','die-keep-label'));host.append(face);});
  const summary=paired?(mode==='advantage'?'Ventaja':'Desventaja')+' · 2d20 → '+values.join(' y ')+' · Resultado: '+values[kept]:count+'d'+sides+' → '+values.join(' + ')+' = '+values.reduce((a,b)=>a+b,0)+(sides===3?' · d6 numerado del 1 al 3, dos veces':sides===100?' · Decenas + unidades; 00 y 0 = 100':'');
  rolling={models,summary};dice.setAttribute('data-rolling','true');dice.querySelector('form').setAttribute('aria-busy','true');dice.querySelector('[data-result]').textContent='Lanzando '+count+'d'+sides+'…';dice.querySelector('form').querySelectorAll('input,select,button').forEach(e=>e.disabled=true);
  if(soundEnabled)window.AlakDice3D.sound(count);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
  const start=performance.now();function animate(now){if(!rolling)return;const p=Math.min(1,(now-start)/1150);models.forEach(m=>m.draw(p));if(p>=1)finish();else frame=requestAnimationFrame(animate);}frame=requestAnimationFrame(animate);
 };
 const resource=make('section',null,'adventure-card');resource.id='sorceryTools';
 resource.innerHTML='<header class="meta-heading"><div><p class="meta-eyebrow">RECURSOS DEL HECHICERO</p><h2>Metamagia</h2><p>Usa tus opciones conocidas y controla tus puntos de hechicería.</p></div><button type="button" data-reset-points>Restablecer puntos</button></header><div class="meta-stats" data-points aria-live="polite"><div><span>Disponibles</span><strong data-point-available>0</strong></div><div><span>Usados</span><strong data-point-used>0</strong></div><div><span>Máximo</span><strong data-point-max>0</strong></div></div><p data-resource-status role="status"></p><h3>Tus opciones de Metamagia</h3><div class="meta-options"></div><details class="meta-conversion"><summary>Conversión de puntos y espacios</summary><p>Crear o convertir un espacio requiere una acción adicional. Los espacios creados desaparecen tras un descanso largo.</p><div class="resource-controls"><label>Nivel del espacio<select data-convert-level></select></label><button type="button" data-create-slot>Crear espacio</button><button type="button" data-convert-slot>Convertir espacio a puntos</button></div><table><caption>Costes de conversión</caption><thead><tr><th>Nivel del espacio</th><th>Coste para crearlo</th><th>Puntos al convertirlo</th></tr></thead><tbody></tbody></table></details><p class="meta-footnote">Recuperas tus puntos tras un descanso largo. Solo puedes aplicar una opción de Metamagia a un conjuro, salvo cuando la opción indique lo contrario.</p>';
 for(let n=1;n<=9;n++){const row=make('tr');for(const value of [n,n<=5?window.ALAK_ADVENTURE_RULES.cost[n]:'No se puede crear',n])row.append(make('td',String(value)));resource.querySelector('tbody').append(row);resource.querySelector('select').add(new Option('Nivel '+n,n));}
 const isPlayer=!!document.querySelector('#traitsView');
 const metaView=make('section',null,isPlayer?'screen':'panel');metaView.id=isPlayer?'metamagicView':'metamagic';metaView.hidden=true;resource.hidden=true;
 (document.querySelector(isPlayer?'#traitsView':'#settings')).after(metaView);metaView.append(resource);
 const metaTab=button('Metamagia',()=>window.alakNavigate(isPlayer?'metamagic':'metamagic'));metaTab.id='metamagicTab';metaTab.hidden=true;
 if(isPlayer)metaTab.dataset.view='metamagic';else{metaTab.className='tab';metaTab.dataset.tab='metamagic';}nav?.append(metaTab);
 let resourceBusy=false,knownSignature='';
 const hints={careful:'Las criaturas elegidas superan su salvación; esto no elimina todo el daño automáticamente.',distant:'Duplica un alcance de al menos 5 pies; toque pasa a 30 pies.',empowered:'Repite dados de daño hasta tu modificador de Carisma (mínimo uno). Puede combinarse con otra Metamagia.',extended:'Duplica una duración de al menos 1 minuto, hasta un máximo de 24 horas.',heightened:'Un objetivo tiene desventaja en su primera salvación contra el conjuro.',quickened:'Requiere un tiempo de lanzamiento de 1 acción. Se convierte en acción adicional; siguen aplicándose las restricciones de conjuros de acción adicional.',subtle:'Elimina componentes verbales y somáticos; conserva los materiales.',twinned:'Solo para conjuros capaces de afectar a una única criatura al nivel de lanzamiento y sin alcance personal. Añade un segundo objetivo válido.'};
 function renderMetamagic(model){
  const rules=window.ALAK_ADVENTURE_RULES,known=rules.knownMetamagic(model),signature=known.join('|'),host=resource.querySelector('.meta-options');
  if(signature!==knownSignature||!host.childNodes.length){
   knownSignature=signature;host.replaceChildren();
   for(const option of rules.metamagic.filter(o=>known.includes(o.id))){
    const card=make('article',null,'meta-option');card.dataset.metaCard=option.id;
    card.append(make('h4',option.name),make('p',hints[option.id]));
    if(option.id==='twinned'){const label=make('label','Nivel al que lanzas el conjuro');const select=make('select');select.dataset.metaLevel='';for(let n=0;n<=9;n++)select.add(new Option(n?'Nivel '+n:'Truco',n));select.onchange=()=>updateCosts();label.append(select);card.append(label);}
    const cost=make('p',null,'meta-cost');cost.dataset.metaCost='';card.append(cost);
    const use=button('Usar '+option.name,()=>act({type:'metamagic',option:option.id,level:Number(card.querySelector('select')?.value||0)}));use.dataset.useMeta=option.id;card.append(use);host.append(card);
   }
   if(!known.length)host.append(make('p','Aún no has registrado opciones conocidas. Selecciónalas en Forja tu personaje para ver aquí sus botones.','meta-empty'));
  }
  updateCosts();
 }
 function updateCosts(){const model=window.alakAdventureSheet?.get();if(!model)return;const rules=window.ALAK_ADVENTURE_RULES,p=rules.points(model);
  for(const card of resource.querySelectorAll('[data-meta-card]')){const option=rules.metamagic.find(o=>o.id===card.dataset.metaCard),cost=option.cost??Math.max(1,Number(card.querySelector('select')?.value||0)),insufficient=cost>p.available;card.querySelector('[data-meta-cost]').textContent='Coste: '+cost+' punto'+(cost===1?'':'s')+(insufficient?' · Puntos insuficientes':'');card.querySelector('button').disabled=resourceBusy||insufficient;}
 }
 resource.querySelector('[data-reset-points]').onclick=()=>{if(confirm('¿Restablecer los puntos de hechicería al máximo? Los espacios y demás recursos no cambian.'))act({type:'resetPoints'});};
 const paper=make('section',null,'adventure-card');paper.id='sheetPaperSettings';
 paper.innerHTML='<h3>Fondo de la hoja de personaje</h3><p>Cambia únicamente el papel de tu ficha.</p><div class="paper-choices"></div><p role="status"></p>';
 for(const [style,label] of [['parchment','Pergamino antiguo'],['worn','Hoja desgastada · borrones de goma'],['notebook','Hoja de cuaderno gastada'],['textured','Hoja texturizada'],['current','Hoja actual']]){const b=button(label,async()=>{try{await window.alakAdventureSheet.act({type:'paper',style});paper.querySelector('[role="status"]').textContent='Fondo guardado en tu hoja.';refresh();}catch(e){paper.querySelector('[role="status"]').textContent=e.message;}});b.dataset.paperChoice=style;b.className='paper-swatch paper-'+style;const caption=make('span',label);b.replaceChildren(caption);paper.querySelector('.paper-choices').append(b);}
 document.querySelector(isPlayer?'#designView':'#settings').append(paper);
 async function act(action){if(resourceBusy)return;resourceBusy=true;const status=resource.querySelector('[data-resource-status]');status.textContent='Guardando…';refresh();try{await window.alakAdventureSheet.act(action);const option=window.ALAK_ADVENTURE_RULES.metamagic.find(o=>o.id===action.option);status.textContent=option?option.name+': '+(option.cost??Math.max(1,action.level))+' punto(s) descontados.':action.type==='resetPoints'?'Puntos restablecidos.':'Guardado en tu hoja.';}catch(e){status.textContent=e.message;}finally{resourceBusy=false;refresh();}}
 resource.querySelector('[data-create-slot]').onclick=()=>act({type:'create',level:Number(resource.querySelector('[data-convert-level]').value)});
 resource.querySelector('[data-convert-slot]').onclick=()=>act({type:'convert',level:Number(resource.querySelector('[data-convert-level]').value)});

 const review=make('aside',null,'adventure-card');review.hidden=true;review.id='levelReviewNotice';review.append(make('p','Tu DM ha actualizado tu nivel. Revisa tus nuevos rasgos, elecciones, PG y mejoras de característica.'),button('Revisar subida de nivel',()=>document.querySelector('#openRulesWizard')?.click()));document.querySelector('.character-intro')?.after(review);
 function refresh(){const model=window.alakAdventureSheet?.get();if(!model)return;const rules=window.ALAK_ADVENTURE_RULES,p=rules.points(model),eligible=rules.hasMetamagic(model);
 metaTab.hidden=!eligible;metaView.hidden=!eligible;resource.hidden=!eligible;
 if(!eligible&&metaView.classList.contains('active'))window.alakNavigate(isPlayer?'sheet':'character');
 const style=model.sheet?.paperStyle||'current';document.querySelectorAll('.dnd-sheet').forEach(e=>e.dataset.paperStyle=style);paper.querySelectorAll('[data-paper-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.paperChoice===style)));
 resource.querySelector('[data-point-available]').textContent=p.available;resource.querySelector('[data-point-used]').textContent=p.max-p.available;resource.querySelector('[data-point-max]').textContent=p.max;
 resource.querySelectorAll('button,input,select').forEach(e=>e.disabled=resourceBusy||!p.max);renderMetamagic(model);review.hidden=!model.levelReviewPending;}
 window.alakRefreshAdventureTools=refresh;refresh();
})();



