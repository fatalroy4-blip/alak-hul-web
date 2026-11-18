/* Installed phones only. Reuses the real sheet fields and their listeners. */
(()=>{
 if(!window.alakPhoneApp?.())return;
 const sheet=document.querySelector('#character .sheet-scroll'),character=document.getElementById('character');
 if(!sheet||sheet.dataset.phoneMounted)return;
 sheet.dataset.phoneMounted='true';document.documentElement.classList.add('phone-sheet-app');
 const player=!!document.getElementById('sheetView'),screen=player?document.getElementById('sheetView'):character;
 const tabs=[['ficha','♟','Ficha'],['habilidades','✧','Habilidades'],['conjuros','✦','Conjuros'],['equipo','▣','Equipo']];
 const create=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
 const parts=[];
 function part(element,key,disclosure){
  if(!element)return;
  let target=element;
  if(disclosure){target=create('details','phone-sheet-details');const label=create('summary','',disclosure);element.before(target);target.append(label,element);}
  target.dataset.phonePart=key;parts.push(target);
 }
 part(sheet.querySelector('.page-one .ds-header'),'ficha','Datos del personaje');
 part(sheet.querySelector('.dnd-abilities'),'ficha');
 for(const selector of ['.dnd-pill-row','.saving','.skills','.passive-box'])part(sheet.querySelector(selector),'habilidades');
 part(sheet.querySelector('.proficiencies-box'),'equipo','Competencias e idiomas');
 for(const selector of ['.combat-top','.hp-box','.hitdeath-grid','.attacks'])part(sheet.querySelector(selector),'ficha');
 part(sheet.querySelector('.equipment-box'),'equipo');
 sheet.querySelectorAll('.personality-box').forEach(e=>part(e,'ficha',e.querySelector('h3')?.textContent));
 for(const [selector,label] of [['.features-box','Rasgos y características'],['.page-two .ds-header','Descripción física'],['.portrait-panel','Retrato del personaje'],['.allies-panel','Aliados y organizaciones'],['.backstory-panel','Historia del personaje'],['.additional-panel','Rasgos adicionales']])part(sheet.querySelector(selector),'ficha',label);
 part(sheet.querySelector('.treasure-panel'),'equipo','Tesoro');
 part(sheet.querySelector('.spell-sheet-header'),'conjuros','Datos de lanzamiento');
 part(sheet.querySelector('.spell-page-grid'),'conjuros');

 const header=create('header','phone-sheet-header');
 const menu=create('button','phone-sheet-menu','‹ Inicio');menu.type='button';menu.onclick=()=>window.alakNavigate?.(player?'home':'home');
 const brand=create('span','phone-sheet-brand','☀ Alak Hul');
 const top=create('div','phone-sheet-top');top.append(menu,brand);header.append(top);
 const identity=create('div','phone-sheet-identity'),portrait=create('button','phone-sheet-portrait'),image=create('img');portrait.type='button';image.alt='';portrait.append(image);portrait.setAttribute('aria-label','Ampliar retrato');portrait.onclick=()=>document.getElementById('characterPortrait')?.click();
 const info=create('div','phone-sheet-info'),name=create('strong'),description=create('span');info.append(name,description);
 const lock=document.querySelector('[data-sheet-lock]');identity.append(portrait,info);if(lock)identity.append(lock);header.append(identity);
 const resources=create('div','phone-sheet-resources'),hp=create('button'),ac=create('button'),save=create('span','phone-sheet-save');hp.type=ac.type='button';hp.onclick=()=>{select('ficha');sheet.querySelector('.hp-box')?.scrollIntoView({block:'center'});};ac.onclick=()=>{select('ficha');sheet.querySelector('.combat-top')?.scrollIntoView({block:'center'});};resources.append(hp,ac,save);header.append(resources);
 character.insertBefore(header,sheet);
 const heading=create('h2','phone-sheet-title','Ficha');heading.tabIndex=-1;sheet.prepend(heading);
 const nav=create('nav','phone-sheet-tabs');nav.setAttribute('aria-label','Secciones de la hoja');
 for(const [key,icon,label] of tabs){const b=create('button');b.type='button';b.dataset.phoneTab=key;b.append(create('span','phone-tab-icon',icon),create('span','',label));b.onclick=()=>select(key,true);nav.append(b);}
 character.append(nav);
 let active='ficha',visible=false;
 function select(key,focus=false){
  active=key;sheet.dataset.phoneSection=key;
  parts.forEach(e=>e.toggleAttribute('data-phone-visible',e.dataset.phonePart===key));
  nav.querySelectorAll('button').forEach(b=>{b.setAttribute('aria-current',b.dataset.phoneTab===key?'page':'false');});
  heading.textContent=tabs.find(t=>t[0]===key)[2];
  if(visible){window.scrollTo({top:0,behavior:'instant'});if(focus)heading.focus({preventScroll:true});}
 }
 const set=(e,text)=>{if(e.textContent!==text)e.textContent=text;};
 const value=key=>sheet.querySelector('[data-char="'+key+'"]')?.value||'—';
 function refresh(){
  const now=screen.classList.contains('active')&&!document.getElementById('workspace')?.hidden;
  // The owner page has no workspace container.
  const open=player?now:screen.classList.contains('active')&&!document.documentElement.classList.contains('owner-locked');
  document.body.classList.toggle('phone-sheet-active',open);nav.hidden=!open;header.hidden=!open;
  if(open!==visible){visible=open;const viewport=document.querySelector('meta[name="viewport"]');viewport.content=open?'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=yes':'width=1440, user-scalable=yes';if(open)window.scrollTo(0,0);}
  set(name,value('name')==='—'?'Mi personaje':value('name'));set(description,value('classLevel'));
  const src=document.getElementById('characterPortrait')?.getAttribute('src');if(src&&image.getAttribute('src')!==src)image.src=src;
  set(hp,'♥ PG '+value('hpCurrent')+' / '+value('hpMax'));set(ac,'◇ CA '+value('ac'));
  set(save,document.getElementById(player?'saveIndicator':'cloudStatus')?.textContent||'');
  const paper=sheet.querySelector('.page-one')?.dataset.paperStyle||'current';if(sheet.dataset.phonePaper!==paper)sheet.dataset.phonePaper=paper;
  if(lock){lock.classList.add('phone-sheet-lock');lock.title=lock.getAttribute('aria-label')||lock.title;}
 }
 select('ficha');refresh();
 // Remote updates change input.value without input events. Refresh summaries only;
 // never clone controls or write back to the saved character from this layout.
 document.addEventListener('input',refresh);document.addEventListener('change',refresh);
 new MutationObserver(refresh).observe(screen,{attributes:true,attributeFilter:['class','hidden']});
 if(player)new MutationObserver(refresh).observe(document.getElementById('workspace'),{attributes:true,attributeFilter:['hidden']});
 new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
 setInterval(()=>{if(visible)refresh();},1000);
})();
