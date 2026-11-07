/**
 * core.js - shared DOM handles, canvas context and tiny utilities.
 */
'use strict';

const $=id=>document.getElementById(id);
const cv=$('cv'),cx=cv.getContext('2d');
let W=540,H=960,stopFlag=false,running=false;
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}

/** Rounded-rect fill helper (works on all WebViews, no roundRect needed). */
function rr(x,y,w,h,r){cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath();cx.fill()}
