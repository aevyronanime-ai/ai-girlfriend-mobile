/**
 * characters.js - cartoon people with lip-sync, blinking and emotions.
 */
'use strict';

function person(x,y,s,kind,speak,t,emo,look){
  const c=PAL[kind],sz={boy:.78,girl:.8,man:1.1,woman:1.02,elder:.95}[kind]||1;
  cx.save();cx.translate(x,y+Math.sin(t*(speak?7:2)+x)*(speak?3:1.5));cx.scale(s*sz,s*sz);
  cx.fillStyle=c.pants;
  if(kind==='girl'||kind==='woman'){cx.beginPath();cx.moveTo(-42,-80);cx.lineTo(42,-80);cx.lineTo(58,-14);cx.lineTo(-58,-14);cx.fill();cx.fillStyle=c.skin;cx.fillRect(-20,-14,12,14);cx.fillRect(8,-14,12,14)}
  else{cx.fillRect(-28,-80,22,80);cx.fillRect(6,-80,22,80)}
  cx.fillStyle='#222';cx.fillRect(-32,-6,28,8);cx.fillRect(4,-6,28,8);
  cx.fillStyle=c.shirt;rr(-42,-200,84,130,22);
  const w=speak?Math.sin(t*6):0;
  cx.strokeStyle=c.skin;cx.lineWidth=14;cx.lineCap='round';
  cx.beginPath();cx.moveTo(-42,-180);cx.lineTo(-60,-118+w*10);cx.stroke();
  cx.beginPath();cx.moveTo(42,-180);cx.lineTo(60+w*14,-135-w*26);cx.stroke();
  if(kind==='elder'){cx.strokeStyle='#6b4a2f';cx.lineWidth=6;cx.beginPath();cx.moveTo(-62,-118);cx.lineTo(-66,0);cx.stroke()}
  cx.fillStyle=c.skin;cx.fillRect(-11,-212,22,20);
  cx.beginPath();cx.ellipse(0,-240,43,48,0,0,6.28);cx.fill();
  // hair
  cx.fillStyle=c.hair;
  if(kind==='girl'||kind==='woman'){cx.beginPath();cx.ellipse(0,-262,46,30,0,Math.PI,0);cx.fill();cx.fillRect(-46,-262,12,70);cx.fillRect(34,-262,12,70);
    if(kind==='girl'){cx.beginPath();cx.arc(-50,-196,12,0,6.28);cx.arc(50,-196,12,0,6.28);cx.fill()}else{cx.beginPath();cx.arc(0,-300,16,0,6.28);cx.fill()}}
  else if(kind==='elder'){cx.beginPath();cx.ellipse(0,-268,40,20,0,Math.PI,0);cx.fill();cx.fillRect(-44,-268,10,36);cx.fillRect(34,-268,10,36)}
  else{cx.beginPath();cx.ellipse(0,-265,46,26,0,Math.PI,0);cx.fill();cx.fillRect(-46,-265,92,12)}
  // eyes
  const big=(emo==='scared'||emo==='surprised')?1.3:1,bl=Math.sin(t*1.1+x)>.985?.1:1,lx=look*3;
  [-16,16].forEach(ex=>{cx.fillStyle='#fff';cx.beginPath();cx.ellipse(ex,-242,9*big,11*big*bl,0,0,6.28);cx.fill();
    cx.fillStyle='#1a1a1a';cx.beginPath();cx.ellipse(ex+lx,-242,4.2,5.5*bl,0,0,6.28);cx.fill()});
  // brows
  cx.strokeStyle=c.hair==='#eeeeee'?'#999':c.hair;cx.lineWidth=4;
  const bq={angry:[6,-6],sad:[-6,6],scared:[-4,-10],surprised:[-8,-8],worried:[-3,-7]}[emo]||[0,0];
  cx.beginPath();cx.moveTo(-26,-262+bq[0]);cx.lineTo(-8,-262+bq[1]);cx.stroke();
  cx.beginPath();cx.moveTo(26,-262+bq[0]);cx.lineTo(8,-262+bq[1]);cx.stroke();
  // mouth
  cx.fillStyle='#7a2a2a';cx.strokeStyle='#7a2a2a';cx.lineWidth=3;
  if(speak){cx.beginPath();cx.ellipse(0,-216,9,3+Math.abs(Math.sin(t*14))*9,0,0,6.28);cx.fill()}
  else if(emo==='sad'||emo==='scared'||emo==='worried'){cx.beginPath();cx.arc(0,-208,10,3.5,5.9);cx.stroke()}
  else{cx.beginPath();cx.arc(0,-224,11,.25,2.9);cx.stroke()}
  if(kind==='man'){cx.fillStyle=c.hair;cx.fillRect(-16,-228,32,6)}
  if(kind==='woman'||kind==='girl'){cx.fillStyle='#d12e5a';cx.beginPath();cx.arc(0,-262,3,0,6.28);cx.fill()}
  cx.restore();
}
