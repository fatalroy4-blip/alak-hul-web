(()=>{
 const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
 const button=(text,fn)=>{const b=make('button',text);b.type='button';b.onclick=fn;return b;};
 const nav=document.querySelector('.topnav')||document.querySelector('.tabs');
 const dice=make('dialog',null,'adventure-dialog');dice.id='diceDialog';dice.setAttribute('aria-label','Dados digitales');
 dice.innerHTML='<h2>Dados digitales</h2><form><label>Cantidad<input name="count" type="number" min="1" max="50" value="2" required></label><label>Tipo de dado<select name="sides"></select></label><button type="submit">Lanzar dados</button></form><p role="status" data-result></p><div class="digital-dice"></div>';
 for(const sides of [3,4,6,8,10,12,20,100])dice.querySelector('select').add(new Option('d'+sides,sides));
 dice.append(button('Cerrar',()=>dice.close()));document.body.append(dice);
 const openDice=button('⚄ Dados',()=>dice.showModal());openDice.id='openDigitalDice';(nav||document.querySelector('.character-intro')||document.body).append(openDice);
 function roll(sides){const a=new Uint32Array(1),limit=Math.floor(4294967296/sides)*sides;do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%sides+1;}
 dice.querySelector('form').onsubmit=e=>{e.preventDefault();const count=Number(dice.querySelector('input').value),sides=Number(dice.querySelector('select').value);if(!Number.isInteger(count)||count<1||count>50)return;
  const values=Array.from({length:count},()=>roll(sides)),host=dice.querySelector('.digital-dice');host.replaceChildren();
  for(const value of values){const face=make('div',null,'digital-die');const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('role','img');svg.setAttribute('aria-label','d'+sides+': '+value);
   const points=sides===4?'50,4 96,88 4,88':sides===6?'12,12 88,12 88,88 12,88':sides===8||sides===10?'50,3 95,50 50,97 5,50':sides===3?'50,6 93,30 93,76 50,96 7,76 7,30':'50,3 91,26 91,74 50,97 9,74 9,26';
   const shape=document.createElementNS(svg.namespaceURI,'polygon');shape.setAttribute('points',points);const label=document.createElementNS(svg.namespaceURI,'text');label.setAttribute('x','50');label.setAttribute('y','60');label.setAttribute('text-anchor','middle');label.textContent=value;svg.append(shape,label);face.append(svg,make('small','d'+sides));host.append(face);
  }dice.querySelector('[data-result]').textContent=count+'d'+sides+' → '+values.join(' + ')+' = '+values.reduce((a,b)=>a+b,0)+(sides===3?' · Representación digital del d3':'');
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
