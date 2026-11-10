/* Shared AC editor, PHB 2014. Equipment is explicit; owning armor is not wearing it. */
(function(){
 const root=document.getElementById('character');if(!root)return;
 const field=k=>root.querySelector('[data-char="'+k+'"]');
 const armors={none:['Sin armadura',10,'none'],padded:['Acolchada',11,'light'],leather:['Cuero',11,'light'],studded:['Cuero tachonado',12,'light'],hide:['Pieles',12,'medium'],chainshirt:['Camisote de malla',13,'medium'],scale:['Cota de escamas',14,'medium'],breastplate:['Coraza',14,'medium'],halfplate:['Semiplacas',15,'medium'],ring:['Cota de anillas',14,'heavy'],chain:['Cota de malla',16,'heavy'],splint:['Bandas',17,'heavy'],plate:['Placas',18,'heavy']};
 const details=document.createElement('details');details.className='armor-settings';
 details.innerHTML='<summary>Clase de armadura · automática / manual</summary><p>Selecciona lo que llevas equipado. Puedes escribir directamente en la casilla de CA para pasar a modo manual; el cálculo automático no reemplazará ese valor.</p><div class="armor-options"><label>Modo<select data-char="acMode"><option value="auto">Automático</option><option value="manual">Manual</option></select></label><label>Armadura equipada<select data-char="acArmor"></select></label><label>Sin armadura<select data-char="acFormula"><option value="class">Según mi clase y rasgos</option><option value="normal">Normal: 10 + Destreza</option><option value="barbarian">Bárbaro: 10 + Destreza + Constitución</option><option value="monk">Monje: 10 + Destreza + Sabiduría (sin escudo)</option><option value="draconic">Resistencia dracónica: 13 + Destreza</option><option value="mage">Armadura de mago activa: 13 + Destreza</option></select></label><label><input type="checkbox" data-char="acShield"> Escudo equipado (+2)</label><label><input type="checkbox" data-char="acDefense"> Estilo Defensa (+1 con armadura)</label><label><input type="checkbox" data-char="acMediumMaster"> Maestro en armaduras intermedias (límite de Destreza +3)</label><label>Otras bonificaciones<input type="number" step="1" data-char="acExtra" placeholder="0"></label></div><p data-ac-status role="status"></p>';
 for(const [id,[name]] of Object.entries(armors))details.querySelector('[data-char="acArmor"]').add(new Option(name,id));
 root.prepend(details);
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function refresh(traits=[]){
  const ac=field('ac');if(!ac)return {};
  const mode=field('acMode');if(!mode.value)mode.value=String(ac.value).trim()?'manual':'auto';
  if(!field('acArmor').value)field('acArmor').value='none';
  if(!field('acFormula').value)field('acFormula').value='class';
  const status=details.querySelector('[data-ac-status]');
  if(mode.value==='manual'){status.textContent='Modo manual: se conserva la CA que escribas en tu hoja.';return {acMode:'manual'};}
  const armor=armors[field('acArmor').value]||armors.none,shield=field('acShield').checked;
  const mod=i=>{const value=field('ability_'+i)?.value;return String(value??'').trim()===''?null:Math.floor((Number(value)-10)/2);};
  const dex=mod(1),con=mod(2),wis=mod(4);
  const corpus=norm(traits.map(t=>t.title).join('\n')+'\n'+(field('features')?.value||'')),klass=norm(field('classLevel')?.value);
  let formula=field('acFormula').value,base=armor[1],extra=0,explanation=armor[0],missing=false;
  if(armor[2]!=='heavy'&&dex===null)missing=true;
  if(armor[2]==='light')extra=dex||0;
  if(armor[2]==='medium')extra=Math.min(dex||0,field('acMediumMaster').checked?3:2);
  if(armor[2]==='none'){
   if(formula==='class'){
    const options=[{value:10+(dex||0),id:'normal'}];
    if(/barbaro/.test(klass)&&con!==null)options.push({value:10+(dex||0)+con,id:'barbarian'});
    if(/monje/.test(klass)&&!shield&&wis!==null)options.push({value:10+(dex||0)+wis,id:'monk'});
    if(/resistencia draconica|resiliencia draconica|draconic resilience/.test(corpus))options.push({value:13+(dex||0),id:'draconic'});
    formula=options.sort((a,b)=>b.value-a.value)[0].id;
    if((/barbaro/.test(klass)&&con===null)||(/monje/.test(klass)&&!shield&&wis===null))missing=true;
   }
   extra=dex||0;
   if(formula==='barbarian'){extra+=con||0;missing||=con===null;explanation='10 + Destreza + Constitución';}
   else if(formula==='monk'&&!shield){extra+=wis||0;missing||=wis===null;explanation='10 + Destreza + Sabiduría';}
   else if(formula==='draconic'||formula==='mage'){base=13;explanation='13 + Destreza';}
   else explanation=shield&&formula==='monk'?'10 + Destreza (el escudo impide la Defensa sin armadura del monje)':'10 + Destreza';
  }else explanation+=' + '+extra+' de Destreza';
  const defense=armor[2]!=='none'&&(field('acDefense').checked||/estilo(?::| de combate:)? defensa/.test(corpus))?1:0;
  const value=missing?'':String(base+extra+(shield?2:0)+defense+(Number(field('acExtra').value)||0));
  ac.value=value;
  status.textContent=missing?'Completa las características necesarias para calcular tu CA.':explanation+(shield?' + 2 escudo':'')+(defense?' + 1 Defensa':'')+' + '+(Number(field('acExtra').value)||0)+' otras bonificaciones = CA '+value;
  return {ac:value,acMode:'auto',acArmor:field('acArmor').value,acFormula:field('acFormula').value};
 }
 // Existing sheets keep their current AC until the player explicitly selects automatic mode.
 field('acMode').value=String(field('ac')?.value||'').trim()?'manual':'auto';
 root.addEventListener('input',e=>{if(e.target===field('ac'))field('acMode').value='manual';},true);
 window.alakArmor={refresh};
})();
