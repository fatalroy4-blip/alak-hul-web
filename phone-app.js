/* Keep the existing navigation and actions, folded into one reachable menu. */
(()=>{
 if(!window.alakPhoneApp?.())return;
 const navigation=document.querySelector('body>.tabs')||document.querySelector('body>.topbar');if(!navigation)return;
 const menu=document.createElement('details');menu.className='phone-app-menu';
 const summary=document.createElement('summary');summary.innerHTML='<span>☰ Menú</span><span>☀ Alak Hul</span>';
 navigation.before(menu);menu.append(summary,navigation);
 navigation.addEventListener('click',event=>{if(event.target.closest('[data-tab],[data-view]')){menu.open=false;window.scrollTo(0,0);}});
})();
