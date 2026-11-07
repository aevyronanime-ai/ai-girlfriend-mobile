/**
 * background.js - procedural backgrounds: sky, hills, village, forest, well, road, river, fog.
 */
'use strict';

function hill(base,col,amp,f,ph){cx.fillStyle=col;cx.beginPath();cx.moveTo(0,H);for(let x=0;x<=W;x+=10)cx.lineTo(x,base+Math.sin(x/f+ph)*amp);cx.lineTo(W,H);cx.fill()}
function hut(x,y,w,night){
  cx.fillStyle=night?'#5d4033':'#c98f5d';cx.fillRect(x-w/2,y-w*.55,w,w*.55);
  cx.fillStyle=night?'#4a2a22':'#9a3f2c';cx.beginPath();cx.moveTo(x-w*.62,y-w*.55);cx.lineTo(x,y-w*1.05);cx.lineTo(x+w*.62,y-w*.55);cx.fill();
  cx.fillStyle=night?'#ffd36b':'#7fb8d8';cx.fillRect(x-w*.12,y-w*.4,w*.24,w*.22);
}
function tree(x,y,s,night){
  cx.fillStyle=night?'#2a1d16':'#6b4a2f';cx.fillRect(x-5*s,y-50*s,10*s,50*s);
  cx.fillStyle=night?'#12301f':'#2f7d3b';
  [0,1,2].forEach(i=>{cx.beginPath();cx.moveTo(x-38*s+i*5*s,y-40*s-i*38*s);cx.lineTo(x,y-100*s-i*38*s);cx.lineTo(x+38*s-i*5*s,y-40*s-i*38*s);cx.fill()});
}
function background(sc,t){
  const night=/night|रात/.test(sc),fog=/fog|कोहरा/.test(sc);
  const g=cx.createLinearGradient(0,0,0,H*.7);
  if(night){g.addColorStop(0,'#070b24');g.addColorStop(1,'#2b3b73')}else{g.addColorStop(0,'#6cc0ee');g.addColorStop(1,'#fde8c0')}
  cx.fillStyle=g;cx.fillRect(0,0,W,H);
  if(night){
    for(let i=0;i<60;i++){cx.globalAlpha=.4+.6*Math.abs(Math.sin(t*1.5+i));cx.fillStyle='#fff';cx.fillRect((i*97)%W,(i*53)%(H*.4),2,2)}
    cx.globalAlpha=1;cx.fillStyle='#fff6c9';cx.beginPath();cx.arc(W*.78,H*.14,Math.min(W,H)*.07,0,6.28);cx.fill();
  }else{cx.fillStyle='#fff3a8';cx.beginPath();cx.arc(W*.8,H*.13,Math.min(W,H)*.08,0,6.28);cx.fill()}
  hill(H*.52,night?'#16213f':'#8cc7a0',30,90,1);
  hill(H*.58,night?'#101a30':'#6fb07f',24,70,3);
  const gy=H*.64;
  const gg=cx.createLinearGradient(0,gy,0,H);
  if(night){gg.addColorStop(0,'#1d3326');gg.addColorStop(1,'#0c1711')}else{gg.addColorStop(0,'#7cc058');gg.addColorStop(1,'#4f8f3a')}
  cx.fillStyle=gg;cx.fillRect(0,gy,W,H-gy);
  if(/forest|जंगल/.test(sc))for(let i=0;i<9;i++)tree(i*W/8+(i%2)*14,gy+20+(i%3)*18,1.1,night);
  else if(/house|घर/.test(sc)){hut(W*.5,gy+60,Math.min(W,H)*.75,night)}
  else if(/road|सड़क/.test(sc)){cx.fillStyle='#2e2e36';cx.beginPath();cx.moveTo(W*.4,gy);cx.lineTo(W*.6,gy);cx.lineTo(W,H);cx.lineTo(0,H);cx.fill();cx.fillStyle='#e8d36a';for(let i=0;i<6;i++){const y=gy+i*i*14+10;cx.fillRect(W/2-2-i*2,y,4+i*4,10+i*6)}}
  else if(/river|नदी/.test(sc)){cx.fillStyle=night?'#17335c':'#4aa6d8';cx.fillRect(0,gy,W,H*.1);cx.strokeStyle='rgba(255,255,255,.4)';cx.lineWidth=2;for(let i=0;i<8;i++){cx.beginPath();cx.moveTo(i*W/7-20+Math.sin(t+i)*10,gy+20+(i%3)*18);cx.quadraticCurveTo(i*W/7,gy+10+(i%3)*18,i*W/7+30,gy+20+(i%3)*18);cx.stroke()}}
  else{hut(W*.18,gy+30,Math.min(W,H)*.3,night);hut(W*.82,gy+36,Math.min(W,H)*.34,night);tree(W*.5,gy+10,.9,night)}
  if(/well|कुआँ|कुएँ/.test(sc)){
    const x=W*.5,y=gy+H*.07,r=Math.min(W,H)*.2;
    if(night){const gl=cx.createRadialGradient(x,y,5,x,y,r*1.6);gl.addColorStop(0,'rgba(80,255,200,.45)');gl.addColorStop(1,'rgba(80,255,200,0)');cx.fillStyle=gl;cx.fillRect(x-r*2,y-r*2,r*4,r*4)}
    cx.fillStyle='#8a8a92';cx.fillRect(x-r,y-r*.25,r*2,r*.7);cx.fillStyle='#16161c';cx.beginPath();cx.ellipse(x,y-r*.25,r,r*.3,0,0,6.28);cx.fill();
    cx.strokeStyle='#8a8a92';cx.lineWidth=4;cx.beginPath();cx.ellipse(x,y-r*.25,r,r*.3,0,0,6.28);cx.stroke();
  }
  if(fog){for(let i=0;i<5;i++){cx.fillStyle='rgba(235,240,255,.13)';cx.beginPath();cx.ellipse(((t*18+i*W/4)%(W*1.4))-W*.2,H*(.6+i*.06),W*.4,H*.05,0,0,6.28);cx.fill()}}
}
