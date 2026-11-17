const historySize = 50;
const allowedSides = [3,4,6,8,10,12,20,100];

function validRoll(row) {
  return row && allowedSides.includes(row.sides) && Array.isArray(row.values) &&
    row.values.length > 0 && row.values.length <= 50 &&
    row.values.every(n => Number.isInteger(n) && n >= 1 && n <= row.sides) &&
    (row.mode === 'normal' || (row.sides === 20 && row.values.length === 2 &&
      ['advantage','disadvantage'].includes(row.mode)));
}

export function appendRoll(history, id, detail, name, timestamp) {
  if (!validRoll(detail)) throw Error('Tirada inválida');
  const entries = Object.entries(history || {}).filter(([key]) => key !== id);
  entries.sort((a,b) => milliseconds(b[1]?.at) - milliseconds(a[1]?.at));
  return {...Object.fromEntries(entries.slice(0,historySize-1)),
    [id]:{sides:detail.sides, values:detail.values, mode:detail.mode, name, at:timestamp}};
}
function milliseconds(value) { return value?.toMillis?.() || Number(value) || 0; }

function describe(row) {
  const line = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = row.name + ' · ' + row.values.length + 'd' + row.sides;
  line.append(title);
  const numbers = document.createElement('div');
  const paired = row.mode !== 'normal';
  const result = paired ? (row.mode === 'advantage' ? Math.max : Math.min)(...row.values)
    : row.values.reduce((sum,n) => sum+n,0);
  if (paired) numbers.append(row.mode === 'advantage' ? 'Ventaja · ' : 'Desventaja · ');
  row.values.forEach((n,i) => {
    if(i) numbers.append(paired ? ' / ' : ' + ');
    if(paired && i === row.values.indexOf(result)){
      const kept = document.createElement('strong'); kept.textContent = n; numbers.append(kept);
    }else numbers.append(String(n));
  });
  numbers.append(' → '+result); line.append(numbers);
  return line;
}

export function rollViewer(uid) {
  const key = 'alak-roll-alerts-'+uid;
  let enabled = true;
  try { enabled = localStorage.getItem(key) !== 'off'; } catch {}
  let seen = null, timer, rows = [];
  const dock = document.createElement('aside'); dock.className = 'roll-dock';
  const toast = document.createElement('div'); toast.className = 'roll-toast'; toast.hidden = true;
  toast.setAttribute('role','status');
  const panel = document.createElement('section'); panel.className='roll-history'; panel.hidden=true;
  panel.id='rollHistoryPanel';
  const heading=document.createElement('strong'); heading.textContent='Historial de tiradas';
  const list=document.createElement('div'); panel.append(heading,list);
  const button=document.createElement('button'); button.type='button'; button.className='roll-d20';
  button.title='Historial de tiradas'; button.setAttribute('aria-label',button.title);
  button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','false');
  button.innerHTML='<svg viewBox="0 0 40 40" aria-hidden="true"><path fill="#38254d" stroke="#e8bf76" d="M20 2 37 11v18L20 38 3 29V11Z"/><path fill="none" stroke="#ba945d" d="m3 11 17-5 17 5-5 17H8Zm5 17 12 10 12-10M8 28 20 6l12 22Z"/><text x="20" y="25" text-anchor="middle" fill="#fff2cd" font-size="12" font-weight="bold">20</text></svg>';
  function open(show){panel.hidden=!show; button.setAttribute('aria-expanded',String(show));toast.hidden=true;}
  button.onclick=()=>open(panel.hidden);
  function outside(e){if(!panel.hidden&&!dock.contains(e.target))open(false);}
  function escape(e){if(e.key==='Escape'&&!panel.hidden){open(false);button.focus();}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  dock.append(toast,panel,button); document.body.append(dock);
  function update(profiles){
    rows=profiles.flatMap(p=>Object.entries(p.diceHistory||{}).filter(([,r])=>validRoll(r)&&milliseconds(r.at)>0)
      .map(([id,r])=>({...r,id:p.ownerUid+'/'+id,name:String(r.name||p.accountName||'Jugador'),time:milliseconds(r.at)})))
      .sort((a,b)=>b.time-a.time||a.id.localeCompare(b.id));
    const fresh=seen && rows.filter(r=>!seen.has(r.id));seen=new Set(rows.map(r=>r.id));
    list.replaceChildren();
    for(const row of rows){
      const article=describe(row),stamp=document.createElement('small');
      stamp.textContent=new Date(row.time).toLocaleString('es-MX');article.prepend(stamp);list.append(article);
    }
    if(!rows.length) list.textContent='Aún no hay tiradas.';
    if(enabled && panel.hidden && fresh?.length){
      toast.replaceChildren(...fresh.slice(0,3).map(describe));toast.hidden=false;
      clearTimeout(timer);timer=setTimeout(()=>toast.hidden=true,5500);
    }
  }
  return {update, mount(host){
    const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=enabled;
    input.onchange=()=>{enabled=input.checked;try{localStorage.setItem(key,enabled?'on':'off');}catch{}if(!enabled)toast.hidden=true;};
    label.append(input,' Ver tiradas en tiempo real');host.append(label);
  },destroy(){clearTimeout(timer);dock.remove();document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);}};
}
