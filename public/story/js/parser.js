/**
 * parser.js - turns the story script text into a list of scene lines.
 */
'use strict';

const PAL={
  boy:{skin:'#f0c29b',hair:'#2a2018',shirt:'#e8b923',pants:'#3a4a8c'},
  girl:{skin:'#f3cba7',hair:'#1d1a2e',shirt:'#e0457b',pants:'#7a3a8c'},
  man:{skin:'#d9a37a',hair:'#171210',shirt:'#3f7fbf',pants:'#4a3b30'},
  woman:{skin:'#e3b48c',hair:'#241713',shirt:'#c0392b',pants:'#8e2f24'},
  elder:{skin:'#d8ae8a',hair:'#eeeeee',shirt:'#8a9a5b',pants:'#6b5a45'}
};
function parse(src){
  const chars={},out=[],auto=['boy','girl','man','woman','elder'];let scene='village day',block=0,ai=0,m;
  for(const raw of src.split('\n')){
    const l=raw.trim();if(!l)continue;
    if(m=l.match(/^CHAR:\s*([^|]+)\|\s*(\w+)/i)){chars[m[1].trim()]={kind:PAL[m[2].toLowerCase()]?m[2].toLowerCase():'boy'};continue}
    if(m=l.match(/^\[(.+)\]$/)){scene=m[1].toLowerCase();block++;continue}
    if(m=l.match(/^TITLE:\s*(.+)/i)){out.push({title:m[1],scene:'title',block:++block,text:m[1],who:'Narrator'});block++;continue}
    let who='Narrator',text=l;
    if(m=l.match(/^([^:：(\[]{1,20})[:：]\s*(.+)$/)){who=m[1].trim();text=m[2]}
    if(/^narrator$/i.test(who))who='Narrator';
    let emo='';const em=text.match(/^\((happy|sad|scared|angry|surprised)\)\s*/i);
    if(em){emo=em[1].toLowerCase();text=text.slice(em[0].length)}
    else if(/[!！]/.test(text))emo='surprised';else if(/[?？]/.test(text))emo='worried';
    if(who!=='Narrator'&&!chars[who])chars[who]={kind:auto[ai++%auto.length]};
    out.push({scene,block,who,text,emo});
  }
  const casts={};
  out.forEach(L=>{if(L.who!=='Narrator'){(casts[L.block]=casts[L.block]||[]);if(!casts[L.block].includes(L.who))casts[L.block].push(L.who)}});
  out.forEach(L=>{L.cast=(casts[L.block]||[]).slice(0,3).map(n=>({name:n,kind:chars[n].kind}))});
  return out;
}
