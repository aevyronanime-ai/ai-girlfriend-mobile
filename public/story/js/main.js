if (!ls('hf_token') && typeof window !== 'undefined' && window.parent && window.parent.localStorage) {
  try {
    const parentToken = window.parent.localStorage.getItem('hf_token') || window.parent.localStorage.getItem('jarvis_setting_hf_token');
    if (parentToken) ls('hf_token', parentToken);
  } catch (e) {}
}
$('token').value=ls('hf_token')||'';
$('engine').onchange=()=>$('hfOpts').classList.toggle('hide',$('engine').value!=='hf');
$('prev').onclick=()=>run(false);
$('rec').onclick=()=>run(true);
$('stop').onclick=()=>{stopFlag=true;if(window.speechSynthesis)speechSynthesis.cancel()};
$('ratio').onchange=()=>{if(!running)setSize()};
setSize();

/* Idle preview: show the first non-title line while nothing is playing. */
(function idle(){
  if(!running){
    const lines=parse($('script').value),L=lines.find(l=>l.scene!=='title');
    if(L)frame(L,0,1,false,performance.now()/1000);
  }
  setTimeout(()=>requestAnimationFrame(idle),120);
})();
