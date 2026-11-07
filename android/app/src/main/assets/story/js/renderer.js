/**
 * renderer.js - subtitles, title card, camera zoom and per-frame composition.
 */
'use strict';

function wrap(text,maxW){
  const words=text.split(/\s+/),lines=[];let cur='';
  for(const w of words){const t=cur?cur+' '+w:w;if(cx.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t}
  if(cur)lines.push(cur);return lines;
}
function subtitle(L){
  if(!L.text)return;
  const fs=Math.round(Math.min(W,H)/17);cx.font='600 '+fs+'px "Noto Sans Devanagari",sans-serif';
  const lines=wrap(L.text,W*.84),lh=fs*1.35,bh=lines.length*lh+22,by=H-bh-24;
  cx.fillStyle='rgba(8,6,28,.72)';rr(W*.05,by,W*.9,bh,16);
  cx.fillStyle='#fff';cx.textAlign='center';
  lines.forEach((ln,i)=>cx.fillText(ln,W/2,by+16+lh*(i+.8)));
  if(L.who!=='Narrator'){cx.font='600 '+Math.round(fs*.7)+'px sans-serif';cx.fillStyle='#F4C2D7';cx.textAlign='left';cx.fillText(L.who,W*.07,by-8)}
}
function frame(L,el,dur,fresh,t){
  if(L.scene==='title'){
    const g=cx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#1B1646');g.addColorStop(1,'#6a4fb3');cx.fillStyle=g;cx.fillRect(0,0,W,H);
    const fs=Math.round(Math.min(W,H)/9);cx.font='700 '+fs+'px "Noto Sans Devanagari",sans-serif';cx.fillStyle='#F4C2D7';cx.textAlign='center';
    wrap(L.title,W*.8).forEach((ln,i)=>cx.fillText(ln,W/2,H*.45+i*fs*1.3));
  }else{
    const z=1+.07*Math.min(1,el/dur);
    cx.save();cx.translate(W/2,H*.6);cx.scale(z,z);cx.translate(-W/2-(z-1)*W*.1,-H*.6);
    background(L.scene,t);
    const n=L.cast.length,pos=n===1?[.5]:n===2?[.3,.7]:[.2,.5,.8],s=Math.min(W,H)/540*1.1,by=H*(W>H?.8:.76);
    L.cast.forEach((c,i)=>person(W*pos[i],by,s,c.kind,c.name===L.who,t+i,c.name===L.who?L.emo:'',pos[i]<.5?1:-1));
    cx.restore();subtitle(L);
  }
  if(fresh&&el<.6){cx.fillStyle='rgba(0,0,0,'+(1-el/.6)+')';cx.fillRect(0,0,W,H)}
}
