/**
 * voice.js - device TTS, Hugging Face TTS and timing helpers.
 */
'use strict';

const RATE={boy:1.2,girl:1.22,man:.92,woman:1.08,elder:.85,Narrator:1};
const PITCH={boy:1.6,girl:1.8,man:.8,woman:1.3,elder:.6,Narrator:1};
function kindOf(L){const c=L.cast.find(c=>c.name===L.who);return c?c.kind:'Narrator'}
function speakDevice(L){
  return new Promise(res=>{
    if(!window.speechSynthesis)return res();
    const u=new SpeechSynthesisUtterance(L.text);u.lang='hi-IN';
    const v=speechSynthesis.getVoices().find(v=>/hi/i.test(v.lang));if(v)u.voice=v;
    u.pitch=PITCH[kindOf(L)];u.rate=.95;
    const to=setTimeout(res,25000);u.onend=u.onerror=()=>{clearTimeout(to);res()};
    speechSynthesis.cancel();speechSynthesis.speak(u);
  });
}
async function ttsBuf(actx,text){
  const r=await fetch('https://router.huggingface.co/hf-inference/models/'+$('tmodel').value.trim(),{
    method:'POST',headers:{Authorization:'Bearer '+$('token').value.trim(),'Content-Type':'application/json'},body:JSON.stringify({inputs:text})});
  if(!r.ok)throw new Error('TTS HTTP '+r.status);
  return actx.decodeAudioData(await r.arrayBuffer());
}
const sleep=ms=>new Promise(r=>{const e=performance.now()+ms;(function k(){if(stopFlag||performance.now()>=e)r();else setTimeout(k,40)})()});
