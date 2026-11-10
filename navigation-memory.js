(()=>{
 let key=null,state={view:'home',y:0},restoring=false,timer;
 const save=()=>{if(!key||restoring)return;try{localStorage.setItem(key,JSON.stringify(state));}catch{}};
 window.alakNavigation={
  start(uid,target){const next='alak-navigation-v1:'+uid+':'+target;if(key===next)return;key=next;let saved;try{saved=JSON.parse(localStorage.getItem(key)||'null');}catch{}state=saved||{view:'home',y:0};restoring=true;
   window.alakNavigate?.(state.view,state.extraId);window.alakRestoreCampaignView?.(state.campaign);
   const y=Number(state.y)||0;requestAnimationFrame(()=>scrollTo({top:y,behavior:'instant'}));setTimeout(()=>{scrollTo({top:y,behavior:'instant'});restoring=false;},350);
  },
  move(view,extraId){if(!key||restoring)return;state={...state,view,extraId:extraId||null,y:0};save();},
  campaign(view){if(!key||restoring)return;state.campaign=view;save();},
  get:()=>state,
  stop(){save();key=null;}
 };
 addEventListener('scroll',()=>{if(restoring)return;state.y=scrollY;clearTimeout(timer);timer=setTimeout(save,150);},{passive:true});
 addEventListener('pagehide',save);
})();
