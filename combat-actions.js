/* Guía breve aprobada por la mesa. */
const dialog=document.createElement('dialog');
dialog.id='combatActionsDialog';dialog.className='combat-actions-dialog';
dialog.setAttribute('aria-labelledby','combatActionsTitle');
dialog.innerHTML=`
<h2 id="combatActionsTitle">Acciones</h2>
<button type="button" autofocus>Cerrar</button>
<section><h3>Movimiento</h3><p>Muévete hasta tu velocidad, antes o después de actuar, o repartiendo el movimiento.</p></section>
<section><h3>Acción — elige una</h3><ul>
<li><strong>Atacar:</strong> con un arma o sin armas.</li>
<li><strong>Lanzar un conjuro:</strong> según su tiempo de lanzamiento.</li>
<li><strong>Correr:</strong> gana movimiento extra.</li>
<li><strong>Desengancharse:</strong> muévete sin provocar ataques de oportunidad este turno.</li>
<li><strong>Esquivar:</strong> dificulta que te golpeen.</li>
<li><strong>Ayudar:</strong> apoya a un compañero.</li>
<li><strong>Esconderse:</strong> intenta ocultarte.</li>
<li><strong>Buscar:</strong> intenta detectar algo.</li>
<li><strong>Usar un objeto:</strong> realiza un uso que requiera acción.</li>
<li><strong>Preparar:</strong> espera una situación concreta para actuar usando tu reacción.</li>
</ul></section>
<section><h3>Acción adicional</h3><p>Usa una habilidad o conjuro que la permita. Máximo una por turno.</p></section>
<section><h3>Reacción</h3><p>Responde a una situación, como un ataque de oportunidad. La recuperas al inicio de tu turno.</p></section>
<section><h3>Misceláneas</h3><ul>
<li>Hablar brevemente o hacer señas.</li>
<li>Abrir o cerrar una puerta.</li>
<li>Sacar o guardar un arma.</li>
<li>Recoger un objeto cercano.</li>
<li><strong>Beber una poción de curación</strong></li>
</ul></section>`;
let opener,outsidePress=false;
const outside=event=>{const r=dialog.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
dialog.addEventListener('pointerdown',event=>{outsidePress=event.target===dialog&&outside(event)});
dialog.addEventListener('pointercancel',()=>{outsidePress=false});
dialog.addEventListener('click',event=>{if(outsidePress&&event.target===dialog&&outside(event))dialog.close();outsidePress=false});
dialog.querySelector('button').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{outsidePress=false;if(opener?.isConnected)opener.focus();else document.querySelector('.mc-actions-help')?.focus()});
document.body.append(dialog);
window.alakCombatActions={open(button){opener=button;if(!dialog.open){dialog.showModal();dialog.scrollTop=0;}}};
