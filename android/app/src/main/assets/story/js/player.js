/**
 * player.js - preview / record pipeline (canvas + audio -> MediaRecorder).
 */
'use strict';

function setSize(){const l=$('ratio').value==='l';W=l?960:540;H=l?540:960;cv.width=W;cv.height=H}
async function run(record){
  if(running)return;
  const lines=parse($('script').value);
  if(!lines.length){$('log').textContent='Script is empty.';return}
  running=true;stopFlag=false;setSize();
  ['prev','rec'].forEach(i=>$(i).disabled=true);$('stop').classList.remove('hide');
  $('out').classList.add('hide');$('dl').classList.add('hide');cv.classList.remove('hide');
  const engine=$('engine').value;let actx=null,dest=null,rec=null,chunks=[],warned=false;
  try{
    if(engine==='hf'){
      if(!$('token').value.trim())throw new Error('Add your Hugging Face token first.');
      ls('hf_token',$('token').value.trim());
      actx=new (window.AudioContext||window.webkitAudioContext)();dest=actx.createMediaStreamDestination();
      for(let i=0;i<lines.length&&!stopFlag;i++){
        $('log').textContent='Generating voice '+(i+1)+'/'+lines.length+'…';
        if(!lines[i].text||lines[i].scene==='title')continue;
        try{lines[i].buf=await ttsBuf(actx,lines[i].text)}catch(e){if(!warned){warned=true;$('log').textContent='Voice failed ('+e.message+'). Continuing without it.';await sleep(1500)}}
      }
    }
    if(record){
      if(!cv.captureStream||!window.MediaRecorder){
        const notSupportedMsg = 'MediaRecorder / canvas.captureStream is not supported in this WebView. Please update Android System WebView or use Chrome.';
        if(window.parent&&window.parent.app&&window.parent.app.showToast){
          window.parent.app.showToast('⚠️ '+notSupportedMsg);
        }
        throw new Error(notSupportedMsg);
      }
      const stream=cv.captureStream(30);if(dest)dest.stream.getAudioTracks().forEach(tr=>stream.addTrack(tr));
      const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
      rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:4e6}:{});
      rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);rec.start(300);
    }
    let cur=null;
    const loop=()=>{if(!cur)return;const el=(performance.now()-cur.start)/1000;frame(cur.L,el,cur.dur,cur.fresh,performance.now()/1000);requestAnimationFrame(loop)};
    for(let i=0;i<lines.length&&!stopFlag;i++){
      const L=lines[i];let dur=Math.max(2.2,L.text.length*.075);
      const first=!cur;cur={L,start:performance.now(),dur,fresh:i===0||lines[i-1].block!==L.block};
      if(first)loop();
      $('log').textContent=(record?'Recording ':'Playing ')+(i+1)+'/'+lines.length;
      if(L.scene==='title'){await sleep(2600)}
      else if(L.buf){
        const src=actx.createBufferSource();src.buffer=L.buf;src.playbackRate.value=RATE[kindOf(L)];
        src.connect(actx.destination);src.connect(dest);cur.dur=L.buf.duration/src.playbackRate.value;src.start();
        await sleep(cur.dur*1000+350);try{src.stop()}catch(e){}
      }else if(engine==='device'&&!record){await speakDevice(L);await sleep(350)}
      else await sleep(dur*1000);
    }
    await sleep(600);cur=null;
    if(rec){
      await new Promise(r=>{rec.onstop=r;rec.stop()});
      const blob=new Blob(chunks,{type:rec.mimeType||'video/webm'}),url=URL.createObjectURL(blob),v=$('out');
      cv.classList.add('hide');v.classList.remove('hide');v.src=url;v.play().catch(()=>{});
      const dlLink=$('dl');
      dlLink.href=url;dlLink.classList.remove('hide');
      dlLink.onclick=()=>{
        if(window.parent&&window.parent.app&&window.parent.app.showToast){
          window.parent.app.showToast('📥 Downloading cartoon story video...');
        }
      };
      $('log').textContent=engine==='hf'?'Done.':'Done. This video has no voice. Choose "AI voice" to record it.';
    }else $('log').textContent=stopFlag?'Stopped.':'Preview finished.';
  }catch(e){$('log').textContent='Error: '+e.message}
  if(window.speechSynthesis)speechSynthesis.cancel();
  if(actx)actx.close().catch(()=>{});
  running=false;['prev','rec'].forEach(i=>$(i).disabled=false);$('stop').classList.add('hide');
}
