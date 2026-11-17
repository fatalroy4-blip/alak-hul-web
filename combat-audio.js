(() => {
let combatAudioContext=null;
window.alakPlayCombatEffect=function(kind){
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return;
  const ctx=combatAudioContext||(combatAudioContext=new Audio());
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  const start=ctx.currentTime+0.025;
  const compressor=ctx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-18,start);
  compressor.knee.setValueAtTime(13,start);
  compressor.ratio.setValueAtTime(3,start);
  compressor.attack.setValueAtTime(.003,start);
  compressor.release.setValueAtTime(.22,start);
  compressor.connect(ctx.destination);
  function tone(type,freq,delay,duration,peak=0.19,finish=null){
   const t=start+delay,osc=ctx.createOscillator(),envelope=ctx.createGain();
   osc.type=type;osc.frequency.setValueAtTime(freq,t);
   if(finish)osc.frequency.exponentialRampToValueAtTime(Math.max(30,finish),t+duration);
   envelope.gain.setValueAtTime(.00001,t);
   envelope.gain.exponentialRampToValueAtTime(Math.max(.0001,peak),t+.018);
   envelope.gain.setTargetAtTime(.00001,t+duration*.52,Math.max(.045,duration*.15));
   osc.connect(envelope).connect(compressor);osc.start(t);osc.stop(t+duration+.085);
  }
  function whoosh(delay,length,peak){
   const t=start+delay,buf=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*length),ctx.sampleRate);
   const v=buf.getChannelData(0);for(let i=0;i<v.length;i++){const x=i/v.length;v[i]=(Math.random()*2-1)*Math.sin(Math.PI*x)*Math.pow(1-x,.55);}
   const src=ctx.createBufferSource();src.buffer=buf;
   const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1200;
   const gain=ctx.createGain();gain.gain.setValueAtTime(.00001,t);
   gain.gain.linearRampToValueAtTime(peak,t+.045);
   gain.gain.exponentialRampToValueAtTime(.0001,t+length);
   src.connect(filter).connect(gain).connect(compressor);src.start(t);src.stop(t+length+.015);
  }
  if(kind==='damage'){
   // Golpe reforzado, con caída metálica y eco: ~0.75 segundos.
   whoosh(0,.36,.22);tone('sawtooth',210,0,.61,.20,62);
   tone('triangle',125,.055,.66,.25,49);tone('square',390,.03,.22,.09,150);
  }else if(kind==='heal'){
   // Arpegio mágico de curación, ~1 segundo.
   [392,523.25,659.25,783.99].forEach((f,i)=>{
    tone('sine',f,i*.14,.53,.20,f*1.01);
    tone('triangle',f/2,i*.14,.43,.065,f/2);
   });
  }else if(kind==='death'){
   // Eco grave de muerte, ~1.1 segundos.
   whoosh(.03,.58,.13);tone('triangle',325,0,.93,.23,55);
   tone('sawtooth',180,.14,.84,.16,42);tone('sine',75,.27,.72,.20,37);
  }else if(kind==='levelup'){
   // Fanfarria luminosa ascendente, ~2 segundos.
   [392,493.88,587.33,783.99,987.77].forEach((f,i)=>{
    tone('triangle',f,i*.29,.72,.18,f*1.005);
    tone('sine',f*2,i*.29+.035,.69,.09,f*2);
   });
   tone('sine',1567.98,1.50,.85,.13,1568);
  }
 }catch(err){/* El combate sigue disponible incluso sin permiso de audio. */}
}
})();
