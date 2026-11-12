// ZeroZero — o código do jogo. Os desenhos estão em pixspr.js e imagens.js.

(()=>{
"use strict";
const W=480,H=270;
const cv=document.getElementById('c');
let ctx=cv.getContext('2d');
const PIX='"Press Start 2P", monospace';let FONT=PIX;const COMIC=PIX;const S=1;

const rot=document.getElementById('rot');
function fit(){
  const s=Math.min(innerWidth/W,innerHeight/H);
  cv.style.width=Math.floor(W*s)+'px';cv.style.height=Math.floor(H*s)+'px';
  const portrait=innerHeight>innerWidth&&(('ontouchstart' in window)||matchMedia('(pointer:coarse)').matches);
  if(rot)rot.style.display=portrait?'flex':'none';
}
function goLandscape(){try{const el=document.documentElement;const r=el.requestFullscreen?el.requestFullscreen():null;
  Promise.resolve(r).then(()=>{try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{});}catch(e){}}).catch(()=>{});}catch(e){}}
function isFS(){return !!(document.fullscreenElement||document.webkitFullscreenElement);}
function toggleFS(ev){if(ev){ev.preventDefault();ev.stopPropagation();}
  try{
    if(isFS()){(document.exitFullscreen||document.webkitExitFullscreen).call(document);try{screen.orientation.unlock&&screen.orientation.unlock();}catch(e){}return;}
    const el=document.documentElement,rq=el.requestFullscreen||el.webkitRequestFullscreen;
    if(!rq||!(document.fullscreenEnabled||document.webkitFullscreenEnabled)){fsMsg();return;}
    Promise.resolve(rq.call(el)).then(()=>{try{screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{});}catch(e){}}).catch(fsMsg);
  }catch(e){fsMsg();}}
function fsMsg(){const t=document.getElementById('fsToast');if(!t)return;t.style.display='block';clearTimeout(fsMsg.h);fsMsg.h=setTimeout(()=>t.style.display='none',3500);}
function updFsBtn(){const b=document.getElementById('fsBtn');if(b)b.innerHTML=isFS()?FS_OUT:FS_IN;}
const FS_IN='<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fff" stroke-width="2"><path d="M1 6V1h5M12 1h5v5M17 12v5h-5M6 17H1v-5"/></svg>';
const FS_OUT='<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fff" stroke-width="2"><path d="M6 1v5H1M17 6h-5V1M12 17v-5h5M1 12h5v5"/></svg>';
document.addEventListener('fullscreenchange',()=>{updFsBtn();setTimeout(fit,100);});document.addEventListener('webkitfullscreenchange',()=>{updFsBtn();setTimeout(fit,100);});
(()=>{const b=document.getElementById('fsBtn');if(b){b.addEventListener('pointerdown',toggleFS);updFsBtn();}})();
addEventListener('resize',fit);addEventListener('orientationchange',()=>setTimeout(fit,200));fit();

// ---------- utils ----------
const rnd=(a,b)=>a+Math.random()*(b-a);
const irnd=(a,b)=>Math.floor(rnd(a,b+1));
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function hash(n){n=(n|0);n=(n<<13)^n;return((n*(n*n*15731+789221)+1376312589)&0x7fffffff)/0x7fffffff;}
function R(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
function B(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);if(w>3&&h>3){ctx.strokeStyle='#1a1220';ctx.lineWidth=.9;ctx.strokeRect(x,y,w,h);}}
function txt(s,x,y,size,col,align,shadow){
  ctx.font=size+'px '+FONT;ctx.textAlign=align||'left';ctx.textBaseline='top';
  if(shadow!==false){ctx.fillStyle=shadow||'#000';ctx.fillText(s,x+1,y+1);}
  ctx.fillStyle=col;ctx.fillText(s,x,y);
}
const money=v=>'R$ '+v.toFixed(2).replace('.',',');

// ---------- input ----------
const ACTS=['left','right','up','down','punch','kick','jump','special','block','weapon','mask','start','pause'];
// one input set per player slot (0 = J1, 1 = J2); held/prs point to the set being used now
const IN=[0,1].map(()=>{const o={held:{},prs:{},tr:false,dbl:{}};ACTS.forEach(a=>{o.held[a]=0;o.prs[a]=0;});return o;});
let held=IN[0].held,prs=IN[0].prs;
function useIn(s){held=IN[s].held;prs=IN[s].prs;}
function prsAny(a){return IN.some(I=>I.prs[a]);}
const KEYMAP={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',
KeyJ:'punch',KeyZ:'punch',KeyK:'kick',KeyX:'kick',Space:'jump',KeyL:'jump',KeyC:'jump',KeyU:'weapon',KeyB:'weapon',KeyH:'mask',KeyN:'mask',
KeyO:'block',ShiftLeft:'block',ShiftRight:'block',Enter:'start',NumpadEnter:'start',KeyP:'pause',Escape:'pause'};
const DEFKEYS=Object.assign({},KEYMAP);
try{const sv=JSON.parse(localStorage.getItem('zz_keys')||'null');if(sv){for(const k in KEYMAP)delete KEYMAP[k];Object.assign(KEYMAP,sv);}}catch(_){}
function saveKeys(){try{localStorage.setItem('zz_keys',JSON.stringify(KEYMAP));}catch(_){}}
let keyCap=null,pauseSel=0;
const EDITACTS=[['left','ESQUERDA'],['right','DIREITA'],['up','CIMA'],['down','BAIXO'],['punch','SOCO'],['kick','CHUTE'],['jump','PULO'],['weapon','ARMA'],['mask','MÁSCARA'],['pause','PAUSA']];
function keyName(c){if(!c)return'-';const m={ArrowLeft:'◄',ArrowRight:'►',ArrowUp:'▲',ArrowDown:'▼',Space:'ESPAÇO',ShiftLeft:'SHIFT',ShiftRight:'SHIFT D',Enter:'ENTER',Escape:'ESC',ControlLeft:'CTRL',ControlRight:'CTRL D',AltLeft:'ALT',Tab:'TAB',Backspace:'BACKSPACE',NumpadEnter:'ENTER NUM'};
  return m[c]||c.replace(/^Key/,'').replace(/^Digit/,'').replace(/^Numpad/,'NUM ').toUpperCase();}
function keysOf(a){return Object.keys(KEYMAP).filter(k=>KEYMAP[k]===a);}
function press(a){const I=IN[LOCAL];if(!I.held[a])I.prs[a]=1;I.held[a]=1;netKey(a,1);}
function release(a){const I=IN[LOCAL];if(!I.held[a])return;I.held[a]=0;netKey(a,0);}
function releaseAll(){ACTS.forEach(a=>{if(IN[LOCAL].held[a])release(a);});setTr(false);}
function setTr(v){if(IN[LOCAL].tr===v)return;IN[LOCAL].tr=v;netTr(v);}
addEventListener('keydown',e=>{
  initAudio();
  if(keyCap){e.preventDefault();if(e.code!=='Escape'&&e.code!=='KeyM'){for(const k of keysOf(keyCap))delete KEYMAP[k];KEYMAP[e.code]=keyCap;saveKeys();sfx('confirm');}keyCap=null;return;}
  if(e.code==='KeyM'){toggleMute();return;}
  const a=KEYMAP[e.code];if(a){press(a);e.preventDefault();}
});
addEventListener('keyup',e=>{const a=KEYMAP[e.code];if(a)release(a);});
cv.addEventListener('pointerdown',()=>{initAudio();if(scene!=='play')press('start');});
cv.addEventListener('pointerup',()=>release('start'));

// touch
let touchRun=false;
const isTouch=('ontouchstart' in window)||matchMedia('(pointer:coarse)').matches;
if(isTouch){
  document.getElementById('touch').style.display='block';
  document.querySelectorAll('.tb').forEach(b=>{
    const k=b.dataset.k;
    b.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();b.classList.add('on');press(k);if(k==='pause'&&scene!=='play')press('start');});
    const up=()=>{b.classList.remove('on');release(k);if(k==='pause')release('start');};
    b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up);
  });
  const st=document.getElementById('stick'),kn=document.getElementById('knob');let sid=null;
  const setDir=(e)=>{
    const r=st.getBoundingClientRect();const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
    const m=Math.hypot(dx,dy),max=r.width/2;const k=Math.min(1,m/max);
    const nx=m?dx/m*k:0,ny=m?dy/m*k:0;
    kn.style.left=(40+nx*40)+'px';kn.style.top=(40+ny*40)+'px';
    (nx<-.35?press:release)('left');(nx>.35?press:release)('right');
    (ny<-.35?press:release)('up');(ny>.35?press:release)('down');
    touchRun=Math.abs(nx)>.88;setTr(touchRun);
  };
  st.addEventListener('pointerdown',e=>{e.preventDefault();initAudio();sid=e.pointerId;st.setPointerCapture(sid);setDir(e);if(scene!=='play'){if(e.clientY<0)0;}});
  st.addEventListener('pointermove',e=>{if(e.pointerId===sid)setDir(e);});
  const end=()=>{sid=null;kn.style.left='40px';kn.style.top='40px';['left','right','up','down'].forEach(release);touchRun=false;setTr(false);};
  st.addEventListener('pointerup',end);st.addEventListener('pointercancel',end);
}

// ---------- audio ----------
let actx=null,master,sfxG,musG,noiseBuf,muted=false;
// para tudo quando a janela/painel perde o foco ou fica escondido
function hardStop(){try{if(NET.role==='off'){if(scene==='play')scene='pause';}else coopHide();}catch(e){}try{if(actx&&actx.state==='running')actx.suspend();}catch(e){}}
function resumeAudio(){try{if(actx&&actx.state==='suspended'&&!muted)actx.resume();}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)hardStop();else resumeAudio();});
// (print screen / ferramenta de captura tiram o foco da janela: não pausa mais por perder o foco)
window.addEventListener('pagehide',()=>{hardStop();netGoodbye();});
window.addEventListener('blur',()=>{try{releaseAll();}catch(e){}});
window.addEventListener('focus',resumeAudio);

function initAudio(){
  if(actx){if(actx.state==='suspended')actx.resume();return;}
  try{
    actx=new (window.AudioContext||window.webkitAudioContext)();
    master=actx.createGain();master.gain.value=.55;master.connect(actx.destination);
    sfxG=actx.createGain();sfxG.gain.value=.8;sfxG.connect(master);
    musG=actx.createGain();musG.gain.value=.22;musG.connect(master);
    noiseBuf=actx.createBuffer(1,actx.sampleRate*.5,actx.sampleRate);
    const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    startMusic();
  }catch(e){actx=null;}
}
function toggleMute(){muted=!muted;if(master)master.gain.value=muted?0:.55;}
function tone(type,f1,f2,dur,vol,dest,when){
  if(!actx)return;const t=when||actx.currentTime;
  const o=actx.createOscillator(),g=actx.createGain();o.type=type;
  o.frequency.setValueAtTime(f1,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g);g.connect(dest||sfxG);o.start(t);o.stop(t+dur+.02);
}
function noise(dur,vol,freq,dest,when,type){
  if(!actx)return;const t=when||actx.currentTime;
  const s=actx.createBufferSource();s.buffer=noiseBuf;
  const f=actx.createBiquadFilter();f.type=type||'highpass';f.frequency.value=freq||1000;
  const g=actx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  s.connect(f);f.connect(g);g.connect(dest||sfxG);s.start(t);s.stop(t+dur+.02);
}
function crowdCheer(){
  if(!actx||muted)return;const t=actx.currentTime;
  for(const [fq,v,dur] of [[900,.32,1.6],[2100,.18,1.3],[400,.2,1.4]]){
    const s=actx.createBufferSource();s.buffer=noiseBuf;s.loop=true;
    const f=actx.createBiquadFilter();f.type='bandpass';f.frequency.value=fq;f.Q.value=.7;
    const g=actx.createGain();g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(v,t+.18);g.gain.exponentialRampToValueAtTime(.001,t+dur);
    s.connect(f);f.connect(g);g.connect(sfxG);s.start(t);s.stop(t+dur+.05);}
  for(let i=0;i<4;i++){const w=t+.1+Math.random()*.6;const f0=900+Math.random()*700;tone('sine',f0,f0*1.6,.35,.05,null,w);}
}
const sfxLog=[];let sfxRec=null;
function sfx(n){
  sfxLog.push(n);if(sfxLog.length>60)sfxLog.shift();if(sfxRec)sfxRec.push(n);
  if(!actx||muted)return;
  switch(n){
    case'swing':noise(.07,.25,2500);break;
    case'hit':tone('square',180,60,.09,.3);noise(.08,.35,800,null,null,'lowpass');break;
    case'heavy':tone('square',120,40,.18,.4);noise(.16,.5,600,null,null,'lowpass');break;
    case'block':tone('triangle',900,700,.06,.3);break;
    case'coin':{const t=actx.currentTime;tone('square',988,0,.06,.15,null,t);tone('square',1319,0,.12,.15,null,t+.06);}break;
    case'jump':tone('square',260,520,.12,.12);break;
    case'land':noise(.06,.2,400,null,null,'lowpass');break;
    case'hurt':tone('sawtooth',300,90,.16,.25);break;
    case'select':tone('square',660,880,.07,.15);break;
    case'confirm':{const t=actx.currentTime;[523,659,784,1047].forEach((f,i)=>tone('square',f,0,.1,.14,null,t+i*.06));}break;
    case'level':{const t=actx.currentTime;[523,659,784,1047,1319].forEach((f,i)=>tone('square',f,0,.14,.14,null,t+i*.08));}break;
    case'special':tone('sawtooth',200,900,.3,.25);noise(.3,.3,1500);break;
    case'food':{const t=actx.currentTime;[784,988,1175].forEach((f,i)=>tone('triangle',f,0,.12,.25,null,t+i*.07));}break;
    case'glass':noise(.25,.4,3000);tone('triangle',2400,1800,.15,.15);break;
    case'alert':tone('square',880,880,.08,.15);break;
  }
}
// music sequencer (original loop)
const STEP=60/138/4;
const BASS=[45,0,45,57,45,0,43,0,41,0,41,53,43,0,43,55, 45,0,45,57,45,0,48,0,50,0,50,52,43,0,47,0];
const LEAD=[69,0,72,0,76,0,74,72,69,0,0,0,67,0,69,0, 72,0,76,0,79,0,77,76,74,0,72,0,71,0,0,0];
let mStep=0,mNext=0;
function mf(n){return 440*Math.pow(2,(n-69)/12);}
function startMusic(){
  mNext=actx.currentTime+.1;
  setInterval(()=>{
    if(!actx)return;
    while(mNext<actx.currentTime+.12){
      const i=mStep%32,bar=Math.floor(mStep/32)%4;
      if(BASS[i])tone('square',mf(BASS[i]),0,STEP*.9,.35,musG,mNext);
      if(bar>0&&LEAD[i])tone('triangle',mf(LEAD[i]+(bar===3?12:0)),0,STEP*1.6,.28,musG,mNext);
      if(i%8===0)tone('sine',140,40,.12,.7,musG,mNext);
      if(i%8===4)noise(.1,.35,1200,musG,mNext);
      if(i%2===1)noise(.03,.12,7000,musG,mNext);
      mNext+=STEP;mStep++;
    }
  },25);
}

// ---------- looks ----------
const BASE={skin:'#e6ad88',skinD:'#c48a68',hair:'#141418',hairD:'#55565f',beard:'#211a17',pants:'#2b3150',pantsD:'#1d2238',shoe:'#121216',sole:'#e8e8e8'};
const SKINS=[
  Object.assign({},BASE,{pix:'rub_red',chubby:true,name:'RUBÃO',sub:'JAQUETA VERMELHA',head:'face',torso:'jacket',top:'#20212a',topD:'#121318',topH:'#3a3d4c'}),
  Object.assign({},BASE,{pix:'rub_leather',chubby:true,name:'RUBÃO',sub:'JAQUETA DE COURO',head:'bode',torso:'jacket',top:'#17181f',topD:'#0e0f14',topH:'#2c2e3b'}),
  Object.assign({},BASE,{pix:'rub_33',chubby:true,name:'RUBÃO',sub:'CAMISA 33',head:'mask33',torso:'tee33',top:'#111113',topD:'#09090a',topH:'#26262a',pants:'#1e2030'}),
];
const HOODIES=[['#4f7396','#3a5670'],['#7a4b8a','#5a3567'],['#3f7a4f','#2c5838'],['#a0603a','#78472a'],['#8a8f99','#686c75']];
const SKINTONES=[['#e8b896','#c08e6e'],['#c98e64','#a06c48'],['#8f5d3d','#6e452c'],['#f0c8a8','#cc9f80']];
const BEANIES=['#d0342c','#e0b030','#2d8bd0','#222','#e8e8e8'];
const pick=a=>a[irnd(0,a.length-1)];
function punkLook(){
  const h=pick(HOODIES),s=pick(SKINTONES);
  return Object.assign({},BASE,{head:'beanie',torso:'hoodie',top:h[0],topD:h[1],topH:h[0],skin:s[0],skinD:s[1],beanie:pick(BEANIES),pants:pick(['#2a2d3d','#3d3a33','#33405a'])});
}
function girlLook(){
  const s=pick(SKINTONES);const j=pick([['#c03a5a','#8a2840'],['#3a6ac0','#284a8a'],['#e0a030','#a87420']]);
  return Object.assign({},BASE,{head:'ponytail',torso:'hoodie',top:j[0],topD:j[1],topH:j[0],skin:s[0],skinD:s[1],hair:pick(['#e05a20','#2a1a10','#f0d060','#5a2a8a']),hairD:'#00000055',pants:'#1a1a24'});
}
function carecaLook(){return Object.assign({},BASE,{head:'bald',torso:'tank',top:'#e0a882',topD:'#b47e5c',topH:'#f0c09a',skin:'#e0a882',skinD:'#b47e5c',pants:'#2a2d3d',pantsD:'#1a1c28'});}
function loucaLook(){return Object.assign({},BASE,{head:'wild',torso:'hoodie',top:'#a0205a',topD:'#701840',topH:'#c03a70',skin:'#f0c8a8',skinD:'#c99878',hair:'#c8a040',hairD:'#00000055',pants:'#1a1a24'});}
function bruteLook(){
  const s=pick(SKINTONES);
  return Object.assign({},BASE,{head:'fedora',torso:'tank',top:'#e8e6e0',topD:'#c4c0b8',topH:'#fff',hat:pick(['#6a3a22','#3a3a44','#2a2a2a']),skin:s[0],skinD:s[1],pants:'#4a4c58',pantsD:'#36384a'});
}
const BOSSLOOK=Object.assign({},BASE,{head:'star',torso:'coat',top:'#4a2d6b',topD:'#33204a',topH:'#6a4590',skin:'#e2b38f',skinD:'#b8866a',hair:'#f0e8d0',hairD:'#c8bca0',pants:'#1a1a22'});
const ROBOLOOK={robot:true};const DRONELOOK={drone:true};
const DEMONLOOK=Object.assign({},BASE,{head:'demon',torso:'hoodie',top:'#3a0a1a',topD:'#22050f',topH:'#5a1a2a',hair:'#ff5a9a',hairD:'#c03a70',skin:'#f4dcd0',skinD:'#d0b0a4',pants:'#22050f',wings:true});
const BAND=[
  Object.assign({},BASE,{head:'beanie',torso:'hoodie',top:'#2a2a2a',topD:'#1a1a1a',beanie:'#3a8a3a',skin:'#e8b896',skinD:'#c08e6e'}),
  Object.assign({},BASE,{head:'ponytail',torso:'tee33x',top:'#e8e8e8',topD:'#c0c0c0',hair:'#f0f0f0',skin:'#f0c8a8',skinD:'#cc9f80'}),
  Object.assign({},BASE,{head:'fedora',torso:'hoodie',top:'#5a2a2a',topD:'#401c1c',hat:'#222',skin:'#c98e64',skinD:'#a06c48'}),
];

// ---------- weapons ----------
const WEAP={
  placa:{dmg:12,reach:34,dur:6,kd:true,len:22,name:'PLACA'},
  guarda:{dmg:9,reach:32,dur:8,len:20,name:'GUARDA-CHUVA'},
  garrafa:{dmg:11,reach:24,dur:1,len:10,name:'GARRAFA',glass:true},
  cone:{dmg:8,reach:28,dur:5,len:13,name:'CONE'},
  taco:{dmg:13,reach:34,dur:7,kd:true,len:21,name:'TACO'},
};
// ---------- fighter drawing (vetor 2D com contorno) ----------
const INK='#1a1220';
let curFacing=1;
function inkPath(build,fill,lw){ctx.beginPath();build();ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=INK;ctx.lineWidth=lw||1.1;ctx.stroke();ctx.fillStyle=fill;ctx.fill();}
function shape(build,fill,lw){ctx.beginPath();build();ctx.fillStyle=fill;ctx.fill();if(lw!==0){ctx.lineJoin='round';ctx.strokeStyle=INK;ctx.lineWidth=lw||1.1;ctx.stroke();}}
function fillOnly(build,fill){ctx.beginPath();build();ctx.fillStyle=fill;ctx.fill();}
function ellipseP(x,y,rx,ry,r){return()=>ctx.ellipse(x,y,rx,ry,r||0,0,Math.PI*2);}
function limb(pts,w,col,shade){
  ctx.lineCap='round';ctx.lineJoin='round';
  const path=()=>{ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);};
  path();ctx.strokeStyle=INK;ctx.lineWidth=w+2.2;ctx.stroke();
  path();ctx.strokeStyle=col;ctx.lineWidth=w;ctx.stroke();
  if(typeof col==='string'&&col[0]==='#'&&col.length===7&&w>3){ctx.save();ctx.translate(-w*.24,w*.12);path();ctx.strokeStyle=mixHex(col,.72);ctx.lineWidth=w*.38;ctx.stroke();ctx.restore();ctx.save();ctx.translate(w*.22,-w*.1);path();ctx.strokeStyle=mixHex(col,1.22);ctx.lineWidth=w*.22;ctx.stroke();ctx.restore();}
  if(shade){path();ctx.strokeStyle=shade;ctx.lineWidth=w*.35;ctx.globalAlpha=.55;ctx.translate(-w*.22,0);ctx.stroke();ctx.translate(w*.22,0);ctx.globalAlpha=1;}
}
function weaponShape(w){
  const L=WEAP[w].len;
  switch(w){
    case'placa':shape(()=>ctx.rect(0,-2,L-6,4),'#9a6a3a',.8);shape(()=>ctx.rect(L-9,-6,10,12),'#f0f0f0',.8);shape(()=>ctx.rect(L-7.5,-4.5,7,9),'#d02a2a',0);break;
    case'guarda':ctx.lineCap='round';ctx.strokeStyle=INK;ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(-3,2);ctx.lineTo(-3,0);ctx.lineTo(L-8,0);ctx.stroke();ctx.strokeStyle='#555';ctx.lineWidth=1.2;ctx.stroke();
      shape(()=>{ctx.moveTo(L-11,-3);ctx.lineTo(L,0);ctx.lineTo(L-11,3);ctx.closePath();},'#8a4ab0',.8);break;
    case'garrafa':shape(()=>{ctx.moveTo(0,-2.5);ctx.lineTo(6,-2.5);ctx.lineTo(8,-1.2);ctx.lineTo(11,-1.2);ctx.lineTo(11,1.2);ctx.lineTo(8,1.2);ctx.lineTo(6,2.5);ctx.lineTo(0,2.5);ctx.closePath();},'#2f8a42',.8);fillOnly(()=>ctx.rect(1,-1.8,4,1),'#9ae0a8');break;
    case'cone':shape(()=>{ctx.moveTo(0,-5);ctx.lineTo(13,-1);ctx.lineTo(13,1);ctx.lineTo(0,5);ctx.closePath();},'#f07a20',.8);fillOnly(()=>{ctx.moveTo(5,-3.5);ctx.lineTo(8,-2.5);ctx.lineTo(8,2.5);ctx.lineTo(5,3.5);},'#fff');shape(()=>ctx.rect(-1.5,-6,2,12),'#333',.8);break;
    case'taco':shape(()=>{ctx.moveTo(0,-1.2);ctx.lineTo(8,-1.6);ctx.lineTo(L,-2.6);ctx.quadraticCurveTo(L+1.5,0,L,2.6);ctx.lineTo(8,1.6);ctx.lineTo(0,1.2);ctx.closePath();},'#dcb478',.8);fillOnly(()=>ctx.rect(0,-1.2,6,2.4),'#5a3a20');break;
  }
}
const ARMS={
  rest:[[1,7],[1.5,14]],swingA:[[2.5,7],[4,13.5]],swingB:[[-1,7],[-2,13.5]],
  punch:[[8,1],[16,-.5]],punch2:[[9,2],[18,1]],grab:[[7,3],[12,2]],
  upper:[[5,-3],[6,-13]],guard:[[5,6],[7,-3]],windup:[[-6,4],[-10,-1]],
  hurt:[[-5,-4],[-8,-11]],spin:[[8,0],[16,-2]],up:[[2,-8],[3,-16]],cast:[[8,-3],[15,-7]],
};
function rubaoTorso(L,chubby){
  const w=chubby?1:.86;
  return()=>{ctx.moveTo(-6*w,-37);ctx.quadraticCurveTo(2,-39.5,7*w,-36);ctx.bezierCurveTo(10.5*w,-31,11.5*w,-22,8*w,-16);ctx.lineTo(-6*w,-15.5);ctx.bezierCurveTo(-9.5*w,-22,-9*w,-31,-6*w,-37);ctx.closePath();};
}
function drawTorso(L){
  if(L.torso==='shirtblood'||L.torso==='workshirt'||L.torso==='bandtee'||L.torso==='jersey'){drawTorsoBand(L);return;}
  const t=L.torso,chubby=L.chubby;
  const body=rubaoTorso(L,chubby);
  if(t==='jacket'){
    shape(body,L.top,1.2);
    ctx.save();ctx.beginPath();body();ctx.clip();
    fillOnly(()=>ctx.rect(-12,-40,6,30),L.topD);
    fillOnly(()=>{ctx.moveTo(3.5,-36);ctx.quadraticCurveTo(7,-28,6.5,-16);ctx.lineTo(12,-16);ctx.lineTo(12,-38);},'#0b0b0e');
    ctx.strokeStyle=L.topH;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(3.5,-36);ctx.quadraticCurveTo(7,-28,6.5,-16);ctx.stroke();
    fillOnly(()=>ctx.rect(-12,-18.5,26,3),L.topD);
    // código de barras vermelho
    const bars=[[-3.2,.7,6],[-2.1,.4,5],[-1.4,.9,6.5],[-.1,.4,5.2],[.6,.7,6],[1.6,.4,4.6],[2.3,.5,5.6]];
    bars.forEach(([x,w2,h])=>fillOnly(()=>ctx.rect(x,-31.5,w2,h),'#e8342c'));
    // rosa da camiseta
    fillOnly(ellipseP(8,-30,1.1,1.1),'#d02a2a');fillOnly(()=>ctx.rect(8.3,-29.3,1.6,.5),'#8a8a96');
    ctx.restore();
    // gola
    shape(()=>{ctx.moveTo(-4,-37.5);ctx.lineTo(1,-39);ctx.lineTo(-.5,-33.5);ctx.closePath();},L.topH,.9);
    shape(()=>{ctx.moveTo(3,-38.5);ctx.lineTo(7.5,-36.5);ctx.lineTo(4.5,-33);ctx.closePath();},L.topH,.9);
  }else if(t==='tee33'||t==='tee33x'){
    shape(body,L.top,1.2);
    ctx.save();ctx.beginPath();body();ctx.clip();fillOnly(()=>ctx.rect(-12,-40,5,30),L.topD);ctx.restore();
    shape(()=>{ctx.moveTo(-1.5,-38.5);ctx.quadraticCurveTo(2,-35.5,5,-38);},'rgba(0,0,0,0)',.9);
    if(t==='tee33'){
      ctx.save();ctx.translate(2,-25.5);ctx.scale(curFacing,1);
      ctx.font='11px '+COMIC;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
      ctx.lineWidth=2.4;ctx.strokeStyle='#f4f4f4';ctx.strokeText('33',0,0);ctx.fillStyle='#d8262a';ctx.fillText('33',0,0);
      ctx.restore();
    }else fillOnly(ellipseP(2,-27,3,3),'#d03030');
  }else if(t==='hoodie'){
    shape(()=>{ctx.moveTo(-8,-38);ctx.quadraticCurveTo(-11,-34,-8,-31);ctx.lineTo(-4,-34);ctx.closePath();},L.topD,1);
    shape(body,L.top,1.2);
    ctx.save();ctx.beginPath();body();ctx.clip();fillOnly(()=>ctx.rect(-12,-40,5.5,30),L.topD);
    shape(()=>{ctx.moveTo(-1,-23);ctx.lineTo(7,-23);ctx.lineTo(8,-18.5);ctx.lineTo(-2,-18.5);ctx.closePath();},L.topD,.7);
    ctx.restore();
    ctx.strokeStyle='#eee';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(3,-35);ctx.lineTo(3,-29);ctx.moveTo(5,-35);ctx.lineTo(5.3,-30);ctx.stroke();
  }else if(t==='tank'){
    shape(body,L.skin,1.2);
    shape(()=>{ctx.moveTo(-6,-35);ctx.lineTo(-3,-35);ctx.quadraticCurveTo(1,-30,4,-35);ctx.lineTo(7,-34.5);ctx.bezierCurveTo(10.5,-29,11.5,-22,8,-16);ctx.lineTo(-6,-15.5);ctx.bezierCurveTo(-9.5,-22,-9,-30,-6,-35);},L.top,1);
    fillOnly(()=>ctx.rect(-6.5,-18,15,3),'#2a2a30');
  }else if(t==='coat'){
    shape(()=>{ctx.moveTo(-7,-37);ctx.quadraticCurveTo(2,-40,8,-36);ctx.lineTo(10,-8);ctx.lineTo(-9,-8);ctx.closePath();},L.top,1.2);
    ctx.save();ctx.beginPath();ctx.rect(-12,-40,5,34);ctx.clip();fillOnly(()=>{ctx.moveTo(-7,-37);ctx.lineTo(-9,-8);ctx.lineTo(-4,-8);ctx.lineTo(-4,-37);},L.topD);ctx.restore();
    shape(()=>{ctx.moveTo(1,-38);ctx.lineTo(6,-37);ctx.lineTo(4,-24);ctx.closePath();},'#f0e8dc',.8);
    fillOnly(()=>{ctx.moveTo(3.3,-36);ctx.lineTo(4.4,-36);ctx.lineTo(4.2,-27);ctx.lineTo(3.6,-27);},'#c0242a');
    shape(()=>{ctx.moveTo(.5,-38);ctx.lineTo(3,-28);ctx.lineTo(-1,-32);ctx.closePath();},L.topH,.8);
  }
}
function drawHead(L,hurt){
  if(L.head==='spikemask'||L.head==='longhair'||L.head==='balaclava'||L.head==='cap'){drawHeadBand(L,hurt);return;}
  const sk=L.skin,sd=L.skinD;
  const headShape=()=>{ctx.moveTo(-6.5,-6);ctx.bezierCurveTo(-7,-13,6,-14,8,-6);ctx.bezierCurveTo(9.5,-1,9,4,6,7);ctx.bezierCurveTo(3,9.5,-3,9,-5.5,5);ctx.bezierCurveTo(-7.5,2,-7,-2,-6.5,-6);ctx.closePath();};
  const eye=(x,y)=>{if(hurt){ctx.strokeStyle=INK;ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(x-1.5,y-1);ctx.lineTo(x+.8,y);ctx.lineTo(x-1.5,y+1);ctx.stroke();}
    else{fillOnly(ellipseP(x,y,1.5,1.6),'#fff');fillOnly(ellipseP(x+.4,y+.1,.85,1.1),'#1a1010');ctx.strokeStyle=INK;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x-1.8,y-1.1);ctx.lineTo(x+1.7,y-1.3);ctx.stroke();}};
  const brow=(x,y,th,c)=>{ctx.strokeStyle=c||INK;ctx.lineWidth=th||1.3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-2,y+.3);ctx.lineTo(x+2.4,y-.5);ctx.stroke();};
  const ear=()=>{shape(ellipseP(-2.5,0,2,2.6),sk,.9);fillOnly(ellipseP(-2.4,.2,.9,1.4),sd);};
  const nose=()=>{shape(()=>{ctx.moveTo(7.5,-3);ctx.quadraticCurveTo(10.3,.5,7.6,1.4);},'rgba(0,0,0,0)',.9);};
  // pescoço
  shape(()=>ctx.rect(-2.5,5,6,6),sd,1);
  switch(L.head){
    case'face':case'bode':{
      shape(headShape,sk,1.2);
      ctx.save();ctx.beginPath();headShape();ctx.clip();fillOnly(()=>ctx.rect(-9,-15,4,26),sd);
      // barba
      fillOnly(()=>{ctx.moveTo(-4.5,-1);ctx.quadraticCurveTo(-3,3,0,3.2);ctx.lineTo(9,1.3);ctx.lineTo(10,12);ctx.lineTo(-8,12);ctx.closePath();},L.beard);
      fillOnly(()=>{ctx.moveTo(3,1.8);ctx.quadraticCurveTo(6,.2,9,1.4);ctx.lineTo(9,2.4);ctx.quadraticCurveTo(6,1.8,3,3);},L.beard);
      fillOnly(()=>{ctx.moveTo(4.6,3.2);ctx.quadraticCurveTo(6.4,2.6,7.8,3.2);ctx.quadraticCurveTo(6.4,4.2,4.6,3.2);},'#b4625a');
      fillOnly(ellipseP(6.5,6.5,1.8,2.2),'#0d0908');
      ctx.restore();
      shape(headShape,'rgba(0,0,0,0)',1.2);
      ear();nose();eye(5.2,-3.3);brow(5,-6.2,1.5);
      // cabelo topete com laterais raspadas
      fillOnly(()=>{ctx.moveTo(-6.4,-5);ctx.quadraticCurveTo(-5,-1,-4.6,0);ctx.lineTo(-1,-3);ctx.lineTo(-1,-8);ctx.closePath();},L.hairD);
      shape(()=>{ctx.moveTo(-6.8,-4.5);ctx.bezierCurveTo(-8.5,-11,-3,-16,3,-15.5);ctx.bezierCurveTo(8,-15.3,11,-12.5,10,-9.5);ctx.bezierCurveTo(8.5,-10.5,7,-9.8,6.5,-8.4);ctx.quadraticCurveTo(2,-9.5,-1,-7.6);ctx.quadraticCurveTo(-3.5,-6.5,-4.8,-3.8);ctx.closePath();},L.hair,1.1);
      ctx.strokeStyle='#4a4a58';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(-3,-12.5);ctx.quadraticCurveTo(3,-15,8.5,-11.8);ctx.moveTo(-4,-10);ctx.quadraticCurveTo(1,-12.5,6,-10.5);ctx.stroke();
      if(L.head==='bode'){
        shape(()=>{ctx.moveTo(-.5,-6.5);ctx.quadraticCurveTo(4,-9,9.2,-6);ctx.quadraticCurveTo(10,-2,8.8,.6);ctx.quadraticCurveTo(5,-.6,2,1);ctx.quadraticCurveTo(-1,-2,-.5,-6.5);ctx.closePath();},'#f2f2f2',1);
        fillOnly(ellipseP(5.4,-3.2,1.8,1.4),'#1a1414');
        [[1.5,-5],[3.5,-.3],[7.8,-1],[2.4,-2.5],[8.4,-5]].forEach(([x,y])=>fillOnly(ellipseP(x,y,.35,.35),'#8a1a1a'));
        const horn=(pts,w)=>{limb(pts,w,'#1c1c20');ctx.strokeStyle='#4a4a54';ctx.lineWidth=.5;for(let i=1;i<pts.length-1;i++){ctx.beginPath();ctx.arc(pts[i][0],pts[i][1],w*.4,0,Math.PI);ctx.stroke();}};
        horn([[-1,-13],[-4,-19],[-10,-20],[-14,-15],[-13,-9],[-9.5,-7.5],[-8.5,-10.5]],3.6);
        horn([[4,-14],[6.5,-19],[11,-20.5],[14,-17],[13.5,-13]],2.8);
      }
      break;}
    case'mask33':{
      shape(()=>{ctx.moveTo(-7.5,-3);ctx.bezierCurveTo(-9,-12,-3,-17,3,-16);ctx.bezierCurveTo(8,-15.5,10,-12,9,-8);ctx.lineTo(-5,-2);ctx.closePath();},L.hair,1.1);
      [[-6,-14,-9,-18],[-2,-16,-3,-20],[2,-16,4,-20],[6,-15,9,-18]].forEach(([a,b,c,d])=>shape(()=>{ctx.moveTo(a-1.5,b);ctx.lineTo(c,d);ctx.lineTo(a+1.5,b+.5);},L.hair,.9));
      ear();
      const mask=()=>{ctx.moveTo(-4.5,-9);ctx.bezierCurveTo(-3,-14,7,-14,9,-8);ctx.bezierCurveTo(10.5,-2,10,5,6.5,8.5);ctx.bezierCurveTo(3,10.5,-3,10,-4.8,5);ctx.bezierCurveTo(-6,0,-6,-5,-4.5,-9);ctx.closePath();};
      shape(mask,'#e6e7ea',1.2);
      ctx.save();ctx.beginPath();mask();ctx.clip();fillOnly(()=>ctx.rect(-7,-15,4,26),'#c2c4ca');ctx.restore();
      ctx.strokeStyle=INK;ctx.lineWidth=.9;ctx.beginPath();ctx.arc(5.2,-3.4,2.9,0,Math.PI*2);ctx.stroke();
      fillOnly(ellipseP(5.2,-3.4,1.3,1.3),'#151010');
      fillOnly(ellipseP(1,-3.6,1.1,1.4),'#151010');
      fillOnly(ellipseP(8.3,.6,.7,.9),'#2a1a1a');
      shape(()=>{ctx.moveTo(3,4);ctx.quadraticCurveTo(6,2.6,8.8,3.6);ctx.quadraticCurveTo(8.5,7.4,5.8,7.4);ctx.quadraticCurveTo(3.2,7,3,4);},'#3a1616',.8);
      if(hurt||true)fillOnly(()=>ctx.rect(3.8,4.1,4.4,1.1),'#f4f4f4');
      break;}
    case'beanie':case'ponytail':case'fedora':case'star':case'demon':case'bald':case'wild':{
      if(L.head==='wild'){for(let k=0;k<9;k++){const a=-2.6+k*.42,r=13+(k%3)*2;shape(()=>{ctx.moveTo(-1+Math.cos(a)*5,-4+Math.sin(a)*5);ctx.lineTo(-1+Math.cos(a+.12)*r,-4+Math.sin(a+.12)*r);ctx.lineTo(-1+Math.cos(a+.3)*6,-4+Math.sin(a+.3)*6);},L.hair,.8);}limb([[-4,-6],[-10,-2],[-12,6],[-9,12]],4,L.hair);}
      if(L.head==='ponytail'||L.head==='demon'){limb([[-4,-9],[-9,-7],[-12,-1],[-11,4]],3.4,L.hair);}
      if(L.head==='star'){shape(()=>{ctx.moveTo(-7,-8);ctx.quadraticCurveTo(-12,4,-10,12);ctx.lineTo(-4,10);ctx.lineTo(-3,-4);ctx.closePath();},L.hair,1);}
      shape(headShape,sk,1.2);
      ctx.save();ctx.beginPath();headShape();ctx.clip();fillOnly(()=>ctx.rect(-9,-15,4,26),sd);
      if(L.head==='fedora'||L.head==='star')fillOnly(()=>{ctx.moveTo(-3,1);ctx.quadraticCurveTo(3,5,9,1.5);ctx.lineTo(10,12);ctx.lineTo(-8,12);ctx.closePath();},L.head==='star'?'rgba(200,190,160,.0)':'rgba(60,40,30,.45)');
      ctx.restore();
      ear();nose();
      if(L.head==='star'){shape(()=>{ctx.moveTo(2,-5);ctx.lineTo(9.5,-5.2);ctx.lineTo(9,-2);ctx.lineTo(3,-2);ctx.closePath();},'#0c0c10',.8);fillOnly(()=>ctx.rect(3,-4.6,3,.8),'#e04ad0');
        fillOnly(()=>{ctx.moveTo(5,4.5);ctx.lineTo(7.5,4.5);ctx.lineTo(6.5,8);},L.hairD);}
      else{eye(5.2,-3.3);brow(5,-6.2,L.head==='fedora'?1.6:1.1);}
      ctx.strokeStyle=INK;ctx.lineWidth=.8;ctx.beginPath();
      if(hurt){ctx.ellipse(6.3,4,1.3,1.5,0,0,7);ctx.fillStyle='#5a1a1a';ctx.fill();}else{ctx.moveTo(4.5,4);ctx.quadraticCurveTo(6.2,4.8,7.8,3.6);}ctx.stroke();
      if(L.head==='ponytail'||L.head==='demon'){
        ctx.strokeStyle=INK;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(6.6,-4.6);ctx.lineTo(7.8,-5.6);ctx.stroke();
        fillOnly(()=>{ctx.moveTo(4.6,4);ctx.quadraticCurveTo(6.2,3.4,7.8,3.8);ctx.quadraticCurveTo(6.2,5,4.6,4);},'#d0405a');
        shape(()=>{ctx.moveTo(-7,-3);ctx.bezierCurveTo(-8.5,-12,-2,-16,3,-15.3);ctx.bezierCurveTo(8,-15,10.5,-11,9.5,-6.5);ctx.quadraticCurveTo(6,-9,4,-6.5);ctx.quadraticCurveTo(1,-8.8,-2,-7);ctx.quadraticCurveTo(-4,-4,-5,-1);ctx.closePath();},L.hair,1.1);
        if(L.head==='demon'){shape(()=>{ctx.moveTo(-1,-13);ctx.lineTo(-3,-19);ctx.lineTo(1.5,-14);},'#2a0a10',.8);shape(()=>{ctx.moveTo(5,-14);ctx.lineTo(6,-20);ctx.lineTo(8,-13.5);},'#2a0a10',.8);}
      }
      if(L.head==='beanie'){
        shape(()=>{ctx.moveTo(-7.5,-5);ctx.bezierCurveTo(-8.5,-16,8,-18,9.5,-6);ctx.closePath();},L.beanie,1.1);
        shape(()=>{ctx.moveTo(-8,-6.5);ctx.lineTo(9.8,-7.5);ctx.lineTo(10,-4.5);ctx.lineTo(-7.8,-3.2);ctx.closePath();},shadeC(L.beanie),1);
        shape(ellipseP(1,-15.8,2.2,2),'#f2f2f2',.9);
      }
      if(L.head==='fedora'){
        fillOnly(()=>{ctx.moveTo(-6.5,-5);ctx.lineTo(-6,0);ctx.lineTo(-4,-1);ctx.lineTo(-4,-6);},'#2a1a10');
        shape(()=>{ctx.moveTo(-10,-6.5);ctx.quadraticCurveTo(2,-9.5,13,-7);ctx.quadraticCurveTo(2,-5.5,-10,-6.5);},L.hat,1);
        shape(()=>{ctx.moveTo(-5.5,-7.5);ctx.lineTo(-4.5,-14.5);ctx.quadraticCurveTo(2,-17,8,-14.5);ctx.lineTo(8.5,-7.8);ctx.closePath();},L.hat,1);
        fillOnly(()=>ctx.rect(-5.3,-10,13.8,1.6),'#141414');
      }
      if(L.head==='star'){shape(()=>{ctx.moveTo(-7.5,-2);ctx.bezierCurveTo(-9,-14,0,-18,5,-15.5);ctx.bezierCurveTo(10,-13,11,-9,10,-7);ctx.quadraticCurveTo(4,-10,-2,-7);ctx.quadraticCurveTo(-5,-5,-5.5,0);ctx.closePath();},L.hair,1.1);}
      if(L.head==='bald'){fillOnly(ellipseP(2,-11,3.2,1.4),'rgba(255,255,255,.45)');fillOnly(()=>ctx.rect(2.5,1,6,1.2),L.skinD);}
      if(L.head==='wild'){shape(()=>{ctx.moveTo(-7,-3);ctx.bezierCurveTo(-8,-13,0,-17,4,-15);ctx.bezierCurveTo(9,-14,11,-9,10,-5);ctx.lineTo(7,-8);ctx.lineTo(5,-5);ctx.lineTo(2,-8);ctx.lineTo(-1,-5);ctx.lineTo(-3,-8);ctx.closePath();},L.hair,1);fillOnly(()=>{ctx.moveTo(4.6,4);ctx.quadraticCurveTo(6.2,3.4,7.8,3.8);ctx.quadraticCurveTo(6.2,5,4.6,4);},'#d0204a');}
      if(L.head==='beanie'&&L.stubble){}
      break;}
  }
}
function shadeC(hex){const n=parseInt(hex.slice(1),16);const r=(n>>16)*.7|0,g=((n>>8)&255)*.7|0,b=(n&255)*.7|0;return'rgb('+r+','+g+','+b+')';}
function armColors(L){
  if(L.torso==='jersey')return{up:L.skin,low:L.skin,upD:L.skinD};
  if(L.torso==='tee33'||L.torso==='tee33x'||L.torso==='shirtblood'||L.torso==='workshirt'||L.torso==='bandtee')return{up:L.skin,low:L.skin,upD:L.skinD,sleeve:L.top,sleeveD:L.topD};
  if(L.torso==='tank')return{up:L.skin,low:L.skin,upD:L.skinD};
  return{up:L.top,low:L.top,upD:L.topD,lowD:L.topD,cuff:true};
}
function drawArm(L,kind,back,sh){
  const A=ARMS[kind]||ARMS.rest,c=armColors(L);
  const el=[sh[0]+A[0][0],sh[1]+A[0][1]],hd=[sh[0]+A[1][0],sh[1]+A[1][1]];
  const up=back?c.upD:c.up,low=back?(c.lowD||c.upD):c.low;
  limb([sh,el],5.6,up);limb([el,hd],5,low);
  if(L.tattoo&&!back){ctx.strokeStyle='#2a3a5a';ctx.lineWidth=.6;ctx.beginPath();const mx=(el[0]+hd[0])/2,my=(el[1]+hd[1])/2;ctx.moveTo(el[0],el[1]);ctx.quadraticCurveTo(mx+1.5,my-1,hd[0]-1,hd[1]-1);ctx.moveTo(mx-1,my+1);ctx.lineTo(mx+1,my-1.5);ctx.stroke();}
  if(c.sleeve){const mx=(sh[0]+el[0])/2,my=(sh[1]+el[1])/2;limb([sh,[mx,my]],6.6,back?c.sleeveD:c.sleeve);}
  if(!back&&L.torso==='jacket'){ // emblema vermelho na manga
    const mx=sh[0]+(el[0]-sh[0])*.55,my=sh[1]+(el[1]-sh[1])*.55;
    ctx.save();ctx.translate(mx,my);ctx.rotate(Math.atan2(el[1]-sh[1],el[0]-sh[0])-Math.PI/2);
    fillOnly(()=>{ctx.moveTo(0,-2.4);ctx.quadraticCurveTo(1.8,-1,1.2,.8);ctx.lineTo(2,2.4);ctx.lineTo(.3,1.6);ctx.lineTo(-.4,2.6);ctx.lineTo(-1.2,1.2);ctx.quadraticCurveTo(-2,-.6,0,-2.4);},'#e8342c');
    ctx.restore();
  }
  shape(ellipseP(hd[0],hd[1],2.9,2.7),back?L.skinD:L.skin,1);
  return hd;
}
function drawLeg(L,hip,foot,back,kneeOut){
  const kx=(hip[0]+foot[0])/2+(kneeOut!=null?kneeOut:2),ky=(hip[1]+foot[1])/2;
  const col=back?L.pantsD:L.pants;
  limb([hip,[kx,ky]],6.6,col);limb([[kx,ky],[foot[0],foot[1]-2]],5.8,col);
  // tênis
  const ang=Math.atan2(foot[1]-ky,foot[0]-kx)-Math.PI/2;
  ctx.save();ctx.translate(foot[0],foot[1]-1.8);ctx.rotate(ang*.6);
  shape(()=>{ctx.moveTo(-3,-2);ctx.quadraticCurveTo(1,-3.2,5,-.8);ctx.quadraticCurveTo(6.4,.6,5.5,1.8);ctx.lineTo(-3.2,1.8);ctx.closePath();},back?'#0a0a0c':L.shoe,1);
  fillOnly(()=>ctx.rect(-3,.8,8.4,1),L.sole);
  ctx.restore();
}
function drawWings(e){
  const f=Math.sin(e.t/4)*3;
  shape(()=>{ctx.moveTo(-3,-33);ctx.quadraticCurveTo(-14,-46+f,-25,-44+f);ctx.quadraticCurveTo(-21,-38,-22,-33+f*.5);ctx.quadraticCurveTo(-18,-35,-15,-29);ctx.quadraticCurveTo(-12,-31,-9,-25);ctx.quadraticCurveTo(-6,-28,-3,-24);ctx.closePath();},'#6a0a24',1);
  ctx.strokeStyle='#9a2a4a';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(-4,-31);ctx.lineTo(-22,-43+f);ctx.moveTo(-6,-29);ctx.lineTo(-15,-30);ctx.stroke();
}
function drawBody(e,L){
  const P=pose(e);const oy=P.oy;
  const hipY=-18+oy;
  if(L.wings)drawWings(e);
  const shB=[-3.5,-34.5+oy],shF=[3,-34.5+oy];
  // braço de trás
  drawArm(L,P.ab,true,shB);
  // pernas
  const hipB=[-2.5,hipY],hipF=[2.5,hipY];
  if(P.kick==='kick'){drawLeg(L,hipB,[-4,0],true);limb([hipF,[9,hipY-1]],6.6,L.pants);limb([[9,hipY-1],[18,hipY-2]],5.8,L.pants);
    ctx.save();ctx.translate(19,hipY-2);ctx.rotate(-Math.PI/2);shape(()=>{ctx.moveTo(-3,-2);ctx.quadraticCurveTo(1,-3.2,5,-.8);ctx.quadraticCurveTo(6.4,.6,5.5,1.8);ctx.lineTo(-3.2,1.8);ctx.closePath();},L.shoe,1);ctx.restore();}
  else if(P.kick==='air'){drawLeg(L,hipB,[-9,hipY+9],true,-3);limb([hipF,[9,hipY+3]],6.6,L.pants);limb([[9,hipY+3],[17,hipY+8]],5.8,L.pants);
    ctx.save();ctx.translate(18,hipY+8);ctx.rotate(-1.1);shape(()=>{ctx.moveTo(-3,-2);ctx.quadraticCurveTo(1,-3.2,5,-.8);ctx.quadraticCurveTo(6.4,.6,5.5,1.8);ctx.lineTo(-3.2,1.8);ctx.closePath();},L.shoe,1);ctx.restore();}
  else if(P.kick==='knee'){drawLeg(L,hipB,[-4,0],true);limb([hipF,[9,hipY-2]],6.6,L.pants);limb([[9,hipY-2],[8,hipY+8]],5.8,L.pants);}
  else{drawLeg(L,hipB,[P.bx+1,-P.bl],true);drawLeg(L,hipF,[P.fx+3,-P.fl],false);}
  ctx.save();ctx.translate(0,oy);
  if(P.hurt)ctx.rotate(-.08);
  drawTorso(L);
  drawInstrument(L,P);
  ctx.save();ctx.translate(1.5,-47);ctx.scale(1.28,1.28);if(P.hurt)ctx.rotate(-.15);drawHead(L,P.hurt);ctx.restore();
  ctx.restore();
  const hd=drawArm(L,P.af,false,shF);if(!e.weapon)drawHandProp(L,hd,P.af);
  if(e.weapon&&e.state!=='hurt'&&e.state!=='grab'&&e.state!=='pickup'){
    ctx.save();ctx.translate(hd[0],hd[1]);
    if(P.wmode==='swing')ctx.rotate(.05);else if(P.wmode==='back')ctx.rotate(-2.3);else ctx.rotate(-1.2);
    weaponShape(e.weapon.w);ctx.restore();
    shape(ellipseP(hd[0],hd[1],2.9,2.7),L.skin,1);
  }
}

// ---------- sprites pixel art desenhados a mao (banda + Rubão) ----------
const PSPR={};for(const k in PIXDATA){const d=PIXDATA[k];const im=new Image();im.src=d.src;const mh=new Image();if(d.mhead)mh.src=d.mhead;PSPR[k]=Object.assign({img:im,mimg:mh,idx:Object.fromEntries(d.names.map((n,i)=>[n,i]))},d);}
function pixFrame(e){
  if(e.forceFrame)return e.forceFrame;
  const st=e.state,t=e.t||0;
  if(st==='walk'||st==='run')return'walk'+(Math.floor(t/(st==='run'?6:10))%4);
  if(st==='jump')return(e.airAtk&&e.airAtk.t>=2)?'kick':'jump';
  if(st==='air')return e.t<6?'hurt':'jump';
  if(st==='down'||st==='dead')return'jump';
  if(st==='getup')return e.t<8?'jump':'idle1';
  if(st==='hurt'||st==='grabbed')return'hurt';
  if(st==='getup'||st==='pickup'||st==='block')return'idle1';
  if(st==='grab')return e.knee>0?'kick':'punch2';
  if(st==='throw')return e.t<6?'punch2':'punch';
  if(st==='attack'&&e.atk){const d=e.atk,a=e.atkT,ph=a<d.s?0:a<d.s+d.a?1:2;
    if(d.spin&&e.drunk)return ph===1?'punch':'idle1';
    if(d.vomit)return ph===0?'idle1':'punchB';
    if(d.sig&&isAxe(e)&&!d.discs)return ph===0?'axeUp':(ph===1||a<d.s+d.a+6)?'axeDown':'idle0';
    if(d.sig){const alt=sigOf(e)==='sticks'&&(e.atkName==='sB'||e.atkName==='fin2');return ph===0?'punch2':(ph===1||a<d.s+d.a+5)?(alt?'punchB':'punch'):'idle0';}
    if(d.leg==='kick')return ph===1?'kick':'idle1';
    if(e.atkName==='mB')return ph===0?'idle1':'punchB';
    if(e.atkName==='mC')return ph===0?'punch2':'punch';
    if(e.atkName==='cross')return ph===0?'idle1':(ph===1||a<d.s+d.a+4)?'punchB':'idle0';
    if(ph===0)return'idle1';
    if(ph===1)return(d.arm==='upper'||d.spin||d.beam||d.fire)?'punch2':'punch';
    return a<d.s+d.a+3?'punch':'idle0';}
  return'idle'+(Math.floor(t/24)%2);
}

// ---------- armas individuais de cada personagem ----------
const SIGW={ // alcance extra, multiplicador de dano, velocidade, escala do desenho, nome
  guitar:{reach:14,dm:1.35,sp:0,sc:.8,name:'GUITARRA'},guitar2:{reach:14,dm:1.35,sp:0,sc:.8,name:'GUITARRA'},
  bass:{reach:18,dm:1.45,sp:1,sc:.75,name:'BAIXO'},mic:{reach:4,dm:1.1,sp:-1,sc:1,name:'MICROFONE'},
  sticks:{reach:12,dm:1.05,sp:-2,sc:1,name:'BAQUETAS'},vinyl:{reach:4,dm:1.15,sp:-1,sc:1,name:'DISCO DE VINIL'},
  bat:{reach:10,dm:1.3,sp:0,sc:1,name:'TACO'},skate:{reach:10,dm:1.3,sp:0,sc:1,name:'SKATE'},chain:{reach:16,dm:1.2,sp:-1,sc:1,name:'CORRENTE'}};
const SIGOF={rub_red:'bat',rub_leather:'bat',rub_33:'bat',vocal:'mic',guitar:'guitar',guitar2:'guitar2',baixo:'bass',batera:'sticks',dj:'vinyl',angelo:'skate',feijao:'chain'};
const SIGIMG={};for(const k in SIGDATA){const im=new Image();im.src=SIGDATA[k].src;SIGIMG[k]=Object.assign({img:im},SIGDATA[k]);}
function isRub(e){return e.look&&e.look.pix&&e.look.pix.indexOf('rub_')===0;}
function gloveOn(e){return isRub(e)&&e.state==='attack'&&['jab','cross','finR','mA','mB','mC'].includes(e.atkName);}
function drawGloves(e,P_,fn){const G=SIGIMG.glove;if(!G||!G.img.complete)return;
  for(const f of [P_.bfist&&P_.bfist[fn],P_.fist&&P_.fist[fn]]){if(!f)continue;
    ctx.drawImage(G.img,Math.round(f[0]-P_.ax-G.gx),Math.round(f[1]-P_.ay-G.gy));}}
function isAxe(e){const k=sigOf(e);return k==='guitar'||k==='guitar2'||k==='bass';}
function sigOf(e){return e.look&&SIGOF[e.look.pix];}
function sigDef(e,name){const b=ATK[name],k=sigOf(e),W_=SIGW[k]||SIGW.bat;
  return Object.assign({},b,isAxe(e)?{heavy:true,s:b.s+2}:{},{dmg:Math.round(b.dmg*W_.dm),reach:[0,b.reach[1]+W_.reach],s:Math.max(2,b.s+W_.sp),r:Math.max(2,b.r+W_.sp)});}
function sigVisible(e){if(!sigOf(e)||e.weapon)return false;
  if(e.state==='attack'&&e.atk&&e.atk.sig)return true;
  return e.sigOn&&['idle','walk','run','attack','jump','block'].includes(e.state);}
function drawSig(e,P_,fn,ph){
  const k=sigOf(e),S_=SIGIMG[k];if(!S_||!S_.img.complete)return;const f=P_.fist&&P_.fist[fn];if(!f)return;
  let ang=-1.2;
  if(fn==='axeUp')ang=-1.95;else if(fn==='axeDown')ang=.55;else if(fn==='punch')ang=.12;else if(fn==='punch2')ang=-2.3;else if(fn==='kick'||fn==='jump')ang=-.9;
  if(e.state==='attack'&&e.atk&&e.atk.sig&&ph===2&&!fn.startsWith('axe'))ang=.35;
  if(k==='vinyl'&&fn!=='punch')ang+=.6;
  const sc=SIGW[k].sc;
  const put=(p,a)=>{ctx.save();ctx.translate(p[0]-P_.ax,p[1]-P_.ay);ctx.rotate(a);ctx.scale(sc,sc);ctx.drawImage(S_.img,-S_.gx,-S_.gy);ctx.restore();};
  if(k==='sticks'){const bf=P_.bfist&&P_.bfist[fn];if(bf)put(bf,fn==='punchB'?.1:ang-.35);put(f,fn==='punchB'?-1.3:ang);return;}
  put(f,ang);
}

// ---------- modo MÁSCARA (barra de fúria) ----------
const MASKCOL={rub_red:'255,40,60',rub_leather:'255,40,60',rub_33:'255,40,60',vocal:'255,60,40',guitar:'160,160,180',guitar2:'255,50,50',baixo:'60,255,140',batera:'255,30,50',dj:'190,90,255',angelo:'60,220,100',feijao:'255,200,40'};
function maskRGB(e){return MASKCOL[e.look&&e.look.pix]||'255,120,40';}
function addFury(p,n){if(!p||!p.isPlayer)return;
  if(!power){const w=(p.pw||0)>=100;p.pw=Math.min(100,(p.pw||0)+n*1.35);if(!w&&p.pw>=100){sfx('select');parts.push({type:'num',x:p.x,y:p.y,z:90,t:0,life:50,v:'PODER PRONTO!',c:'#5ae0ff',small:true});}}
  if(p.maskT>0)return;const was=p.fury>=100;p.fury=Math.min(100,(p.fury||0)+n);if(!was&&p.fury>=100){sfx('select');parts.push({type:'num',x:p.x,y:p.y,z:76,t:0,life:50,v:'MÁSCARA PRONTA!',c:'#ffe066',small:true});}}
window.__fill=()=>{const p=players[0];if(p){p.fury=100;p.pw=100;}};
// ================= PODERES INDIVIDUAIS =================
let power=null;const PCUT=84;
const PNAME={vocal:'BERRO TROVÃO!',guitar2:'RAIO DA GUITARRA!',guitar:'CHUVA DE FOGO!',baixo:'CESTA DE 3!',batera:'PEÃO DA BATERIA!',angelo:'TOFUZAÇÃO!',feijao:'SABE DE NADA, INOCENTE!',dj:'CHUVA DE VINIL!'};
function onScr(){return enemies.filter(e=>!e.dying&&e.state!=='dead'&&e.x>cam-6&&e.x<cam+W+6);}
function pHit(e,dmg,stun){const p=power.p;if((e.type==='boss'||e.mpBoss)&&dmg>70)dmg=70;
  applyHit({isPlayer:true,atkBonus:0,facing:e.x>=p.x?1:-1,x:p.x,gp:p.gp,maxGp:p.maxGp,scale:1},e,dmg>=20?{dmg,kb:3,kd:true,launch:3.2,heavy:true}:{dmg,kb:.8});
  if(stun&&!e.dying){e.state='idle';e.atk=null;e.stunT=stun;}}
function startPower(p){const k=p.look.pix;power={k,by:p.slot,p,t:0,tg:onScr(),x0:p.x,y0:p.y,c0:cam,fx:[]};power.tg.forEach(e=>{e.stunT=9999;});p.state='idle';sfx('level');}
function endPower(){const P=power;power=null;enemies.forEach(e=>{if(e.stunT>2000)e.stunT=0;if(e.tofu&&!e.dying)e.tofu=false;});if(P&&P.p)P.p.facing=1;}
const HEADSZ={vocal:[28,32],feijao:[28,26]};
function headBox(e){const P_=PSPR[e.look.pix];if(!P_||!P_.hpos)return null;const fn=pixFrame(e),hp=P_.hpos[fn];if(!hp)return null;
  const sz=HEADSZ[e.look.pix]||[28,30],px=(e.scale||1)/1.2*(e.pxMul||1),f=e.facing||1,w=sz[0],h=sz[1];
  return{P_,i:P_.idx[fn]||0,hp,w,h,px,f,nx:e.x-cam+f*(hp[0]+w/2-P_.ax)*px,ny:e.y-e.z+(hp[1]+h-P_.ay)*px};}
function updPower(){const P=power,p=P.p;P.t++;const u=P.t-PCUT;if(u<0){if(P.t===PCUT-30)sfx('confirm');return;}
  const tg=P.tg.filter(e=>enemies.includes(e));
  switch(P.k){
    case'vocal':if(u===14){sfx('special');shakeT=40;shakeM=4;tg.forEach(e=>pHit(e,6,180));P.done=1;}if(u%10===0&&u<90)P.fx.push({r:6,t:0});if(u>110)endPower();break;
    case'feijao':if(u===1)p.say={v:'SABE DE NADA, INOCENTE!',t:140};if(u===40){sfx('alert');shakeT=12;shakeM=2;tg.forEach(e=>pHit(e,4,180));}if(u>150)endPower();break;
    case'guitar2':{const i=Math.floor(u/12);if(u%12===0&&i<tg.length){P.bolt={e:tg[i],t:0};sfx('special');shakeT=6;shakeM=3;}
      if(P.bolt){P.bolt.t++;if(P.bolt.t===4){pHit(P.bolt.e,999);spark(P.bolt.e.x,P.bolt.e.y,40,'#bfe6ff',true);}if(P.bolt.t>10)P.bolt=null;}
      if(u>tg.length*12+30||(!tg.length&&u>40))endPower();break;}
    case'guitar':{P.tg.forEach((e,i)=>{const land=i*12+34;if(u===i*12)P.fx.push({e,t:0,x:e.x+rnd(-20,20)});if(u===land&&enemies.includes(e)){pHit(e,999);sfx('heavy');shakeT=8;shakeM=3;puff(e.x,e.y,6);parts.push({type:'pow',x:e.x,y:e.y,z:40,t:0,life:26,v:'BOOM!',rot:0});}});
      P.fx.forEach(f=>f.t++);if(u>P.tg.length*12+60)endPower();break;}
    case'baixo':{const n=P.tg.length,st=16;
      if(!P.ball)P.ball={x:p.x+p.facing*12,y:p.y,z:40};
      const i=Math.floor(u/st);
      if(i<n){const e=P.tg[i],a=(u%st)/st,from=i?P.tg[i-1]:{x:p.x+p.facing*12,y:p.y,z:0};const fz=i?55:40;
        P.ball={x:from.x+(e.x-from.x)*a,y:from.y+(e.y-from.y)*a,z:fz+(55-fz)*a+Math.sin(a*Math.PI)*30};
        if(u%st===st-1&&enemies.includes(e)){pHit(e,10,180);sfx('hit');parts.push({type:'num',x:e.x,y:e.y,z:80,t:0,life:30,v:'TÓIM!',c:'#ff9a30'});}}
      else{const v=u-n*st;P.hoop=true;
        if(v<14){const a=v/14;const L=n?P.tg[n-1]:p;P.ball={x:L.x+(p.x-L.x)*a,y:L.y+(p.y-L.y)*a,z:55-15*a};}
        else if(v<60){const a=(v-14)/46,hx=cam+W-46,hy=p.y,hz=150;P.ball={x:p.x+(hx-p.x)*a,y:p.y,z:40+(hz-40)*a+Math.sin(a*Math.PI)*70};if(v===15)sfx('swing');}
        else{if(v===60){sfx('level');parts.push({type:'big',x:cam+W/2,y:p.y,z:110,t:0,life:110,v:'CESTA DE 3!',c:'#ff9a30'});}P.ball={x:cam+W-46,y:p.y,z:150-(v-60)*2.5};if(v>100)endPower();}}
      break;}
    case'batera':{const path=[P.x0,P.c0+W-40,P.c0+40,P.x0],seg=40,i=Math.min(2,Math.floor(u/seg)),a=(u%seg)/seg;
      if(u<seg*3){p.x=path[i]+(path[i+1]-path[i])*a;p.facing=Math.floor(u/3)%2?1:-1;if(u%seg===0)P.hs=new Set();if(u%6===0){sfx('swing');puff(p.x,p.y,1);}
        for(const e of enemies)if(!e.dying&&!P.hs.has(e)&&Math.abs(e.x-p.x)<30&&Math.abs(e.y-p.y)<18){P.hs.add(e);pHit(e,26);}}
      else endPower();break;}
    case'angelo':{if(u===1)P.tg.forEach(e=>{e.tofu=true;puff(e.x,e.y,4);});const st=22,i=Math.floor((u-20)/st);
      if(u>=20&&i<P.tg.length){const e=P.tg[i],a=((u-20)%st)/st;if(a===0)P.sx=p.x;p.x=P.sx+(e.x-e.facing*0-18*Math.sign(e.x-P.sx||1)-P.sx)*Math.min(1,a*1.6);p.y+=(e.y-p.y)*.2;p.facing=e.x>=p.x?1:-1;
        if((u-20)%st===st-4&&enemies.includes(e)){sfx('hit');parts.push({type:'num',x:e.x,y:e.y,z:50,t:0,life:30,v:'NHAM!',c:'#fff6c0'});if(e.type==='boss'||e.mpBoss){pHit(e,70,0);e.tofu=false;}else{e.hp=0;e.dying=true;e.state='dead';e.t=0;e.eaten=true;}}}
      else if(u>=20)endPower();break;}
    default:{if(u%5===0&&u<60){projs.push({kind:'disc',by:P.by,x:cam-10,y:YMIN+rnd(0,YMAX-YMIN),z:rnd(20,50),vx:6.5,t:0,hitSet:new Set(),last:true});sfx('swing');}if(u>100)endPower();}
  }
}
function drawTofu(e,x,y){if(e.eaten)return;const s=e.scale>1.3?1.4:1;const w=26*s,h=22*s;x=Math.round(x);y=Math.round(y);
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x,y,w*.6,4,0,0,7);ctx.fill();
  R(x-w/2,y-h,w,h,'#f6f0dc');R(x-w/2,y-h,w,4*s,'#fffcf0');R(x+w/2-4*s,y-h,4*s,h,'#e0d6b8');R(x-w/2,y-h,w,1,'#a89c78');
  const b=Math.floor(t60/10)%2;R(x-6*s,y-h*.62-b,3*s,3*s,'#222');R(x+3*s,y-h*.62-b,3*s,3*s,'#222');
  ctx.strokeStyle='#222';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(x,y-h*.42-b,5*s,.2,Math.PI-.2);ctx.stroke();R(x-9*s,y-h*.45,3*s,2*s,'#ff9ab0');R(x+6*s,y-h*.45,3*s,2*s,'#ff9ab0');}
function bolt(x1,y1,x2,y2,c){ctx.strokeStyle=c;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x1,y1);const n=8;for(let i=1;i<n;i++){const a=i/n;ctx.lineTo(x1+(x2-x1)*a+rnd(-8,8),y1+(y2-y1)*a+rnd(-8,8));}ctx.lineTo(x2,y2);ctx.stroke();}
function drawPowerFX(){const P=power;if(!P||P.t<=PCUT)return;const p=P.p,u=P.t-PCUT,px=p.x-cam,py=p.y-p.z;
  if(P.k==='vocal'||P.k==='feijao'){const H=headBox(p);if(H){
    if(P.k==='vocal'){const op=Math.min(1,u/10)*(u<95?1:Math.max(0,(110-u)/15)),k=1+.45*op,S2=H.px*k;
      ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(H.nx),Math.round(H.ny));ctx.scale(H.f*S2,S2);
      ctx.drawImage(H.P_.img,H.i*H.P_.fw+H.hp[0],H.hp[1],H.w,H.h,-H.w/2,-H.h,H.w,H.h);
      const mo=op*(2+Math.abs(Math.sin(u/3))*3.2),mx0=14-H.w/2,my0=21.5-H.h;
      if(op>.05){ctx.fillStyle='#2a0608';ctx.beginPath();ctx.ellipse(mx0,my0+mo*.35,4.2,1.2+mo,0,0,7);ctx.fill();ctx.fillStyle='#c02a3a';ctx.beginPath();ctx.ellipse(mx0,my0+mo*.9,2.6,mo*.4,0,0,7);ctx.fill();ctx.fillStyle='#f4f0e8';ctx.fillRect(mx0-3,my0-1+mo*.35-mo,6,1);}
      ctx.restore();const mx=H.nx,my=H.ny+my0*S2;
      for(const f of P.fx){f.t++;f.r+=6;ctx.globalAlpha=Math.max(0,1-f.r/300);ctx.strokeStyle=f.r%12?'#fff':'#ffe066';ctx.lineWidth=3;ctx.beginPath();ctx.arc(mx+H.f*8,my,f.r,H.f>0?-1:Math.PI-1,H.f>0?1:Math.PI+1);ctx.stroke();}ctx.globalAlpha=1;
      if(u<90)outlineText('AAAAAAHHH!!',Math.round(mx+H.f*70),Math.round(my-34),12,'#ffe066','#000',4);}
    else{ctx.save();ctx.translate(Math.round(H.nx),Math.round(H.ny));ctx.scale(H.f*H.px,H.px);const ey=11.5-H.h,x0=-H.w/2;
      R(x0+4,ey-2.5,9,5,'#0a0a0a');R(x0+15,ey-2.5,9,5,'#0a0a0a');R(x0+12,ey-2,4,1.5,'#0a0a0a');R(x0+2,ey-2.5,2,1.5,'#0a0a0a');R(x0+24,ey-2.5,2,1.5,'#0a0a0a');
      R(x0+5,ey-1.5,3,1,'#9ab0d0');R(x0+16,ey-1.5,3,1,'#9ab0d0');ctx.restore();
      if(Math.floor(u/6)%2===0)glow(H.nx-H.f*4*H.px,H.ny+(ey)*H.px,8,'rgba(255,255,255,1)',.5);}}}
  if(P.k==='guitar2'&&P.bolt){const e=P.bolt.e,gx=px+p.facing*14,gy=py-44;ctx.save();ctx.globalCompositeOperation='lighter';bolt(gx,gy,e.x-cam,e.y-e.z-40,'#8ad0ff');bolt(gx,gy,e.x-cam,e.y-e.z-40,'#ffffff');ctx.restore();glow(e.x-cam,e.y-e.z-40,40,'rgba(140,200,255,1)',.8);glow(gx,gy,26,'rgba(140,200,255,1)',.8);if(P.bolt.t<3)R(0,0,W,H,'rgba(200,230,255,.25)');}
  if(P.k==='guitar'){for(const f of P.fx){const a=Math.min(1,f.t/34);if(a>=1)continue;const x=f.x-cam+(1-a)*-60,y=-20+(f.e.y-30+20)*a;ctx.save();ctx.globalCompositeOperation='lighter';for(let k=0;k<6;k++){ctx.globalAlpha=.5-k*.08;ctx.fillStyle=k<2?'#fff0a0':'#ff6a20';ctx.beginPath();ctx.arc(x-k*5*.5,y-k*7,9-k,0,7);ctx.fill();}ctx.restore();glow(x,y,30,'rgba(255,120,30,1)',.6);}
    if(u<40)R(0,0,W,H,'rgba(255,80,0,'+(.12*Math.sin(u/40*Math.PI))+')');}
  if(P.k==='baixo'&&P.ball){const b=P.ball,bx=Math.round(b.x-cam),by=Math.round(b.y-b.z);ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(bx,Math.round(b.y),5,2,0,0,7);ctx.fill();
    ctx.fillStyle='#e8701a';ctx.beginPath();ctx.arc(bx,by,6,0,7);ctx.fill();ctx.strokeStyle='#3a1a08';ctx.lineWidth=1;ctx.beginPath();ctx.arc(bx,by,6,0,7);ctx.moveTo(bx-6,by);ctx.lineTo(bx+6,by);ctx.moveTo(bx,by-6);ctx.lineTo(bx,by+6);ctx.stroke();
    if(P.hoop){const hx=W-46,hy=Math.round(p.y-150);R(hx-4,hy-34,44,30,'#fff');R(hx-4,hy-34,44,2,'#c02020');R(hx+8,hy-24,18,12,'rgba(0,0,0,0)');ctx.strokeStyle='#c02020';ctx.lineWidth=2;ctx.strokeRect(hx+8,hy-24,16,12);R(hx+38,hy-34,4,100,'#555');
      ctx.strokeStyle='#ff5a10';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(hx,hy-2,10,3,0,0,7);ctx.stroke();ctx.strokeStyle='#eee';ctx.lineWidth=1;for(let k=-8;k<=8;k+=4){ctx.beginPath();ctx.moveTo(hx+k,hy);ctx.lineTo(hx+k*.6,hy+12);ctx.stroke();}}}
  if(P.k==='batera'&&u<120){ctx.save();ctx.globalCompositeOperation='lighter';for(let k=0;k<3;k++){ctx.globalAlpha=.35-k*.1;ctx.strokeStyle=k?'#ffe066':'#fff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(px,py-30-k*14,24-k*3,6,0,t60*.5+k,t60*.5+k+4.5);ctx.stroke();}ctx.restore();}
  ctx.globalAlpha=1;
}
function drawPowerCut(){const P=power;if(!P||P.t>PCUT)return;const t=P.t,p=P.p;
  const inA=Math.min(1,t/10),outA=t>PCUT-10?(PCUT-t)/10:1,k=inA*outA;
  ctx.fillStyle='rgba(0,0,0,'+(.55*k)+')';ctx.fillRect(0,0,W,H);
  const off=(1-inA)*W-(1-outA)*W*0;ctx.save();ctx.translate(off,0);ctx.globalAlpha=outA;
  const poly=()=>{ctx.beginPath();ctx.moveTo(26,44);ctx.lineTo(462,22);ctx.lineTo(452,226);ctx.lineTo(16,246);ctx.closePath();};
  ctx.fillStyle='#000';ctx.save();ctx.translate(5,5);poly();ctx.fill();ctx.restore();
  poly();ctx.fillStyle='#fff';ctx.fill();ctx.save();ctx.translate(240,134);ctx.scale(.97,.95);ctx.translate(-240,-134);poly();ctx.clip();
  const c=maskRGB(p);ctx.fillStyle='rgb('+c+')';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(0,0,0,.25)';for(let y=20;y<250;y+=7)for(let x=(y%14?0:3);x<470;x+=7){ctx.beginPath();ctx.arc(x,y,1.6+x/470*1.4,0,7);ctx.fill();}
  ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=2;for(let i=0;i<28;i++){const a=i/28*Math.PI*2+t*.01,r1=60+((i*37)%30);ctx.beginPath();ctx.moveTo(330+Math.cos(a)*r1,134+Math.sin(a)*r1*.7);ctx.lineTo(330+Math.cos(a)*420,134+Math.sin(a)*300);ctx.stroke();}
  const im=TELIMG[p.look.pix];if(im&&im.complete&&im.naturalWidth){const z=1+t*.0025,h=232*z,w=h*im.naturalWidth/im.naturalHeight;ctx.drawImage(im,330-w/2,124-h/2+12,w,h);
    const g=ctx.createLinearGradient(170,0,260,0);g.addColorStop(0,'rgb('+c+')');g.addColorStop(1,'rgba('+c+',0)');ctx.fillStyle=g;ctx.fillRect(160,0,100,H);}
  ctx.restore();
  ctx.lineWidth=4;ctx.strokeStyle='#000';poly();ctx.stroke();
  // caixas de texto estilo HQ
  const nm=p.look.name||'';R(30,52,ctx.measureText?Math.max(120,nm.length*11+16):140,22,'#000');R(28,50,Math.max(120,nm.length*11+16),22,'#ffe066');txt(nm,36,57,8,'#000');
  const pn=PNAME[p.look.pix]||'PODER!';const sc=1+.08*Math.sin(t/3);ctx.save();ctx.translate(120,150);ctx.rotate(-.12);ctx.scale(sc,sc);
  ctx.fillStyle='#fff';ctx.beginPath();for(let i=0;i<24;i++){const a=i/24*Math.PI*2,r=i%2?62:86;ctx.lineTo(Math.cos(a)*r*1.25,Math.sin(a)*r*.62);}ctx.closePath();ctx.fill();ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.stroke();
  const ws=pn.split(' ');const lines=ws.length>2?[ws.slice(0,Math.ceil(ws.length/2)).join(' '),ws.slice(Math.ceil(ws.length/2)).join(' ')]:[pn];
  lines.forEach((l,i)=>outlineText(l,0,(i-(lines.length-1)/2)*16,lines.length>1?10:12,'#ff3a2a','#000',4));ctx.restore();
  ctx.restore();
}
function activateMask(p){p.fury=0;p.maskT=600;p.inv=Math.max(p.inv,30);sfx('special');shakeT=16;shakeM=3;hitstop=8;
  parts.push({type:'pow',x:p.x,y:p.y,z:70,t:0,life:40,v:'MÁSCARA!',rot:0});
  for(let i=0;i<24;i++)parts.push({type:'bit',x:p.x,y:p.y,z:rnd(10,60),vx:rnd(-3,3),vz:rnd(0,3),t:0,life:rnd(18,30),c:'rgb('+maskRGB(p)+')'});}
function drawMaskFX(){const p=me();if(!p||p.out||!(p.maskT>0))return;FRAME.maskOverlay=true;
  const c=maskRGB(p),k=p.maskT<120?(Math.floor(p.maskT/6)%2?.5:1):1,beat=(t60%20)<4?1:0;
  ctx.save();ctx.globalCompositeOperation='overlay';ctx.globalAlpha=(.28+beat*.12)*k;
  const hue=(t60*4)%360;ctx.fillStyle='hsl('+hue+',90%,55%)';ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=(.08+beat*.1)*k;ctx.fillStyle='rgb('+c+')';ctx.fillRect(0,0,W,H);ctx.restore();
  for(let i=0;i<6;i++){const x=((i*83+t60*3)%W),y=40+((i*37+t60)%120);glow(x,y,26,'rgba('+c+',1)',.18*k);}
}
function drawPixFighter(e,sx,sy,s){
  const P_=PSPR[e.look.pix];if(!P_||!P_.img.complete)return false;
  const px=s/1.2*(e.pxMul||1);const fn=pixFrame(e);const i=P_.idx[fn]||0;
  let rot=0,dx=0,dy=0;
  let sqx=1,sqy=1;
  if(e.state==='down'||e.state==='dead'){
    const t=e.t||0,b=t<14?Math.abs(Math.sin(t/14*Math.PI))*5*(1-t/14):0;
    rot=-Math.PI/2+(t<14?Math.sin(t*.9)*.08*(1-t/14):0);dx=28*px;dy=(-4-b)*px;
    if(t<5){sqx=1.12;sqy=.88;}}
  else if(e.state==='air'){const a=Math.min(1,e.t/16);rot=-Math.PI/2*a-Math.sin(Math.min(1,e.t/16)*Math.PI)*.35;dx=28*a*px;dy=-4*a*px;}
  else if(e.state==='getup'){const a=Math.max(0,1-e.t/12);rot=-Math.PI/2*a;dx=28*a*px;dy=-4*a*px;}
  else if(e.state==='hurt'||e.state==='grabbed')rot=-.1;
  if(e.maskT>0)glow(sx,sy-40*px,46*px,'rgba('+maskRGB(e)+',1)',.35+.15*Math.sin(t60/4));
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(sx),Math.round(sy));ctx.scale((e.state==='attack'&&e.atk&&e.atk.spin&&e.spinF)?e.spinF:(e.facing||1),1);ctx.translate(dx,dy);if(rot)ctx.rotate(rot);ctx.scale(px*sqx,px*sqy);
  const draw=()=>ctx.drawImage(P_.img,i*P_.fw,0,P_.fw,P_.fh,-P_.ax,-P_.ay,P_.fw,P_.fh);
  const behind=fn==='axeUp'&&sigVisible(e);
  if(behind)drawSig(e,P_,fn,0);
  draw();
  if(e.maskT>0&&P_.mimg.complete&&P_.hpos&&P_.hpos[fn]){const hp=P_.hpos[fn],mo=P_.moff||[0,0];ctx.drawImage(P_.mimg,hp[0]+mo[0]-P_.ax,hp[1]+mo[1]-P_.ay);}
  if(gloveOn(e))drawGloves(e,P_,fn);
  if(sigVisible(e)&&!behind){const d=e.atk,a=e.atkT;drawSig(e,P_,fn,d&&e.state==='attack'?(a<d.s?0:a<d.s+d.a?1:2):-1);}
  if(e.weapon&&e.state!=='hurt'&&e.state!=='grab'&&e.state!=='pickup'){ctx.save();const pun=fn==='punch'||fn==='punch2'||fn==='punchB';const fp=(P_.fist&&P_.fist[fn])||[P_.fw*.7,P_.fh*.4];ctx.translate(fp[0]-P_.ax,fp[1]-P_.ay);ctx.scale(1.1,1.1);ctx.rotate(pun?.05:fn.startsWith('walk')?-1.0:-1.25);weaponShape(e.weapon.w);ctx.restore();}
  if(e.flashT>0){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=e.flashT/6*.75;draw();}
  ctx.restore();return true;
}
function drawFighterAt(e,sx,sy,mul){
  const L=e.look;const s=(e.scale||1)*(mul||1);
  if(L.pix&&drawPixFighter(e,sx,sy,s))return;
  const tmp={look:L,state:e.state,t:e.t,atk:e.atk,atkT:e.atkT,atkName:e.atkName,airAtk:e.airAtk,weapon:e.weapon,knee:e.knee,facing:1};
  let rot=0,dx=0,dy=0;
  if(e.state==='down'||e.state==='dead'){tmp.state='idle';tmp.t=0;tmp.weapon=null;rot=-Math.PI/2;dx=26*s;dy=-7*s;}
  else if(e.state==='air'){const a=Math.min(1,e.t/10);tmp.state='hurt';rot=-Math.PI/2*a;dx=26*a*s;dy=-7*a*s;}
  const spr=getSprite(tmp,Math.round(s*20)/20,e.facing);
  ctx.save();ctx.translate(Math.round(sx),Math.round(sy));ctx.scale(e.facing,1);ctx.translate(dx,dy);if(rot)ctx.rotate(rot);
  ctx.drawImage(spr,-BAX,-BAY);
  if(e.flashT>0){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=e.flashT/6*.75;ctx.drawImage(spr,-BAX,-BAY);}
  ctx.restore();
}
function drawShadow(x,y,z,s){
  const w=Math.max(4,(12-z*0.15))*s;
  ctx.fillStyle='rgba(10,10,40,.32)';ctx.beginPath();ctx.ellipse(x,y,w,3*s,0,0,Math.PI*2);ctx.fill();
}
// compat para retrato
function head(L,hurt){drawHead(L,hurt);}
function torso(L){drawTorso(L);}

function pose(e){
  const t=e.t;let P={fx:0,fl:0,bx:-4,bl:0,oy:0,af:'rest',ab:'rest',kick:null,hurt:false,wmode:'hold'};
  const st=e.state;
  if(st==='idle'){P.oy=Math.floor(t/24)%2;}
  else if(st==='walk'||st==='run'){
    const sp=st==='run'?4:7;const p=Math.floor(t/sp)%4;const k=st==='run'?[4,1,-4,-1]:[2,1,-2,-1];
    P.fx=-1+k[p];P.bx=-3-k[p];P.fl=p===1?2:0;P.bl=p===3?2:0;P.oy=(p%2);
    P.af=p<2?'swingB':'swingA';P.ab=p<2?'swingA':'swingB';
  }
  else if(st==='jump'){P.fx=1;P.fl=4;P.bx=-5;P.bl=2;P.af='up';P.wmode='back';
    if(e.airAtk&&e.airAtk.t>=2){P.kick='air';P.af='rest';P.wmode='hold';}}
  else if(st==='block'){P.af='guard';P.ab='guard';P.fx=1;P.bx=-5;P.oy=1;}
  else if(st==='hurt'||st==='grabbed'){P.hurt=true;P.af='hurt';P.oy=1;P.fx=1;P.bx=-5;}
  else if(st==='getup'){P.oy=5;P.fx=2;P.bx=-6;}
  else if(st==='pickup'){P.oy=6;P.fx=2;P.bx=-6;P.af='punch';}
  else if(st==='grab'){P.af='grab';P.ab='grab';P.fx=1;P.bx=-5;if(e.knee>0){P.kick='knee';}}
  else if(st==='throw'){P.af=e.t<6?'grab':'punch2';P.fx=2;P.bx=-6;}
  else if(st==='attack'&&e.atk){
    const d=e.atk,a=e.atkT;const ph=a<d.s?0:a<d.s+d.a?1:2;
    if(d.leg==='kick'){P.kick=ph===1?'kick':null;P.af=ph===0?'windup':'rest';if(ph===0)P.fx=-1;}
    else if(d.spin){P.af=ph===0?'up':'spin';P.ab=ph===0?'up':'spin';P.oy=ph===0?2:0;}
    else if(d.beam){P.af=ph===0?'windup':'punch2';P.ab=ph===0?'windup':'punch';P.fx=2;P.bx=-7;P.oy=ph===0?1:0;}
    else if(d.fire){P.af=ph===0?'windup':'cast';P.oy=ph===0?1:0;P.fx=2;P.bx=-6;}
    else if(d.weaponSwing){
      if(ph===0){P.af='windup';P.wmode='back';P.oy=1;}
      else if(ph===1||a<d.s+d.a+4){P.af='punch';P.wmode='swing';P.fx=2;P.bx=-6;}
      else{P.af='rest';}
    }
    else{
      const arm=d.arm||'punch';
      if(ph===0){P.af=(d.s>=10)?'windup':'rest';P.oy=d.s>=10?1:0;}
      else if(ph===1){P.af=arm;P.fx=2;P.bx=-6;}
      else{P.af=arm==='upper'?'upper':(a<d.s+d.a+3?arm:'rest');P.fx=1;P.bx=-5;}
    }
  }
  return P;
}

// ---------- banda + motor de sprites ----------
function hexToRgb(h){const n=parseInt(h.slice(1),16);return[n>>16,(n>>8)&255,n&255];}
function mixHex(h,f){if(typeof h!=='string'||h[0]!=='#'||h.length!==7)return h;const [r,g,b]=hexToRgb(h);const m=v=>Math.max(0,Math.min(255,Math.round(f<1?v*f:v+(255-v)*(f-1))));return'#'+[m(r),m(g),m(b)].map(v=>v.toString(16).padStart(2,'0')).join('');}
// cabeças e troncos da banda (desenho original baseado nos integrantes)
function drawHeadBand(L,hurt){
  const sk=L.skin,sd=L.skinD;
  const headShape=()=>{ctx.moveTo(-6.5,-6);ctx.bezierCurveTo(-7,-13,6,-14,8,-6);ctx.bezierCurveTo(9.5,-1,9,4,6,7);ctx.bezierCurveTo(3,9.5,-3,9,-5.5,5);ctx.bezierCurveTo(-7.5,2,-7,-2,-6.5,-6);ctx.closePath();};
  const eyeW=(x,y)=>{if(hurt){ctx.strokeStyle=INK;ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(x-1.5,y-1);ctx.lineTo(x+.8,y);ctx.lineTo(x-1.5,y+1);ctx.stroke();}else{fillOnly(ellipseP(x,y,1.5,1.6),'#fff');fillOnly(ellipseP(x+.4,y+.1,.85,1.1),'#1a1010');}};
  shape(()=>ctx.rect(-2.5,5,6,6),sd,1);
  switch(L.head){
    case'spikemask':{ // máscara pálida com coroa de espinhos e corrente
      const mask=()=>{ctx.moveTo(-6.8,-5);ctx.bezierCurveTo(-7.5,-14,7,-15,8.5,-6);ctx.bezierCurveTo(10,0,9.5,5,6,8.5);ctx.bezierCurveTo(2.5,10.5,-3.5,10,-5.8,5.5);ctx.bezierCurveTo(-7.6,1.5,-7.4,-2,-6.8,-5);ctx.closePath();};
      shape(mask,'#d8cfc4',1.2);
      ctx.save();ctx.beginPath();mask();ctx.clip();
      fillOnly(()=>ctx.rect(-9,-16,4.5,28),'#a89a8e');
      [[1,-9,1.6],[6,-10,1.2],[-2,3,1.4],[7,4,1.1],[3.5,-1,.9]].forEach(([x,y,r])=>fillOnly(ellipseP(x,y,r,r*.8),'#8a1414'));
      ctx.strokeStyle='#5a3a30';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(-4,-8);ctx.lineTo(-1,-6);ctx.moveTo(2,1);ctx.lineTo(5,2.5);ctx.moveTo(-3,5);ctx.lineTo(0,6);ctx.stroke();
      ctx.restore();
      fillOnly(ellipseP(5.4,-3.2,1.9,1.5),'#120808');fillOnly(ellipseP(0,-3.4,1.4,1.4),'#120808');
      if(!hurt)fillOnly(ellipseP(5.8,-3.2,.5,.5),'#e8e0d0');
      shape(()=>{ctx.moveTo(3,3.6);ctx.quadraticCurveTo(6,2.2,8.6,3.4);ctx.quadraticCurveTo(8.2,7,5.6,7.2);ctx.quadraticCurveTo(3.2,6.6,3,3.6);},'#2a0c0c',.8);
      fillOnly(()=>ctx.rect(4,3.8,4,1),'#e8e0d0');
      // coroa de espinhos prateados
      for(let k=0;k<6;k++){const x=-5+k*2.6,h=3+(k%2)*2.2;shape(()=>{ctx.moveTo(x-1,-11.5+Math.abs(k-2.5)*.4);ctx.lineTo(x,-11.5-h);ctx.lineTo(x+1,-11.5+Math.abs(k-2.5)*.4);ctx.closePath();},'#d8dce6',.6);}
      shape(()=>{ctx.moveTo(-6.5,-11);ctx.quadraticCurveTo(1,-13.5,8.5,-10.5);ctx.lineTo(8.3,-9);ctx.quadraticCurveTo(1,-12,-6.3,-9.5);ctx.closePath();},'#9aa0b0',.7);
      // corrente
      for(let k=0;k<5;k++){ctx.strokeStyle=INK;ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(-4+k*2.6,-1+k*1.4,1.3,.8,.5,0,7);ctx.stroke();ctx.strokeStyle='#b8bcc8';ctx.lineWidth=.6;ctx.stroke();}
      break;}
    case'longhair':{
      limb([[-5,-9],[-9,-4],[-10,4],[-8,10]],5,L.hair);
      shape(headShape,sk,1.2);
      ctx.save();ctx.beginPath();headShape();ctx.clip();fillOnly(()=>ctx.rect(-9,-15,4,26),sd);
      fillOnly(()=>{ctx.moveTo(-4,0);ctx.quadraticCurveTo(-2,3.5,1,3.4);ctx.lineTo(9,1.4);ctx.lineTo(10,12);ctx.lineTo(-8,12);ctx.closePath();},L.beard);
      fillOnly(()=>{ctx.moveTo(4.4,3.3);ctx.quadraticCurveTo(6.3,2.7,7.8,3.3);ctx.quadraticCurveTo(6.3,4.2,4.4,3.3);},'#b4625a');
      ctx.restore();
      shape(headShape,'rgba(0,0,0,0)',1.2);
      shape(()=>{ctx.moveTo(7.5,-3);ctx.quadraticCurveTo(10.3,.5,7.6,1.4);},'rgba(0,0,0,0)',.9);
      eyeW(5.2,-3.3);ctx.strokeStyle=INK;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(3,-5.8);ctx.lineTo(7.4,-6.4);ctx.stroke();
      shape(()=>{ctx.moveTo(-7.5,0);ctx.bezierCurveTo(-9.5,-12,-2,-16.5,3.5,-15.5);ctx.bezierCurveTo(8.5,-14.5,10.5,-10,9.5,-7);ctx.quadraticCurveTo(6,-10,3,-8.2);ctx.quadraticCurveTo(0,-9.5,-2.5,-7);ctx.quadraticCurveTo(-4.5,-3,-4,2);ctx.closePath();},L.hair,1.1);
      ctx.strokeStyle=mixHex(L.hair,1.5);ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(-5,-9);ctx.quadraticCurveTo(0,-14,6,-12.5);ctx.stroke();
      break;}
    case'balaclava':{
      const hood=()=>{ctx.moveTo(-7,-5);ctx.bezierCurveTo(-7.8,-15,7.5,-16,8.6,-6);ctx.bezierCurveTo(10,0,9.5,5,6,8.5);ctx.bezierCurveTo(2.5,10.5,-3.5,10,-6,5.5);ctx.bezierCurveTo(-7.8,1.5,-7.5,-2,-7,-5);ctx.closePath();};
      shape(hood,'#16161c',1.2);
      ctx.save();ctx.beginPath();hood();ctx.clip();fillOnly(()=>ctx.rect(-9,-16,4,28),'#0a0a0e');ctx.strokeStyle='#2a2a34';ctx.lineWidth=.5;for(let k=-12;k<10;k+=2.2){ctx.beginPath();ctx.moveTo(-8,k);ctx.lineTo(10,k+.6);ctx.stroke();}ctx.restore();
      shape(()=>{ctx.moveTo(1.5,-5.5);ctx.lineTo(9,-5.8);ctx.lineTo(9.2,-1.5);ctx.lineTo(1.8,-1.4);ctx.closePath();},sk,.8);
      eyeW(5.4,-3.5);
      ctx.strokeStyle=INK;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(3,-5);ctx.lineTo(7.8,-5.4);ctx.stroke();
      break;}
    case'cap':{
      shape(headShape,sk,1.2);
      ctx.save();ctx.beginPath();headShape();ctx.clip();fillOnly(()=>ctx.rect(-9,-15,4,26),sd);
      fillOnly(()=>{ctx.moveTo(-3,2);ctx.quadraticCurveTo(3,5.5,9.5,1.5);ctx.lineTo(10,12);ctx.lineTo(-8,12);ctx.closePath();},'rgba(40,28,22,.55)');
      ctx.restore();
      shape(ellipseP(-2.5,0,2,2.6),sk,.9);
      shape(()=>{ctx.moveTo(7.5,-3);ctx.quadraticCurveTo(10.3,.5,7.6,1.4);},'rgba(0,0,0,0)',.9);
      shape(()=>{ctx.moveTo(1.5,-5);ctx.lineTo(9.6,-5.2);ctx.lineTo(9.2,-2);ctx.lineTo(2.2,-1.8);ctx.closePath();},'#0c0c10',.8);fillOnly(()=>ctx.rect(3,-4.6,3,.7),'#6a7aa0');
      ctx.strokeStyle=INK;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(4.5,4);ctx.quadraticCurveTo(6.2,4.6,7.8,3.8);ctx.stroke();
      shape(()=>{ctx.moveTo(-7.5,-5.5);ctx.bezierCurveTo(-8,-15,7,-16.5,9,-7.5);ctx.closePath();},'#141418',1.1);
      shape(()=>{ctx.moveTo(6,-8.5);ctx.quadraticCurveTo(12,-8.8,15,-6.6);ctx.lineTo(8.5,-6.6);ctx.closePath();},'#0c0c10',.9);
      fillOnly(()=>ctx.rect(-1,-12.5,4,2.4),'#e8e8e8');
      break;}
  }
}
function drawTorsoBand(L){
  const body=rubaoTorso(L,L.chubby);
  const t=L.torso;
  if(t==='shirtblood'||t==='workshirt'){
    shape(body,L.top,1.2);
    ctx.save();ctx.beginPath();body();ctx.clip();
    fillOnly(()=>ctx.rect(-12,-40,5.5,30),L.topD);
    ctx.strokeStyle=mixHex(L.top,.7);ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(4,-37);ctx.lineTo(5.5,-16);ctx.stroke();
    for(let k=0;k<4;k++)fillOnly(ellipseP(5.6,-33+k*4.5,.45,.45),'#5a5048');
    if(t==='shirtblood'){[[-3,-31,1.6],[2,-25,1.2],[-5,-21,1],[7,-28,.9],[0,-19,1.4],[-1,-34,.8],[6,-20,.7]].forEach(([x,y,r])=>{fillOnly(ellipseP(x,y,r,r*1.2),'#9a1a1a');fillOnly(()=>ctx.rect(x-.2,y,.5,r*2.2),'#9a1a1a');});
      fillOnly(()=>{ctx.moveTo(1,-37);ctx.lineTo(4.5,-37);ctx.lineTo(3,-31);ctx.closePath();},sd(L));}
    else{fillOnly(()=>ctx.rect(-4,-30,4,4),mixHex(L.top,.8));ctx.strokeStyle=mixHex(L.top,.75);ctx.lineWidth=.5;ctx.strokeRect(-4,-30,4,4);}
    ctx.restore();
    shape(()=>{ctx.moveTo(-3,-38);ctx.lineTo(1.5,-39.2);ctx.lineTo(.5,-35);ctx.closePath();},mixHex(L.top,1.1),.8);
    shape(()=>{ctx.moveTo(2.5,-39);ctx.lineTo(7,-37.2);ctx.lineTo(4,-34.6);ctx.closePath();},mixHex(L.top,1.1),.8);
  }else if(t==='bandtee'){
    shape(body,L.top,1.2);
    ctx.save();ctx.beginPath();body();ctx.clip();fillOnly(()=>ctx.rect(-12,-40,5,30),L.topD);
    // logo de banda genérico (rabisco espinhoso)
    ctx.strokeStyle='#141414';ctx.lineWidth=1;ctx.lineCap='round';ctx.beginPath();
    for(let k=0;k<7;k++){const x=-4+k*1.8;ctx.moveTo(x,-29);ctx.lineTo(x+.6,-33+(k%2)*1.5);ctx.moveTo(x,-29);ctx.lineTo(x+.9,-25.5-(k%3));}
    ctx.moveTo(-5,-29);ctx.lineTo(8,-29);ctx.stroke();
    ctx.restore();
    shape(()=>{ctx.moveTo(-1.5,-38.5);ctx.quadraticCurveTo(2,-35.5,5,-38);},'rgba(0,0,0,0)',.9);
  }else if(t==='jersey'){
    shape(()=>{ctx.moveTo(-5,-37);ctx.lineTo(-2,-37);ctx.quadraticCurveTo(1.5,-32,4.5,-37);ctx.lineTo(7,-36);ctx.bezierCurveTo(10.5,-31,11.5,-22,8,-16);ctx.lineTo(-6,-15.5);ctx.bezierCurveTo(-9.5,-22,-9,-31,-5,-37);ctx.closePath();},L.top,1.2);
    ctx.save();ctx.beginPath();body();ctx.clip();fillOnly(()=>ctx.rect(-12,-40,5,30),L.topD);
    ctx.save();ctx.translate(2,-27);ctx.scale(curFacing,1);ctx.strokeStyle='#c8202a';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(-5,1);ctx.bezierCurveTo(-4,-4,-1,-3,-2,1);ctx.bezierCurveTo(0,-2,2,-2,1.5,1.5);ctx.bezierCurveTo(3,-1,5,-1,5,1);ctx.stroke();ctx.restore();
    fillOnly(()=>ctx.rect(-12,-20,24,1.2),'#c8202a');
    ctx.restore();
    ctx.strokeStyle='#c8202a';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(-2,-37);ctx.quadraticCurveTo(1.5,-32,4.5,-37);ctx.stroke();
  }
}
function sd(L){return L.skinD;}
// instrumento pendurado (desenhado depois do tronco)
function drawInstrument(L,P){
  if(!L.inst)return;
  ctx.save();
  if(L.inst==='guitar'||L.inst==='bass'){
    const body=L.inst==='bass'?'#f0eee8':'#151518',pick=L.inst==='bass'?'#2a2a2e':'#3a3a40';
    ctx.translate(-1,-21);ctx.rotate(-.42);
    shape(()=>ctx.rect(4,-1.4,21,2.8),'#5a3a22',.8);for(let k=0;k<5;k++)fillOnly(()=>ctx.rect(7+k*4,-1.4,.5,2.8),'#c8c8c8');
    shape(()=>{ctx.moveTo(24,-2);ctx.lineTo(28,-3);ctx.lineTo(28.5,3);ctx.lineTo(24,2);ctx.closePath();},'#1a1a1e',.7);
    shape(()=>{ctx.moveTo(-9,-4);ctx.bezierCurveTo(-11,-8,-3,-9,-1,-5);ctx.bezierCurveTo(1,-6.5,6,-6,5,-1);ctx.bezierCurveTo(6,4,1,6,-1,4.5);ctx.bezierCurveTo(-4,8,-11,6,-9,-4);ctx.closePath();},body,1);
    shape(()=>{ctx.moveTo(-6,-1);ctx.bezierCurveTo(-6,-4,-1,-4,0,-1);ctx.bezierCurveTo(1,2,-5,3,-6,-1);},pick,.5);
    fillOnly(()=>ctx.rect(-3,-2,1,4),'#d8d8d8');
    ctx.restore();
    // alça
    ctx.strokeStyle='#0c0c10';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-6,-35);ctx.quadraticCurveTo(2,-26,7,-17);ctx.stroke();
    return;
  }
  ctx.restore();
}
function drawHandProp(L,hd,kind){
  if(L.prop==='mic'){ctx.save();ctx.translate(hd[0],hd[1]);ctx.rotate(kind==='rest'||kind==='swingA'||kind==='swingB'?-.4:0);
    shape(()=>ctx.rect(-.9,-8,1.8,7),'#2a2a30',.7);shape(ellipseP(0,-9,1.9,2.2),'#9aa0b0',.7);ctx.restore();}
  if(L.prop==='sticks'){ctx.save();ctx.translate(hd[0],hd[1]);ctx.rotate(-.9);shape(()=>ctx.rect(-.6,-11,1.2,13),'#e0c890',.6);ctx.restore();}
}
const BANDLOOKS=[
  Object.assign({},BASE,{id:'vocal',pix:'vocal',name:'JOHNNY B.',sub:'VOCAL • VOZTROVÃO',head:'spikemask',torso:'shirtblood',top:'#f2eee8',topD:'#cfc8be',skin:'#e6ad88',skinD:'#c48a68',tattoo:true,chubby:true,prop:'mic',pants:'#1a1a22',pantsD:'#101016',special:'grito',beam:['rgba(255,60,60,.9)','#ffd0d0','rgba(255,60,60,1)']}),
  Object.assign({},BASE,{id:'guitar',pix:'guitar',name:'JUNINHO',sub:'GUITARRA • O SOLO',head:'longhair',torso:'bandtee',top:'#ece8e2',topD:'#c4beb4',hair:'#1c140e',beard:'#2a1c14',skin:'#e0a884',skinD:'#bc8664',tattoo:true,inst:'guitar',pants:'#20222e',pantsD:'#14161e',special:'solo',beam:['rgba(255,220,60,.9)','#fffbd0','rgba(255,200,40,1)']}),
  Object.assign({},BASE,{id:'baixo',pix:'baixo',name:'BERNARDO',sub:'BAIXO • O GRAVE',head:'balaclava',torso:'jersey',top:'#f2f2f0',topD:'#cacac6',skin:'#d89c78',skinD:'#b47c5a',inst:'bass',pants:'#24262e',pantsD:'#16181e',special:'grave',beam:['rgba(80,140,255,.9)','#d8e6ff','rgba(80,140,255,1)']}),
  Object.assign({},BASE,{id:'batera',pix:'batera',name:'ALISSON',sub:'BATERA • O MAGRINHO',head:'cap',torso:'workshirt',top:'#c8b48c',topD:'#a08c66',skin:'#e0a884',skinD:'#bc8664',prop:'sticks',pants:'#2a2a30',pantsD:'#1a1a20',special:'rufada',beam:['rgba(80,255,160,.9)','#d8ffe8','rgba(60,230,140,1)']}),
];
BANDLOOKS.push(Object.assign({},BANDLOOKS[1],{id:'guitar2',pix:'guitar2',name:'MATHEUS CABRAL',sub:'GUITARRA • O RIFF',beam:['rgba(255,90,40,.9)','#ffe0d0','rgba(255,90,40,1)']}));
BANDLOOKS.push(Object.assign({},BANDLOOKS[0],{id:'angelo',pix:'angelo',name:'ANGELO',sub:'PARTICIPAÇÃO • O BARBA',prop:null,beam:['rgba(60,200,90,.9)','#d8ffe0','rgba(60,200,90,1)']}));
BANDLOOKS.push(Object.assign({},BANDLOOKS[0],{id:'feijao',pix:'feijao',name:'FEIJÃO',sub:'PARTICIPAÇÃO • O MALANDRO',prop:null,beam:['rgba(240,190,40,.9)','#fff0c0','rgba(240,190,40,1)']}));
BANDLOOKS.push(Object.assign({},BANDLOOKS[0],{id:'dj',pix:'dj',name:'DJ SIDESHOW JOE',sub:'DJ • O SCRATCH',prop:null,beam:['rgba(200,80,255,.9)','#f0d8ff','rgba(200,80,255,1)']}));
// ---------- motor de sprites: desenha 4x, reduz, paleta limitada, contorno 1px ----------
const SPRC=new Map();const BKS=4,BKW=150,BKH=136,BAX=75,BAY=124;
const bkBig=document.createElement('canvas');bkBig.width=BKW*BKS;bkBig.height=BKH*BKS;const bkG=bkBig.getContext('2d');
const bkMid=document.createElement('canvas');bkMid.width=BKW*2;bkMid.height=BKH*2;const bkM=bkMid.getContext('2d');
let lookIds=new WeakMap(),lookN=0;
function palOf(L){
  if(L.__pal)return L.__pal;
  const set=new Set(['#140a18','#ffffff','#e8342c','#c8202a','#9a1a1a','#8a1414','#d02a2a','#120808','#1a1010','#0d0908','#b4625a','#d8d8d8','#9aa0b0','#d8dce6','#5a3a22','#e0c890','#2a2a30','#3a3a40','#c8c8c8','#4a4a54','#1c1c20','#f2f2f2','#e8e0d0','#2a0c0c','#5a3a30','#8a8a96','#0b0b0e','#151518','#0c0c10','#6a7aa0','#4ae0ff','#ffe066','#9a6a3a','#d02a2a','#f07a20','#2f8a42','#9ae0a8','#dcb478','#8a4ab0','#555555','#f0f0f0','#333333','#e8e8e8','#d0405a','#2a0a10','#6a0a24']);
  for(const k in L){const v=L[k];if(typeof v==='string'&&v[0]==='#'&&v.length===7){set.add(v);set.add(mixHex(v,.72));set.add(mixHex(v,.5));set.add(mixHex(v,1.22));}}
  L.__pal=[...set].map(hexToRgb);return L.__pal;
}
function getSprite(tmp,s,face){
  const L=tmp.look;if(!lookIds.has(L))lookIds.set(L,++lookN);
  const P=pose(tmp);const txtFlip=(L.torso==='tee33'||L.torso==='jersey');
  const key=lookIds.get(L)+'|'+s.toFixed(2)+'|'+JSON.stringify(P)+'|'+(tmp.weapon?tmp.weapon.w:'')+'|'+(txtFlip?face:1)+'|'+(tmp.state==='hurt'?1:0);
  let c=SPRC.get(key);if(c)return c;
  const real=ctx;ctx=bkG;bkG.setTransform(1,0,0,1,0,0);bkG.clearRect(0,0,bkBig.width,bkBig.height);
  bkG.setTransform(BKS*s,0,0,BKS*s,BAX*BKS,BAY*BKS);curFacing=txtFlip?face:1;
  drawBody(tmp,L);ctx=real;curFacing=1;
  bkM.clearRect(0,0,bkMid.width,bkMid.height);bkM.imageSmoothingEnabled=true;bkM.imageSmoothingQuality='high';bkM.drawImage(bkBig,0,0,bkMid.width,bkMid.height);
  c=document.createElement('canvas');c.width=BKW;c.height=BKH;const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(bkMid,0,0,BKW,BKH);
  const id=g.getImageData(0,0,BKW,BKH),d=id.data,pal=palOf(L),n=BKW*BKH,op=new Uint8Array(n);
  for(let i=0;i<n;i++){const j=i*4;if(d[j+3]<110){d[j+3]=0;continue;}op[i]=1;
    const r=d[j],gg=d[j+1],b=d[j+2];let best=0,bd=1e9;for(let k=0;k<pal.length;k++){const p=pal[k];const dr=r-p[0],dg=gg-p[1],db=b-p[2];const dd=dr*dr*2+dg*dg*3+db*db;if(dd<bd){bd=dd;best=k;}}
    d[j]=pal[best][0];d[j+1]=pal[best][1];d[j+2]=pal[best][2];d[j+3]=255;}
  for(let y=0;y<BKH;y++)for(let x=0;x<BKW;x++){const i=y*BKW+x;if(op[i])continue;
    if((x>0&&op[i-1])||(x<BKW-1&&op[i+1])||(y>0&&op[i-BKW])||(y<BKH-1&&op[i+BKW])){const j=i*4;d[j]=14;d[j+1]=8;d[j+2]=20;d[j+3]=255;}}
  g.putImageData(id,0,0);
  if(SPRC.size>900)SPRC.clear();
  SPRC.set(key,c);return c;
}
// ---------- background (pixel art com textura e luz) ----------
let cam=0,t60=0;
const CLUB_X=2800,BAR_X=3300,BONUS_X=4300;
const ZONES=[{x0:0,x1:1000,k:'street'},{x0:1000,x1:1600,k:'park'},{x0:1600,x1:2200,k:'shops'},{x0:2200,x1:2800,k:'bridge'},{x0:2800,x1:3300,k:'praca'},{x0:3300,x1:3800,k:'club'}];
let STAGE=1;let buddy=null,runner=null,runT=0,runN=0,tigasSay=null;
const FEIJAO_FALAS=['CADÊ MINHA MOCHILA?!','VIU MINHA MOCHILA?','ORDINÁRIO! ROUBARAM MINHA MOCHILA!','A MOCHILA TÁ COM O TIGAS!','BORA ACHAR A MOCHILA!'];
const BARMAN=[0,1,2].map(i=>({look:null,state:'idle',t:i*13,facing:i===1?1:-1,scale:1,z:0}));
const STAGES=[{bar:'CASTIGO',clim:'Inverno em Passo Fundo.',tint:null},{bar:'CHAPECÓ',clim:'Chuva sem parar na cidade.',tint:'rgba(10,30,80,.30)'},{bar:'BABEL',clim:'Uma névoa estranha cobriu tudo.',tint:'rgba(20,70,40,.28)'},{bar:'BATATAS',clim:'Um calor dos infernos.',tint:'rgba(150,60,0,.24)'},{bar:'MAROCA',clim:'O céu ficou vermelho.',tint:'rgba(150,0,0,.34)'}];
function SG(){return STAGES[STAGE-1];}
const ZNAMES={park:'Parquinho...',shops:'Centro Comercial...',bridge:'Debaixo da Ponte...',praca:'Praça do Xis do Japa...',club:'Bar Castigo...'};
const DOORS=[{x:1500,kind:'bonus'},{x:1700,kind:'shop',shop:0},{x:2100,kind:'shop',shop:1}];
const zoneAt=x=>{for(const z of ZONES)if(x<z.x1)return z.k;return'praca';};
const SIGNS=['LANCHERIA','BAR DO ZÉ','24 HORAS','MERCADO','FLIPERAMA','PADARIA'];
const SHOPS=[
  {name:'CAFÉ QUENTINHO',items:[['Chimarrão',1.40,{hp:20}],['Café',1.60,{gp:20}],['Expresso',1.60,{gp:30}],['Chocolate Quente',2.50,{hp:40}],['Pão de Queijo',3.75,{hp:30,gp:20,str:1}]]},
  {name:'LANCHERIA DO TCHÊ',items:[['Refri',1.50,{gp:25}],['Pastel',2.00,{hp:35}],['Cachorro-Quente',3.00,{hp:50}],['X-Salada',4.50,{hp:70,def:1}],['Xis Completo',8.00,{hp:999,gp:999,str:1,spd:1}]]},
];
// --- texturas
const TEX={};
function mkPat(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');fn(g,w,h);return ctx.createPattern(c,'repeat');}
function speck(g,w,h,cols,n,seed){let s=seed||7;const r=()=>{s=(s*16807)%2147483647;return s/2147483647;};for(let i=0;i<n;i++){g.fillStyle=cols[i%cols.length];g.fillRect(r()*w|0,r()*h|0,1,1);}}
function brickPat(base,mort,hi,dk){return mkPat(16,8,(g)=>{g.fillStyle=base;g.fillRect(0,0,16,8);g.fillStyle=mort;g.fillRect(0,3,16,1);g.fillRect(0,7,16,1);g.fillRect(7,0,1,3);g.fillRect(15,4,1,3);g.fillStyle=hi;g.fillRect(0,0,7,1);g.fillRect(8,4,7,1);speck(g,16,8,[dk,hi],8);});}
function sidingPat(base,line,hi){return mkPat(8,6,(g)=>{g.fillStyle=base;g.fillRect(0,0,8,6);g.fillStyle=line;g.fillRect(0,5,8,1);g.fillStyle=hi;g.fillRect(0,0,8,1);speck(g,8,6,[line],2);});}
function initTex(){
  TEX.brick=brickPat('#7a3e36','#4a2226','#93503f','#63302c');
  TEX.brickP=brickPat('#4e3054','#2e1a36','#634070','#3e2444');
  TEX.brickB=brickPat('#5a4a40','#362a26','#6e5a4c','#4a3c34');
  TEX.sideB=sidingPat('#4a5e86','#36456a','#5a70a0');TEX.sideG=sidingPat('#4e6a5a','#3a5246','#5e7e6a');TEX.sideT=sidingPat('#8a7056','#6a5440','#9e8466');
  TEX.concrete=mkPat(16,16,(g)=>{g.fillStyle='#5e5a68';g.fillRect(0,0,16,16);speck(g,16,16,['#545060','#6c6876','#4c4858'],46);g.fillStyle='#4a4656';g.fillRect(0,15,16,1);});
  TEX.side=mkPat(24,12,(g)=>{g.fillStyle='#5a6488';g.fillRect(0,0,24,12);g.fillStyle='#454e70';g.fillRect(23,0,1,12);g.fillRect(0,11,24,1);g.fillStyle='#6c76a0';g.fillRect(0,0,23,1);speck(g,24,12,['#505a7c','#646e94'],18);});
  TEX.asph=mkPat(32,32,(g)=>{g.fillStyle='#262938';g.fillRect(0,0,32,32);speck(g,32,32,['#2f3346','#1f2230','#3a3e52','#2a2d3e'],150);});
  TEX.snow=mkPat(16,8,(g)=>{g.fillStyle='#e4ecf8';g.fillRect(0,0,16,8);speck(g,16,8,['#cfdaee','#f6f9ff','#d8e2f2'],16);});
  TEX.wood=mkPat(16,6,(g)=>{g.fillStyle='#6a4428';g.fillRect(0,0,16,6);g.fillStyle='#4a2e1a';g.fillRect(0,5,16,1);g.fillRect(11,0,1,5);g.fillStyle='#7e5434';g.fillRect(0,0,11,1);speck(g,16,6,['#5a3a22'],6);});
  TEX.metal=mkPat(10,10,(g)=>{g.fillStyle='#2c3246';g.fillRect(0,0,10,10);g.fillStyle='#3c4460';g.fillRect(0,0,10,1);g.fillStyle='#565e7c';g.fillRect(2,4,1,1);g.fillRect(7,4,1,1);g.fillStyle='#22283a';g.fillRect(0,9,10,1);});
  TEX.roof=mkPat(8,4,(g)=>{g.fillStyle='#3a2a42';g.fillRect(0,0,8,4);g.fillStyle='#2a1e32';g.fillRect(0,3,8,1);g.fillRect(4,0,1,3);});
  TEX.tile=mkPat(20,10,(g)=>{g.fillStyle='#d8c8a8';g.fillRect(0,0,20,10);g.fillStyle='#b8a888';g.fillRect(19,0,1,10);g.fillRect(0,9,20,1);});
}
function P(pat,x,y,w,h){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.fillStyle=pat;ctx.fillRect(0,0,w,h);ctx.restore();}
function OL(x,y,w,h){ctx.strokeStyle='#140c1a';ctx.lineWidth=1;ctx.strokeRect(Math.round(x)+.5,Math.round(y)+.5,w-1,h-1);}
function glow(x,y,r,col,a){ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=a==null?1:a;ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();}
const WARM='rgba(255,170,80,1)',PINK='rgba(255,70,170,1)',CYAN='rgba(70,220,255,1)';
function windowLit(x,y,w,h,lit,k){
  R(x-1,y-1,w+2,h+2,'#1a1020');
  if(lit){const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'#ffe8a0');g.addColorStop(1,'#f0a048');ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
    R(x,y+h-3,w,3,'#c06a30');if(hash(k)>.5)R(x+2,y+h-9,4,6,'#7a3a2a');R(x+w/2|0,y,1,h,'#3a2030');R(x,y+h/2|0,w,1,'#3a2030');glow(x+w/2,y+h/2,w*1.2,WARM,.22);}
  else{R(x,y,w,h,'#1e2244');R(x+1,y+1,w/2-1|0,2,'#3a4070');R(x+w/2|0,y,1,h,'#141630');}
  R(x-2,y+h+1,w+4,2,'#e8eef8');
}
function snowPile(x,y,w,h){
  ctx.fillStyle='#140c1a';ctx.beginPath();ctx.ellipse(x,y,w/2+1,h+1,0,Math.PI,0);ctx.fill();
  ctx.fillStyle='#b8c6e2';ctx.beginPath();ctx.ellipse(x,y,w/2,h,0,Math.PI,0);ctx.fill();
  ctx.fillStyle='#eef3fb';ctx.beginPath();ctx.ellipse(x-w*.06,y-h*.18,w*.42,h*.78,0,Math.PI,0);ctx.fill();
  R(x-w*.2,y-h*.85,w*.18,1,'#ffffff');
}
// --- céu de entardecer com nuvens
const CLOUDS=[];for(let i=0;i<14;i++){const b=[];const n=4+irnd(0,4);for(let k=0;k<n;k++)b.push([k*9+rnd(-3,3),rnd(-4,3),rnd(6,12)]);CLOUDS.push({x:i*120+rnd(0,60),y:rnd(26,96),b,s:rnd(.06,.12)});}
function drawSky(){
  const g=ctx.createLinearGradient(0,0,0,165);
  g.addColorStop(0,'#160f3a');g.addColorStop(.32,'#36205e');g.addColorStop(.58,'#7a2e72');g.addColorStop(.8,'#d4506a');g.addColorStop(1,'#ff9a56');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,170);
  // dithering nas faixas
  for(const [yy,c] of [[50,'#36205e'],[92,'#7a2e72'],[128,'#d4506a']])for(let x=(yy%2);x<W;x+=2){R(x,yy,1,1,c);R(x+1,yy+2,1,1,c);}
  for(let i=0;i<46;i++){const x=((hash(i*7)*W*1.3-cam*.02)%W+W)%W,y=hash(i*13)*70;R(x,y,1,1,(t60/20+i)%9<1?'#fff':'#c8c0ff');}
  const mx=402-cam*.015;glow(mx,36,30,'rgba(255,220,200,1)',.18);ctx.fillStyle='#fff0e0';ctx.beginPath();ctx.arc(mx,36,11,0,7);ctx.fill();ctx.fillStyle='#f0d8d0';ctx.beginPath();ctx.arc(mx-3,33,2.5,0,7);ctx.arc(mx+4,40,1.8,0,7);ctx.fill();
  for(const c of CLOUDS){const x=((c.x-cam*c.s)%1700+1700)%1700-120;if(x>W+60)continue;
    ctx.fillStyle='#ffb08a';for(const [dx,dy,r] of c.b){ctx.beginPath();ctx.arc(x+dx,c.y+dy-1.5,r,0,7);ctx.fill();}
    ctx.fillStyle='#9a3a78';for(const [dx,dy,r] of c.b){ctx.beginPath();ctx.arc(x+dx,c.y+dy+1,r*.92,0,7);ctx.fill();}
    ctx.fillStyle='#6a2a64';for(const [dx,dy,r] of c.b){ctx.beginPath();ctx.arc(x+dx+1,c.y+dy+3,r*.7,0,7);ctx.fill();}}
}
function drawFar(){
  const p=cam*.18,bw=30;const i0=Math.floor(p/bw)-1;
  for(let i=i0;i<i0+W/bw+3;i++){
    const h=46+hash(i*3+1)*56,x=Math.round(i*bw-p),y=156-h,w=bw-1-Math.floor(hash(i*5)*7);
    R(x,y,w,h+14,'#2a1a46');R(x,y,w,1,'#4a2e6a');
    for(let wy=y+4;wy<154;wy+=6)for(let wx=x+2;wx<x+w-2;wx+=4){const hv=hash(i*977+wx*31+wy*17);if(hv>.7)R(wx,wy,2,2,hv>.93?'#ff8ad0':'#ffb04a');}
    if(hash(i*71)>.9){R(x+w/2,y-14,1,14,'#2a1a46');if(Math.floor(t60/30+i)%2)R(x+w/2-1,y-15,3,2,'#ff4040');}
  }
  const p2=cam*.4,bw2=56;const j0=Math.floor(p2/bw2)-1;
  for(let i=j0;i<j0+W/bw2+3;i++){
    const h=40+hash(i*9+4)*50,x=Math.round(i*bw2-p2),y=164-h,w=bw2-6;
    R(x,y,w,h,'#3a2052');R(x,y,w,2,'#e0e6f6');R(x,y+2,w,1,'#56306e');
    for(let wy=y+6;wy<160;wy+=9)for(let wx=x+4;wx<x+w-6;wx+=8){const hv=hash(i*311+wx*13+wy*7);R(wx,wy,4,5,hv>.55?'#ffc060':'#24183a');if(hv>.55)glow(wx+2,wy+2,6,WARM,.12);}
    if(hash(i*29)>.7){const c=hash(i*33)>.5?'#ff4ab0':'#4ae0ff';R(x+8,y+10,18,6,'#140c1a');R(x+9,y+11,16,4,c);glow(x+17,y+13,16,c==='#ff4ab0'?PINK:CYAN,.35);}
  }
}
function pine(x,base,h,dark){
  for(let k=0;k<4;k++){const ww=(6+k*5)*h/50,yy=base-h+k*h/4;
    ctx.fillStyle='#0c0a18';ctx.beginPath();ctx.moveTo(x,yy-5);ctx.lineTo(x-ww-1,yy+h/4+4);ctx.lineTo(x+ww+1,yy+h/4+4);ctx.closePath();ctx.fill();
    ctx.fillStyle=dark||'#1c2a48';ctx.beginPath();ctx.moveTo(x,yy-4);ctx.lineTo(x-ww,yy+h/4+3);ctx.lineTo(x+ww,yy+h/4+3);ctx.closePath();ctx.fill();
    ctx.fillStyle='#2c3e64';ctx.beginPath();ctx.moveTo(x,yy-4);ctx.lineTo(x+ww,yy+h/4+3);ctx.lineTo(x+ww*.3,yy+h/4+3);ctx.closePath();ctx.fill();
    R(x-ww+2,yy+h/4+1,ww*2-4,2,'#e6eef9');R(x-ww+4,yy+h/4-1,ww-5,2,'#ffffff');}
  R(x-1,base,3,8,'#2a1a14');
}
function drawTrees(){
  const p=cam*.62,sw=64;const i0=Math.floor(p/sw)-1;
  for(let i=i0;i<i0+W/sw+3;i++){if(hash(i*11)<.55)continue;pine(Math.round(i*sw-p+hash(i*19)*20),166,34+hash(i*23)*26,'#1a2440');}
}
function lamp(lx,c){
  c=c||WARM;
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.13;ctx.fillStyle='#ffd090';ctx.beginPath();ctx.moveTo(lx-3,96);ctx.lineTo(lx-30,200);ctx.lineTo(lx+34,200);ctx.lineTo(lx+6,96);ctx.fill();ctx.restore();
  R(lx-1,92,5,78,'#140c1a');R(lx,92,3,78,'#3a3048');R(lx,92,1,78,'#5a4a68');
  R(lx-7,88,14,5,'#140c1a');R(lx-6,89,12,3,'#3a3048');R(lx-5,92,10,3,'#fff0c0');R(lx-7,86,14,2,'#eef3fb');
  glow(lx+1,95,22,c,.5);
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.25;ctx.fillStyle='#ffb060';ctx.beginPath();ctx.ellipse(lx+2,188,30,7,0,0,7);ctx.fill();ctx.restore();
}
function neonSign(x,y,w,text,col,on){
  R(x-1,y-1,w+2,16,'#140c1a');R(x,y,w,14,'#24142c');
  ctx.font='8px '+PIX;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle=on?'#ffffff':'#5a3a5a';ctx.fillText(text,x+w/2,y+7.5);
  if(on){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.65;ctx.fillStyle=col;ctx.fillText(text,x+w/2,y+7.5);ctx.restore();glow(x+w/2,y+7,w*.7,col==='#ff4ab0'?PINK:col==='#4ae0ff'?CYAN:WARM,.35);}
}
function nearStreet(i,x){
  const kind=hash(i*41);
  if(kind<.42){ // sobrado de tijolo
    const top=40;P(i%2?TEX.brick:TEX.brickB,x+8,top,184,128);OL(x+8,top,184,128);
    R(x+6,top-4,188,5,'#2a1a2a');R(x+6,top-6,188,3,'#eef3fb');
    for(let r=0;r<2;r++)for(let c=0;c<3;c++){windowLit(x+24+c*58,top+12+r*42,24,26,hash(i*7+r*3+c)>.35,i*7+r*3+c);}
    // escada de incêndio
    ctx.strokeStyle='#1a1424';ctx.lineWidth=1;for(let r=0;r<2;r++){ctx.strokeRect(x+136.5,top+38.5+r*42,48,1);for(let k=0;k<6;k++)R(x+138+k*8,top+32+r*42,1,7,'#1a1424');}
    R(x+86,124,28,44,'#140c1a');R(x+88,126,24,42,'#5a2e24');R(x+90,128,9,18,'#3a1e18');R(x+101,128,9,18,'#3a1e18');R(x+107,148,2,2,'#ffd060');
    R(x+82,120,36,4,'#2a1a20');R(x+80,118,40,3,'#eef3fb');glow(x+100,122,14,WARM,.5);R(x+97,120,6,3,'#fff0b0');
    for(let k=0;k<3;k++){R(x+84-k*2,160+k*3,32+k*4,3,'#6a6478');R(x+84-k*2,160+k*3,32+k*4,1,'#8a849a');}
  }else if(kind<.75){ // loja
    const top=58;P(i%3?TEX.sideB:TEX.sideT,x+6,top,188,110);OL(x+6,top,188,110);R(x+4,top-3,192,4,'#eef3fb');
    const on=(Math.floor(t60/40+i)%9)!==0;const nc=['#ff4ab0','#4ae0ff','#ffb04a'][i%3];
    neonSign(x+30,top+10,140,SIGNS[Math.floor(hash(i*53)*SIGNS.length)],nc,on);
    for(let k=0;k<11;k++){R(x+12+k*16,top+32,16,10,k%2?'#f0f0f0':'#c82a3a');}
    R(x+12,top+42,176,2,'#140c1a');
    const g=ctx.createLinearGradient(0,top+48,0,top+96);g.addColorStop(0,'#fff0b8');g.addColorStop(1,'#f0a050');
    R(x+15,top+47,112,52,'#140c1a');ctx.fillStyle=g;ctx.fillRect(x+16,top+48,110,50);
    for(let k=0;k<5;k++){R(x+22+k*21,top+70,14,28,'#a85a30');R(x+22+k*21,top+70,14,2,'#c87a48');R(x+24+k*21,top+62,10,7,['#e04a4a','#4ac07a','#ffe060'][k%3]);}
    R(x+16,top+48,110,1,'#fff');ctx.globalAlpha=.25;R(x+16,top+48,30,50,'#fff');ctx.globalAlpha=1;
    glow(x+70,top+74,70,WARM,.25);
    R(x+137,top+44,42,66,'#140c1a');R(x+139,top+46,38,64,'#4a2a2a');R(x+142,top+50,32,22,'#ffe0a0');R(x+171,top+80,3,3,'#ffd060');
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.2;ctx.fillStyle='#ffb060';ctx.beginPath();ctx.moveTo(x+16,166);ctx.lineTo(x+126,166);ctx.lineTo(x+150,196);ctx.lineTo(x-6,196);ctx.fill();ctx.restore();
  }else{ // beco
    R(x,60,200,108,'#1a1228');P(TEX.brickP,x,60,60,108);OL(x,60,60,108);P(TEX.brickP,x+150,70,50,98);OL(x+150,70,50,98);
    ctx.strokeStyle='#5a5a70';ctx.lineWidth=1;ctx.globalAlpha=.6;for(let k=0;k<90;k+=6){ctx.beginPath();ctx.moveTo(x+60+k,120);ctx.lineTo(x+66+k,168);ctx.moveTo(x+66+k,120);ctx.lineTo(x+60+k,168);ctx.stroke();}ctx.globalAlpha=1;
    R(x+60,118,90,2,'#6a6a80');
    R(x+72,140,40,28,'#140c1a');R(x+73,141,38,26,'#2e6a3e');R(x+73,141,38,3,'#4a9a5a');R(x+71,138,42,4,'#eef3fb');
    for(let k=0;k<3;k++){ctx.fillStyle='#140c1a';ctx.beginPath();ctx.ellipse(x+124+k*9,163,6,6,0,0,7);ctx.fill();ctx.fillStyle='#2a2a34';ctx.beginPath();ctx.ellipse(x+124+k*9,163,5,5,0,0,7);ctx.fill();R(x+122+k*9,159,2,2,'#4a4a58');}
    ctx.font='16px '+PIX;ctx.textAlign='center';ctx.textBaseline='middle';ctx.globalAlpha=.8;ctx.fillStyle=['#ff4ab0','#4ae0ff','#ffe060'][i%3];ctx.fillText(['ZZ','RS!','TCHÊ'][i%3],x+30,100);ctx.globalAlpha=1;
  }
  if(hash(i*61)>.58){const px=x+160;R(px,102,2,66,'#140c1a');R(px+.5,102,1,66,'#8a8a9a');
    ctx.fillStyle='#140c1a';const oc=(cx,cy,r)=>{ctx.beginPath();for(let k=0;k<8;k++){const a=Math.PI/8+k*Math.PI/4;ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}ctx.closePath();ctx.fill();};
    oc(px+1,92,13);ctx.fillStyle='#fff';oc(px+1,92,12);ctx.fillStyle='#d02a2a';oc(px+1,92,10.5);
    ctx.font='8px '+PIX;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText('PARE',px+1,93);}
  lamp(x+190);
}
function nearPark(i,x,wx){
  pine(x+40+hash(i*3)*30,168,86+hash(i*5)*30,'#16264a');
  if(hash(i*9)>.4)pine(x+136,168,64,'#1a2c50');
  if(wx===1400){
    P(TEX.wood,x+50,96,100,72);OL(x+50,96,100,72);
    ctx.fillStyle='#140c1a';ctx.beginPath();ctx.moveTo(x+42,98);ctx.lineTo(x+100,72);ctx.lineTo(x+158,98);ctx.fill();
    ctx.save();ctx.beginPath();ctx.moveTo(x+45,96);ctx.lineTo(x+100,74);ctx.lineTo(x+155,96);ctx.clip();P(TEX.roof,x+40,70,120,30);ctx.restore();
    R(x+42,94,116,4,'#eef3fb');
    R(x+81,119,38,49,'#140c1a');R(x+83,121,34,47,bonusUsed?'#2a3a2a':'#3a6a48');
    if(!bonusUsed){ctx.globalAlpha=.4+Math.sin(t60/8)*.2;R(x+83,121,34,47,'#fff4b0');ctx.globalAlpha=1;glow(x+100,142,40,WARM,.5);txt('★',x+100,136,8,'#fff','center');}
  }
  const kind=i%3;
  if(kind===0&&wx!==1400){const sx=x+70;
    ctx.strokeStyle='#140c1a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(sx,168);ctx.lineTo(sx+16,104);ctx.lineTo(sx+32,168);ctx.moveTo(sx+70,168);ctx.lineTo(sx+86,104);ctx.lineTo(sx+102,168);ctx.stroke();
    ctx.strokeStyle='#c0304a';ctx.lineWidth=2;ctx.stroke();
    R(sx+13,101,77,6,'#140c1a');R(sx+14,102,75,4,'#c0304a');R(sx+14,100,75,2,'#eef3fb');
    for(let k=0;k<2;k++){const cx=sx+34+k*30+Math.sin(t60/30+k)*3;R(cx,106,1,36,'#9a9aaa');R(cx+10,106,1,36,'#9a9aaa');R(cx-3,141,16,5,'#140c1a');R(cx-2,142,14,3,'#e0b040');}
  }else if(kind===1&&wx!==1400){
    ctx.fillStyle='#140c1a';ctx.beginPath();ctx.ellipse(x+80,160,42,11,0,0,7);ctx.fill();ctx.fillStyle='#7a7a94';ctx.beginPath();ctx.ellipse(x+80,160,40,10,0,0,7);ctx.fill();
    ctx.fillStyle='#eef3fb';ctx.beginPath();ctx.ellipse(x+80,156,36,6,0,0,7);ctx.fill();R(x+75,134,10,22,'#140c1a');R(x+76,134,8,22,'#8a8aa4');R(x+71,131,18,5,'#eef3fb');
    R(x+139,148,4,18,'#140c1a');ctx.fillStyle='#140c1a';ctx.beginPath();ctx.ellipse(x+142,142,12,7,0,0,7);ctx.fill();ctx.fillStyle='#3aa060';ctx.beginPath();ctx.ellipse(x+142,142,11,6,0,0,7);ctx.fill();
    R(x+150,130,7,10,'#140c1a');R(x+151,131,5,9,'#3aa060');R(x+153,132,1,1,'#111');R(x+134,139,4,3,'#d03030');
  }
  if(hash(i*13)>.5){P(TEX.wood,x+20,146,44,6);OL(x+20,146,44,6);R(x+24,152,3,14,'#140c1a');R(x+57,152,3,14,'#140c1a');R(x+18,144,48,3,'#eef3fb');}
  for(let k=0;k<200;k+=8){R(x+k,134,2,32,'#140c1a');R(x+k-1,132,4,3,'#eef3fb');}
  R(x,140,200,2,'#140c1a');R(x,156,200,2,'#140c1a');
  snowPile(x+60,168,120,14);snowPile(x+160,168,90,10);
  lamp(x+190,CYAN);
}
function nearShops(i,x,wx){
  const d=DOORS.find(d=>d.kind==='shop'&&d.x===wx+100);
  const top=52;P([TEX.brick,TEX.sideB,TEX.brickB][i%3],x+4,top,192,116);OL(x+4,top,192,116);R(x+2,top-3,196,4,'#eef3fb');
  const nc=d?'#ffb04a':['#4ae0ff','#ff4ab0'][i%2];
  neonSign(x+18,top+8,164,d?SHOPS[d.shop].name:['LIVRARIA','DISCOS','BRECHÓ','GAMES'][i%4],nc,(Math.floor(t60/50+i)%11)!==0);
  for(let k=0;k<12;k++)R(x+10+k*15,top+30,15,10,k%2?'#f4f4f4':(d?'#c82a3a':'#2a8a5a'));
  ctx.fillStyle=d?'#c82a3a':'#2a8a5a';for(let k=0;k<12;k++){ctx.beginPath();ctx.arc(x+17.5+k*15,top+40,7.5,0,Math.PI);ctx.fill();}
  const g=ctx.createLinearGradient(0,top+56,0,top+104);g.addColorStop(0,d?'#fff0b8':'#c0d8ff');g.addColorStop(1,d?'#f0a050':'#6a86c0');
  R(x+13,top+55,100,50,'#140c1a');ctx.fillStyle=g;ctx.fillRect(x+14,top+56,98,48);
  for(let k=0;k<4;k++){R(x+20+k*23,top+80,15,24,d?'#a85a30':'#3a4a7a');R(x+22+k*23,top+72,11,7,['#e04a4a','#ffe060','#4ac07a','#e0e0ff'][k]);}
  ctx.globalAlpha=.25;R(x+14,top+56,26,48,'#fff');ctx.globalAlpha=1;
  if(d)glow(x+62,top+80,70,WARM,.3);
  R(x+124,top+52,48,64,'#140c1a');R(x+126,top+54,44,62,d?'#ffd890':'#3a2a2a');R(x+164,top+86,3,3,'#8a6a2a');
  if(d){ctx.globalAlpha=.25+Math.sin(t60/10)*.12;R(x+126,top+54,44,62,'#fff');ctx.globalAlpha=1;glow(x+148,top+90,36,WARM,.4);}
  snowPile(x+40,168,60,6);
  lamp(x+192);
}
function nearBridge(i,x){
  R(x,0,200,100,'#120e1e');
  P(TEX.metal,x,48,200,14);OL(x,48,200,14);P(TEX.metal,x,84,200,10);OL(x,84,200,10);
  for(let k=0;k<200;k+=50){P(TEX.metal,x+k,48,8,46);OL(x+k,48,8,46);
    ctx.strokeStyle='#140c1a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+k+8,62);ctx.lineTo(x+k+50,84);ctx.moveTo(x+k+50,62);ctx.lineTo(x+k+8,84);ctx.stroke();
    ctx.strokeStyle='#3a4260';ctx.lineWidth=2;ctx.stroke();}
  R(x,0,200,20,'#2b1e4e');for(let k=0;k<200;k+=20)R(x+k,0,9,22,'#140c1a');R(x,20,200,4,'#1a1430');
  P(TEX.concrete,x,100,200,68);OL(x,100,200,68);for(let k=0;k<200;k+=40)R(x+k,100,1,68,'#3e3a48');
  const g=hash(i*17);
  if(g>.25){ctx.font='16px '+PIX;ctx.textAlign='center';ctx.textBaseline='middle';const c=['#ff4ab0','#4ae0ff','#ffe060'][Math.floor(g*3)%3];ctx.lineWidth=3;ctx.strokeStyle='#140c1a';ctx.strokeText(['ZZ','ZERO','RS!'][Math.floor(g*7)%3],x+110,132);ctx.fillStyle=c;ctx.fillText(['ZZ','ZERO','RS!'][Math.floor(g*7)%3],x+110,132);}
  if(hash(i*23)>.4){R(x+20,110,26,34,'#140c1a');R(x+21,111,24,32,'#f0e6cc');R(x+23,113,20,14,'#c03a3a');R(x+23,129,20,2,'#555');R(x+23,133,14,2,'#555');R(x+23,137,17,2,'#555');}
  lampSodium(x+100);
  ctx.globalAlpha=.4;R(x,94,200,10,'#000');ctx.globalAlpha=1;
}
function lampSodium(x){R(x-8,94,16,4,'#140c1a');R(x-6,97,12,2,'#ffc060');glow(x,100,50,WARM,.45);
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.12;ctx.fillStyle='#ffa040';ctx.beginPath();ctx.moveTo(x-6,98);ctx.lineTo(x-50,200);ctx.lineTo(x+50,200);ctx.lineTo(x+6,98);ctx.fill();ctx.restore();}
function drawPraca(){
  const ox=Math.round(CLUB_X-cam);if(ox>W||ox<-520)return;
  ctx.save();ctx.beginPath();ctx.rect(Math.max(0,ox),0,Math.min(W,BAR_X-cam)-Math.max(0,ox),H);ctx.clip();
  // BAR CASTIGO (onde é o show)
  {const bx=ox;P(TEX.brickP,bx,24,205,144);OL(bx,24,205,144);
   R(bx,24,205,144,'rgba(30,8,40,.55)');
   R(bx+8,6,190,30,'#140c1a');R(bx+10,8,186,26,'#1e0a26');
   const on2=Math.floor(t60/18)%14!==0,flick=Math.floor(t60/3)%9===0;
   ctx.font='16px '+PIX;ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.fillStyle=on2&&!flick?'#ff5ad0':'#4a1a40';ctx.fillText(SG().bar,bx+103,22);
   if(on2&&!flick){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.55;ctx.fillText(SG().bar,bx+103,22);ctx.restore();glow(bx+103,22,110,'rgba(255,80,210,1)',.4);}
   // porta com luz e cordão
   R(bx+78,90,50,78,'#140c1a');R(bx+80,92,46,76,'#ff9ae8');R(bx+80,92,46,76,'rgba(120,20,90,.55)');R(bx+102,92,2,76,'#140c1a');
   glow(bx+103,130,70,'rgba(255,100,220,1)',.35);
   for(const px_ of [bx+66,bx+140]){R(px_-1,150,3,18,'#c0a040');R(px_-3,148,7,3,'#e0c060');}
   ctx.strokeStyle='#d02a4a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bx+66,152);ctx.quadraticCurveTo(bx+103,162,bx+140,152);ctx.stroke();
   // cartazes do show
   for(const [cx_,cl] of [[bx+24,'#ffe066'],[bx+160,'#4ae0ff']]){R(cx_,70,30,40,'#140c1a');R(cx_+1,71,28,38,'#2a1030');
     ctx.font='8px '+PIX;ctx.fillStyle=cl;ctx.fillText('00',cx_+15,84);ctx.fillStyle='#fff';ctx.fillText('HOJE',cx_+15,98);}
   R(bx+8,46,190,3,'#ff5ad0');ctx.globalAlpha=.5;R(bx+8,46,190,3,'#fff');ctx.globalAlpha=1;}
  // lancheria
  const lx=ox+222;P(TEX.tile,lx,62,250,106);OL(lx,62,250,106);
  R(lx-4,48,258,16,'#140c1a');R(lx-3,49,256,14,'#c82a3a');for(let k=0;k<256;k+=16)R(lx-3+k,49,8,14,'#e8e8e8');
  // letreiro grande
  const on=Math.floor(t60/25)%12!==0;
  R(lx+40,12,170,34,'#140c1a');R(lx+42,14,166,30,'#2a1424');
  ctx.font='16px '+PIX;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=on?'#fff6c0':'#5a3a3a';ctx.fillText('XIS DO JAPA',lx+125,30);
  if(on){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.6;ctx.fillStyle='#ffb04a';ctx.fillText('XIS DO JAPA',lx+125,30);ctx.restore();glow(lx+125,30,110,WARM,.35);}
  // ícone de lanche
  ctx.fillStyle='#140c1a';ctx.beginPath();ctx.ellipse(lx+22,30,13,11,0,0,7);ctx.fill();ctx.fillStyle='#e8a040';ctx.beginPath();ctx.ellipse(lx+22,26,11,6,0,Math.PI,0);ctx.fill();
  R(lx+11,27,22,3,'#4ac04a');R(lx+11,30,22,3,'#6a3420');R(lx+11,33,22,3,'#e8a040');
  // vitrine
  const g=ctx.createLinearGradient(0,72,0,150);g.addColorStop(0,'#fff4c8');g.addColorStop(1,'#f8a050');
  R(lx+10,70,160,76,'#140c1a');ctx.fillStyle=g;ctx.fillRect(lx+12,72,156,72);
  for(let k=0;k<4;k++){R(lx+20+k*38,118,24,4,'#c82a3a');R(lx+30+k*38,122,4,22,'#6a3420');R(lx+18+k*38,104,8,12,'#c82a3a');R(lx+38+k*38,104,8,12,'#c82a3a');}
  R(lx+12,96,156,3,'#d08040');for(let k=0;k<6;k++)R(lx+20+k*25,84,12,10,['#fff','#ffe060','#e04a4a'][k%3]);
  ctx.globalAlpha=.3;R(lx+12,72,40,72,'#fff');ctx.globalAlpha=1;R(lx+90,70,2,76,'#140c1a');
  glow(lx+90,110,120,WARM,.35);
  R(lx+182,78,58,90,'#140c1a');R(lx+184,80,54,88,'#ffe0a0');R(lx+210,80,2,88,'#140c1a');
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.22;ctx.fillStyle='#ffb060';ctx.beginPath();ctx.moveTo(lx+12,168);ctx.lineTo(lx+240,168);ctx.lineTo(lx+270,210);ctx.lineTo(lx-20,210);ctx.fill();ctx.restore();
  lamp(ox+214,PINK);
  ctx.restore();
}
function drawDoors(){
  const p=me();if(!p||p.out||scene!=='play')return;
  for(const d of DOORS){
    if(d.kind==='bonus'&&bonusUsed)continue;
    const sx=Math.round(d.x-cam);if(sx<-20||sx>W+20)continue;
    if(!lock&&Math.abs(p.x-d.x)<22&&p.y<YMIN+16&&Math.floor(t60/12)%2)outlineText('▲ ENTRAR',sx,104,8,'#ffe066','#000',3);
  }
}
function drawRainbow(){
  R(0,0,W,H,'#0a0620');
  for(let i=0;i<60;i++){const x=((hash(i*7)*W*2-(cam-BONUS_X)*.2)%W+W)%W,y=hash(i*13)*150;R(x,y,1,1,'#fff');}
  for(let i=0;i<5;i++){const x=((hash(i*31)*W-(cam-BONUS_X)*.4)%W+W)%W,y=20+hash(i*17)*80;outlineText('★',x,y,16,'#ffffff','#5a3aa0',3);}
  const C=['#ff3a5a','#ff9a3a','#ffe03a','#5ad05a','#3ab0ff','#8a5aff'];
  for(let k=0;k<6;k++)R(0,166+k*18,W,18,C[k]);
  ctx.globalAlpha=.25;for(let x=-((cam-BONUS_X)%40);x<W;x+=40)R(x,166,20,104,'#fff');ctx.globalAlpha=1;
  R(0,150,W,4,'#ff8ad0');for(let x=-((cam-BONUS_X)%48);x<W;x+=48){R(x,140,4,26,'#ff8ad0');R(x-3,136,10,6,'#fff');outlineText('★',x+24,152,8,'#ffe066','#a03a80',2);}
  if(bonus)outlineText('BÔNUS! '+Math.ceil(bonusT/60)+'s',W/2,62,16,'#ffe066','#5a1a80',4);
}
function drawNear(){
  const sw=200;const i0=Math.floor(cam/sw)-1;
  for(let i=i0;i<i0+W/sw+3;i++){
    const wx=i*sw;if(wx<0||wx>=CLUB_X)continue;
    const x=Math.round(wx-cam);const k=zoneAt(wx);
    if(k==='street')nearStreet(i,x);else if(k==='park')nearPark(i,x,wx);else if(k==='shops')nearShops(i,x,wx);else nearBridge(i,x);
  }
  drawPraca();drawBarInside();
}
function groundStreet(x0,x1){
  const o=-Math.floor(cam)%24;
  ctx.save();ctx.translate(o,0);ctx.fillStyle=TEX.side;ctx.fillRect(x0-o-24,166,x1-x0+48,32);ctx.restore();
  R(x0,164,x1-x0,3,'#eef3fb');R(x0,167,x1-x0,1,'#b8c6e2');
  R(x0,197,x1-x0,4,'#8a90a8');R(x0,197,x1-x0,1,'#b0b6cc');R(x0,201,x1-x0,2,'#140c1a');
  const o2=-Math.floor(cam)%32;ctx.save();ctx.translate(o2,0);ctx.fillStyle=TEX.asph;ctx.fillRect(x0-o2-32,203,x1-x0+64,67);ctx.restore();
  for(let x=-(Math.floor(cam)%70);x<W;x+=70){R(x,235,30,3,'#140c1a');R(x,235,29,2,'#e0c050');}
  for(let i=Math.floor(cam/150)-1;i<cam/150+5;i++){const x=Math.round(i*150-cam+hash(i*7)*60),y=214+hash(i*3)*40;
    ctx.fillStyle='#1a1c2c';ctx.beginPath();ctx.ellipse(x,y,22,4,0,0,7);ctx.fill();ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35;
    const c=['#ff4ab0','#ffb04a','#4ae0ff'][((i%3)+3)%3];ctx.fillStyle=c;ctx.fillRect(x-8,y-2,3,4);ctx.fillRect(x+4,y-1,2,3);ctx.restore();}
}
function groundPark(x0,x1){
  const o=-Math.floor(cam)%16;ctx.save();ctx.translate(o,0);ctx.fillStyle=TEX.snow;ctx.fillRect(x0-o-16,164,x1-x0+32,106);ctx.restore();
  const o2=-Math.floor(cam)%24;ctx.save();ctx.translate(o2,0);ctx.fillStyle=TEX.side;ctx.fillRect(x0-o2-24,196,x1-x0+48,34);ctx.restore();
  R(x0,195,x1-x0,2,'#9aa8c8');R(x0,230,x1-x0,2,'#9aa8c8');
  for(let i=Math.floor(cam/70)-1;i<cam/70+9;i++){const x=Math.round(i*70-cam+hash(i*5)*30);ctx.fillStyle='#c8d4ec';ctx.beginPath();ctx.ellipse(x,180+hash(i)*10,14,3,0,0,7);ctx.ellipse(x+20,250+hash(i*2)*14,18,4,0,0,7);ctx.fill();}
}
function groundBridge(x0,x1){
  const o=-Math.floor(cam)%16;ctx.save();ctx.translate(o,0);ctx.fillStyle=TEX.concrete;ctx.fillRect(x0-o-16,166,x1-x0+32,31);ctx.restore();
  R(x0,196,x1-x0,4,'#46424e');R(x0,200,x1-x0,2,'#140c1a');
  const o2=-Math.floor(cam)%32;ctx.save();ctx.translate(o2,0);ctx.fillStyle=TEX.asph;ctx.fillRect(x0-o2-32,202,x1-x0+64,68);ctx.restore();
  R(x0,232,x1-x0,2,'#e0c050');R(x0,236,x1-x0,2,'#e0c050');
}
function drawGround(){
  for(const z of ZONES){
    const x0=Math.max(0,Math.round(z.x0-cam)),x1=Math.min(W,Math.round(z.x1-cam));if(x1<=x0)continue;
    ctx.save();ctx.beginPath();ctx.rect(x0,160,x1-x0,H);ctx.clip();
    if(z.k==='club'){groundBar(x0,x1);ctx.restore();continue;}
    if(z.k==='park')groundPark(x0,x1);else if(z.k==='bridge')groundBridge(x0,x1);else groundStreet(x0,x1);
    if(z.k!=='bridge')for(let i=Math.floor(cam/110)-1;i<cam/110+6;i++){
      const x=Math.round(i*110-cam+hash(i*3)*40),y=170+hash(i*9)*24;snowPile(x,y,16+hash(i)*18,3+hash(i*2)*2);
    }
    ctx.restore();
  }
}
const SNOW=[];for(let i=0;i<120;i++)SNOW.push({x:Math.random()*W,y:Math.random()*H,s:Math.random()<.2?2:1,v:.3+Math.random()*.6,ph:Math.random()*6});
const CLP=Array.from({length:90},()=>({x:Math.random()*480,y:Math.random()*270,v:.5+Math.random()*1.5,ph:Math.random()*6}));
function drawClimate(){
  if(bonus)return;if(STAGE===1){drawSnow();return;}
  const inBar=cam>BAR_X-80;
  if(STAGE===2){if(inBar)return;ctx.strokeStyle='rgba(170,200,255,.55)';ctx.lineWidth=1;ctx.beginPath();
    for(const f of CLP){f.y+=f.v*5;f.x-=f.v*.8;if(f.y>H){f.y=-10;f.x=Math.random()*(W+60);}ctx.moveTo(f.x,f.y);ctx.lineTo(f.x-2,f.y+8);}ctx.stroke();
    if(t60%240<4)R(0,0,W,H,'rgba(220,230,255,.35)');return;}
  if(STAGE===3){if(cam>BAR_X-80)return;for(let i=0;i<4;i++){const y=150+i*28+Math.sin(t60/90+i)*6,x=((-cam*.3-t60*(.2+i*.1))%W+W)%W;ctx.globalAlpha=.12;
    for(const dx of[-W,0])R(x+dx,y,W,22,'#c8ffd8');}ctx.globalAlpha=1;return;}
  const hot=STAGE===4;
  for(const f of CLP){if(hot){f.y-=f.v*.6;f.x+=Math.sin(t60/30+f.ph)*.4;if(f.y<0){f.y=H;f.x=Math.random()*W;}}
    else{f.y+=f.v*.5;f.x+=Math.sin(t60/40+f.ph)*.5;if(f.y>H){f.y=-2;f.x=Math.random()*W;}}
    ctx.globalAlpha=.5+.4*Math.sin(t60/8+f.ph);ctx.fillStyle=hot?(f.ph>3?'#ffb040':'#ff6a20'):(f.ph>2?'#5a5050':'#ff3020');
    ctx.fillRect(Math.round(f.x),Math.round(f.y),f.v>1.3?2:1,f.v>1.3?2:1);}
  ctx.globalAlpha=1;
  if(!hot&&t60%180<30)R(0,0,W,H,'rgba(255,0,0,'+(.08*Math.sin((t60%180)/30*Math.PI))+')');
}
function drawSnow(){
  if(bonus)return;
  ctx.fillStyle='#f4f8ff';
  for(const f of SNOW){f.y+=f.v;f.x+=Math.sin(t60/40+f.ph)*.25;if(f.y>H){f.y=-2;f.x=Math.random()*W;}
    const x=((f.x-cam*(f.s===2?.15:.05))%W+W)%W;
    ctx.globalAlpha=f.s===2?.9:.6;ctx.fillRect(Math.round(x),Math.round(f.y),f.s,f.s);}
  ctx.globalAlpha=1;
}
function vignette(){const g=ctx.createRadialGradient(W/2,H/2,H*.45,W/2,H/2,H*.95);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(10,0,30,.45)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
function drawBG(){if(cam>=BONUS_X-100){drawRainbow();return;}drawSky();drawFar();drawTrees();drawNear();drawGround();drawDoors();}


// ---------- BAR CASTIGO (por dentro) ----------
function silh(x,y,s,c,k){const b=Math.floor((t60/10+k*5)%10)<5?0:1;ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y-30*s-b,5*s,0,7);ctx.fill();
  ctx.beginPath();ctx.moveTo(x-7*s,y);ctx.lineTo(x-8*s,y-18*s-b);ctx.quadraticCurveTo(x,y-27*s-b,x+8*s,y-18*s-b);ctx.lineTo(x+7*s,y);ctx.fill();
  if(k%3===0){R(x+6*s,y-24*s-b,2,6,c);R(x+6*s,y-26*s-b,3,3,'rgba(255,200,80,.6)');}}
function barTable(x,y,c){R(x-1,y-22,3,22,'#111');R(x-6,y-1,13,2,'#111');ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y-23,13,3,0,0,7);ctx.fill();R(x-6,y-30,3,6,'#3a7a3a');R(x+3,y-29,3,5,'rgba(255,220,120,.8)');}
function barDecorBack(ox){
  // mesas e gente (silhuetas) entre o balcão e o palco
  const cs=STAGE===3?['#3a2a7a','#2a1a5a']:STAGE===5?['#120a06','#1e120a']:['#1a0a1e','#0a0610'];
  if(STAGE===5){ // bar de motoqueiro: moto na parede, placas e pneus
    const mx=ox+196,my=112;ctx.lineWidth=3;ctx.strokeStyle='#0a0a0a';
    for(const wx of[mx+10,mx+78]){ctx.beginPath();ctx.arc(wx,my,13,0,7);ctx.stroke();ctx.strokeStyle='#8a8a92';ctx.lineWidth=1;ctx.beginPath();ctx.arc(wx,my,8,0,7);ctx.stroke();for(let a=0;a<6;a++){ctx.beginPath();ctx.moveTo(wx,my);ctx.lineTo(wx+Math.cos(a)*8,my+Math.sin(a)*8);ctx.stroke();}ctx.strokeStyle='#0a0a0a';ctx.lineWidth=3;}
    ctx.lineWidth=2;ctx.strokeStyle='#c8ccd4';ctx.beginPath();ctx.moveTo(mx+78,my);ctx.lineTo(mx+62,my-28);ctx.lineTo(mx+58,my-36);ctx.moveTo(mx+52,my-36);ctx.lineTo(mx+66,my-36);ctx.stroke();
    ctx.beginPath();ctx.moveTo(mx+10,my);ctx.lineTo(mx+30,my-6);ctx.lineTo(mx+62,my-14);ctx.stroke();
    ctx.fillStyle='#8a1010';ctx.beginPath();ctx.moveTo(mx+34,my-14);ctx.quadraticCurveTo(mx+46,my-30,mx+60,my-22);ctx.lineTo(mx+56,my-12);ctx.closePath();ctx.fill();R(mx+42,my-24,8,2,'#e8c050');
    R(mx+30,my-10,16,10,'#5a5a62');R(mx+32,my-8,5,6,'#a8acb4');R(mx+39,my-8,5,6,'#a8acb4');R(mx+14,my-16,22,4,'#1a1a1a');R(mx+4,my-2,30,2,'#c8ccd4');
    glow(mx+46,my-14,50,'rgba(255,160,60,1)',.18);
    for(let k=0;k<3;k++){const px=ox+322+k*0;}
    [[ox+186,72,'#e8d050'],[ox+222,66,'#d8d8e0'],[ox+258,72,'#c84040']].forEach(([x,y,c])=>{R(x,y,26,13,'#111');R(x+1,y+1,24,11,c);R(x+4,y+4,18,1,'#333');R(x+4,y+7,12,1,'#333');});
    for(let k=0;k<3;k++){ctx.lineWidth=4;ctx.strokeStyle='#0c0c0c';ctx.beginPath();ctx.ellipse(ox+466,150-k*9,14,4,0,0,7);ctx.stroke();}
    R(ox+300,54,40,8,'#111');for(let k=0;k<5;k++)R(ox+302+k*8,55,4,6,k%2?'#fff':'#111');
  }
  for(let k=0;k<4;k++)barTable(ox+192+k*30,166,STAGE===3?['#ff6a8a','#ffe060','#6ac0ff','#7aff7a'][k]:'#2a1a1a');
  for(let k=0;k<6;k++)silh(ox+186+k*20+(k%2)*5,166,.9,cs[k%2],k);
}
function barDecorFront(ox){
  const cs=STAGE===3?['#2a1a5a','#3a2a7a']:STAGE===5?['#0a0604','#160e08']:['#0e0612','#1a0a1e'];
  for(let k=0;k<11;k++)silh(ox+306+k*20,170,1,cs[k%2],k+3);
  if(STAGE===3){const bx=ox+250,by=20;ctx.fillStyle='#d8e0f0';ctx.beginPath();ctx.arc(bx,by,9,0,7);ctx.fill();for(let k=0;k<12;k++)R(bx-7+(k%4)*4,by-6+Math.floor(k/4)*4,2,2,['#fff','#8ac0ff','#ff8ae8'][(k+Math.floor(t60/6))%3]);
    for(let k=0;k<6;k++){const a=t60/30+k*1.05,c=['#ff6a8a','#ffe060','#6ac0ff','#7aff7a','#b05aff','#ffa040'][k];ctx.globalAlpha=.1;ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+Math.cos(a)*300,by+Math.abs(Math.sin(a))*260);ctx.lineTo(bx+Math.cos(a+.12)*300,by+Math.abs(Math.sin(a+.12))*260);ctx.fill();}ctx.globalAlpha=1;}
}
function drawBarmen(ox){
  const looks=[['#f0f0f0','#c8c8c8','beanie'],['#1a1a1a','#0a0a0a','bald'],['#c03a3a','#8a2020','fedora']];
  BARMAN.forEach((b,i)=>{if(!b.look)b.look=Object.assign({},BASE,{head:looks[i][2],torso:'tank',top:looks[i][0],topD:looks[i][1],topH:looks[i][0],skin:['#f0c8a8','#8f5d3d','#c98e64'][i],skinD:['#c99878','#6a4028','#a06a44'][i],beanie:'#2a2a2a',hat:'#2a2a2a',pants:'#222'});
    b.t++;const busy=runner&&runner.phase==='beer'&&i===1;b.state='idle';drawFighterAt(b,ox+50+i*50,166,.85);});
}
function drawBarInside(){
  const ox=Math.round(BAR_X-cam);if(ox>W||ox<-520)return;
  ctx.save();ctx.beginPath();ctx.rect(Math.max(0,ox),0,W,H);ctx.clip();
  const TH=STAGE===3?{w:'#5a44b0',b:'#6a54c4',m:'#2a1a5a',n:'#4af0ff',g:'rgba(80,240,255,1)'}:STAGE===5?{w:'#2a1a10',b:'#3a2414',m:'#120a06',n:'#ff8a20',g:'rgba(255,140,40,1)'}:{w:'#2a0e22',b:'#3a1430',m:'#14060f',n:'#ff5ad0',g:'rgba(255,80,210,1)'};
  R(ox,0,520,170,TH.w);
  if(STAGE===5){for(let x=0;x<520;x+=18){R(ox+x,0,17,170,x%36?'#3a2414':'#33200f');R(ox+x+17,0,1,170,'#1a0e06');}}
  else for(let y=4;y<170;y+=8)for(let x=((y/8)%2)*12;x<520;x+=24)R(ox+x,y,22,6,TH.b);
  if(STAGE===3)for(let k=0;k<6;k++)R(ox,64+k*3,520,3,['#ff4a6a','#ffa040','#ffe060','#5aff7a','#4ac0ff','#b05aff'][k]);
  // mezanino com público
  R(ox,0,520,46,TH.m);
  for(let k=0;k<44;k++){const hx=ox+6+k*12,b=Math.floor((t60/8+k*3)%8)<4?0:2;
    const cc=['#f0c8a8','#c98e64','#e8b896','#8f5d3d'][k%4];R(hx,18+b,8,8,cc);R(hx,16+b,8,3,['#222','#e05a20','#f0d060','#3a2a1a'][(k*7)%4]);R(hx-1,26+b,10,14,['#1a1a22','#c03a5a','#2a2a3a','#555'][(k*5)%4]);}
  R(ox,40,520,6,'#5a3a20');for(let k=0;k<520;k+=10)R(ox+k,46,2,16,'#5a3a20');R(ox,60,520,3,'#5a3a20');
  // varal de luzinhas
  for(let k=0;k<26;k++){const lx=ox+8+k*20,ly=70+Math.sin(k*.9)*3;R(lx,ly,3,3,['#ff5ad0','#ffe066','#4ae0ff','#7aff7a'][k%4]);if((k+Math.floor(t60/10))%3===0)glow(lx+1,ly+1,7,'rgba(255,200,120,1)',.5);}
  // neon CASTIGO
  const on=Math.floor(t60/20)%7!==0;
  R(ox+30,80,170,26,'#14060f');ctx.font='16px '+PIX;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle=on?TH.n:'#3a2a3a';ctx.fillText(SG().bar,ox+115,94);
  if(on){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.5;ctx.fillText(SG().bar,ox+115,94);ctx.restore();glow(ox+115,94,100,TH.g,.35);}
  barDecorBack(ox);
  // balcão com garrafas
  R(ox+16,112,150,6,'#3a2a1a');for(let k=0;k<12;k++){const bx=ox+22+k*12;R(bx,100,5,12,['#2a6a3a','#8a4a1a','#c8c8d0','#5a2a6a'][k%4]);R(bx+1,96,3,4,'#222');}
  if(STAGE===4)drawBarmen(ox);
  R(ox+10,140,170,30,STAGE===5?'#2a2a2e':'#4a2a18');R(ox+10,138,170,4,STAGE===5?'#9aa0a8':'#7a4a28');for(let k=0;k<6;k++)R(ox+18+k*28,144,2,24,'#3a1e10');
  for(let k=0;k<4;k++){const tx=ox+24+k*40;R(tx,128,4,10,'#c8a040');R(tx-1,126,6,3,'#fff6c0');}
  // palco
  const sx=ox+300;R(sx,118,220,52,'#16121e');R(sx,116,220,4,'#6a6a8a');
  for(let k=0;k<2;k++){const spx=sx+6+k*170;R(spx,62,34,56,'#101014');for(let r=0;r<3;r++){ctx.fillStyle='#24242e';ctx.beginPath();ctx.arc(spx+17,72+r*17,7,0,7);ctx.fill();}}
  // bateria vazia e pedestal
  R(sx+96,96,30,22,'#101014');ctx.fillStyle='#c02a3a';ctx.beginPath();ctx.arc(sx+111,104,10,0,7);ctx.fill();ctx.fillStyle='#14060f';ctx.font='8px '+PIX;ctx.fillText('00',sx+111,104);
  R(sx+86,90,14,2,'#c8c8d0');R(sx+122,88,14,2,'#c8c8d0');R(sx+60,90,1,26,'#888');R(sx+57,88,7,3,'#888');
  barDecorFront(ox);
  ctx.globalAlpha=STAGE===3?.18:.12;
  for(let k=0;k<3;k++){ctx.fillStyle=STAGE===3?['#ff6a8a','#6affc0','#6ac0ff'][k]:STAGE===5?'#ffb060':'#ff8ae8';}
  for(let k=0;k<3;k++){const lx=sx+70+k*40+Math.sin(t60/40+k)*10;ctx.beginPath();ctx.moveTo(lx-4,0);ctx.lineTo(lx-30,118);ctx.lineTo(lx+30,118);ctx.lineTo(lx+4,0);ctx.fill();}
  ctx.globalAlpha=1;
  ctx.restore();
}
function groundBar(x0,x1){
  const o=BAR_X-cam;
  for(let r=0;r<7;r++)for(let c=-1;c<24;c++){const tx=Math.round(o+c*24),ty=168+r*15;
    const lit=((c+r)%2===0);
    if(STAGE===3){const hue=((c*37+r*61+Math.floor(t60/20)*(lit?1:0))%360);R(tx,ty,24,15,lit?'hsl('+hue+',70%,'+(45+10*Math.sin(t60/15+c))+'%)':'#2a2050');}
    else if(STAGE===5)R(tx,ty,24,15,lit?'#3a3530':'#24201c');
    else R(tx,ty,24,15,lit?'#3a2a44':'#1c1424');}
  R(x0,166,x1-x0,3,'#14060f');
  glow(W/2,215,240,STAGE===5?'rgba(255,140,40,1)':'rgba(255,80,210,1)',STAGE===3?.12:.06);
}

// ---------- luz, contorno e chefão robô ----------
const SCR=[document.createElement('canvas'),document.createElement('canvas')];SCR.forEach(c=>{c.width=320;c.height=280;});
const SCX=SCR.map(c=>c.getContext('2d'));
function drawEntity(e,sx,sy){
  if(!e.look.robot&&!e.look.drone){drawFighterAt(e,sx,sy);return;}
  const real=ctx;const A=SCX[0],B=SCX[1];const ox=160,oy=230;
  A.setTransform(1,0,0,1,0,0);A.globalCompositeOperation='source-over';A.globalAlpha=1;A.clearRect(0,0,320,280);
  ctx=A;
  if(e.look.robot)drawRobot(e,ox,oy);else if(e.look.drone)drawDrone(e,ox,oy);else drawFighterAt(e,ox,oy);
  ctx=real;
  // luz ambiente: quente de cima/direita, fria de baixo/esquerda
  A.globalCompositeOperation='source-atop';
  let g=A.createLinearGradient(ox+40,oy-140,ox-40,oy);g.addColorStop(0,'rgba(255,170,90,.22)');g.addColorStop(.5,'rgba(255,120,120,0)');g.addColorStop(1,'rgba(70,80,200,.28)');
  A.fillStyle=g;A.fillRect(0,0,320,280);
  if(e.flashT>0){A.globalAlpha=e.flashT/6*.85;A.fillStyle='#ffffff';A.fillRect(0,0,320,280);A.globalAlpha=1;}
  A.globalCompositeOperation='source-over';
  // contorno externo de 1px
  B.setTransform(1,0,0,1,0,0);B.globalCompositeOperation='source-over';B.clearRect(0,0,320,280);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])B.drawImage(SCR[0],dx,dy);
  B.globalCompositeOperation='source-in';B.fillStyle='#0e0814';B.fillRect(0,0,320,280);
  B.globalCompositeOperation='source-over';B.drawImage(SCR[0],0,0);
  ctx.drawImage(SCR[1],Math.round(sx-ox),Math.round(sy-oy));
}
// robô chefão (desenho original): laranja e aço, olho ciano
function drawRobot(e,sx,sy){
  const s=e.scale;ctx.save();ctx.translate(sx,sy);ctx.scale(e.facing*s,s);
  const st=e.state,t=e.t;let lean=0,fist=0,raise=0,bob=Math.sin(t/14)*1.2,eye=0;
  if(st==='attack'&&e.atk){const d=e.atk,a=e.atkT,ph=a<d.s?0:a<d.s+d.a?1:2;
    if(d.fire){eye=ph===0?a/d.s:1;lean=-2;}else if(d.pillar){raise=ph===0?1:0;}else{fist=ph===0?-1:ph===1?1:.3;lean=ph===1?4:-3;}}
  if(st==='hurt')lean=-5;
  if(st==='down'||st==='dead'||st==='air'){ctx.rotate(-Math.PI/2*Math.min(1,(st==='air'?t/10:1)));ctx.translate(30,-14);}
  const O='#120a18',A1='#d8762a',A2='#a85418',A3='#ffb060',ST='#8a92a8',SD='#5a6078',DK='#2a2e3e';
  const plate=(x,y,w,h,c,hi,r)=>{ctx.fillStyle=O;rr(x-1,y-1,w+2,h+2,r+1);ctx.fill();ctx.fillStyle=c;rr(x,y,w,h,r);ctx.fill();if(hi){ctx.fillStyle=hi;rr(x+1,y+1,w-2,2,1);ctx.fill();}};
  const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();};
  // braço de trás
  ctx.save();ctx.translate(-12+lean*.5,-56+bob);ctx.rotate(.3+(raise?-2:0));plate(-4,0,9,20,SD,null,3);plate(-7,18,15,16,A2,null,4);ctx.restore();
  // pernas
  for(const [lx,c,c2] of [[-8,SD,A2],[7,ST,A1]]){plate(lx-5,-34,10,16,c,null,3);plate(lx-7,-20,14,16,c2,c2===A1?A3:null,3);plate(lx-9,-5,18,6,DK,null,2);}
  // tronco
  ctx.save();ctx.translate(lean,bob);
  plate(-20,-74,40,42,A1,A3,8);
  plate(-14,-66,20,18,ST,'#b8c0d4',4);plate(-11,-63,14,12,DK,null,3);
  ctx.fillStyle=Math.floor(t/8)%2?'#4ae0ff':'#2a90c0';ctx.fillRect(-9,-61,4,3);ctx.fillRect(-3,-61,4,3);ctx.fillRect(-9,-56,10,2);
  plate(8,-70,8,30,A2,null,3);
  for(let k=0;k<3;k++)plate(-16+k*12,-38,10,6,DK,null,2);
  // cabeça
  plate(-8,-90,22,17,ST,'#b8c0d4',6);plate(4,-86,12,9,DK,null,3);
  const eg=ctx.createRadialGradient(10,-81.5,0,10,-81.5,5+eye*4);eg.addColorStop(0,'#ffffff');eg.addColorStop(.4,'#4ae0ff');eg.addColorStop(1,'rgba(74,224,255,0)');
  ctx.fillStyle=eg;ctx.fillRect(0,-92,22,22);
  plate(-4,-96,3,7,DK,null,1);ctx.fillStyle=Math.floor(t/20)%2?'#ff4040':'#801010';ctx.fillRect(-4,-98,3,3);
  ctx.restore();
  // braço da frente com punho gigante
  ctx.save();ctx.translate(10+lean,-58+bob);
  const ang=fist>0?-1.5:fist<0?.9:.35+(raise?-2.2:0);ctx.rotate(ang);
  plate(-5,0,10,18,ST,'#b8c0d4',3);
  ctx.translate(0,16+(fist>0?10:0));plate(-10,0,20,20,A1,A3,6);for(let k=0;k<3;k++)plate(-8+k*6,15,5,6,A2,null,2);
  if(fist>0&&e.atk&&e.atk.move){ctx.fillStyle='#ffb060';ctx.globalAlpha=.7;ctx.beginPath();ctx.moveTo(-6,-14);ctx.lineTo(0,-30-Math.random()*8);ctx.lineTo(6,-14);ctx.fill();ctx.globalAlpha=1;}
  ctx.restore();
  ctx.restore();
}
function drawDrone(e,sx,sy){
  ctx.save();ctx.translate(sx,sy-e.z*0);ctx.scale(e.facing*e.scale,e.scale);
  const t=e.t,O='#120a18';
  if(e.state==='down'||e.state==='dead')ctx.rotate(.9);
  ctx.fillStyle=O;ctx.beginPath();ctx.ellipse(0,-14,11,8,0,0,7);ctx.fill();
  ctx.fillStyle='#4a5a7a';ctx.beginPath();ctx.ellipse(0,-14,10,7,0,0,7);ctx.fill();
  ctx.fillStyle='#7a8aaa';ctx.beginPath();ctx.ellipse(-2,-17,7,3,0,0,7);ctx.fill();
  ctx.fillStyle=O;ctx.fillRect(2,-17,8,6);ctx.fillStyle=e.state==='attack'?'#ff4040':'#ffb040';ctx.fillRect(3,-16,6,4);
  ctx.fillStyle=O;ctx.fillRect(-1,-27,2,6);
  const w=Math.abs(Math.sin(t*1.3))*12+2;ctx.fillStyle='#d8e0f0';ctx.fillRect(-w,-28,w*2,2);
  ctx.fillStyle=O;ctx.fillRect(-8,-8,3,5);ctx.fillRect(5,-8,3,5);
  ctx.restore();
}
function pixTitle(text,x,y,size,c1,c2,c3){
  ctx.font=size+'px '+PIX;ctx.textAlign='center';ctx.textBaseline='middle';
  const d=Math.max(2,size/8|0);
  for(let i=d;i>0;i--){ctx.fillStyle='#5a1408';ctx.fillText(text,x+i*.6,y+i);}
  ctx.lineJoin='round';ctx.lineWidth=d+2;ctx.strokeStyle='#1a0606';ctx.strokeText(text,x,y);
  const g=ctx.createLinearGradient(0,y-size/2,0,y+size/2);g.addColorStop(0,c1||'#fff8b0');g.addColorStop(.45,c2||'#ffd030');g.addColorStop(1,c3||'#ff6a14');
  ctx.fillStyle=g;ctx.fillText(text,x,y);
  ctx.save();ctx.beginPath();ctx.rect(x-W,y-size/2,W*2,size*.18);ctx.clip();ctx.fillStyle='rgba(255,255,255,.55)';ctx.fillText(text,x,y);ctx.restore();
}
function drawBeam(p){
  const d=p.atk;if(!d||!d.beam)return;const a=p.atkT;if(a<d.s||a>=d.s+d.a)return;
  const k=(a-d.s)/d.a,len=150*p.scale*Math.min(1,(a-d.s+1)/3);const BC=p.look.beam||['rgba(255,80,200,.9)','#ffffff','rgba(255,70,170,1)'];
  const hx=p.x-cam+p.facing*18*p.scale,hy=p.y-p.z-34*p.scale;const th=(1-Math.abs(k*2-1)*.6)*7;
  ctx.save();ctx.globalCompositeOperation='lighter';
  const g=ctx.createLinearGradient(0,hy-th,0,hy+th);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.3,BC[0]);g.addColorStop(.5,BC[1]);g.addColorStop(.7,BC[0]);g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g;ctx.fillRect(p.facing>0?hx:hx-len,hy-th,len,th*2);
  glow(hx,hy,18,BC[2],.8);glow(hx+p.facing*len,hy,14,BC[2],.6);
  for(let i=0;i<5;i++){ctx.fillStyle='#fff';ctx.fillRect(hx+p.facing*Math.random()*len,hy+rnd(-th,th),2,1);}
  ctx.restore();
}
// ---------- attacks ----------
const ATK={
  jab:{s:3,a:3,r:8,dmg:5,reach:[0,22],kb:1,arm:'punch',next:'cross'},
  cross:{s:3,a:3,r:9,dmg:6,reach:[0,23],kb:1.2,arm:'punch2',next:'fin1'},
  mA:{s:2,a:3,r:6,dmg:9,reach:[0,26],kb:1.4,next:'mB',fury:true},
  mB:{s:2,a:3,r:7,dmg:10,reach:[0,26],kb:1.6,next:'mC',fury:true},
  mC:{s:6,a:6,r:16,dmg:18,reach:[-10,80],kb:4.5,kd:true,launch:4.6,heavy:true,depth:16,fury:true,wave:true},
  mKick:{s:4,a:8,r:14,dmg:16,reach:[0,32],kb:4,kd:true,launch:3.6,heavy:true,leg:'kick',move:4.5,fury:true},
  dPunch:{s:18,a:5,r:26,dmg:8,reach:[0,30],kb:2.6,arm:'punch',tell:true},
  dSpin:{s:24,a:60,r:36,dmg:6,reach:[0,26],kb:3,kd:true,launch:3,spin:true,tell:true,depth:14},
  throwB:{s:18,a:4,r:18,dmg:0,reach:[0,0],throwB:true,tell:true},
  dVomit:{s:26,a:24,r:32,dmg:0,reach:[0,0],vomit:true,tell:true},
  finDJ:{s:6,a:14,r:12,dmg:0,reach:[0,0],kb:0,sig:true,discs:true},
  finR:{s:7,a:4,r:22,dmg:16,reach:[0,28],kb:3,kd:true,launch:3.4,heavy:true,fly:true},
  fin1:{s:7,a:4,r:3,dmg:6,reach:[0,28],kb:1,sig:true,auto:'fin2'},
  fin2:{s:5,a:4,r:18,dmg:9,reach:[0,30],kb:3.2,kd:true,launch:3.6,heavy:true,sig:true},
  sA:{s:5,a:4,r:9,dmg:8,reach:[0,30],kb:1.4,sig:true,next:'sB'},
  sB:{s:5,a:4,r:10,dmg:9,reach:[0,30],kb:1.6,sig:true,next:'sC'},
  sC:{s:8,a:5,r:18,dmg:14,reach:[0,32],kb:3.6,kd:true,launch:4,heavy:true,sig:true},
  upper:{s:5,a:4,r:16,dmg:11,reach:[0,22],kb:2.2,launch:4.2,kd:true,arm:'upper',heavy:true},
  kick:{s:7,a:4,r:15,dmg:10,reach:[0,27],kb:3,kd:true,leg:'kick',heavy:true,launch:2.6},
  airkick:{s:2,a:99,r:0,dmg:10,reach:[0,22],kb:2.6,kd:true,launch:2.6,heavy:true},
  dash:{s:2,a:14,r:12,dmg:12,reach:[0,20],kb:3.5,kd:true,launch:3,arm:'punch2',heavy:true,move:3},
  special:{s:10,a:14,r:16,dmg:16,reach:[0,150],kb:3,kd:true,launch:4.5,beam:true,heavy:true,depth:13},
  ePunch:{s:16,a:4,r:24,dmg:6,reach:[0,21],kb:1.5,arm:'punch'},
  eKick:{s:20,a:4,r:26,dmg:8,reach:[0,25],kb:2.5,leg:'kick'},
  bPunch:{s:26,a:5,r:30,dmg:12,reach:[0,27],kb:3,kd:true,launch:3,arm:'punch2',heavy:true,tell:true},
  bossJab:{s:14,a:4,r:22,dmg:5,reach:[0,26],kb:2,arm:'punch'},
  bossDash:{s:40,a:38,r:40,dmg:9,reach:[0,24],kb:4,kd:true,launch:3.5,arm:'punch2',move:4.4,heavy:true,tell:true},
  bossFire:{s:26,a:2,r:30,dmg:0,reach:[0,0],fire:true,tell:true},
  bossPillar:{s:20,a:2,r:40,dmg:0,reach:[0,0],fire:true,pillar:true,tell:true},
  swoop:{s:18,a:26,r:22,dmg:8,reach:[0,18],kb:2.5,kd:true,launch:2.5,move:3.4,arm:'punch',swoop:true,tell:true,depth:12},
  stomp:{s:4,a:3,r:12,dmg:4,reach:[-6,22],leg:'kick',groundHit:true},
};
const POW=['POW!','PÁ!','TUM!','CRÁS!','KABUM!','PLAU!'];

// ---------- game state ----------
const YMIN=172,YMAX=258,WORLD=3800;
let players=[],party=[{slot:0,look:null}],buddyOn=false,stop=null;
const act=()=>players.filter(p=>p&&!p.out&&!p.left);   // players fighting now
const inGame=()=>players.filter(p=>p&&!p.left);         // players still in the game (out ones included)
const me=()=>{const p=players[LOCAL];return p&&!p.left?p:null;};
let scene='boot',sceneT=0,player,enemies,items,parts,projs,trigs,trigIdx,lock,waveIdx,waveDelay,goTimer,hitstop=0,shakeT=0,shakeM=0,
  kills=0,playTime=0,banner=null,comboN=0,comboT=0,bossRef=null,bossMinions=false,selIdx=0,hintT=0,totalXp=0,winT=0,bonus=false,bonusUsed=false,bonusT=0,bonusSave=null,fade=null,areaBanner=null,zonesSeen=null,shop=null,demonWave=0;

function newFighter(o){return Object.assign({x:0,y:215,z:0,vx:0,vz:0,facing:1,state:'idle',t:0,hp:100,maxHp:100,hitstun:0,inv:0,atk:null,atkT:0,hitSet:null,scale:1,dying:false,bounce:0,cd:0},o);}
function startStage(){
  buddy=null;runner=null;runT=0;tigasSay=null;
  ZNAMES.club='Bar '+SG().bar+'...';
  // the other player left: a new start (next stage, try again) is a plain 1-player game
  if(party.some(m=>m.left)){const keep=party.filter(m=>!m.left);if(keep.length===1){const L=keep[0].look||chosenLook;chosenLook=L;
    if(LOCAL!==0){ACTS.forEach(a=>{IN[0].held[a]=IN[LOCAL].held[a];IN[LOCAL].held[a]=0;});IN[0].tr=IN[LOCAL].tr;IN[LOCAL].tr=false;LOCAL=0;}
    party=[{slot:0,look:L}];}}
  if(party.length===1)party[0].look=chosenLook;
  players=party.map(m=>newFighter({isPlayer:true,slot:m.slot,look:m.look,x:m.slot?46:70,y:m.slot?238:220,scale:1.2,hp:100,maxHp:100,gp:50,maxGp:100,lvl:1,xp:0,money:0,lives:3,atkBonus:0,buffer:null,lastTap:{d:0,t:-99},runDir:0,weapon:null,pushT:0,def:0,spd:0,comboN:0,comboT:0,left:!!m.left}));
  player=players[0];
  buddyOn=STAGE===2&&!players.some(p=>p.look&&p.look.pix==='feijao');
  enemies=[];items=[];parts=[];projs=[];trigIdx=0;lock=null;waveIdx=0;waveDelay=0;goTimer=0;cam=0;kills=0;playTime=0;comboN=0;comboT=0;bossRef=null;bossMinions=false;hintT=480;totalXp=0;winT=0;bonus=false;bonusUsed=false;fade=null;areaBanner=null;zonesSeen=new Set(['street']);shop=null;demonWave=0;
  trigs=[
    {x:320,waves:[['punk','punk'],['punk','garota','punk']]},
    {x:1150,waves:[['punk','brute'],['garota','punk','garota']]},
    {x:1860,waves:[['punk','garota','punk'],['brute','garota']]},
    {x:2420,waves:[['punk','garota','brute'],['brute','garota','punk','punk']]},
    STAGE===2?{x:2950,cam:2820,boss:'duo',waves:[['careca','louca']]}:{x:2950,cam:2820,boss:'robot',waves:[['boss']]},
    {x:3470,cam:3320,boss:'drunk',final:true,waves:[['drunk']]},
  ];
  [[520,'can'],[1300,'bin'],[1960,'can'],[760,'bin'],[2380,'can'],[2640,'bin']].forEach(([x,k])=>items.push({kind:'can',bin:k==='bin',x,y:rnd(176,184),z:0,vz:0,vx:0,hp:2,t:0}));
  [[230,'placa'],[880,'guarda'],[1240,'garrafa'],[1580,'taco'],[1840,'cone'],[2330,'garrafa'],[2600,'taco'],[3000,'placa']].forEach(([x,w])=>items.push({kind:'weapon',w,dur:WEAP[w].dur,x,y:rnd(196,244),z:0,vz:0,vx:0,t:99}));
  banner={t:0,card:true};
}
function spawn(type,side){
  const x=side<0?cam-26:cam+W+26,y=rnd(YMIN+4,YMAX-4);let e;
  if(type==='punk')e=newFighter({type,look:punkLook(),x,y,hp:34,maxHp:34,spd:rnd(.8,1.05),atkDefs:['ePunch','ePunch','eKick'],range:19,xp:10,drop:3,scale:1.15,cd:rnd(30,80)});
  else if(type==='garota')e=newFighter({type,look:girlLook(),x,y,hp:28,maxHp:28,spd:rnd(1.1,1.3),atkDefs:['eKick','eKick','ePunch'],range:21,xp:12,drop:3,scale:1.12,cd:rnd(30,70)});
  else if(type==='brute')e=newFighter({type,look:bruteLook(),x,y,hp:80,maxHp:80,spd:.6,atkDefs:['bPunch'],range:24,xp:25,drop:6,scale:1.42,cd:60,armor:1});
  else if(type==='demonio')e=newFighter({type,look:DRONELOOK,x,y,z:34,hp:22,maxHp:22,spd:1.3,atkDefs:['swoop'],range:30,xp:15,drop:3,scale:1.12,cd:rnd(40,90),flyer:true});
  else if(type==='careca'){e=newFighter({type:'careca',name:'CARECA',look:carecaLook(),x:cam+W+40,y:205,hp:190,maxHp:190,spd:.85,atkDefs:['bPunch','bPunch','eKick'],range:24,xp:60,drop:10,scale:1.5,cd:60,armor:1});bossRef=e;}
  else if(type==='louca'){e=newFighter({type:'louca',name:'LOUCA',look:loucaLook(),x:cam-40,y:235,hp:120,maxHp:120,spd:1.15,atkDefs:['ePunch','eKick'],range:21,xp:50,drop:8,scale:1.2,cd:80,thrower:true,weapon:{w:'garrafa',dur:99}});}
  else if(type==='drunk'){e=newFighter({type:'boss',drunk:true,name:'TIGAS',look:Object.assign({},BASE,{pix:'vilao'+STAGE,name:'TIGAS'}),x:cam+W+40,y:215,hp:Math.round(300*(2+.75*(STAGE-1))),maxHp:Math.round(300*(2+.75*(STAGE-1))),spd:.55,atkDefs:['dPunch'],range:30,xp:150,drop:20,scale:1.5,pxMul:STAGE<3?1.2:.95,cd:Math.max(50,90-8*(STAGE-1)),armor:2,kdMeter:0});bossRef=e;}
  else{e=newFighter({type:'boss',name:'ROBÔ CHEFÃO',look:ROBOLOOK,x:cam+W+40,y:215,hp:240,maxHp:240,spd:.7,atkDefs:['bossJab','bossJab','bossDash'],range:24,xp:100,drop:18,scale:1.5,cd:90,armor:2,kdMeter:0});bossRef=e;}
  if(STAGE>1&&!e.drunk){e.maxHp=Math.round(e.maxHp*(1+.2*(STAGE-1)));e.hp=e.maxHp;}
  // 2 players fighting: normal enemies x1.5, bosses (ROBÔ, TIGAS, CARECA, LOUCA) x2.5 health and damage
  if(act().length>1){const boss=e.type==='boss'||type==='careca'||type==='louca',m=boss?2.5:1.5;
    e.maxHp=Math.round(e.maxHp*m);e.hp=e.maxHp;e.dmul=m;if(type==='careca'||type==='louca')e.mpBoss=true;}
  e.hover=rnd(55,85);e.yOff=rnd(-18,18);e.facing=side<0?1:-1;e.state='walk';
  enemies.push(e);return e;
}
function spawnWave(list){const tg=trigs&&trigs[trigIdx];if(act().length>1&&!(tg&&tg.boss))list=list.concat(list);list.forEach((t,i)=>spawn(t,(t==='boss'||t==='drunk'||t==='careca')?1:(i%2?-1:1)));}
function addCombo(a){const o=a.owner||a;if(players.includes(o)){o.comboN=(o.comboN||0)+1;o.comboT=70;}}
function startAttack(e,name,def){e.state='attack';e.atk=def||ATK[name];e.atkName=name;e.atkT=0;e.hitSet=new Set();e.buffer=null;if(!e.isPlayer&&e.atk.tell)sfx('alert');}

function hittable(t){return t.state!=='down'&&t.state!=='dead'&&t.state!=='getup'&&t.state!=='grabbed'&&t.inv<=0&&!(t.dying&&t.state!=='air');}
function checkHits(e,d,targets){
  for(const t of targets){
    if(e.hitSet.has(t))continue;
    if(d.groundHit){if(t.state!=='down'||(t.stomps||0)>=3)continue;}else if(!hittable(t))continue;
    if(t.state==='air'&&!e.isPlayer)continue;
    const fwd=(t.x-e.x)*e.facing,hw=6*t.scale;
    const r0=d.reach[0]*e.scale,r1=d.reach[1]*e.scale;
    const okx=d.spin?Math.abs(t.x-e.x)<=r1+hw:(fwd+hw>=r0&&fwd-hw<=r1);
    if(!okx||Math.abs(t.y-e.y)>(d.depth||9)||Math.abs(t.z-e.z)>28)continue;
    e.hitSet.add(t);applyHit(e,t,d);
  }
}
function releaseGrab(p){if(p.grabbed){const g=p.grabbed;if(g.state==='grabbed'){g.state='hurt';g.hitstun=8;g.vx=p.facing*1.5;g.t=0;}p.grabbed=null;}}
function applyHit(a,t,d){
  if(t.isPlayer&&power)return;
  if(t.isPlayer&&!d._s){const m=(STAGE>1?1+.12*(STAGE-1):1)*(a.dmul||1);if(m!==1)d=Object.assign({},d,{dmg:Math.round(d.dmg*m),_s:1});}
  const dir=d.spin?(t.x>=a.x?1:-1):a.facing;
  if(t.state==='block'&&!t.isPlayer&&d.heavy){t.state='hurt';t.hitstun=20;t.t=0;parts.push({type:'pow',x:t.x,y:t.y,z:50,t:0,life:26,v:'QUEBROU!',rot:0});}
  if(t.state==='block'&&t.facing===-dir){t.vx=dir*1.6;sfx('block');spark(t.x-dir*6,t.y,t.z+30,'#8ad0ff');hitstop=3;return;}
  if(d.groundHit){const dm=d.dmg+a.atkBonus;t.hp-=dm;t.stomps=(t.stomps||0)+1;t.t=Math.max(0,t.t-12);if(t.hp<=0){t.hp=0;t.dying=true;}
    sfx('hit');hitstop=3;spark(t.x,t.y,6,'#ffffff');addCombo(a);a.gp=Math.min(a.maxGp,a.gp+1);
    parts.push({type:'num',x:t.x,y:t.y,z:24,t:0,life:40,v:String(dm),c:'#ff3a4a'});return;}
  if(t.isPlayer&&t.state==='grab')releaseGrab(t);
  let dmg=d.dmg+(a.isPlayer?a.atkBonus:0);
  if(t.isPlayer)dmg=Math.max(1,dmg-(t.def||0));
  if(a.isPlayer&&t.state==='air')dmg=Math.ceil(dmg*.8);
  if(a.isPlayer&&a.maskT>0)dmg=Math.round(dmg*1.5);
  t.hp-=dmg;
  {const src=a.owner||a;if(a.isPlayer&&players.includes(src))addFury(src,5);}
  if(t.isPlayer)addFury(t,4);
  if(a.isPlayer){a.gp=Math.min(a.maxGp,a.gp+2);addCombo(a);
    if(d.weaponSwing&&a.weapon){a.weapon.dur--;if(WEAP[a.weapon.w].glass){breakWeapon(a);}}}
  t.facing=-dir;t.flashT=6;
  let kd=d.kd||t.state==='air';
  if(t.armor&&!t.dying&&t.hp>0){
    if(t.type==='boss'){if(d.kd){t.kdMeter++;kd=t.kdMeter>=2;if(kd)t.kdMeter=0;}else kd=false;}
    else if(d.kd&&!d.heavy)kd=false;
  }
  if(t.hp<=0){t.hp=0;t.dying=true;kd=true;}
  if(kd){t.state='air';t.t=0;t.vz=(d.launch||3)+(t.hp<=0?1:0);t.vx=dir*d.kb*(t.scale>1.5?.6:1);t.bounce=0;t.atk=null;if(!t.z)t.z=1;
    if(d.fly&&t.type!=='boss'){const dist=dir>0?cam+W-16-t.x:t.x-(cam+16);t.vx=dir*Math.max(4,dist/(2*t.vz/.3));t.thrown=true;t.thrownHit=new Set();t.thrownBy=a.owner||a;
      parts.push({type:'pow',x:t.x+dir*10,y:t.y,z:t.z+40,t:0,life:30,v:'NOCAUTE!',rot:rnd(-.2,.2)});shakeT=14;shakeM=4;}}
  else{t.state='hurt';t.t=0;t.hitstun=t.type==='boss'?8:(t.armor?10:15);t.vx=dir*d.kb*.6;t.atk=null;}
  if(t.isPlayer){sfx('hurt');t.buffer=null;}
  sfx(d.heavy?'heavy':'hit');
  hitstop=d.heavy?6:3;if(d.heavy||t.isPlayer){shakeT=d.heavy?10:6;shakeM=d.heavy?3:2;}
  spark(t.x-dir*4,t.y,t.z+28*t.scale,d.heavy?'#ffe066':'#ffffff',d.heavy);
  parts.push({type:'num',x:t.x+rnd(-4,4),y:t.y,z:t.z+46*t.scale,t:0,life:40,v:String(dmg),c:t.isPlayer?'#ff5a5a':'#ff3a4a'});
  if(a.isPlayer&&a.look&&a.look.pix==='feijao'){if(!(a.ordT>0)||d.heavy){a.ordT=24;parts.push({type:'pow',x:t.x+dir*8,y:t.y,z:t.z+38*t.scale,t:0,life:34,v:'ORDINARIIAAA!',rot:rnd(-.18,.18)});}}
  else if(a.isPlayer&&d.heavy&&Math.random()<.7)parts.push({type:'pow',x:t.x+dir*8,y:t.y,z:t.z+34*t.scale,t:0,life:26,v:pick(POW),rot:rnd(-.25,.25)});
}
function breakWeapon(p){if(!p.weapon)return;spark(p.x+p.facing*16,p.y,30,'#c8ffd0',true);sfx(WEAP[p.weapon.w].glass?'glass':'heavy');p.weapon=null;}
function spark(x,y,z,c,big){parts.push({type:'spark',x,y,z,t:0,life:big?12:9,c,big});
  for(let i=0;i<(big?7:4);i++)parts.push({type:'bit',x,y,z,vx:rnd(-2,2),vz:rnd(0,2.5),t:0,life:rnd(14,24),c});}
function puff(x,y,n){for(let i=0;i<n;i++)parts.push({type:'puff',x:x+rnd(-6,6),y:y+rnd(-2,2),z:rnd(0,3),vx:rnd(-.8,.8),vz:rnd(.2,.9),t:0,life:rnd(16,28)});}
function dropLoot(e){
  for(let i=0;i<e.drop;i++)items.push({kind:'coin',val:pick([.25,.5,1,1,2])*(e.type==='boss'?2:1),x:e.x,y:clamp(e.y+rnd(-5,5),YMIN,YMAX),z:20,vz:rnd(2.5,4.5),vx:rnd(-2,2),t:0});
  for(let i=0;i<10;i++)parts.push({type:'bit',x:e.x,y:e.y,z:rnd(4,30),vx:rnd(-2,2),vz:rnd(0,3),t:0,life:rnd(14,26),c:pick(['#ffe066','#ffffff','#8ad0ff'])});
  if(e.type==='brute'&&Math.random()<.45||e.type==='boss')items.push({kind:'food',x:e.x,y:e.y,z:14,vz:3,vx:0,t:0});
}
function gainXp(n){
  totalXp+=n;const A=act();const share=A.length>1?Math.ceil(n/A.length):n;
  for(const p of A){p.xp+=share;
  while(p.xp>=p.lvl*45){p.xp-=p.lvl*45;p.lvl++;p.maxHp+=10;p.hp=p.maxHp;p.atkBonus++;if(p.lvl%2===0)p.def++;if(p.lvl%3===0)p.spd++;p.gp=p.maxGp;sfx('level');
    parts.push({type:'big',x:p.x,y:p.y,z:76,t:0,life:90,v:'LEVEL UP!',c:'#ffe066'});}}
}
function moneyPop(p){
  let m=parts.find(q=>q.type==='money'&&q.p===p);
  if(!m){m={type:'money',t:0,life:70,p};parts.push(m);}
  m.t=0;m.x=p.x;m.y=p.y;m.z=70;m.v=money(p.money);
}

// ---------- updates ----------
function physicsKnock(e){
  e.vz-=.3;e.z+=e.vz;e.x+=e.vx;e.vx*=.985;
  if(e.thrown){
    for(const o of enemies){if(o===e||!hittable(o)||o.type==='boss'&&false)continue;
      if(Math.abs(o.x-e.x)<14&&Math.abs(o.y-e.y)<10&&e.z<30&&!(e.thrownHit||(e.thrownHit=new Set())).has(o)){
        const ow=players.includes(e.thrownBy)?e.thrownBy:players[0];e.thrownHit.add(o);applyHit({isPlayer:true,owner:ow,atkBonus:ow.atkBonus,facing:Math.sign(e.vx)||1,x:e.x,gp:0,maxGp:0,scale:1},o,{dmg:10,kb:3,kd:true,launch:3,heavy:true});}}
  }
  if(e.z<=0&&e.vz<0){
    e.z=0;
    if(e.bounce===0&&e.vz<-2.4){e.vz=-e.vz*.35;e.bounce=1;e.vx*=.6;puff(e.x,e.y,5);sfx('land');shakeT=4;shakeM=1;}
    else{e.vz=0;e.vx=0;e.state='down';e.t=0;e.thrown=false;e.thrownHit=null;puff(e.x,e.y,4);}
  }
}
function nearWeapon(p){
  let best=null,bd=99;
  for(const it of items){if(it.kind!=='weapon'||it.gone||it.z>4)continue;const dx=Math.abs(it.x-p.x),dy=Math.abs(it.y-p.y);if(dx<18&&dy<9&&dx<bd){bd=dx;best=it;}}
  return best;
}
function updPlayer(p){
  p.t++;if(p.inv>0)p.inv--;if(p.ordT>0)p.ordT--;if(p.slowT>0)p.slowT--;
  if(p.maskT>0){p.maskT--;if(p.maskT===0){sfx('select');parts.push({type:'num',x:p.x,y:p.y,z:70,t:0,life:40,v:'FIM DA MÁSCARA',c:'#c0c8e0',small:true});}}
  const mx=(held.right?1:0)-(held.left?1:0),my=(held.down?1:0)-(held.up?1:0);
  for(const [k,d] of [['left',-1],['right',1],['up',-2],['down',2]])if(prs[k]){if((NET.role==='host'&&p.slot===1)?!!IN[1].dbl[k]:(p.lastTap.d===d&&t60-p.lastTap.t<18)){if(Math.abs(d)===1)p.runDir=d;else p.runV=d/2;}p.lastTap={d,t:t60};}
  if(mx!==(p.runDir||0)||mx===0)p.runDir=0;
  if(my!==(p.runV||0)||my===0)p.runV=0;
  if(IN[p.slot].tr&&mx)p.runDir=mx;
  const free=p.state==='idle'||p.state==='walk'||p.state==='run'||p.state==='block';
  if(free){
    const wNear=!p.weapon&&nearWeapon(p);
    if(prs.jump){p.state='jump';p.t=0;p.vz=4.5;p.vx=mx*(p.runDir?2.4:1.4);p.airAtk=null;sfx('jump');}
    else if(prs.mask&&(p.pw||0)>=100&&!power){p.pw=0;p.inv=Math.max(p.inv,30);startPower(p);}
    else if(prs.mask&&p.fury>=100&&!(p.maskT>0)){activateMask(p);}
    else if(prs.punch&&p.maskT>0&&!p.weapon&&!wNear){startAttack(p,'mA');sfx('swing');}
    else if(prs.kick&&p.maskT>0&&!p.weapon){startAttack(p,'mKick');sfx('swing');}
    else if(prs.weapon&&sigOf(p)&&!p.weapon){p.sigOn=!p.sigOn;sfx('select');
      parts.push({type:'num',x:p.x,y:p.y,z:70,t:0,life:40,v:p.sigOn?SIGW[sigOf(p)].name+'!':'MÃOS LIMPAS',c:p.sigOn?'#ffe066':'#c0c8e0',small:true});}
    else if(prs.punch&&p.sigOn&&!p.weapon&&!wNear){startAttack(p,'sA',sigDef(p,'sA'));sfx('swing');}
    else if(prs.punch&&wNear){p.state='pickup';p.t=0;p.weapon={w:wNear.w,dur:wNear.dur};wNear.gone=true;sfx('select');
      parts.push({type:'num',x:p.x,y:p.y,z:62,t:0,life:40,v:WEAP[wNear.w].name,c:'#8ad0ff',small:true});}
    else if(prs.punch&&p.weapon){const W_=WEAP[p.weapon.w];startAttack(p,'wSwing',{s:6,a:5,r:13,dmg:W_.dmg,reach:[0,W_.reach],kb:2.6,kd:!!W_.kd,launch:3,heavy:true,weaponSwing:true});sfx('swing');}
    else if(prs.kick&&p.weapon){p.state='throw';p.t=0;}
    else if((prs.punch||prs.kick)&&!p.weapon&&enemies.some(e=>e.state==='down'&&(e.stomps||0)<3&&Math.abs(e.y-p.y)<9&&(e.x-p.x)*p.facing>-8&&(e.x-p.x)*p.facing<30)){startAttack(p,'stomp');sfx('swing');}
    else if(prs.punch){startAttack(p,p.state==='run'?'dash':'jab');sfx('swing');}
    else if(prs.kick){startAttack(p,p.state==='run'?'dash':'kick');sfx('swing');}
    else if(held.block){if(p.state!=='block'){p.state='block';p.t=0;}p.x+=p.vx;p.vx*=.8;}
    else if(mx||my){
      const run=!!(p.runDir||p.runV);const st=run?'run':'walk';if(p.state!==st){p.state=st;p.t=0;}
      const sp=(1+p.spd*.07)*(p.maskT>0?1.3:1)*(p.slowT>0?.55:1);p.x+=mx*(p.runDir?2.6:1.45)*sp;p.y+=my*(p.runV?2:1)*sp;if(mx)p.facing=mx;
      if(run&&p.t%8===0)puff(p.x-p.facing*4,p.y,1);
      // grab check
      let tgt=null;
      if(mx&&!p.weapon)for(const e of enemies){if(e.type==='boss'||e.flyer||e.dying)continue;
        if(!['idle','walk','hurt'].includes(e.state))continue;
        const fwd=(e.x-p.x)*p.facing;if(fwd>4&&fwd<18&&Math.abs(e.y-p.y)<6){tgt=e;break;}}
      if(tgt){p.pushT++;if(p.pushT>14||tgt.state==='hurt'){p.state='grab';p.t=0;p.grabbed=tgt;p.knee=0;p.knees=0;p.pushT=0;tgt.state='grabbed';tgt.t=0;tgt.atk=null;sfx('block');}}
      else p.pushT=0;
    }else if(p.state!=='idle'){p.state='idle';p.t=0;}
  }else if(p.state==='attack'){
    const d=p.atk;p.atkT++;
    if(prs.punch&&d.next)p.buffer='punch';
    if(prs.kick&&(p.atkName==='jab'||p.atkName==='cross'||p.atkName==='sA'||p.atkName==='sB'))p.buffer='kick';
    if(d.move&&p.atkT>=d.s&&p.atkT<d.s+d.a)p.x+=p.facing*d.move*(1-(p.atkT-d.s)/d.a*.6);
    if(p.atkT>=d.s&&p.atkT<d.s+d.a)checkHits(p,d,enemies);
    if(d.wave&&p.atkT===d.s){shakeT=10;shakeM=3;for(let i=0;i<14;i++)parts.push({type:'bit',x:p.x+p.facing*rnd(10,80),y:p.y+rnd(-8,8),z:rnd(4,40),vx:p.facing*rnd(1,3),vz:rnd(0,2),t:0,life:rnd(14,24),c:'rgb('+maskRGB(p)+')'});}
    if(d.discs&&(p.atkT===d.s||p.atkT===d.s+5||p.atkT===d.s+10)){const n=(p.atkT-d.s)/5;
      projs.push({kind:'disc',by:p.slot,x:p.x+p.facing*14,y:p.y+(n-1)*3,z:30+(n-1)*3,vx:p.facing*6,t:0,last:n===2,hitSet:new Set()});sfx('swing');}
    if(d.auto&&p.atkT>=d.s+d.a){startAttack(p,d.auto,sigDef(p,d.auto));sfx('swing');}
    else if(p.atkT>=d.s+d.a&&p.buffer){
      const b=p.buffer;p.buffer=null;
      if(b==='kick'){startAttack(p,'kick');sfx('swing');}else if(d.next){const dn=(d.next==='fin1'&&isRub(p))?'finR':(d.next==='fin1'&&sigOf(p)==='vinyl')?'finDJ':d.next;const nx=ATK[dn];if(dn==='finR'||dn==='finDJ'){startAttack(p,dn);}else if(nx.sig&&!sigOf(p)){startAttack(p,'upper');}else startAttack(p,d.next,nx.sig?sigDef(p,d.next):undefined);sfx('swing');}
    }else if(p.atkT>=d.s+d.a+d.r){p.state='idle';p.t=0;p.atk=null;if(p.weapon&&p.weapon.dur<=0)breakWeapon(p);}
  }else if(p.state==='jump'){
    p.vz-=.26;p.z+=p.vz;p.x+=p.vx;p.y+=my*.5;
    if(mx){p.vx+=mx*.05;p.vx=clamp(p.vx,-2.4,2.4);}
    if(!p.airAtk&&(prs.punch||prs.kick)){p.airAtk={t:0};p.hitSet=new Set();sfx('swing');}
    if(p.airAtk){p.airAtk.t++;if(p.airAtk.t>=2)checkHits(p,ATK.airkick,enemies);}
    if(p.z<=0){p.z=0;p.state='idle';p.t=0;p.airAtk=null;puff(p.x,p.y,4);sfx('land');}
  }else if(p.state==='pickup'){p.t++;if(p.t>10){p.state='idle';p.t=0;}}
  else if(p.state==='throw'){
    if(p.t===6&&p.weapon){projs.push({kind:'thrown',by:p.slot,w:p.weapon.w,x:p.x+p.facing*12,y:p.y,z:30,vx:p.facing*5.5,t:0});p.weapon=null;sfx('swing');}
    if(p.t>16){p.state='idle';p.t=0;}
  }else if(p.state==='grab'){
    const g=p.grabbed;
    if(!g||g.state!=='grabbed'){p.state='idle';p.grabbed=null;}
    else{
      g.x=p.x+p.facing*13*p.scale;g.y=p.y;g.z=0;g.facing=-p.facing;
      if(p.knee>0){p.knee--;if(p.knee===4){g.hp-=5+p.atkBonus;sfx('hit');hitstop=3;spark(g.x,g.y,22,'#ffffff');
        parts.push({type:'num',x:g.x,y:g.y,z:50,t:0,life:40,v:String(5+p.atkBonus),c:'#ff3a4a'});addCombo(p);p.gp=Math.min(p.maxGp,p.gp+2);
        if(g.hp<=0){g.hp=0;g.dying=true;g.state='air';g.t=0;g.vz=3;g.vx=p.facing*2;g.bounce=0;g.z=1;p.state='idle';p.grabbed=null;}}}
      else if(prs.punch){p.knee=10;p.knees++;}
      const throwDir=(prs.kick||prs.jump||(p.knees>=3&&p.knee===0))?((mx===-p.facing)?-p.facing:p.facing):0;
      if(p.grabbed&&throwDir){
        p.facing=throwDir;g.state='air';g.t=0;g.vz=3.4;g.vx=throwDir*5;g.bounce=0;g.z=2;g.thrown=true;g.thrownHit=new Set();g.thrownBy=p;
        g.hp-=10+p.atkBonus;if(g.hp<=0){g.hp=0;g.dying=true;}
        parts.push({type:'num',x:g.x,y:g.y,z:50,t:0,life:40,v:String(10+p.atkBonus),c:'#ff3a4a'});
        parts.push({type:'pow',x:g.x,y:g.y,z:40,t:0,life:26,v:'VUPT!',rot:rnd(-.2,.2)});
        sfx('heavy');shakeT=8;shakeM=2;p.state='throw';p.t=7;p.grabbed=null;
      }else if(p.t>110&&p.grabbed){releaseGrab(p);p.state='idle';}
    }
  }else if(p.state==='hurt'){p.x+=p.vx;p.vx*=.8;if(--p.hitstun<=0){p.state='idle';p.t=0;}}
  else if(p.state==='air'){physicsKnock(p);p.t++;}
  else if(p.state==='down'){
    if(p.weapon){items.push({kind:'weapon',w:p.weapon.w,dur:p.weapon.dur,x:p.x,y:p.y,z:10,vz:2,vx:0,t:0});p.weapon=null;}
    if(p.t>(p.dying?70:34)){
      if(p.dying){
        p.lives--;
        if(p.lives<0){p.lives=0;if(act().length>1){goOut(p);return;}scene='gameover';sceneT=0;return;}
        p.dying=false;p.hp=p.maxHp;p.gp=p.maxGp;p.inv=150;p.state='getup';p.t=0;
        parts.push({type:'big',x:p.x,y:p.y,z:76,t:0,life:80,v:'DE PÉ!',c:'#8ad0ff'});
        enemies.forEach(e=>{if(!e.dying&&Math.abs(e.x-p.x)<90&&e.state!=='down'){e.state='air';e.t=0;e.vz=3;e.vx=(e.x>=p.x?1:-1)*3;e.bounce=0;e.z=1;}});
      }else{p.state='getup';p.t=0;p.inv=60;}
    }
  }else if(p.state==='getup'){if(p.t>14){p.state='idle';p.t=0;}}
  if(p.state!=='down')p.y=clamp(p.y,YMIN,YMAX);
  const minX=lock?lock.cam+8:Math.max(8,cam+8),maxX=lock?lock.cam+W-8:act().length>1?Math.min(WORLD-12,cam+W-8):WORLD-12;
  p.x=clamp(p.x,minX,maxX);
  for(const it of items){
    if(it.kind==='can'||it.kind==='weapon'||it.gone)continue;
    if(Math.abs(it.x-p.x)<11&&Math.abs(it.y-p.y)<8&&it.z<5&&it.t>12){
      it.gone=true;
      if(it.kind==='coin'){p.money+=it.val;sfx('coin');moneyPop(p);}
      else{p.hp=Math.min(p.maxHp,p.hp+40);sfx('food');parts.push({type:'num',x:it.x,y:it.y,z:24,t:0,life:40,v:'+40 HP',c:'#7aff8a'});}
    }
  }
  const atkActive=(p.state==='attack'&&p.atkT>=p.atk.s&&p.atkT<p.atk.s+p.atk.a)||(p.state==='jump'&&p.airAtk);
  if(atkActive)for(const it of items){if(it.kind!=='can'||it.gone||it.cool)continue;
    const fwd=(it.x-p.x)*p.facing;if(fwd>-6&&fwd<30&&Math.abs(it.y-p.y)<10){
      it.hp--;it.cool=16;sfx('hit');spark(it.x,it.y,14,'#ffffff');it.vx=p.facing*1.5;
      if(it.hp<=0){it.gone=true;puff(it.x,it.y,8);items.push({kind:'food',x:it.x,y:it.y,z:10,vz:3,vx:p.facing,t:0});
        for(let i=0;i<3;i++)items.push({kind:'coin',val:.5,x:it.x,y:it.y,z:10,vz:rnd(2,3),vx:rnd(-1,1),t:0});}}}
}
function isKO(p){return p.state==='down'||p.state==='air'||!!p.dying;}
// the player an enemy goes after: the nearest one not knocked down; chosen again about once per second
function tgtOf(e){const A=act();if(A.length<2)return A[0]||players[0];
  let t=e.tgt;
  if(!t||!A.includes(t)||isKO(t)||(e.t%60)===0){
    const c=A.filter(p=>!isKO(p)),pool=c.length?c:A;t=pool[0];
    for(const p of pool)if(Math.hypot(p.x-e.x,p.y-e.y)<Math.hypot(t.x-e.x,t.y-e.y))t=p;e.tgt=t;}
  return t;}
function updEnemy(e,engaged){
  e.t++;if(e.inv>0)e.inv--;if(e.cd>0)e.cd--;
  if(e.stunT>0){e.stunT--;if(e.state==='idle'||e.state==='walk'||e.state==='attack'||e.state==='block'){e.state='idle';e.atk=null;return;}}
  const p=tgtOf(e);
  switch(e.state){
    case'idle':case'walk':{
      const dx=p.x-e.x,dy=p.y-e.y;const side=dx>=0?1:-1;e.facing=side;
      const pDown=p.state==='down'||p.state==='air'||p.dying||p.inv>60;
      let tx,ty;
      if(engaged&&!pDown){tx=p.x-side*e.range;ty=p.y;}else{tx=p.x-side*e.hover;ty=p.y+e.yOff;}
      if(e.flyer){e.z+=(34+Math.sin(e.t/14)*4-e.z)*.06;
        tx=p.x-side*(engaged?46:80);ty=p.y+(engaged?0:e.yOff);
        e.x+=Math.sign(tx-e.x)*Math.min(e.spd,Math.abs(tx-e.x));e.y+=Math.sign(ty-e.y)*Math.min(e.spd*.7,Math.abs(ty-e.y));e.state='walk';
        if(engaged&&!pDown&&e.cd<=0&&Math.abs(dx)<70&&Math.abs(dy)<10){startAttack(e,'swoop');e.cd=rnd(70,130);}
        break;}
      if((e.type==='punk'||e.type==='garota')&&p.state==='attack'&&p.atkT===1&&Math.abs(dx)<34&&Math.abs(dy)<8&&Math.random()<.22){e.state='block';e.t=0;break;}
      if(e.thrower&&!pDown&&e.cd<=0&&Math.abs(dx)>50&&Math.abs(dx)<230){startAttack(e,'throwB');e.cd=rnd(70,110);if(Math.random()<.4)e.say={v:pick(['AAAAHHH!!','TOMA!!','SAI DAQUI!!','IIIIHHH!']),t:70};break;}
      if(e.drunk){e.y+=Math.sin(e.t/18)*.25;if(STAGE>=3&&Math.random()<.004&&!e.say)e.say={v:pick(['HAHAHAHA!','HIHIHI...','MAIS UMA!!','HUAHAHAHA!']),t:80};
        if(!pDown&&e.cd<=0){const ad=Math.abs(dx),r=Math.random();
          if(ad<75&&Math.abs(dy)<16){startAttack(e,r<.45?'dPunch':r<.75?'dSpin':'dVomit');}
          else if(ad<210){if(r<.5)startAttack(e,'dVomit');else if(r<.8)startAttack(e,'dSpin');}
          if(e.state==='attack'){e.cd=rnd(70,120);if(e.atkName==='dVomit'){parts.push({type:'num',x:e.x,y:e.y,z:110,t:0,life:40,v:'HIC!',c:'#9aff6a',small:true});}break;}}}
      else if(e.type==='boss'&&!pDown&&e.cd<=0&&Math.abs(dx)>70){
        const r=Math.random();
        if(Math.abs(dy)<14&&r<.35){startAttack(e,'bossDash');e.cd=rnd(90,140);break;}
        if(r<.65){startAttack(e,'bossFire');e.cd=rnd(80,120);break;}
        startAttack(e,'bossPillar');e.cd=rnd(90,130);break;}
      let mvx=0,mvy=0;
      if(Math.abs(tx-e.x)>3)mvx=Math.sign(tx-e.x)*e.spd;
      if(Math.abs(ty-e.y)>2)mvy=Math.sign(ty-e.y)*e.spd*.7;
      for(const o of enemies){if(o===e||o.dying)continue;if(Math.abs(o.x-e.x)<12&&Math.abs(o.y-e.y)<7)mvy+=(e.y>=o.y?.3:-.3);}
      e.x+=mvx;e.y+=mvy;
      const st=(mvx||mvy)?'walk':'idle';if(e.state!==st){e.state=st;e.t=0;}
      if(engaged&&!pDown&&e.cd<=0&&Math.abs(dx)<=e.range+6*e.scale&&Math.abs(dy)<6){
        const n=pick(e.atkDefs);startAttack(e,n==='bossDash'?'bossJab':n);
        e.cd=e.type==='boss'?rnd(55,95):rnd(45,100);
      }
      break;}
    case'attack':{
      const d=e.atk;e.atkT++;
      if(d.fire&&e.atkT===d.s){
        if(d.pillar){for(let k=0;k<2;k++)projs.push({kind:'pillar',dmul:e.dmul,vx:0,x:p.x+(k-1)*rnd(30,50)*(k?1:0),y:clamp(p.y+(k?rnd(-12,12):0),YMIN,YMAX),t:-k*12});sfx('alert');}
        else{projs.push({kind:'fire',dmul:e.dmul,x:e.x+e.facing*24,y:e.y,z:44,vx:e.facing*3.6,t:0});sfx('special');}}
      if(d.swoop){const act=e.atkT>=d.s&&e.atkT<d.s+d.a;e.z+=((act?6:34)-e.z)*.15;if(act)e.y+=Math.sign(p.y-e.y)*.6;}
      if(d.move&&e.atkT>=d.s&&e.atkT<d.s+d.a){e.x+=e.facing*d.move;if(e.atkT%4===0)puff(e.x-e.facing*6,e.y,1);}
      if(d.spin&&e.atkT>=d.s&&e.atkT<d.s+d.a){e.x+=Math.sign(p.x-e.x)*1.7;e.y+=Math.sign(p.y-e.y)*.5;if((e.atkT-d.s)%12===0)e.hitSet=new Set();e.spinF=Math.floor(e.atkT/4)%2?1:-1;if(e.atkT%8===0)sfx('swing');}
      if(d.throwB&&e.atkT===d.s){const T=40;projs.push({kind:'bottle',dmul:e.dmul,x:e.x+e.facing*10,y:e.y,z:40,vx:(p.x-e.x-e.facing*10)/T,vy:(p.y-e.y)/T,vz:3.2,t:0});sfx('swing');}
      if(d.vomit&&e.atkT>=d.s&&e.atkT<d.s+d.a&&e.atkT%3===0){const M=mouthOf(e);projs.push({kind:'vomit',dmul:e.dmul,x:M[0],y:e.y+rnd(-3,3),z:M[1],vx:e.facing*rnd(2.2,4.4),vy:rnd(-.5,.5),vz:rnd(.4,2),t:0});if(e.atkT===d.s)sfx('heavy');}
      if(!d.fire&&!d.vomit&&!d.throwB&&e.atkT>=d.s&&e.atkT<d.s+d.a)checkHits(e,d,act());
      if(e.atkT>=d.s+d.a+d.r){e.state='idle';e.t=0;e.atk=null;}
      break;}
    case'grabbed':if(!act().some(q=>q.grabbed===e)){e.state='hurt';e.hitstun=6;e.t=0;}break;
    case'hurt':e.x+=e.vx;e.vx*=.8;if(--e.hitstun<=0){e.state='idle';e.t=0;e.cd=Math.max(e.cd,20);}break;
    case'air':physicsKnock(e);break;
    case'down':
      if(e.dying){if(e.t>40){e.state='dead';e.t=0;}}
      else if(e.t>(e.type==='boss'?30:44)){e.state='getup';e.t=0;e.inv=20;}
      break;
    case'getup':e.stomps=0;if(e.t>14){e.state='idle';e.t=0;e.cd=30;}break;
    case'block':if(e.t>28){e.state='idle';e.t=0;}break;
    case'dead':if(e.t>30){e.remove=true;dropLoot(e);kills++;gainXp(e.xp);sfx('coin');}break;
  }
  if(e.state!=='air')e.y=clamp(e.y,YMIN,YMAX);
  e.x=clamp(e.x,cam-40,Math.min(WORLD,cam+W+40));
}
function mouthOf(e){const P_=PSPR[e.look.pix];const px=(e.scale||1)/1.2*(e.pxMul||1);const fn=pixFrame(e);
  if(P_&&P_.hpos&&P_.hpos[fn]&&P_.mimg&&P_.mimg.width){const hp=P_.hpos[fn],mx=hp[0]+P_.mimg.width*.72-P_.ax,my=hp[1]+P_.mimg.height*.78-P_.ay;return[e.x+(e.facing||1)*mx*px,-my*px];}
  return[e.x+e.facing*30,66];}
function updProjs(){
  for(const q of projs){
    q.t++;q.x+=q.vx;
    if(q.kind==='pillar'){
      for(const p of act())if(q.t>=40&&q.t<58&&hittable(p)&&Math.abs(p.x-q.x)<14&&Math.abs(p.y-q.y)<10){applyHit({facing:p.x>=q.x?1:-1,x:q.x,isPlayer:false,scale:1,dmul:q.dmul},p,{dmg:8,kb:2,kd:true,launch:4,heavy:true});}
      if(q.t===40){sfx('special');shakeT=8;shakeM=2;}
      if(q.t>66)q.gone=true;
      continue;
    }
    if(q.kind==='bottle'){q.y+=q.vy;q.vz-=.16;q.z+=q.vz;
      for(const p of act())if(!q.gone&&hittable(p)&&Math.abs(p.x-q.x)<11&&Math.abs(p.y-q.y)<9&&q.z<52&&q.z>p.z-4){applyHit({facing:Math.sign(q.vx)||1,x:q.x,isPlayer:false,scale:1,dmul:q.dmul},p,{dmg:9,kb:2.4,kd:true,launch:2.4});q.gone=true;spark(q.x,q.y,q.z,'#c8ffd0',true);sfx('glass');}
      if(q.z<=0){q.gone=true;spark(q.x,q.y,4,'#c8ffd0',true);sfx('glass');}
      continue;}
    if(q.kind==='vomit'){q.y+=q.vy;q.vz-=.16;q.z+=q.vz;
      if(q.t%2===0)parts.push({type:'bit',x:q.x,y:q.y,z:q.z,vx:-q.vx*.1,vz:rnd(0,.5),t:0,life:10,c:pick(['#9ad83a','#c8e85a','#6a9a2a'])});
      for(const p of act())if(!q.gone&&hittable(p)&&Math.abs(p.x-q.x)<11&&Math.abs(p.y-q.y)<9&&q.z<44){applyHit({facing:Math.sign(q.vx),x:q.x,isPlayer:false,scale:1,dmul:q.dmul},p,{dmg:4,kb:1.2});q.gone=true;}
      if(q.z<=0){q.gone=true;const near=projs.find(o=>o.kind==='puddle'&&Math.abs(o.x-q.x)<14&&Math.abs(o.y-q.y)<8);
        if(near){near.t=Math.min(near.t,60);near.r=Math.min(22,(near.r||10)+1);}else projs.push({kind:'puddle',dmul:q.dmul,x:q.x,y:q.y,z:0,vx:0,t:0,r:10});}
      continue;}
    if(q.kind==='puddle'){if(q.t>320)q.gone=true;
      for(const p of act())if(Math.abs(p.x-q.x)<(q.r||10)+4&&Math.abs(p.y-q.y)<6&&p.z<2){p.slowT=3;if(q.t%50===0&&hittable(p)&&p.hp>1){p.hp=Math.max(1,p.hp-Math.round(q.dmul||1));parts.push({type:'num',x:p.x,y:p.y,z:40,t:0,life:24,v:'ECA!',c:'#9aff6a',small:true});}}
      continue;}
    if(q.kind==='disc'){
      for(const e of enemies){if(!hittable(e)||q.hitSet.has(e))continue;if(Math.abs(e.x-q.x)<13&&Math.abs(e.y-q.y)<11){q.hitSet.add(e);
        const ow=players[q.by]||players[0];applyHit({isPlayer:true,owner:ow,atkBonus:ow.atkBonus,facing:Math.sign(q.vx),x:q.x,gp:ow.gp,maxGp:ow.maxGp,scale:1},e,q.last?{dmg:10,kb:3.2,kd:true,launch:3.4,heavy:true}:{dmg:6,kb:1.2});}}
      if(q.x<cam-20||q.x>cam+W+20||q.t>90)q.gone=true;
      continue;
    }
    if(q.kind==='fire'){
      if(q.t%3===0)parts.push({type:'bit',x:q.x,y:q.y,z:q.z+rnd(-4,4),vx:-q.vx*.3,vz:rnd(0,.6),t:0,life:16,c:pick(['#5ab0ff','#bfe6ff','#2a6ad0'])});
      for(const p of act())if(!q.gone&&hittable(p)&&Math.abs(p.x-q.x)<12&&Math.abs(p.y-q.y)<10){applyHit({facing:Math.sign(q.vx),x:q.x,isPlayer:false,scale:1,dmul:q.dmul},p,{dmg:7,kb:3,kd:true,launch:3,heavy:true});q.gone=true;}
      if(q.x<cam-30||q.x>cam+W+30)q.gone=true;
    }else{
      for(const e of enemies){if(!hittable(e))continue;if(Math.abs(e.x-q.x)<12&&Math.abs(e.y-q.y)<10){
        const ow=players[q.by]||players[0];applyHit({isPlayer:true,owner:ow,atkBonus:ow.atkBonus,facing:Math.sign(q.vx),x:q.x,gp:ow.gp,maxGp:ow.maxGp,scale:1},e,{dmg:WEAP[q.w].dmg+4,kb:3,kd:true,launch:3,heavy:true});q.hit=true;break;}}
      const minX=lock?lock.cam:cam,maxX=(lock?lock.cam:cam)+W;
      if(q.hit||q.t>40||q.x<minX+4||q.x>maxX-4){
        q.gone=true;
        if(WEAP[q.w].glass){spark(q.x,q.y,q.z,'#c8ffd0',true);sfx('glass');}
        else items.push({kind:'weapon',w:q.w,dur:Math.max(1,WEAP[q.w].dur-2),x:clamp(q.x,minX+10,maxX-10),y:q.y,z:q.z,vz:2,vx:-q.vx*.2,t:0});
      }
    }
  }
  projs=projs.filter(q=>!q.gone);
}
function updItems(){
  for(const it of items){
    it.t++;if(it.cool)it.cool--;
    if(it.kind==='can'){it.x+=it.vx||0;it.vx=(it.vx||0)*.85;continue;}
    it.vz-=.25;it.z+=it.vz;it.x+=it.vx;it.vx*=.96;
    if(it.z<=0){it.z=0;if(it.vz<-1)it.vz=-it.vz*.45;else{it.vz=0;it.vx*=.7;}}
    if(it.kind==='coin'&&it.t>720)it.gone=true;
  }
  items=items.filter(i=>!i.gone);
}
function updParts(){
  for(const q of parts){q.t++;
    if(q.type==='bit'||q.type==='puff'){q.x+=q.vx;q.z+=q.vz;q.vz-=q.type==='bit'?.18:.02;if(q.z<0)q.z=0;}
    if(q.type==='num')q.z+=.6;if(q.type==='big')q.z+=.3;if(q.type==='money'&&q.p){q.x=q.p.x;q.y=q.p.y;}}
  parts=parts.filter(q=>q.t<q.life);
}
function updWaves(){
  if(bonus)return;
  const p=act()[0]||players[0];
  if(!lock&&trigIdx<trigs.length&&act().some(q=>q.x>=trigs[trigIdx].x)){
    const tg=trigs[trigIdx];lock={cam:tg.cam!=null?tg.cam:clamp(tg.x-W/2+60,0,WORLD-W)};waveIdx=0;
    if(tg.boss){banner={t:0,boss:true,lines:tg.boss==='drunk'?['CHEFÃO DO '+SG().bar,'TIGAS']:tg.boss==='duo'?['SUB-CHEFÕES','CARECA & LOUCA']:['DESAFIO DO CHEFÃO','ROBÔ CHEFÃO']};waveDelay=110;demonWave=tg.boss!=='robot'?9:0;
      if(tg.boss==='drunk')tigasSay={t:-110,v:STAGE===2?'JÁ ERAS TUA MOCHILA, FEIJÃO! SÓ DEPOIS QUE ME DERROTAR...':['HEHEHE... CHEGOU A HORA!','VOCÊS DE NOVO?!','HAHAHA! A CABEÇA TÁ FERVENDO!','EU SOU O CALOR! HAHAHA!','AGORA EU SOU O DEMÔNIO!!!'][STAGE-1]};}
    else spawnWave(tg.waves[0]);
  }
  if(lock){
    const tg=trigs[trigIdx];
    if(waveDelay>0){waveDelay--;if(waveDelay===0)spawnWave(tg.waves[waveIdx]);return;}
    if(bossRef&&!bossRef.dying){const f=bossRef.hp/bossRef.maxHp;
      if(demonWave===0&&f<.7||demonWave===1&&f<.35){demonWave++;const sd=demonWave===1?-1:1;spawn('demonio',sd);if(act().length>1)spawn('demonio',-sd);
        parts.push({type:'big',x:bossRef.x,y:bossRef.y,z:96,t:0,life:80,v:'DRONES, ATACAR!',c:'#4ae0ff'});}}
    if(enemies.length===0){
      waveIdx++;
      if(waveIdx<tg.waves.length)waveDelay=40;
      else{if(tg.final){if(!winT){winT=1;sfx('level');}return;}
        if(tg.boss){parts.push({type:'big',x:p.x+60,y:p.y,z:90,t:0,life:120,v:'PRO '+SG().bar+'! ►',c:'#ff5ad0'});bossRef=null;}
        lock=null;trigIdx++;goTimer=200;}
    }
  }
}
// at most 2 normal enemies attack each player at the same time; bosses always attack
function engagedSet(){
  const alive=enemies.filter(e=>!e.dying&&e.state!=='down'&&e.state!=='dead'&&e.state!=='grabbed');
  const s=new Set(),A=act();
  for(const e of alive)if(e.type==='boss')s.add(e);
  for(const p of A){const mine=alive.filter(e=>e.type!=='boss'&&(A.length<2||tgtOf(e)===p));
    mine.sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x));mine.slice(0,2).forEach(e=>s.add(e));}
  return s;
}
const FADE_ACTS={bonusIn:()=>enterBonus(),bonusOut:()=>exitBonus(),
  shopIn:a=>{scene='shop';shop={i:a.i,by:a.by,sel:0,confirm:false,yes:true,msg:'',msgT:0};if(inGame().length>1)stop={by:a.by,why:'shop'};},
  shopOut:a=>{scene='play';shop=null;stop=null;const p=players[a.by];if(p)p.y=YMIN+18;},
  show:()=>{showInit();scene='show';sceneT=0;}};
function doFade(act,arg){fade={t:0,act,arg};}
function runFade(){const f=fade;if(FADE_ACTS[f.act])FADE_ACTS[f.act](f.arg);}
function enterBonus(){
  bonusSave={pos:act().map(p=>[p.slot,p.x,p.y]),cam};bonus=true;bonusUsed=true;bonusT=25*60;
  act().forEach((p,i)=>{p.x=BONUS_X+60-i*24;p.y=215+i*18;p.state='idle';});lock={cam:BONUS_X};cam=BONUS_X;
  for(let i=0;i<36;i++)items.push({kind:'coin',val:pick([.5,1,1,2,2]),x:BONUS_X+40+rnd(0,420),y:rnd(YMIN+2,YMAX-2),z:rnd(0,30),vz:0,vx:0,t:20,bonusCoin:true});
  for(let i=0;i<3;i++)items.push({kind:'can',bin:true,x:BONUS_X+120+i*120,y:rnd(180,240),z:0,vz:0,vx:0,hp:2,t:0,bonusCoin:true});
  sfx('level');
}
function exitBonus(){
  items=items.filter(i=>!i.bonusCoin&&i.x<BONUS_X-100);bonus=false;
  for(const [s,x,y] of bonusSave.pos){const p=players[s];if(p){p.x=x;p.y=y;p.state='idle';}}cam=bonusSave.cam;lock=null;
}
function tryDoors(){
  if(lock||bonus)return;
  for(const p of act()){if(!IN[p.slot].prs.up||p.y>YMIN+16)continue;
  if(!['idle','walk','run'].includes(p.state))continue;
  for(const d of DOORS){if(Math.abs(p.x-d.x)>22)continue;
    if(d.kind==='bonus'&&!bonusUsed){sfx('confirm');doFade('bonusIn');return;}
    if(d.kind==='shop'){sfx('confirm');doFade('shopIn',{i:d.shop,by:p.slot});return;}
  }}
}
function updExtras(){
  const p=act()[0]||players[0];
  if(buddyOn&&!buddy&&!winT)buddy={look:BANDLOOKS[6],x:p.x-40,y:p.y+6,z:0,state:'idle',t:0,facing:1,scale:1.2,inv:0,say:{v:'EI! CADÊ MINHA MOCHILA?!',t:150}};
  if(buddy){const b=buddy;b.t++;if(Math.abs(b.x-p.x)>260){b.x=p.x-60;b.y=p.y;}const tx=p.x-34*(p.facing||1),ty=clamp(p.y+8,YMIN,YMAX),dx=tx-b.x;
    if(Math.abs(dx)>10||Math.abs(ty-b.y)>4){b.x+=Math.sign(dx)*Math.min(2,Math.abs(dx));b.y+=Math.sign(ty-b.y)*Math.min(1,Math.abs(ty-b.y));if(b.state!=='walk'){b.state='walk';}b.facing=Math.sign(dx)||b.facing;}
    else{if(b.state!=='idle')b.t=0;b.state='idle';b.facing=p.x>=b.x?1:-1;}
    if(!b.say&&b.t%420===200&&!winT)b.say={v:pick(FEIJAO_FALAS),t:130};}
  if(winT===2&&STAGE===2){if(buddy)buddy.say={v:'MINHA MOCHILAAA! VALEU, PARCEIRO!',t:200};parts.push({type:'big',x:p.x,y:p.y,z:90,t:0,life:160,v:'MOCHILA RECUPERADA!',c:'#ffe066'});}
  for(const e of [buddy,bossRef,...players,...enemies])if(e&&e.say&&--e.say.t<=0)e.say=null;
  if(tigasSay){tigasSay.t++;if(bossRef&&bossRef.drunk&&tigasSay.t>=0&&!tigasSay.done&&(tigasSay.done=1))bossRef.say={v:tigasSay.v,t:STAGE===2?240:130};if(tigasSay.t>0&&STAGE===2&&buddy&&tigasSay.t===250)buddy.say={v:'DEVOLVE, ORDINÁRIO!!',t:110};if(tigasSay.t>300)tigasSay=null;}
  // Batatas: gente correndo pro balcão
  if(STAGE===4&&bossRef&&bossRef.drunk&&!winT&&cam>BAR_X-60){runT++;
    if(!runner&&runT%420===0)runner={phase:'warn',t:0,look:punkLook(),x:cam+W+24,y:clamp((act()[(runN++)%Math.max(1,act().length)]||p).y,YMIN,YMAX),z:0,state:'run',facing:-1,scale:1.15,inv:0};
    if(runner){const r=runner;r.t++;
      if(r.phase==='warn'&&r.t>=60){r.phase='run';r.t=0;sfx('alert');}
      else if(r.phase==='run'){r.x-=4.2;
        for(const q of act())if(!r.hit&&q.z<6&&hittable(q)&&Math.abs(r.x-q.x)<13&&Math.abs(r.y-q.y)<10){r.hit=true;q.stunT=120;q.vx=0;sfx('hit');hitstop=4;parts.push({type:'num',x:q.x,y:q.y,z:70,t:0,life:60,v:'TONTO!',c:'#ffe066'});r.say={v:'FOI MAL!',t:50};}
        if(r.x<BAR_X+95){r.phase='up';}}
      else if(r.phase==='up'){r.state='walk';r.y-=1.2;if(r.y<=YMIN){r.phase='beer';r.t=0;r.state='idle';r.facing=-1;}}
      else if(r.phase==='beer'){if(r.t===10)r.say={v:'UMA GELADA, CHEFE!',t:50};if(r.t>55){r.phase='out';r.state='run';r.beer=true;}}
      else if(r.phase==='out'){r.x-=3.2;if(r.x<cam-30)runner=null;}}}
  if(STAGE!==4)runner=null;
}
function updPlay(){
  t60++;
  if(fade){const fd=fade;fd.t++;if(fd.t===18)runFade();if(fade&&fade.t>=36)fade=null;return;}
  if(stop&&stop.why==='drop')return;
  {const pz=inGame().find(p=>IN[p.slot].prs.pause);if(pz){scene='pause';if(inGame().length>1){stop={by:pz.slot,why:'pause'};pauseSel=0;}return;}}
  if(winT){winT++;if(winT>150&&!fade){doFade('show');}}
  if(bonus){bonusT--;if(bonusT<=0){doFade('bonusOut');return;}}
  if(!bonus){const zk=zoneAt((act()[0]||players[0]).x);if(!zonesSeen.has(zk)){zonesSeen.add(zk);if(ZNAMES[zk])areaBanner={t:0,s:ZNAMES[zk]};}}
  if(areaBanner&&++areaBanner.t>200)areaBanner=null;
  tryDoors();
  if(banner){banner.t++;if(banner.t>(banner.boss?110:230))banner=null;}
  if(power){updPower();if(power&&power.t<=PCUT)return;}
  if(hitstop>0){hitstop--;return;}
  playTime++;
  if(hintT>0)hintT--;
  for(const p of players)if(p.comboT>0&&--p.comboT===0)p.comboN=0;
  for(const p of players)if(p.flashT>0)p.flashT--;enemies.forEach(e=>{if(e.flashT>0)e.flashT--;});
  if(goTimer>0)goTimer--;
  ranPlayers=true;
  for(const p of act()){useIn(p.slot);
    const stun=p.stunT>0||!!power;let sv=null;if(stun){if(p.stunT>0)p.stunT--;sv=Object.assign({},held);ACTS.forEach(a=>{held[a]=0;prs[a]=0;});if(p.state==='walk'||p.state==='run')p.state='idle';}
    updPlayer(p);if(sv)Object.assign(held,sv);
    if(scene!=='play'){useIn(LOCAL);return;}}
  useIn(LOCAL);
  updExtras();
  const eng=engagedSet();
  for(const e of enemies)updEnemy(e,eng.has(e));
  enemies=enemies.filter(e=>!e.remove);
  updProjs();updItems();updParts();updWaves();
  const A=act();const target=lock?lock.cam:A.length>1?clamp((A[0].x+A[1].x)/2-W/2,0,WORLD-W):clamp((A[0]||players[0]).x-W*0.42,0,WORLD-W);
  if(!(power&&(power.k==='batera'||power.k==='angelo')))cam+=(target-cam)*.12;if(Math.abs(target-cam)<.2)cam=target;
  if(shakeT>0)shakeT--;
}

// ---------- render world ----------
function drawItem(it){
  const sx=Math.round(it.x-cam),sy=Math.round(it.y-it.z);
  if(it.kind==='coin'){
    if(it.t>600&&Math.floor(it.t/4)%2)return;
    drawShadow(it.x-cam,it.y,it.z,.4);
    const w=Math.max(1,Math.round(Math.abs(Math.cos(it.t/7))*5));
    const c=it.val>=2?['#c8d8f0','#ffffff','#8aa0c0']:it.val>=1?['#e0a820','#fff0a0','#a07010']:['#c08850','#f0c890','#8a5a30'];
    B(sx-(w>>1),sy-7,w,7,c[0]);B(sx-(w>>1),sy-7,Math.max(1,w-1),1,c[1]);B(sx-(w>>1),sy-1,w,1,c[2]);
  }else if(it.kind==='food'){
    drawShadow(it.x-cam,it.y,it.z,.6);
    B(sx-5,sy-8,10,3,'#d08a3a');B(sx-4,sy-9,8,1,'#e8a850');B(sx-5,sy-5,10,1,'#4ac04a');B(sx-5,sy-4,10,2,'#6a3a20');B(sx-5,sy-2,10,2,'#d08a3a');
    if(Math.floor(it.t/10)%2)B(sx-1,sy-12,2,2,'#fff');
  }else if(it.kind==='can'){
    drawShadow(it.x-cam,it.y,0,.8);
    const c=it.bin?['#3a8a4a','#2a6a38','#5ab06a']:['#8a94a0','#5a6470','#b0bac6'];
    B(sx-7,sy-20,14,20,c[0]);B(sx-7,sy-20,3,20,c[1]);B(sx-8,sy-22,16,3,c[2]);B(sx-8,sy-23,16,1,'#e6eef9');
    for(let k=0;k<3;k++)B(sx-7,sy-16+k*5,14,1,c[1]);if(it.bin)B(sx-2,sy-13,4,4,'#e6eef9');
  }else if(it.kind==='weapon'){
    drawShadow(it.x-cam,it.y,it.z,.7);
    ctx.save();ctx.translate(sx-WEAP[it.w].len/2,sy-3);weaponShape(it.w);ctx.restore();
    const mp_=me();if(mp_&&!mp_.out&&!mp_.weapon&&Math.abs(it.x-mp_.x)<18&&Math.abs(it.y-mp_.y)<9&&Math.floor(t60/12)%2)txt('▼',sx,sy-18,8,'#ffe066','center');
  }
}
function drawProj(q){
  const sx=Math.round(q.x-cam),sy=Math.round(q.y-(q.z||0));
  if(q.kind==='puddle'){const a=q.t>260?(320-q.t)/60:1,r=q.r||10;ctx.globalAlpha=.85*a;ctx.fillStyle='#5a7a1a';ctx.beginPath();ctx.ellipse(sx,Math.round(q.y),r+3,4,0,0,7);ctx.fill();
    ctx.fillStyle='#8ab82a';ctx.beginPath();ctx.ellipse(sx-1,Math.round(q.y)-1,r,3,0,0,7);ctx.fill();R(sx-3,Math.round(q.y)-2,2,1,'#d8f07a');ctx.globalAlpha=1;return;}
  if(q.kind==='bottle'){ctx.globalAlpha=.3;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(sx,Math.round(q.y),3,1,0,0,7);ctx.fill();ctx.globalAlpha=1;
    ctx.save();ctx.translate(sx,sy);ctx.rotate(q.t*.35);R(-2,-5,4,8,'#2a7a3a');R(-1,-8,2,3,'#2a7a3a');R(-1,-4,1,5,'#8ae09a');ctx.restore();return;}
  if(q.kind==='vomit'){ctx.globalAlpha=.3;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(sx,Math.round(q.y),3,1,0,0,7);ctx.fill();ctx.globalAlpha=1;
    ctx.fillStyle='#7aa82a';ctx.beginPath();ctx.arc(sx,sy,3.2,0,7);ctx.fill();R(sx-1,sy-2,2,2,'#c8f06a');return;}
  if(q.kind==='disc'){const G=SIGIMG.vinyl;ctx.save();ctx.globalAlpha=.35;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(sx,Math.round(q.y),6,2,0,0,7);ctx.fill();ctx.restore();
    if(G&&G.img.complete){ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(sx,sy);ctx.rotate(q.t*.6*Math.sign(q.vx));ctx.drawImage(G.img,-Math.round(G.w/2),-Math.round(G.h/2));ctx.restore();}
    if(q.t%2===0)parts.push({type:'bit',x:q.x,y:q.y,z:q.z,vx:-q.vx*.15,vz:rnd(0,.4),t:0,life:10,c:pick(['#d02a30','#ffffff','#8a5aff'])});return;}
  if(q.kind==='pillar'){
    if(q.t<0)return;
    if(q.t<40){const r=10+Math.sin(q.t/3)*2;ctx.strokeStyle=Math.floor(q.t/4)%2?'#ff3030':'#ffd040';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(sx,sy,r,r*.35,0,0,7);ctx.stroke();R(sx-1,sy-4,2,8,'#ff3030');R(sx-4,sy-1,8,2,'#ff3030');
      if(q.t>26){const my=sy-(40-q.t)*14;R(sx-3,my-16,6,14,'#140c1a');R(sx-2,my-15,4,12,'#c8ccd8');R(sx-2,my-3,4,3,'#d02a2a');glow(sx,my-18,8,WARM,.8);}return;}
    const k=(q.t-40)/26;const r=8+k*26;glow(sx,sy-10,r*1.6,WARM,1-k);
    ctx.fillStyle='rgba(255,240,180,'+(1-k)+')';ctx.beginPath();ctx.arc(sx,sy-8,r*.7,0,7);ctx.fill();
    ctx.fillStyle='rgba(60,40,60,'+(.7*(1-k))+')';for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(sx+Math.cos(i*1.3)*r*.8,sy-10-k*20+Math.sin(i*2)*6,6+k*8,0,7);ctx.fill();}
    return;
  }

  drawShadow(q.x-cam,q.y,q.z,.6);
  if(q.kind==='fire'){
    const fl=Math.sin(q.t/2)*2;
    glow(sx,sy,20,CYAN,.7);ctx.fillStyle='#2a8ad0';ctx.beginPath();ctx.ellipse(sx,sy,12+fl,6,0,0,7);ctx.fill();
    ctx.fillStyle='#5ab0ff';ctx.beginPath();ctx.ellipse(sx+Math.sign(q.vx)*2,sy,9,7,0,0,7);ctx.fill();
    ctx.fillStyle='#d8f0ff';ctx.beginPath();ctx.ellipse(sx+Math.sign(q.vx)*3,sy,5,4,0,0,7);ctx.fill();
    R(sx+Math.sign(q.vx)*3-3,sy-2,2,2,'#1a2a6a');R(sx+Math.sign(q.vx)*3+1,sy-2,2,2,'#1a2a6a');
  }else{ctx.save();ctx.translate(sx,sy);ctx.rotate(q.t*.45*Math.sign(q.vx));ctx.translate(-WEAP[q.w].len/2,0);weaponShape(q.w);ctx.restore();}
}
function outlineText(s,x,y,size,fill,stroke,lw){
  ctx.font=size+'px '+PIX;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineJoin='round';ctx.lineWidth=lw||4;ctx.strokeStyle=stroke||'#000';ctx.strokeText(s,x,y);ctx.fillStyle=fill;ctx.fillText(s,x,y);
}
function drawPart(q){
  const sx=Math.round(q.x-cam),sy=Math.round(q.y-q.z);const k=q.t/q.life;
  if(q.type==='spark'){
    const r=(q.big?12:8)*(0.4+k);ctx.globalAlpha=1-k;ctx.fillStyle=q.c;
    ctx.fillRect(sx-r,sy-1,r*2,2);ctx.fillRect(sx-1,sy-r,2,r*2);
    for(const [a,b] of [[-1,-1],[1,1],[1,-1],[-1,1]])ctx.fillRect(sx+a*r*.6,sy+b*r*.6,2,2);
    ctx.globalAlpha=1;
  }else if(q.type==='bit'){R(sx,sy,2,2,q.c);}
  else if(q.type==='puff'){ctx.globalAlpha=.7*(1-k);R(sx-2,sy-2,4,3,'#e6eef9');ctx.globalAlpha=1;}
  else if(q.type==='num'){ctx.globalAlpha=k>.7?1-(k-.7)/.3:1;outlineText(q.v,sx,sy,8,q.c,'#000',3);ctx.globalAlpha=1;}
  else if(q.type==='big'){ctx.globalAlpha=k>.8?1-(k-.8)/.2:1;outlineText(q.v,sx,sy,8,q.c,'#802010',3);ctx.globalAlpha=1;}
  else if(q.type==='money'){ctx.globalAlpha=k>.75?1-(k-.75)/.25:1;outlineText(q.v,sx,sy-Math.min(6,q.t),16,'#ffe066','#5a3a00',4);ctx.globalAlpha=1;}
  else if(q.type==='pow'){
    const s=k<.15?.4+k/.15*.9:1.3-(k-.15)*.3;ctx.save();ctx.translate(sx,sy);ctx.rotate(q.rot);ctx.scale(s,s);
    ctx.globalAlpha=k>.8?1-(k-.8)/.2:1;outlineText(q.v,0,0,16,'#ffffff','#000',5);ctx.restore();ctx.globalAlpha=1;
  }
}
function drawSay(x,y,v,big){ctx.font='8px '+FONT;const w=Math.min(220,ctx.measureText(v).width+10);x=clamp(x,w/2+4,W-w/2-4);y=Math.max(14,y);
  const lines=[];if(ctx.measureText(v).width>210){const ws=v.split(' ');let c='';for(const t of ws){if(ctx.measureText(c+' '+t).width>200){lines.push(c);c=t;}else c=c?c+' '+t:t;}lines.push(c);}else lines.push(v);
  const h=lines.length*11+6;R(x-w/2-1,y-h-1,w+2,h+2,'#000');R(x-w/2,y-h,w,h,big?'#ffe8e0':'#fff');ctx.fillStyle='#000';ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.lineTo(x,y+6);ctx.fill();ctx.fillStyle=big?'#ffe8e0':'#fff';ctx.beginPath();ctx.moveTo(x-3,y-1);ctx.lineTo(x+3,y-1);ctx.lineTo(x,y+4);ctx.fill();
  lines.forEach((l,i)=>txt(l,x,y-h+4+i*11,8,big?'#a01010':'#111','center'));}
function drawWorld(){
  drawBG();drawMaskFX();
  const list=[];
  items.forEach(i=>list.push({y:i.y-0.1,f:()=>drawItem(i)}));
  projs.forEach(q=>list.push({y:q.kind==='puddle'?q.y-60:q.y,f:()=>drawProj(q)}));
  [...enemies,...act(),...[buddy,runner&&runner.phase!=='warn'?runner:null].filter(Boolean)].forEach(e=>{
    list.push({y:e.y-50,f:()=>drawShadow(e.x-cam,e.y,e.z,e.scale)});
    list.push({y:e.y+(e.state==='grabbed'?.5:0),f:()=>{
      if(e.inv>0&&e.state!=='getup'&&Math.floor(e.t/3)%2)return;
      if(e.state==='dead'&&Math.floor(e.t/3)%2)return;
      const ox=e.state==='hurt'||e.state==='grabbed'?(e.t%2?1:-1):0;
      if(e.tofu)drawTofu(e,e.x-cam+ox,e.y-e.z);else drawEntity(e,e.x-cam+ox,e.y-e.z);
      if(!e.isPlayer&&e.state==='attack'&&e.atk.tell&&e.atkT<e.atk.s){
        const hx=Math.round(e.x-cam),hy=Math.round(e.y-e.z-58*e.scale);
        if(Math.floor(e.atkT/4)%2===0){R(hx-2,hy,4,7,'#ff3030');R(hx-2,hy+9,4,3,'#ff3030');}
      }
    }});
  });
  list.sort((a,b)=>a.y-b.y);list.forEach(o=>o.f());
  for(const p of act())if(p.state==='attack')drawBeam(p);
  parts.forEach(drawPart);
  if(runner&&runner.beer&&runner.phase==='out'){const bx=Math.round(runner.x-cam)-10,by=Math.round(runner.y-46);R(bx,by,4,8,'#d89a20');R(bx,by-2,4,2,'#fff');}
  for(const p of act())if(p.stunT>0){for(let k=0;k<3;k++){const a=t60/8+k*2.1;txt('★',Math.round(p.x-cam+Math.cos(a)*12),Math.round(p.y-p.z-78+Math.sin(a)*3),8,'#ffe066','center');}}
  if(runner&&runner.phase==='warn'){ctx.globalAlpha=.55+.45*Math.sin(runner.t/2.5);const ay=Math.round(runner.y-30);ctx.fillStyle='#ffe066';ctx.beginPath();ctx.moveTo(W-30,ay);ctx.lineTo(W-14,ay-12);ctx.lineTo(W-14,ay+12);ctx.fill();R(W-14,ay-5,10,10,'#ffe066');glow(W-20,ay,28,'rgba(255,220,80,1)',.6);outlineText('!',W-40,ay,10,'#ff4a3a','#000',3);ctx.globalAlpha=1;}
  for(const e of [buddy,runner,...act(),...enemies])if(e&&e.say)drawSay(Math.round(e.x-cam),Math.round(e.y-e.z-(e.drunk?(e.pxMul>1?118:128):e.scale>1.3?92:80)),e.say.v,e.drunk);
  if(inGame().length>1)for(const p of act())outlineText('J'+(p.slot+1),Math.round(p.x-cam),Math.round(p.y-p.z-(p.scale>1.3?96:88)),8,p.slot?'#5ab0ff':'#ff4a4a','#000',3);
  drawPowerFX();
  for(const e of enemies)if(e.stunT>0&&!e.dying&&e.state==='idle'){for(let k=0;k<3;k++){const a=t60/8+k*2.1;txt(k===1&&power&&power.k==='feijao'?'?':'★',Math.round(e.x-cam+Math.cos(a)*12),Math.round(e.y-e.z-(e.drunk?120:e.scale>1.3?88:74)+Math.sin(a)*3),8,'#ffe066','center');}}
  if(SG().tint&&!bonus&&!(STAGE===3&&cam>BAR_X-80))R(0,0,W,H,SG().tint);
}

// ---------- HUD ----------
function bar(x,y,w,h,v,max,c,bg){R(x-1,y-1,w+2,h+2,'#000');R(x,y,w,h,bg||'#3a1018');R(x,y,Math.round(w*clamp(v/max,0,1)),h,c);R(x,y,Math.round(w*clamp(v/max,0,1)),1,'rgba(255,255,255,.4)');}
function drawPortrait(L,x,y,sz){
  sz=sz||26;shape(()=>ctx.rect(x,y,sz,sz),'#c0201a',1.2);fillOnly(()=>ctx.rect(x+1.5,y+1.5,sz-3,sz-3),'#f4e6cc');
  ctx.save();ctx.beginPath();ctx.rect(x+1.5,y+1.5,sz-3,sz-3);ctx.clip();
  const PP=L.pix&&PSPR[L.pix];
  if(PP&&PP.img.complete){const hc=PP.hc,hs=hc[2]+2,k=(sz-3)/hs;ctx.imageSmoothingEnabled=false;ctx.drawImage(PP.img,Math.round(hc[0]-hs/2),hc[1],hs,hs,x+1.5,y+3,hs*k,hs*k);ctx.restore();return;}
  const sc=sz/26;ctx.translate(x+sz*.42,y+sz*.6);ctx.scale(sc,sc);curFacing=1;drawHead(L,false);ctx.restore();
}
function heart(x,y){const P=['0110110','1111111','1111111','0111110','0011100','0001000'];P.forEach((r,j)=>{for(let i=0;i<7;i++)if(r[i]==='1')R(x+i,y+j,1,1,'#ff3a4a');});R(x+1,y+1,1,1,'#ffb0b8');}
function flame(x,y){const P=['0010','0110','0111','1111','1111','0110'];P.forEach((r,j)=>{for(let i=0;i<4;i++)if(r[i]==='1')R(x+i,y+j,1,1,j<2?'#ffe066':'#ff8a20');});}
function coinIcon(x,y){R(x,y,6,6,'#e0a820');R(x,y,5,1,'#fff0a0');R(x+2,y+2,2,2,'#a07010');}
// one player's HUD panel; ox moves it (2 players: J1 on the left, J2 on the right). local = this device's player
function drawPanel(p,ox,local){const two=inGame().length>1,out=!!p.out;
  R(ox+4,4,118,47,'rgba(0,0,0,.5)');R(ox+4,4,118,1,two&&p.slot?'#2a7ad0':'#c0201a');
  if(out)ctx.globalAlpha=.4;drawPortrait(p.look,ox+7,7,26);ctx.globalAlpha=1;
  if(out)outlineText('FORA',ox+21,32,8,'#ff8080','#000',3);else outlineText('x'+p.lives,ox+30,32,8,'#fff','#000',3);
  heart(ox+40,9);txt(String(Math.ceil(p.hp)).padStart(3,'0'),ox+50,8,8,'#ffffff');
  flame(ox+82,9);txt(String(Math.floor(p.gp)).padStart(3,'0'),ox+88,8,8,'#ffffff');
  bar(ox+40,20,78,3,p.hp,p.maxHp,'#ff3a4a');bar(ox+40,26,78,2,p.gp,p.maxGp,'#ff9a30','#2a1408');
  txt('LV'+p.lvl,ox+40,30,8,'#ffe066');
  if(p.sigOn&&sigOf(p))outlineText('ARMA',ox+100,33,8,'#ffe066','#000',3);
  {const full=(p.fury||0)>=100,act=p.maskT>0,blink=Math.floor(t60/6)%2,mine=!!power&&power.p===p;
   R(ox+7,36,32,4,'#000');txt('MASC',ox+8,34,8,act?'#ff60ff':full?(blink?'#ffffff':'#ffe066'):'#c08aff');
   const v=act?p.maskT/6:(p.fury||0);bar(ox+40,37,78,3,v,100,act?'hsl('+((t60*6)%360)+',90%,60%)':full?(blink?'#ffffff':'#ffe066'):'#b060ff','#1a0a2a');
   const pf=(p.pw||0)>=100&&!power;R(ox+7,43,32,4,'#000');txt('PODER',ox+8,41,8,pf?(blink?'#ffffff':'#5ae0ff'):'#5a9ad0');
   bar(ox+40,44,78,3,mine?100*(1-Math.min(1,power.t/(PCUT+60))):(p.pw||0),100,pf?(blink?'#ffffff':'#5ae0ff'):'#2a8ad0','#0a1a2a');
   if(local&&!out){const ready=pf||(full&&!act);const hk=keysOf('mask').map(keyName)[0]||'H';
    if(ready){glow(ox+79,pf?45:38,28,pf?'rgba(90,224,255,1)':'rgba(255,230,100,1)',.35+.25*blink);outlineText((isTouch?'APERTE MÁSC':'APERTE '+hk)+(pf?' • PODER!':' • MÁSCARA!'),two&&ox?W-100:ox+79,54,8,blink?(pf?'#5ae0ff':'#ffe066'):'#ffffff','#000',3);}
    const mb=document.getElementById('maskBtn');if(mb){mb.style.boxShadow=ready?(blink?'0 0 18px 6px '+(pf?'#5ae0ff':'#ffe066'):'0 0 8px 2px #ff9a30'):'';mb.textContent=pf?'PODER':'MÁSC';}}}
  if(p.weapon){txt(WEAP[p.weapon.w].name,ox+70,30,8,'#8ad0ff');}
  if(p.money>0){R(ox+4,62,72,12,'rgba(0,0,0,.5)');coinIcon(ox+7,65);txt(money(p.money),ox+16,64,8,'#ffe066');}
  if(two&&p.comboN>1)outlineText(p.comboN+' HITS',ox+64,84,8,'#ffe066','#802010',3);}
function drawHUD(){
  const G=inGame();
  if(G.length>1){drawPanel(players[0],0,LOCAL===0);drawPanel(players[1],W-126,LOCAL===1);}
  else{const p=G[0]||players[0];drawPanel(p,0,true);if(p.comboN>1)outlineText(p.comboN+' HITS',W-40,56,8,'#ffe066','#802010',3);}
  if(goTimer>0&&Math.floor(goTimer/15)%2===0)outlineText('VAI! ►',W-36,110,16,'#ffffff','#c02020',4);
  if(bossRef&&scene==='play'&&enemies.includes(bossRef)){
    txt('≡CHEFÃO',40,H-30,8,'#ffffff');R(39,H-20,262,10,'#140c1a');R(40,H-19,260,8,'#3a1a2a');const f=clamp(bossRef.hp/bossRef.maxHp,0,1);const g=ctx.createLinearGradient(40,0,300,0);g.addColorStop(0,'#ff5aa0');g.addColorStop(1,'#ffd040');ctx.fillStyle=g;ctx.fillRect(40,H-19,260*f,8);R(40,H-19,260*f,2,'rgba(255,255,255,.5)');for(let k=1;k<10;k++)R(40+k*26,H-19,1,8,'#140c1a');
  }
  if(hintT>0&&!(banner&&banner.card&&banner.t<200)){
    ctx.globalAlpha=Math.min(1,hintT/60);
    R(0,H-30,W,30,'rgba(0,0,0,.55)');
    txt(isTouch?'SOCO CHUTE PULO ARMA MÁSC':'J SOCO  K CHUTE  ESPAÇO PULO  U ARMA  H MÁSCARA',W/2,H-26,8,'#ffffff','center');
    txt('SOCO PERTO DE OBJETO = PEGAR • ANDE NO INIMIGO = AGARRAR',W/2,H-14,8,'#8ad0ff','center');
    ctx.globalAlpha=1;
  }
  if(banner)drawBanner(banner);
  if(winT){const k=Math.min(1,winT/12);ctx.save();ctx.translate(W/2,92);ctx.scale(k*(1+Math.sin(winT/6)*.03),k);pixTitle('VOCÊ VENCEU!',0,0,32);ctx.restore();}
  if(areaBanner){const k=areaBanner.t,n=Math.floor(k/3);ctx.globalAlpha=k>170?(200-k)/30:1;
    ctx.font='16px '+FONT;ctx.textAlign='left';ctx.textBaseline='middle';ctx.lineWidth=5;ctx.strokeStyle='#000';ctx.lineJoin='round';
    const s=areaBanner.s.slice(0,n);ctx.strokeText(s,14,72);ctx.fillStyle='#fff';ctx.fillText(s,14,72);ctx.globalAlpha=1;}
}
function drawFade(){if(!fade)return;const a=fade.t<18?fade.t/18:(36-fade.t)/18;ctx.globalAlpha=clamp(a,0,1);R(0,0,W,H,'#000');ctx.globalAlpha=1;}
function drawBanner(b){
  const k=b.t;
  if(b.card){
    const out=k>200?(k-200)/30:0;ctx.globalAlpha=1-out;
    const slide=Math.min(1,k/16);const ox=Math.round((1-slide)*-200);
    pixTitle('1',62+ox,96,48,'#d8ffb0','#6ae05a','#1a8a2a');
    const L=STAGE===1?['Inverno Gaúcho!','Não Se Atrase','Pro Grande Show!']:['Fase '+STAGE+'!','Rumo ao','Bar '+SG().bar+'!'];
    L.forEach((s,i)=>{if(k>10+i*8){ctx.textAlign='left';ctx.font='16px '+FONT;ctx.lineWidth=5;ctx.strokeStyle='#000';ctx.lineJoin='round';
      ctx.textBaseline='middle';ctx.strokeText(s,96+ox,72+i*24);ctx.fillStyle='#fff';ctx.fillText(s,96+ox,72+i*24);}});
    ctx.globalAlpha=1;return;
  }
  const out=k>90?(k-90)/20:0;ctx.globalAlpha=1-out;
  outlineText(b.lines[1],W/2,70,16,'#ffffff','#000',5);outlineText(b.lines[0],W/2,50,8,'#ff6ad0','#000',3);
  ctx.globalAlpha=1;
}

// ---------- menus ----------
let titleCam=0;
function drawLogo(x,y){
  const j=()=>Math.round(rnd(-.6,.6));
  ctx.font='46px '+COMIC;ctx.textAlign='center';ctx.textBaseline='top';
  ctx.fillStyle='#000';ctx.fillText('ZEROZERO',x+4,y+4);
  ctx.fillStyle='#c0201a';ctx.fillText('ZEROZERO',x+2+j(),y+2+j());
  ctx.fillStyle='#ffffff';ctx.fillText('ZEROZERO',x,y);
  R(x-150,y+40,300,2,'#c0201a');
}
const demo=newFighter({look:BANDLOOKS[0],facing:1});
const MENU=['1 JOGADOR','CRIAR SALA','ENTRAR NA SALA'];let menuSel=0,netMsg=null;
function updTitle(){t60++;sceneT++;titleCam+=.4;cam=titleCam%2000;
  if(prs.up){menuSel=(menuSel+MENU.length-1)%MENU.length;sfx('select');}
  if(prs.down){menuSel=(menuSel+1)%MENU.length;sfx('select');}
  if(prs.start||prs.punch||prs.jump){sfx('confirm');netMsg=null;
    if(menuSel===0)startSolo();else if(menuSel===1)netCreate();else netJoinScreen();}}
function startSolo(){party=[{slot:0,look:null}];scene='select';sceneT=0;}
function drawTitle(){
  drawSky();drawFar();
  {const g=ctx.createLinearGradient(0,150,0,H);g.addColorStop(0,'#ff9a56');g.addColorStop(.25,'#c0507a');g.addColorStop(1,'#2a1a46');ctx.fillStyle=g;ctx.fillRect(0,158,W,H-158);}for(let i=0;i<8;i++){const x=((i*90-titleCam*.8)%720+720)%720-60;ctx.fillStyle='#f4e0f0';ctx.beginPath();ctx.ellipse(x,214+(i%3)*14,40,10,0,0,7);ctx.fill();ctx.fillStyle='#b080c0';ctx.beginPath();ctx.ellipse(x+4,219+(i%3)*14,36,7,0,0,7);ctx.fill();}
  vignette();
  const bob=Math.sin(sceneT/20)*3;pixTitle('ZEROZERO',W/2,74+bob,40);
  txt('PANCADARIA ATÉ O SHOW',W/2,108,8,'#ffffff','center','#5a1a40');
  demo.state='idle';demo.t=sceneT;demo.look=BANDLOOKS[Math.floor(sceneT/120)%BANDLOOKS.length];demo.scale=1;
  const fx=60+((sceneT*1.2)%560);drawShadow(400,236,0,1.8);ctx.save();drawFighterAt(demo,400,236,1.8);ctx.restore();
  MENU.forEach((m,i)=>{const on=i===menuSel;txt((on?'► ':'  ')+m+(on?' ◄':'  '),W/2,128+i*15,8,on?'#ffe066':'#ffffff','center','#5a1a40');});
  if(netMsg){R(30,180,W-60,20,'rgba(0,0,0,.85)');txt(netMsg,W/2,186,8,'#ff8a5a','center');}
  txt('© 2026 RUBÃO STUDIOS',W/2,H-12,8,'#c8a8e8','center');
}

// theater select
const sil=document.createElement('canvas');sil.width=W*S;sil.height=H*S;const sctx=sil.getContext('2d');
function drawTheater(){
  B(0,0,W,H,'#14040a');
  for(let x=0;x<W;x+=14){B(x,0,7,200,'#5a0a14');B(x+7,0,7,200,'#480810');B(x+3,0,2,200,'#6a1420');}
  B(0,196,W,74,'#5a2a18');for(let y=200;y<H;y+=10)B(0,y,W,1,'#3a1a10');
  ctx.globalAlpha=.25;ctx.fillStyle='#ffe0a0';ctx.beginPath();ctx.ellipse(W/2,226,170,30,0,0,7);ctx.fill();ctx.globalAlpha=1;
  // side curtains
  const side=(flip)=>{ctx.save();if(flip){ctx.translate(W,0);ctx.scale(-1,1);}
    ctx.fillStyle='#8a1424';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(96,0);ctx.quadraticCurveTo(70,90,52,140);ctx.quadraticCurveTo(70,210,80,270);ctx.lineTo(0,270);ctx.fill();
    ctx.strokeStyle='#5a0a14';ctx.lineWidth=3;for(let k=12;k<80;k+=16){ctx.beginPath();ctx.moveTo(k,0);ctx.quadraticCurveTo(k*.6,140,k*.8,270);ctx.stroke();}
    B(40,134,22,6,'#e0b040');B(56,138,6,14,'#e0b040');B(54,150,10,8,'#c09030');
    ctx.restore();};
  side(false);side(true);
  // valance
  B(0,0,W,36,'#9a1828');B(0,30,W,4,'#e0b040');
  ctx.fillStyle='#9a1828';for(let x=0;x<W+24;x+=24){ctx.beginPath();ctx.arc(x,34,12,0,Math.PI);ctx.fill();}
  ctx.strokeStyle='#e0b040';ctx.lineWidth=2;for(let x=0;x<W+24;x+=24){ctx.beginPath();ctx.arc(x,34,12,0,Math.PI);ctx.stroke();}
  for(let x=12;x<W;x+=24){B(x-1,44,3,6,'#e0b040');}
}
const CHARS=[{looks:[BANDLOOKS[0]]},{looks:[BANDLOOKS[1]]},{looks:[BANDLOOKS[4]]},{looks:[BANDLOOKS[2]]},{looks:[BANDLOOKS[3]]},{looks:[BANDLOOKS[7]]},{looks:[BANDLOOKS[5]]},{looks:[BANDLOOKS[6]]}];
let selChar=0,selSkin=0,chosenLook=BANDLOOKS[0];
const selF=CHARS.map(c=>newFighter({look:c.looks[0],facing:1}));
let SELS=[{char:0,ok:false},{char:1,ok:false}];
function updSelect2(){const n=CHARS.length;
  for(const s of [0,1]){const I=IN[s].prs,S=SELS[s];if(party[s]&&party[s].left)continue;
    if(S.ok)continue;
    if(I.left){S.char=(S.char+n-1)%n;sfx('select');}if(I.right){S.char=(S.char+1)%n;sfx('select');}
    if((I.start||I.punch||I.jump)&&sceneT>10){const o=SELS[1-s];
      if(o.ok&&o.char===S.char)sfx('block');else{S.ok=true;party[s].look=CHARS[S.char].looks[0];sfx('confirm');}}}
  if(SELS[0].ok&&SELS[1].ok){chosenLook=party[0].look;STAGE=1;scene='mut';sceneT=0;
    if(NET.role==='host'&&!NET.started){netSend({t:'start'});NET.started=true;}}}
function updSelect(){
  t60++;sceneT++;if(party.length>1){updSelect2();return;}
  if(prs.left){selChar=(selChar+CHARS.length-1)%CHARS.length;selSkin=0;sfx('select');}
  if(prs.right){selChar=(selChar+1)%CHARS.length;selSkin=0;sfx('select');}
  const nl=CHARS[selChar].looks.length;
  if(prs.up&&nl>1){selSkin=(selSkin+nl-1)%nl;sfx('select');}
  if(prs.down&&nl>1){selSkin=(selSkin+1)%nl;sfx('select');}
  selF[selChar].look=CHARS[selChar].looks[selSkin];
  if((prs.start||prs.punch||prs.jump)&&sceneT>10){chosenLook=CHARS[selChar].looks[selSkin];party=[{slot:0,look:chosenLook}];sfx('confirm');STAGE=1;scene='mut';sceneT=0;}
}
let selLightT=0,selPrev=-1;
function slotX(i){const n=CHARS.length;return Math.round(28+i*(W-56)/(n-1));}
const FANS=[];for(let i=0;i<30;i++)FANS.push({x:i*17+rnd(-5,5),s:rnd(.8,1.15),ph:rnd(0,6.28),sp:rnd(.12,.22),arms:Math.random()<.6?(Math.random()<.5?2:1):0,phone:Math.random()<.15,row:i%2});
function drawSilC(f,cx,y,mul,col){
  const real=ctx;ctx=sctx;
  sctx.setTransform(1,0,0,1,0,0);sctx.clearRect(0,0,sil.width,sil.height);sctx.setTransform(S,0,0,S,0,0);drawFighterAt(f,cx,y,mul);
  ctx.globalCompositeOperation='source-atop';R(0,0,W,H,col);ctx.globalCompositeOperation='source-over';ctx=real;
  ctx.drawImage(sil,0,0,W,H);
}
function drawStageBG(){
  R(0,0,W,H,'#040306');
  {const g=ctx.createLinearGradient(0,0,0,190);g.addColorStop(0,'#0a0712');g.addColorStop(1,'#130c1c');ctx.fillStyle=g;ctx.fillRect(0,16,W,174);}
  // treliça com refletores
  R(0,6,W,3,'#2a2632');R(0,13,W,2,'#1e1a26');
  for(let x=0;x<W;x+=12){ctx.strokeStyle='#221e2a';ctx.beginPath();ctx.moveTo(x,9);ctx.lineTo(x+6,13);ctx.lineTo(x+12,9);ctx.stroke();}
  for(let i=0;i<CHARS.length;i++){const cx=slotX(i),on=i===selChar;
    R(cx-5,15,10,7,on?'#3a3440':'#1a1620');R(cx-4,21,8,2,on?'#fff2c0':'#2a2430');
    if(on)glow(cx,22,14,'rgba(255,240,190,1)',.6);}
  // neblina
  for(let i=0;i<5;i++){const x=((i*130+t60*.15)%(W+160))-80;glow(x,150+Math.sin(t60/90+i)*8,70,'rgba(120,90,170,1)',.06);}
  // palco
  R(0,188,W,16,'#16111c');for(let x=0;x<W;x+=24)R(x,188,1,16,'#0e0a12');
  R(0,203,W,2,'#3a2c48');R(0,205,W,12,'#0a070d');
  // amplificadores e caixas nas laterais
  for(const ax of [4,W-36]){R(ax,140,32,48,'#0d0b10');R(ax+2,142,28,44,'#151219');for(let k=0;k<3;k++)ctx.fillStyle='#0a080c',ctx.beginPath(),ctx.arc(ax+16,150+k*14,5,0,7),ctx.fill();}
}
const TELIMG={};for(const k in TELDATA){const im=new Image();im.src=TELDATA[k];TELIMG[k]=im;}
function drawTelao(look,t){
  const w=150,h=186,x=Math.round(W/2-w/2),y=8;
  R(x-5,y-5,w+10,h+10,'#0c0a10');R(x-4,y-4,w+8,h+8,'#1e1a26');R(x-1,y-1,w+2,h+2,'#000');
  R(x+w/2-14,y+h+5,28,10,'#0e0b12');
  const im=TELIMG[look&&look.pix];
  if(t<10||!im||!im.complete){for(let i=0;i<260;i++){const v=Math.random()*200|0;ctx.fillStyle='rgb('+v+','+v+','+(v+20)+')';ctx.fillRect(x+Math.random()*w|0,y+Math.random()*h|0,2,1);}}
  else{ctx.save();ctx.imageSmoothingEnabled=true;ctx.globalAlpha=Math.min(1,(t-10)/12);{const sw=im.width,shh=im.width*h/w,sy=Math.max(0,(im.height-shh)*.35);ctx.drawImage(im,0,sy,sw,Math.min(shh,im.height),x,y,w,h);}ctx.restore();
    ctx.save();ctx.globalCompositeOperation='multiply';ctx.fillStyle='rgba(120,90,150,1)';ctx.globalAlpha=.25;ctx.fillRect(x,y,w,h);ctx.restore();}
  ctx.fillStyle='rgba(0,0,0,.28)';for(let yy=y;yy<y+h;yy+=2)ctx.fillRect(x,yy,w,1);
  const bar=(t*2)%(h+20)-10;ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(x,y+bar,w,6);
  glow(x+w/2,y+h/2,160,'rgba(140,110,200,1)',.12);
  if(t>=10&&look){const a=Math.min(1,(t-10)/10);ctx.globalAlpha=a;
    R(x,y+4,w,24,'rgba(0,0,0,.45)');outlineText(look.name,W/2,y+22,look.name.length>9?8:16,'#ffe066','#000',4);ctx.globalAlpha=1;}
}
function drawSpot(cx,k){
  ctx.save();ctx.globalCompositeOperation='lighter';
  const g=ctx.createLinearGradient(0,22,0,200);g.addColorStop(0,'rgba(255,244,200,'+(.38*k)+')');g.addColorStop(1,'rgba(255,230,170,'+(.14*k)+')');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(cx-4,22);ctx.lineTo(cx+4,22);ctx.lineTo(cx+36,196);ctx.lineTo(cx-36,196);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,236,180,'+(.35*k)+')';ctx.beginPath();ctx.ellipse(cx,196,36,7,0,0,7);ctx.fill();
  ctx.restore();
  for(let i=0;i<6;i++){const y=40+((i*29+t60*.4)%150);ctx.fillStyle='rgba(255,240,200,'+(.25*k)+')';ctx.fillRect(Math.round(cx+Math.sin(i*2+t60/40)*(8+y*.12)),Math.round(y),1,1);}
}
function drawCrowd(){
  const ex=selLightT>8?Math.max(0,1-(selLightT-8)/100):0;
  {const g=ctx.createLinearGradient(0,205,0,H);g.addColorStop(0,'rgba(90,50,120,.55)');g.addColorStop(.5,'rgba(40,20,60,.35)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,205,W,H-205);}
  for(const row of [0,1])for(const f of FANS){if(f.row!==row)continue;
    const jump=Math.abs(Math.sin(t60*f.sp*(1+ex*1.2)+f.ph))*(row?7:5)*(1+ex*1.6),x=Math.round(f.x+(row?8:0)),base=row?H+4:H-6,hy=Math.round(base-30*f.s-jump),col=row?'#000':'#07050a';
    ctx.fillStyle=col;
    ctx.beginPath();ctx.arc(x,hy,5.5*f.s,0,7);ctx.fill();
    ctx.fillRect(x-8*f.s,hy+5*f.s,16*f.s,40);
    ctx.strokeStyle=col;ctx.lineWidth=3*f.s;ctx.lineCap='round';
    const wave=Math.sin(t60*f.sp*2+f.ph)*3;
    const arms=ex>.25?2:f.arms;
    if(arms>=1){ctx.beginPath();ctx.moveTo(x+6*f.s,hy+8);ctx.lineTo(x+10*f.s+wave,hy-12*f.s);ctx.stroke();ctx.beginPath();ctx.arc(x+10*f.s+wave,hy-13*f.s,2.4*f.s,0,7);ctx.fill();}
    if(arms===2){ctx.beginPath();ctx.moveTo(x-6*f.s,hy+8);ctx.lineTo(x-10*f.s-wave,hy-12*f.s);ctx.stroke();ctx.beginPath();ctx.arc(x-10*f.s-wave,hy-13*f.s,2.4*f.s,0,7);ctx.fill();}
    if(f.phone&&arms>=1){ctx.fillStyle='#dfe8ff';ctx.fillRect(Math.round(x+9*f.s+wave),Math.round(hy-19*f.s),3,4);glow(x+10*f.s+wave,hy-17*f.s,6,'rgba(200,220,255,1)',.4);}
  }
}
function drawSelect(){
  if(party.length>1){selChar=SELS[LOCAL].char;selSkin=0;}
  const lk=selChar*10+selSkin;if(selPrev!==lk){selPrev=lk;selLightT=0;}
  if(selLightT===8)crowdCheer();selLightT++;
  drawStageBG();
  drawTelao(selF[selChar].look,selLightT);
  const k=Math.min(1,selLightT/10)*(selLightT<4&&selLightT%2?0.3:1);
  for(let i=0;i<CHARS.length;i++){
    const cx=slotX(i),sel=i===selChar,f=selF[i];f.t=sceneT;
    if(sel){f.state=Math.floor(sceneT/90)%3===2?'attack':'idle';
      if(f.state==='attack'){if(!f.atk||f.atkT>=f.atk.s+f.atk.a+f.atk.r){f.atk=ATK.jab;f.atkT=0;}f.atkT++;}else f.atk=null;}
    else{f.state='idle';f.atk=null;}
    if(sel)continue;
    drawSilC(f,cx+1,196,1.0,'#2a2440');drawSilC(f,cx,196,1.0,'#000');
  }
  // escolhido por cima, com holofote
  {const cx=slotX(selChar),f=selF[selChar],L=f.look;
    drawSpot(cx,k);
    if(k<1){drawSilC(f,cx,196,1.1,'#000');ctx.globalAlpha=k;}
    drawShadow(cx,196,0,1.2);drawFighterAt(f,cx,196,1.1);ctx.globalAlpha=1;
    if(CHARS[selChar].looks.length>1)outlineText('▲▼ SKIN '+(selSkin+1)+'/'+CHARS[selChar].looks.length,W/2,70,8,'#ffffff','#000',3);
  }
  drawCrowd();
  if(party.length>1)for(const s of [0,1]){const S=SELS[s];outlineText((S.ok?'OK ':'')+'J'+(s+1),slotX(S.char),s?132:120,8,s?'#5ab0ff':'#ff5a5a','#000',3);}
  outlineText(isTouch?'JOYSTICK ESCOLHE • SOCO CONFIRMA':'◄ ► LUTADOR  ▲▼ SKIN  ENTER OK',W/2,H-6,8,'#e8d8c0','#000',3);
}
function drawSil(f,cx){
  const real=ctx;ctx=sctx;ctx.setTransform(S,0,0,S,0,0);
  sctx.setTransform(1,0,0,1,0,0);sctx.clearRect(0,0,sil.width,sil.height);sctx.setTransform(S,0,0,S,0,0);drawFighterAt(f,cx,200,1.0);
  ctx.globalCompositeOperation='source-atop';R(0,0,W,H,'#2a3a8a');
  ctx.globalAlpha=.35;R(0,0,W,140,'#6a7ad0');ctx.globalAlpha=1;
  ctx.globalCompositeOperation='source-over';ctx=real;
}
function teamLooks(){const L=party.filter(m=>!m.left&&m.look).map(m=>m.look);return L.length>1?L:[chosenLook];}
const STORYF=[newFighter({look:BANDLOOKS[0]}),newFighter({look:BANDLOOKS[1]})];
function storyLines(){const T=teamLooks();const nm=T.length>1?T.map(L=>L.name).join(' E '):(chosenLook&&chosenLook.name)||'RUBÃO';const B=SG().bar;if(STAGE===2)return['FASE 2 — '+B,SG().clim,'Roubaram a mochila do Feijão!','Ele jura que foi o TIGAS...','Leva o Feijão junto até o '+B+'.','Boraaa, '+nm+'!'];if(STAGE>1)return['FASE '+STAGE+' — '+B,SG().clim,'Hoje tem show da ZeroZero no '+B+'.','Mas o TIGAS voltou... e está pior.','A gangue dele fechou as ruas.','Boraaa, '+nm+'!'];return['Inverno em Passo Fundo.','Hoje tem show da ZeroZero no Castigo.','Mas uma gangue tomou conta da Indep.','e ninguém chega lá sem passar por eles.','Hora de resolver na mão.','Boraaa, '+nm+'!'];}
const MUTF=newFighter({look:Object.assign({},BASE,{pix:'vilao1',name:'TIGAS'}),facing:-1,scale:1.5});
function updMut(){t60++;sceneT++;
  if(prs.down||prs.up){STAGE=prs.down?STAGE%5+1:(STAGE+3)%5+1;sceneT=0;sfx('select');return;}if((prs.start||prs.punch||prs.jump)&&sceneT>20||sceneT>330){scene='story';sceneT=0;sfx('confirm');}
  if(sceneT===110&&STAGE>1){sfx('alert');shakeT=20;shakeM=4;}}
function drawMut(){
  const st=STAGE>1&&sceneT<110?STAGE-1:STAGE,red=(STAGE-1)/4;
  R(0,0,W,H,'#000');
  const g=ctx.createRadialGradient(W/2,170,10,W/2,170,200);g.addColorStop(0,'rgba('+Math.round(60+150*red)+',20,'+Math.round(60-40*red)+',.9)');g.addColorStop(1,'rgba(0,0,0,1)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  R(0,214,W,56,'#0a0608');
  const sh=STAGE>1&&sceneT>60&&sceneT<110?Math.round(rnd(-3,3)):0;
  MUTF.look.pix='vilao'+st;MUTF.state='idle';MUTF.t=sceneT;MUTF.pxMul=st<3?1.25:1;MUTF.x=0;MUTF.y=215;MUTF.z=0;
  drawEntity(MUTF,W/2+sh,222);
  if(STAGE>1&&sceneT>=100&&sceneT<125){ctx.globalAlpha=1-(sceneT-100)/25;R(0,0,W,H,'#fff');ctx.globalAlpha=1;}
  outlineText('FASE '+STAGE+' — '+SG().bar,W/2,22,12,'#ffe066','#000',4);
  const msg=STAGE===1?'TIGAS':(sceneT<110?'TIGAS ESTÁ MUTANDO...':'TIGAS — FORMA '+['','HUMANA','POSSUÍDA','METADE DEMÔNIO','DEMÔNIO','DEMONIÃO GORDO'][STAGE].toUpperCase());
  outlineText(msg,W/2,46,sceneT>=110||STAGE===1?14:8,STAGE===1||sceneT<110?'#ffffff':'#ff4a3a','#000',4);
  txt('▲▼ ESCOLHER FASE  '+[1,2,3,4,5].map(n=>n===STAGE?'['+n+']':n).join(' '),W/2,232,8,'#8ad0ff','center');
  if(sceneT>60&&Math.floor(sceneT/30)%2===0)outlineText('ENTER',W/2,250,8,'#ffffff','#000',3);
}
function updStory(){
  t60++;sceneT++;cam=(cam+.3)%1800;
  const total=storyLines().join('').length+60;
  if(prsAny('start')||prsAny('punch')||prsAny('jump')){if(sceneT*0.6<total-60)sceneT=Math.ceil(total/0.6);else{scene='play';startStage();sfx('confirm');}}
}
function drawStory(){
  drawBG();R(0,0,W,H,'rgba(0,0,0,.75)');
  let n=Math.floor(sceneT*.6);
  const STORY=storyLines();
  for(let i=0;i<STORY.length;i++){const s=STORY[i].slice(0,Math.max(0,n));n-=STORY[i].length;txt(s,32,52+i*20,8,i>=4?'#ffe066':'#ffffff');}
  const T=teamLooks();
  T.forEach((L,i)=>{const f=T.length>1?STORYF[i]:selF[selChar];f.look=L;f.state='walk';f.t=sceneT;f.atk=null;FRAME.walkers.push(L.pix);
    const wx=Math.min(400-i*44,-20-i*44+sceneT*1.2);drawShadow(wx,200+i*10,0,1.6);drawFighterAt(f,wx,200+i*10,1.6);});
  if(Math.floor(sceneT/30)%2===0)txt('ENTER ►',W-16,H-20,8,'#8890b0','right');
}
function updShop(){
  t60++;const sh=shop,S=SHOPS[sh.i],p=players[sh.by]||players[0];if(sh.msgT>0)sh.msgT--;useIn(sh.by);
  if(fade){fade.t++;if(fade.t===18)runFade();if(fade.t>=36)fade=null;return;}
  if(sh.confirm){
    if(prs.left||prs.right){sh.yes=!sh.yes;sfx('select');}
    if(prs.kick||prs.pause){sh.confirm=false;}
    else if(prs.punch||prs.start||prs.jump){
      sh.confirm=false;
      if(sh.yes){const [nm,price,ef]=S.items[sh.sel];
        if(p.money+1e-9<price){sh.msg='SEM GRANA, TCHÊ!';sh.msgT=90;sfx('block');}
        else{p.money=Math.round((p.money-price)*100)/100;const out=[];
          if(ef.hp){const h=Math.min(ef.hp,p.maxHp-p.hp);p.hp+=h;out.push('+'+(ef.hp>=999?'TUDO':ef.hp)+' HP');}
          if(ef.gp){p.gp=Math.min(p.maxGp,p.gp+ef.gp);out.push('+'+(ef.gp>=999?'TUDO':ef.gp)+' GP');}
          if(ef.str){p.atkBonus+=ef.str;out.push('+FOR');}if(ef.def){p.def+=ef.def;out.push('+DEF');}if(ef.spd){p.spd+=ef.spd;out.push('+VEL');}
          sh.msg=out.join(' ');sh.msgT=90;sfx('food');}}
    }
    return;
  }
  if(prs.up){sh.sel=(sh.sel+S.items.length-1)%S.items.length;sfx('select');}
  if(prs.down){sh.sel=(sh.sel+1)%S.items.length;sfx('select');}
  if(prs.punch||prs.start||prs.jump){sh.confirm=true;sh.yes=true;sfx('select');}
  if(prs.kick||prs.pause){doFade('shopOut',{by:sh.by});}
}
function drawShop(){
  const sh=shop;if(!sh){drawWorld();drawHUD();drawFade();return;}
  const S=SHOPS[sh.i],p=players[sh.by]||players[0];
  R(0,0,W,H,'#2a1810');for(let x=0;x<W;x+=16)R(x,0,1,170,'#22140c');
  for(let k=0;k<3;k++){R(20,40+k*36,280,4,'#6a4026');for(let j=0;j<9;j++)R(28+j*30,22+k*36,14,18,['#e8e0d0','#c03a3a','#3a8a5a','#e0b030'][(j+k)%4]);}
  R(0,170,W,100,'#4a2a18');for(let y=174;y<H;y+=12)R(0,y,W,1,'#3a2010');
  R(40,140,260,40,'#6a3a20');R(40,138,260,4,'#a06a3a');
  const keeper={look:Object.assign({},BASE,{head:'ponytail',torso:'tee33x',top:'#e8e0d0',topD:'#c8c0b0',hair:'#3a2010',skin:'#e8b896',skinD:'#c08e6e'}),facing:-1,state:'idle',t:t60,scale:1.4};
  drawFighterAt(keeper,230,140);R(196,120,60,20,'#6a3a20');R(196,118,60,3,'#a06a3a');
  const me={look:p.look,facing:1,state:'idle',t:t60,scale:1.5};drawShadow(110,232,0,1.5);drawFighterAt(me,110,232);
  if(Math.floor(t60/40)%2){R(236,74,14,12,'#fff');txt('...',237,76,8,'#333');}
  // left panel
  R(8,8,126,78,'#000');R(9,9,124,76,'#f0e0c0');R(9,9,124,3,'#c0201a');
  drawPortrait(p.look,14,16,24);txt(p.look.name,44,16,8,'#2a1a10',null,false);
  txt('HP '+Math.ceil(p.hp)+'/'+p.maxHp,44,30,8,'#c02a3a',null,false);txt('GP '+Math.floor(p.gp),44,42,8,'#d07a10',null,false);
  coinIcon(14,56);txt(money(p.money),24,55,8,'#2a1a10',null,false);
  txt('FOR'+(5+p.atkBonus)+' DEF'+(5+p.def)+' VEL'+(5+p.spd),14,70,8,'#5a3a20',null,false);
  // menu
  const mx=226,my=96;R(mx-2,my-2,250,158,'#000');R(mx,my,246,154,'#14101a');R(mx,my,246,16,'#f0e0c0');txt(S.name,mx+6,my+4,8,'#2a1a10',null,false);
  S.items.forEach(([nm,pr],i)=>{const y=my+22+i*16,sel=i===sh.sel;if(sel)R(mx+2,y-2,242,13,'#d02a6a');
    txt(nm,mx+8,y,8,sel?'#fff':'#e8e0d0',null,false);coinIcon(mx+186,y);txt(pr.toFixed(2).replace('.',','),mx+240,y,8,sel?'#fff':'#ffe066','right',false);});
  const ef=S.items[sh.sel][2];const desc=[ef.hp&&('+'+(ef.hp>=999?'TUDO':ef.hp)+' HP'),ef.gp&&('+'+(ef.gp>=999?'TUDO':ef.gp)+' GP'),ef.str&&'+FOR',ef.def&&'+DEF',ef.spd&&'+VEL'].filter(Boolean).join(' ');
  txt(desc,mx+8,my+108,8,'#8ad0ff',null,false);
  if(sh.confirm){txt('É isso que você quer?',mx+8,my+122,8,'#fff',null,false);
    txt((sh.yes?'► ':'  ')+'SIM',mx+30,my+138,8,sh.yes?'#ffe066':'#888',null,false);txt((!sh.yes?'► ':'  ')+'NÃO',mx+130,my+138,8,!sh.yes?'#ffe066':'#888',null,false);}
  else txt(isTouch?'SOCO COMPRA • CHUTE SAI':'J/ENTER COMPRA • K SAI',mx+8,my+132,8,'#8890b0',null,false);
  if(sh.msgT>0)outlineText(sh.msg,110,150,8,sh.msg.startsWith('SEM')?'#ff6a6a':'#7aff8a','#000',3);
  drawFade();
}
let pauseAsk=null;
function coop(){return NET.role!=='off';}
function resumeGame(){if(NET.role==='guest'){NET.myPause=null;netData({resume:1});return;}scene='play';stop=null;}
function updPause(){if(keyCap)return;if(stop&&stop.by!==LOCAL)return;if(NET.role==='guest'&&!myPauseOn())return;const n=EDITACTS.length+(coop()?3:2);
  if(pauseAsk){if(prs.left||prs.right){pauseAsk.yes=!pauseAsk.yes;sfx('select');}
    if(prs.start||prs.punch){const y=pauseAsk.yes;pauseAsk=null;if(y)netLeave();}
    else if(prs.pause||prs.kick)pauseAsk=null;return;}
  if(prs.pause){resumeGame();return;}
  if(prs.up){pauseSel=(pauseSel+n-1)%n;sfx('select');}if(prs.down){pauseSel=(pauseSel+1)%n;sfx('select');}
  if(prs.start||prs.punch){if(pauseSel<EDITACTS.length){keyCap=EDITACTS[pauseSel][0];sfx('select');}
    else if(pauseSel===EDITACTS.length){for(const k in KEYMAP)delete KEYMAP[k];Object.assign(KEYMAP,DEFKEYS);saveKeys();sfx('confirm');}
    else if(pauseSel===EDITACTS.length+1)resumeGame();
    else{pauseAsk={yes:false};sfx('select');}}}
function drawPause(){
  drawWorld();drawHUD();R(0,0,W,H,'rgba(0,0,10,.9)');
  outlineText('PAUSA',W/2,22,16,'#ffffff','#a01010',4);
  txt('EDITAR BOTÕES (TECLADO)',W/2,40,8,'#8ad0ff','center');
  const n=EDITACTS.length,y0=56;
  EDITACTS.forEach(([a,l],i)=>{const y=y0+i*15,on=i===pauseSel;if(on)R(70,y-3,340,14,'rgba(255,224,102,.18)');
    txt((on?'► ':'  ')+l,80,y,8,on?'#ffe066':'#c8d0e8');
    const v=keyCap===a?(Math.floor(t60/15)%2?'APERTE UMA TECLA...':''):keysOf(a).map(keyName).join(' / ');
    txt(v,400,y,8,keyCap===a?'#ff8a5a':'#ffffff','right');});
  const yA=y0+n*15+4;
  [['RESTAURAR PADRÃO','#ff9a9a'],['VOLTAR AO JOGO','#7aff9a']].concat(coop()?[['SAIR DA SALA','#ff6a6a']]:[]).forEach(([l,c],k)=>{const on=pauseSel===n+k;if(on)R(70,yA+k*15-3,340,14,'rgba(255,224,102,.18)');txt((on?'► ':'  ')+l,80,yA+k*15,8,on?'#ffe066':c);});
  if(pauseAsk){R(120,96,240,70,'#000');R(122,98,236,66,'#2a0a14');outlineText('SAIR DA SALA?',W/2,114,8,'#ffffff','#000',3);
    txt((pauseAsk.yes?'► ':'  ')+'SIM',190,140,8,pauseAsk.yes?'#ffe066':'#888','center');txt((!pauseAsk.yes?'► ':'  ')+'NÃO',290,140,8,!pauseAsk.yes?'#ffe066':'#888','center');}
  txt(keyCap?'ESC = CANCELAR':'▲▼ ESCOLHER • ENTER EDITAR • '+keysOf('pause').map(keyName).join('/')+' VOLTA • M = SOM',W/2,256,8,'#8890b0','center');
}
function updOver(){t60++;sceneT++;if(sceneT>60&&(prsAny('start')||prsAny('punch'))){scene='play';startStage();}}
function drawOver(){drawWorld();R(0,0,W,H,'rgba(40,0,0,.7)');outlineText('FIM DE JOGO',W/2,110,16,'#ffffff','#a01010',4);
  if(sceneT>60&&Math.floor(sceneT/30)%2===0)txt('ENTER PARA TENTAR DE NOVO',W/2,140,8,'#ffe066','center');}

// ---------- SHOW FINAL NO CASTIGO ----------
let SHOW=null;
const MUSIC_SLOTS={vocal:{x:300,y:150,mul:1.15,role:'vocal'},guitar:{x:226,y:152,mul:1.1,role:'gtr'},guitar2:{x:376,y:152,mul:1.1,role:'gtr'},
  baixo:{x:446,y:152,mul:1.1,role:'bass'},batera:{x:318,y:118,mul:1.0,role:'drums'},dj:{x:186,y:120,mul:1.0,role:'dj'}};
const CROWD_SLOTS={rub:{x:58,y:232},angelo:{x:104,y:224},feijao:{x:150,y:236}};
function slotKey(look){const p=look.pix;if(p.indexOf('rub_')===0)return'rub';return p;}
function showInit(){
  const T=teamLooks(),mks=T.map(slotKey);
  const band=[];
  for(const L of BANDLOOKS){const k=slotKey(L);if(mks.includes(k))continue;
    const sl=MUSIC_SLOTS[k]||CROWD_SLOTS[k];if(!sl)continue;band.push({look:L,k,sl,f:newFighter({look:L,facing:-1})});}
  SHOW={band,me:T.map((L,i)=>({look:L,k:mks[i],sl:MUSIC_SLOTS[mks[i]]||CROWD_SLOTS[mks[i]],f:newFighter({look:L,facing:1}),x:-20-i*34,y:226,phase:'walk',t:0})),t:0,conf:[]};
  sfx('level');crowdCheer();
}
window.__sub=()=>{enemies=[];lock=null;trigIdx=trigs.findIndex(t=>t.boss&&t.boss!=='drunk');player.x=2960;player.y=215;cam=2820;};window.__vom=()=>{if(bossRef){bossRef.cd=999;bossRef.facing=-1;startAttack(bossRef,'dVomit');}};window.__run=()=>{runT=419;};window.__dbg=()=>JSON.stringify({r:runner&&{p:runner.phase,x:Math.round(runner.x),y:runner.y,t:runner.t},runT,cam:Math.round(cam),px:Math.round(player.x),st:player.stunT,hs:hitstop,sc:scene});window.__pow=(i)=>{chosenLook=BANDLOOKS[i];STAGE=1;scene='play';startStage();player.x=200;cam=40;trigIdx=99;for(const t of ['punk','garota','brute','punk']){const e=spawn(t,Math.random()<.5?1:-1);e.x=cam+80+Math.random()*320;e.y=YMIN+Math.random()*(YMAX-YMIN);}};window.__act=()=>activateMask(player);window.__stage=(n,i)=>{chosenLook=BANDLOOKS[i];STAGE=n;scene='mut';sceneT=0;};window.__play=()=>{scene='play';startStage();};window.__show=()=>{showInit();scene='show';sceneT=0;};window.__win=()=>{winT=1;};window.__bar=()=>{enemies=[];lock=null;trigIdx=trigs.length-1;player.x=3480;player.y=215;cam=3320;};
function updShow(){
  t60++;sceneT++;if(fade){fade.t++;if(fade.t>=36)fade=null;}const S=SHOW;if(!S)return;S.t++;
  for(const m of S.me){m.t++;
  if(m.phase==='walk'){const tx=m.sl.x,ty=MUSIC_SLOTS[m.k]?232:m.sl.y;
    const dx=tx-m.x,dy=ty-m.y;const d=Math.hypot(dx,dy);
    if(d<2){if(MUSIC_SLOTS[m.k]){m.phase='hop';m.t=0;m.x0=m.x;m.y0=m.y;}else{m.phase='play';m.t=0;crowdCheer();}}
    else{m.x+=dx/d*1.6;m.y+=dy/d*1.6;}}
  else if(m.phase==='hop'){const k=Math.min(1,m.t/26);m.x=m.x0+(m.sl.x-m.x0)*k;m.y=m.y0+(m.sl.y-m.y0)*k;m.z=Math.sin(k*Math.PI)*34;
    if(k>=1){m.phase='play';m.t=0;m.z=0;crowdCheer();shakeT=6;shakeM=2;}}}
  if(S.t%150===0)crowdCheer();
  if(S.t%4===0&&S.conf.length<90)S.conf.push({x:rnd(0,W),y:-6,vy:rnd(.6,1.4),vx:rnd(-.4,.4),c:pick(['#ff5ad0','#ffe066','#4ae0ff','#7aff7a','#ffffff'])});
  for(const c of S.conf){c.x+=c.vx;c.y+=c.vy;}S.conf=S.conf.filter(c=>c.y<H+4);
  selLightT=12+(S.t%40<6?0:30);
  if((prsAny('start')||prsAny('punch')||prsAny('jump'))&&S.t>200){scene='clear';sceneT=0;sfx('confirm');}
  if(S.t>1500){scene='clear';sceneT=0;}
}
function fistAt(f,fn,x,y,mul,back){const P_=PSPR[f.look.pix];const px=mul/1.2;const fp=(back?P_.bfist:P_.fist)[fn];if(!fp)return[x,y-30];
  return[x+(fp[0]-P_.ax)*px*(f.facing||1),y+(fp[1]-P_.ay)*px];}
function drawInstr(f,x,y,mul,key,playing){
  const G=SIGIMG[key];if(!G||!G.img.complete)return;const px=mul/1.2,fc=f.facing||1;
  const B0=ctx.getTransform().inverse();ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.scale(fc,1);
  ctx.translate((key==='bass'?-6:-6)*px,(key==='bass'?-40:-30)*px+(playing?Math.sin(t60/3)*.6:0));ctx.rotate(key==='bass'?-.55:-.5);const sc=px*(key==='bass'?.82:.86);ctx.scale(-sc,sc);
  ctx.drawImage(G.img,-(G.w-16),-G.h/2);
  const A=instAnchors(key,G);if(A){const m=B0.multiply(ctx.getTransform()),mp=(ix,iy)=>{const lx=ix-(G.w-16),ly=iy-G.h/2;return[m.a*lx+m.c*ly+m.e,m.b*lx+m.d*ly+m.f];};
    ctx.restore();return;}
  ctx.restore();}
const INSTA={};
function instAnchors(key,G){if(INSTA[key]!==undefined)return INSTA[key];try{const c=document.createElement('canvas');c.width=G.w;c.height=G.h;const g=c.getContext('2d');g.drawImage(G.img,0,0);const d=g.getImageData(0,0,G.w,G.h).data;
    const col=[];let x0=G.w,x1=0;for(let x=0;x<G.w;x++){let n=0,ys=0;for(let y=0;y<G.h;y++)if(d[(y*G.w+x)*4+3]>40){n++;ys+=y;}col.push([n,n?ys/n:0]);if(n){x0=Math.min(x0,x);x1=Math.max(x1,x);}}
    let bx=x0;for(let x=x0;x<=x1;x++)if(col[x][0]>col[bx][0])bx=x;const nx=Math.abs(bx-x0)>Math.abs(bx-x1)?x0:x1;
    const fx=Math.round(bx+(nx-bx)*.62);const sx_=Math.round(bx+(nx-bx)*.08);
    INSTA[key]={bx:sx_,by:col[sx_][1]||G.h/2,nx:fx,ny:col[fx][1]||G.h/2};}catch(_){INSTA[key]=null;}return INSTA[key];}
function drawGuitarArms(f,x,y,px,body,neck,playing){const L=f.look,fc=f.facing||1;
  const sleeve=L.pix==='guitar2'?'#18181c':L.pix==='baixo'?(L.skin||'#d89c78'):(L.torso==='jersey'||L.torso==='tank')?L.skin:(L.top||'#222'),sk=L.skin||'#e0a884',ink='#120a0c';
  const shY=y-44*px,sh1=[x+fc*5*px,shY],sh2=[x-fc*5*px,shY];
  const bodyNear=Math.abs(body[0]-sh1[0])<Math.abs(body[0]-sh2[0]);const sb=bodyNear?sh1:sh2,sn=bodyNear?sh2:sh1;
  const st=playing?Math.sin(t60/2.2)*2.2*px:0;const hb=[body[0],body[1]+st];
  const arm=(s,h,drop)=>{const e=[(s[0]+h[0])/2,(s[1]+h[1])/2+drop*px];
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=ink;ctx.lineWidth=5.6*px;ctx.beginPath();ctx.moveTo(s[0],s[1]);ctx.lineTo(e[0],e[1]);ctx.lineTo(h[0],h[1]);ctx.stroke();
    ctx.strokeStyle=sleeve;ctx.lineWidth=3.8*px;ctx.beginPath();ctx.moveTo(s[0],s[1]);ctx.lineTo(e[0],e[1]);ctx.lineTo(h[0],h[1]);ctx.stroke();
    ctx.fillStyle=ink;ctx.beginPath();ctx.arc(h[0],h[1],2.9*px,0,7);ctx.fill();ctx.fillStyle=sk;ctx.beginPath();ctx.arc(h[0],h[1],2.1*px,0,7);ctx.fill();ctx.lineCap='butt';};
  arm(sn,neck,7);arm(sb,hb,5);}
function drawPerf(o,x,y,mul,role,t,playing){
  const f=o.f;f.t=t;let fn='idle0';
  if(!playing){fn=null;}
  else if(role==='gtr'||role==='bass')fn=(Math.floor(t/7)%2)?'play':'play2';
  else if(role==='vocal')fn=(Math.floor(t/22)%3===2)?'idle1':'punch2';
  else if(role==='drums')fn=(Math.floor(t/5)%2)?'punch':'punchB';
  else if(role==='dj')fn=(Math.floor(t/14)%2)?'idle0':'walk1';
  f.forceFrame=fn;f.state=fn?'idle':'walk';
  const bob=playing?Math.abs(Math.sin(t/7))*1.5:0;
  if(role==='drums'){drawFighterAt(f,x,y-bob,mul);
    const [ax,ay]=fistAt(f,fn,x,y-bob,mul,true),[bx,by]=fistAt(f,fn,x,y-bob,mul,false);const S_=SIGIMG.sticks;
    if(S_&&S_.img.complete)for(const [px_,py_,a] of [[ax,ay,fn==='punchB'?-2.6:-2.0],[bx,by,fn==='punch'?-2.6:-2.0]]){ctx.save();ctx.translate(px_,py_);ctx.rotate(a);ctx.drawImage(S_.img,-S_.gx,-S_.gy);ctx.restore();}
    // bateria na frente
    const dx=x-26;ctx.fillStyle='#14060f';ctx.beginPath();ctx.arc(dx+26,y-12,15,0,7);ctx.fill();ctx.fillStyle='#c02a3a';ctx.beginPath();ctx.arc(dx+26,y-12,13,0,7);ctx.fill();
    ctx.fillStyle='#f0e8e0';ctx.beginPath();ctx.arc(dx+26,y-12,9,0,7);ctx.fill();ctx.font='8px '+PIX;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#14060f';ctx.fillText('00',dx+26,y-12);
    R(dx+2,y-30,16,8,'#c02a3a');R(dx+36,y-30,16,8,'#c02a3a');R(dx-8,y-44+(t%10<5?1:0),22,2,'#e8d070');R(dx+44,y-42+(t%10>=5?1:0),20,2,'#e8d070');
    R(dx+2,y-44,1,14,'#888');R(dx+53,y-42,1,12,'#888');return;}
  if(role==='dj'){drawFighterAt(f,x,y-bob,mul);
    R(x-30,y-26,60,4,'#2a2a34');R(x-28,y-22,56,22,'#14141a');
    for(const k of[-14,14]){ctx.fillStyle='#000';ctx.beginPath();ctx.arc(x+k,y-26,8,0,7);ctx.fill();ctx.strokeStyle='#555';ctx.beginPath();ctx.arc(x+k,y-26,6,t/4,t/4+4);ctx.stroke();R(x+k-1,y-27,2,2,'#d02a30');}
    glow(x,y-14,26,'rgba(190,90,255,1)',.4);return;}
  if(role==='vocal'){R(x-10*(f.facing||1),y-40,1,40,'#9a9aa8');R(x-10*(f.facing||1)-4,y-1,9,2,'#555');}
  drawFighterAt(f,x,y-bob,mul);
  if(role==='gtr'||role==='bass'){drawInstr(f,x,y-bob,mul,role==='bass'?'bass':f.look.pix==='guitar2'?'guitar2':'guitar',playing);if(fn){f.forceFrame=fn+'A';drawFighterAt(f,x,y-bob,mul);f.forceFrame=fn;}}
  if(role==='vocal'&&fn){const [mx,my]=fistAt(f,fn,x,y-bob,mul,false);const M_=SIGIMG.mic;if(M_&&M_.img.complete){ctx.save();ctx.translate(mx,my);ctx.rotate(-1.75*(f.facing||1));ctx.drawImage(M_.img,-M_.gx,-M_.gy);ctx.restore();}}
}
function drawShow(){
  const S=SHOW;if(!S)return;const t=S.t;
  R(0,0,W,H,'#1c0818');
  for(let y=4;y<150;y+=8)for(let x=((y/8)%2)*12;x<W;x+=24)R(x,y,22,6,'#2a0e24');
  R(0,0,W,40,'#10040c');
  for(let k=0;k<40;k++){const hx=4+k*12,b=Math.floor((t/6+k*3)%8)<4?0:3;R(hx,16+b,8,8,['#f0c8a8','#c98e64','#e8b896','#8f5d3d'][k%4]);R(hx-1,24+b,10,14,['#1a1a22','#c03a5a','#2a2a3a','#555'][(k*5)%4]);}
  R(0,36,W,5,'#5a3a20');
  const on=Math.floor(t/12)%10!==0;ctx.font='16px '+PIX;ctx.textAlign='center';ctx.textBaseline='middle';
  R(W/2-90,46,180,24,'#10040c');ctx.fillStyle=on?'#ff5ad0':'#4a1a40';ctx.fillText(SG().bar,W/2+30,58);
  if(on){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.5;ctx.fillText(SG().bar,W/2+30,58);ctx.restore();glow(W/2+30,58,110,'rgba(255,80,210,1)',.4);}
  // palco
  R(120,150,W-120,14,'#26203a');R(120,148,W-120,3,'#8a8ab0');R(120,164,W-120,6,'#0c0810');
  for(const ax of [128,W-40]){R(ax,96,34,54,'#0e0e12');for(let r=0;r<3;r++){ctx.fillStyle='#24242e';ctx.beginPath();ctx.arc(ax+17,106+r*15,6,0,7);ctx.fill();}}
  // canhões de luz
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let k=0;k<5;k++){const hue=(t*3+k*70)%360,lx=150+k*75,sw=Math.sin(t/30+k)*60;ctx.fillStyle='hsla('+hue+',90%,60%,.13)';
    ctx.beginPath();ctx.moveTo(lx-4,40);ctx.lineTo(lx+sw-34,170);ctx.lineTo(lx+sw+34,170);ctx.lineTo(lx+4,40);ctx.fill();}
  if(t%40<4){ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(0,0,W,H);}
  ctx.restore();
  // pista
  for(let r=0;r<7;r++)for(let c=0;c<21;c++){R(c*24,170+r*15,24,15,((c+r)%2)?'#2a1c34':'#16101e');}
  // banda (de trás pra frente)
  const all=S.band.slice();
  const list=all.map(o=>({o,x:o.sl.x,y:o.sl.y,z:0,mul:o.sl.mul||1.1,role:o.sl.role||'crowd',playing:true,t:t+o.sl.x}));
  for(const m of S.me)list.push({o:m,x:m.x,y:m.y,z:m.z||0,mul:(m.sl.mul||1.1),role:m.sl.role||'crowd',playing:m.phase==='play',t:m.t,me:true});
  list.sort((a,b)=>a.y-b.y);
  for(const it of list){
    if(it.role==='crowd'){const f=it.o.f;f.facing=1;const jz=it.playing?Math.abs(Math.sin((it.t)/9))*12:0;
      f.forceFrame=it.playing?(jz>4?'jump':'punch2'):null;f.state=it.playing?'idle':'walk';f.t=it.t;
      drawShadow(it.x,it.y,0,1.2);drawFighterAt(f,it.x,it.y-jz,1.2);continue;}
    if(it.me&&!it.playing){const f=it.o.f;f.facing=1;f.forceFrame=it.o.phase==='hop'?'jump':null;f.state='walk';f.t=it.o.t;drawShadow(it.x,it.y,0,1.2);drawFighterAt(f,it.x,it.y-it.z,1.2);continue;}
    it.o.f.facing=-1;drawPerf(it.o,it.x,it.y,it.mul,it.role,it.t,true);
  }
  // notas musicais
  for(let k=0;k<6;k++){const nx=(k*83+t*1.3)%W,ny=150-((t*0.8+k*40)%120);ctx.fillStyle=['#ffe066','#ff5ad0','#4ae0ff'][k%3];ctx.globalAlpha=.8;ctx.font='8px '+PIX;ctx.fillText('♪',nx,ny);ctx.globalAlpha=1;}
  drawCrowd();
  for(const c of S.conf)R(Math.round(c.x),Math.round(c.y),2,3,c.c);
  if(t>60){const k=Math.min(1,(t-60)/14);ctx.save();ctx.translate(W/2,200);ctx.scale(k,k);pixTitle('AO VIVO!',0,0,24);ctx.restore();}
  if(t>200&&Math.floor(t/30)%2===0)outlineText(isTouch?'TOQUE PARA CONTINUAR':'ENTER ► CONTINUAR',W/2,H-10,8,'#ffffff','#000',3);
  drawFade();
}
function updClear(){
  t60++;sceneT++;updParts();updItems();
  for(const it of items)if(it.kind==='coin'&&it.t>30){const A=act().length?act():players;const q=A.reduce((a,b)=>Math.abs(b.x-it.x)<Math.abs(a.x-it.x)?b:a);q.money+=it.val;it.gone=true;}
  if(sceneT>120&&(prsAny('start')||prsAny('punch'))){if(STAGE<5){STAGE++;scene='mut';}else{STAGE=1;if(NET.role==='host'&&NET.peer==='here')toSelect();else scene='title';}sceneT=0;}
}
// 2 players: one card per player (own money), then KO, XP and time for the team
function drawClearTeam(team){
  team.forEach((p,i)=>{const cx=i?W/2+10:W/2-190,cy=76;R(cx-2,cy-2,184,54,'#000');
    for(let y=0;y<50;y+=10)for(let x=0;x<180;x+=10)R(cx+x,cy+y,10,10,((x+y)/10)%2?'#f0d890':'#e8c870');
    R(cx,cy,180,3,p.slot?'#2a7ad0':'#c0201a');drawPortrait(p.look,cx+8,cy+10,30);
    outlineText(p.look.name,cx+108,cy+16,8,'#fff','#000',3);
    if(sceneT>40){R(cx+46,cy+30,128,13,'#1a1a2a');txt('R$',cx+50,cy+33,8,'#ffe066');txt(money(p.money).slice(3),cx+170,cy+33,8,'#ffffff','right');}});
  const s=Math.floor(playTime/60),tx=W/2-80,ty=138;
  const rows=[['KO',String(kills)],['XP',String(totalXp)],['TEMPO',Math.floor(s/60)+':'+String(s%60).padStart(2,'0')]];
  R(tx-2,ty-2,164,56,'#000');R(tx,ty,160,52,'#2a1a3a');
  rows.forEach(([a,b],i)=>{if(sceneT>52+i*12){R(tx+4,ty+4+i*16,152,13,'#1a1a2a');txt(a,tx+8,ty+7+i*16,8,'#ffe066');txt(b,tx+150,ty+7+i*16,8,'#ffffff','right');}});}
function drawClear(){
  drawWorld();
  const k=Math.min(1,sceneT/30);R(0,0,W,H,'rgba(0,0,20,'+(.6*k)+')');
  if(sceneT<20)return;
  const g=ctx.createLinearGradient(0,30,0,62);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#6ab0ff');
  const pop=Math.min(1,(sceneT-20)/10);ctx.save();ctx.translate(W/2,46);ctx.scale(pop,pop);
  ctx.font='24px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=7;ctx.strokeStyle='#0a1a40';ctx.lineJoin='round';
  ctx.strokeText('ÁREA LIMPA!!!',0,0);ctx.fillStyle=g;ctx.fillText('ÁREA LIMPA!!!',0,0);ctx.restore();
  const team=players.filter(p=>!p.left);
  if(team.length>1)drawClearTeam(team);else{const pl=team[0]||player;
  const cx=W/2-90,cy=78;R(cx-2,cy-2,184,104,'#000');
  for(let y=0;y<100;y+=10)for(let x=0;x<180;x+=10)R(cx+x,cy+y,10,10,((x+y)/10)%2?'#f0d890':'#e8c870');
  R(cx,cy,180,3,'#c0201a');
  drawPortrait(pl.look,cx+8,cy+10,30);
  outlineText(pl.look.name,cx+100,cy+18,8,'#fff','#000',3);
  const s=Math.floor(playTime/60);
  const rows=[['KO',String(kills)],['XP',String(totalXp)],['R$',money(pl.money).slice(3)],['TEMPO',Math.floor(s/60)+':'+String(s%60).padStart(2,'0')]];
  rows.forEach(([a,b],i)=>{if(sceneT>40+i*12){R(cx+46,cy+30+i*16,128,13,'#1a1a2a');txt(a,cx+50,cy+33+i*16,8,'#ffe066');txt(b,cx+170,cy+33+i*16,8,'#ffffff','right');}});}
  if(sceneT>120){outlineText(STAGE<5?'PRÓXIMA: '+STAGES[STAGE].bar:'VOCÊ ZEROU O JOGO!',W/2,206,8,'#8ad0ff','#000',3);if(Math.floor(sceneT/30)%2===0)outlineText('ENTER',W/2,226,8,'#ffffff','#000',3);}
}

// ---------- online co-op ----------
// The room creator's game is the real one (host). The friend's game (guest) sends its button presses
// and draws the game state the host sends 30 times a second. Room server rules: server/protocol.js.
const VERSION='dev'; // set when deploying (both players must have the same version)
const NAME_MAX=16; // room names: same rules as cleanName() in server/protocol.js
const ROOM_NAMES=['PORÃO DO METAL','GARAGEM DO ROCK','RODA PUNK','BATE CABEÇA','PALCO PRINCIPAL','ENSAIO GERAL','CAMARIM','TURNÊ ZEROZERO',
  'SOM NA CAIXA','AMPLI NO TALO','MOSH PIT','ESTÚDIO 00','BACKSTAGE','RIFF PESADO','PANCADARIA','SALA DO RUBÃO'];
const NETMSG={not_found:'SALA NÃO ENCONTRADA',full:'SALA CHEIA',started:'JOGO JÁ COMEÇOU',version:'VERSÃO DIFERENTE — RECARREGUE A PÁGINA',expired:'CONEXÃO PERDIDA'};
const NET={role:'off',code:null,name:null,peer:'none',ws:null,token:null,started:false,inbox:[],lost:false,lostT:0,connT:0,sent:new Set(),snapN:0,toast:null,clock:0,lastTap:null,myPause:null,
  peerZip:false,zbusy:0,zq:Promise.resolve(),uq:{n:0,p:Promise.resolve()},ready:[]};
let LOCAL=0;
const SHARED=new Set(['select','mut','story','play','shop','pause','gameover','clear','show']);
const PLAYSC=new Set(['play','shop','pause']);
function cleanName(s){return typeof s!=='string'?'':s.normalize('NFC').toUpperCase().replace(/\s+/g,' ').replace(/[^A-Z0-9À-ÖØ-Þ ]/g,'').replace(/ +/g,' ').trim().slice(0,NAME_MAX).trim();}
function wsUrl(path){const u=new URL(path,location.href);u.protocol=u.protocol==='http:'?'ws:':'wss:';return u.href;}
function ping(){return new Promise(res=>{let done=false,tm=null;const fin=v=>{if(done)return;done=true;if(tm)clearTimeout(tm);res(v);};
  tm=setTimeout(()=>fin('down'),8000);
  try{fetch('/api/ping',{cache:'no-store'}).then(r=>fin(r.status===429?'limit':r.ok?'ok':'down'),()=>fin('down'));}catch(e){fin('down');}});}
function offlineMsg(r){return r==='limit'?'MODO ONLINE ESGOTADO HOJE — TENTE AMANHÃ':'SEM CONEXÃO COM O SERVIDOR';}
// CRIAR SALA: the room name screen ('name'): a text box with a suggested name, 3 suggestions, CRIAR
function netCreate(){netMsg='CONECTANDO...';ping().then(r=>{if(scene!=='title')return;if(r!=='ok'){netMsg=offlineMsg(r);return;}nameOpen();});}
const NAMEF={order:[],i:0};
function nameOpen(){netMsg=null;scene='name';sceneT=0;const f=nameForm(),b=document.getElementById('roomName');
  const o=ROOM_NAMES.slice();for(let i=o.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[o[i],o[j]]=[o[j],o[i]];}
  NAMEF.order=o;NAMEF.i=0;f.querySelectorAll('.roomSug').forEach((s,k)=>{s.textContent=o[k];});
  nameUse(0);f.style.display='flex';if(!isTouch)try{b.focus();}catch(e){}}
function nameUse(i){const b=document.getElementById('roomName');NAMEF.i=i;b.value=NAMEF.order[i];try{b.setSelectionRange(0,b.value.length);}catch(e){}}
function nameStep(d){const n=NAMEF.order.length;nameUse((NAMEF.i+d+n)%n);sfx('select');}
function nameForm(){let f=document.getElementById('roomForm');if(f)return f;
  f=document.createElement('div');f.id='roomForm';
  f.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:none;flex-direction:column;align-items:center;gap:10px;z-index:50';
  const font="'Press Start 2P',monospace",b=document.createElement('input');
  b.id='roomName';b.type='text';b.maxLength=NAME_MAX;b.autocomplete='off';b.spellcheck=false;
  b.setAttribute('autocapitalize','characters');b.setAttribute('enterkeyhint','go');b.setAttribute('aria-label','Nome da sala');
  b.style.cssText="width:300px;max-width:84vw;font:14px "+font+";text-align:center;text-transform:uppercase;padding:10px;background:#140a1e;color:#ffe066;border:3px solid #ffe066;border-radius:6px;outline:none;-webkit-user-select:text;user-select:text";
  // typing a name must not move the game or mute the sound
  b.addEventListener('keydown',e=>{e.stopPropagation();const c=e.code||e.key;
    if(c==='Enter'||c==='NumpadEnter'||e.key==='Enter'){e.preventDefault();nameSubmit();}
    else if(c==='Escape'){e.preventDefault();nameBack();}
    else if(c==='ArrowDown'||c==='ArrowUp'){e.preventDefault();nameStep(c==='ArrowDown'?1:-1);}});
  b.addEventListener('keyup',e=>e.stopPropagation());
  // a tap on the box while it holds the suggestion selects it, so typing replaces it
  b.addEventListener('focus',()=>setTimeout(()=>{if(b.value===NAMEF.order[NAMEF.i])try{b.setSelectionRange(0,b.value.length);}catch(e){}},0));
  const btn="font:8px "+font+";padding:8px 10px;background:#2a1a46;color:#ffffff;border:2px solid #c8a8e8;border-radius:6px;cursor:pointer";
  const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:90vw';
  for(let k=0;k<3;k++){const s=document.createElement('button');s.type='button';s.className='roomSug';s.style.cssText=btn;
    s.addEventListener('click',e=>{e.preventDefault();nameUse(k);sfx('select');if(!isTouch)try{b.focus();}catch(_){}});row.appendChild(s);}
  const go=document.createElement('button');go.type='button';go.id='roomGo';go.textContent='CRIAR';
  go.style.cssText=btn.replace('#2a1a46','#a01010').replace('#c8a8e8','#ffe066')+';font-size:10px;padding:10px 22px';
  go.addEventListener('click',e=>{e.preventDefault();nameSubmit();});
  for(const el of [row,go])el.addEventListener('pointerdown',e=>e.stopPropagation());
  f.append(b,row,go);document.body.appendChild(f);return f;}
function nameSubmit(){if(NET.ws||scene!=='name')return;const b=document.getElementById('roomName');
  const n=cleanName(b.value)||NAMEF.order[NAMEF.i];sfx('confirm');try{b.blur();}catch(e){}
  netMsg='CRIANDO...';netOpen('/api/room/new?v='+VERSION+'&name='+encodeURIComponent(n));}
function nameBack(){netClose();netReset();toTitle();}
function syncForm(){const f=document.getElementById('roomForm');if(f)f.style.display=scene==='name'&&!NET.ws?'flex':'none';}
// ENTRAR NA SALA: the room list ('join'), asked from the server about every 2 seconds
const LIST={items:[],sel:0,loaded:false,busy:false,t:0};
function netJoinScreen(){netMsg='CONECTANDO...';ping().then(r=>{if(scene!=='title')return;if(r!=='ok'){netMsg=offlineMsg(r);return;}
  netMsg=null;scene='join';sceneT=0;LIST.items=[];LIST.sel=0;LIST.loaded=false;LIST.t=0;listAsk();});}
function listAsk(){if(LIST.busy)return;LIST.busy=true;LIST.t=0;
  const done=rooms=>{LIST.busy=false;if(scene!=='join')return;
    if(!rooms){if(!LIST.loaded&&NET.role==='off'){toTitle();netMsg='SEM CONEXÃO COM O SERVIDOR';}return;}
    const was=LIST.items[LIST.sel];LIST.items=rooms;LIST.loaded=true;
    const k=was?rooms.findIndex(r=>r.id===was.id):-1;LIST.sel=k>=0?k:Math.max(0,Math.min(LIST.sel,rooms.length-1));};
  try{fetch('/api/rooms',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>done(j&&Array.isArray(j.rooms)?j.rooms.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'):null),()=>done(null));}
  catch(e){done(null);}}
function listJoin(){const r=LIST.items[LIST.sel];if(!r||NET.ws)return;sfx('confirm');netMsg='ENTRANDO...';NET.name=r.name;
  netOpen('/api/room/'+encodeURIComponent(r.id)+'?v='+VERSION);}
function joinBack(){netClose();netReset();toTitle();}
function netOpen(path){netClose();let ws;try{ws=new WebSocket(wsUrl(path));}catch(e){NET.ws=null;NET.inbox.push({t:'_close',ws:null});return;}
  NET.ws=ws;NET.connT=0;
  ws.onmessage=ev=>{if(NET.ws!==ws)return;let m;try{m=JSON.parse(ev.data);}catch(_){return;}NET.inbox.push(m);};
  ws.onclose=()=>{if(NET.ws===ws)NET.inbox.push({t:'_close',ws});};
  ws.onerror=()=>{};}
function netClose(){const ws=NET.ws;NET.ws=null;if(ws){ws.onmessage=ws.onclose=ws.onerror=null;try{ws.close();}catch(_){}}}
function netSend(m){const ws=NET.ws;if(ws&&ws.readyState===1)try{ws.send(JSON.stringify(m));}catch(_){}}
function netData(d){netSend({t:'m',d});}
function netGoodbye(){if(NET.ws&&NET.role!=='off')netSend({t:'leave'});}
function netReset(){NET.peerZip=false;NET.ready.length=0;netClose();NET.role='off';NET.code=null;NET.name=null;NET.peer='none';NET.token=null;NET.started=false;NET.inbox.length=0;NET.lost=false;NET.sent.clear();LOCAL=0;stop=null;sfxRec=null;}
function toTitle(){scene='title';sceneT=0;party=[{slot:0,look:null}];menuSel=0;pauseAsk=null;shop=null;syncForm();}
function netLeave(){netSend({t:'leave'});netReset();toTitle();}
function netFail(msg){netReset();toTitle();netMsg=msg||'SEM CONEXÃO COM O SERVIDOR';}
function toSelect(){scene='select';sceneT=0;party=[{slot:0,look:null},{slot:1,look:null}];SELS=[{char:0,ok:false},{char:1,ok:false}];stop=null;shop=null;NET.sent.clear();}
function toRoomWait(){scene='room';sceneT=0;party=[{slot:0,look:null}];stop=null;}
// guest: send each button press to the host (with "double tap" worked out here, so network delay can't break running)
// guest: my own pause menu opens at once, before the host's game has stopped (it stops a few steps later)
function myPauseOn(){return NET.role==='guest'&&((scene==='pause'&&stop&&stop.by===LOCAL)||(NET.myPause!==null&&NET.clock-NET.myPause<60&&scene==='play'&&!stop));}
function netKey(a,v){if(NET.role!=='guest'||!SHARED.has(scene))return;
  if(myPauseOn())return; // my own pause menu works here only
  if(a==='pause'&&v&&scene==='play'&&!stop){NET.myPause=NET.clock;pauseSel=0;pauseAsk=null;IN[LOCAL].prs.pause=0;}
  let tap=0;
  if(v&&(a==='left'||a==='right'||a==='up'||a==='down')){const d={left:-1,right:1,up:-2,down:2}[a];
    tap=NET.lastTap&&NET.lastTap.d===d&&NET.clock-NET.lastTap.t<18?1:0;NET.lastTap={d,t:NET.clock};}
  netData({k:a,v,tap});}
function netTr(v){if(NET.role==='guest')netData({tr:v?1:0});}
function hostData(d){const I=IN[1];
  if(d.k&&ACTS.includes(d.k)){if(d.v){if(!I.held[d.k])I.prs[d.k]=1;I.held[d.k]=1;if(d.tap)I.dbl[d.k]=1;}else I.held[d.k]=0;}
  if(d.tr!==undefined)I.tr=!!d.tr;
  if(d.zip)NET.peerZip=true;
  if(d.resume&&stop&&stop.by===1&&scene==='pause'){scene='play';stop=null;}
  if(d.hide){const p=players[1];if(scene==='play'&&!stop&&p&&!p.out&&!p.left){scene='pause';stop={by:1,why:'pause'};}}}
// host: send the whole game to the guest every 2nd step
function netAfter(){if(sfxRec&&sfxRec.length>60)sfxRec.length=0;
  if(NET.role!=='host'||NET.peer!=='here'||!SHARED.has(scene))return;if((NET.snapN++)%2)return;netSnap();}
// gzip the game state when both browsers can (about 3x less data); messages stay in order through one queue
const ZIP=typeof CompressionStream==='function'&&typeof DecompressionStream==='function'&&typeof Response==='function'&&typeof TextEncoder==='function';
function b64(buf){const u=new Uint8Array(buf);let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s);}
function unb64(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;}
function zipStr(str){return new Response(new Response(new TextEncoder().encode(str)).body.pipeThrough(new CompressionStream('gzip'))).arrayBuffer().then(b64);}
function unzipStr(z){return new Response(new Response(unb64(z)).body.pipeThrough(new DecompressionStream('gzip'))).text();}
function netSnap(){if(NET.role!=='host')return;const zip=ZIP&&NET.peerZip;
  if(zip&&NET.zbusy>=3)return; // the gzip queue is behind: skip this one (the next one carries everything)
  const ctx={sent:NET.sent,L:{}};const s=encodeGraph(snapState(),ctx);const fx=sfxRec||[];sfxRec=[];
  if(!zip&&!NET.zbusy){netData({s,L:ctx.L,fx});return;}
  NET.zbusy++;const json=JSON.stringify(s);
  NET.zq=NET.zq.then(()=>zip?zipStr(json):null).then(z=>z?netData({z,L:ctx.L,fx}):netData({s,L:ctx.L,fx}),()=>netData({s,L:ctx.L,fx})).then(()=>{NET.zbusy--;});}
function guestSnap(d){ // a state message arrived on the guest
  if(d.z===undefined&&!NET.uq.n){NET.ready.push(d);return;}
  NET.uq.n++;NET.uq.p=NET.uq.p.then(()=>d.z!==undefined?unzipStr(d.z).then(t=>({s:JSON.parse(t),L:d.L,fx:d.fx})):d)
    .then(x=>{NET.ready.push(x);},()=>{}).then(()=>{NET.uq.n--;});}
function applySnap(d){addLooks(d.L);loadState(decodeGraph(d.s));if(scene!=='join')netMsg=null;for(const n of d.fx||[])sfx(n);}
function netPoll(){NET.clock++;if(NET.toast&&--NET.toast.t<=0)NET.toast=null;
  if(NET.ws&&NET.ws.readyState===0&&++NET.connT>480){const ws=NET.ws;ws.onmessage=ws.onclose=ws.onerror=null;try{ws.close();}catch(_){}NET.inbox.push({t:'_close',ws});}
  const box=NET.inbox.splice(0);
  for(const m of box){if(m.t==='m'&&m.d&&(m.d.s!==undefined||m.d.z!==undefined)){if(NET.role==='guest')guestSnap(m.d);continue;}
    netEvent(m);}
  if(NET.ready.length&&NET.role==='guest'){const R_=NET.ready.splice(0);let fx=[];for(const d of R_){addLooks(d.L);fx=fx.concat(d.fx||[]);}
    const last=R_[R_.length-1];last.fx=fx;applySnap(last);}
  if(NET.lost)netRetry();
  syncForm();}
function netEvent(m){const other=1-LOCAL;
  switch(m.t){
  case'hello':{const first=NET.code!==m.code;NET.token=m.token;NET.code=m.code;if(m.name)NET.name=m.name;NET.peer=m.peer;NET.lost=false;NET.lostT=0;
    if(m.slot===0){NET.role='host';LOCAL=0;sfxRec=sfxRec||[];
      if(first){scene='room';sceneT=0;netMsg=null;}else if(stop&&stop.why==='drop'&&stop.by===0)stop=null;
      if(m.peer==='here'&&scene==='room')toSelect();NET.sent.clear();}
    else{NET.role='guest';LOCAL=1;if(first)netMsg=m.peer==='drop'?'ESPERANDO JOGADOR 1...':'ENTRANDO...';if(ZIP)netData({zip:1});}
    break;}
  case'peer':
    if(m.ev==='join'||m.ev==='back'||m.ev==='drop')NET.peerZip=false;
    if(m.ev==='join'){NET.peer='here';if(NET.role==='host'&&scene==='room')toSelect();NET.sent.clear();}
    else if(m.ev==='drop'){NET.peer='drop';
      if(NET.role==='host'){ACTS.forEach(a=>{IN[1].held[a]=0;});IN[1].tr=false;const p=players[1];
        if(PLAYSC.has(scene)&&!(p&&p.out)&&!stop)stop={by:1,why:'drop'};}}
    else if(m.ev==='back'){NET.peer='here';NET.sent.clear();if(stop&&stop.why==='drop'&&stop.by===other)stop=null;
      if(NET.role==='guest'&&scene==='join')netMsg='ENTRANDO...';}
    else if(m.ev==='leave'){NET.peer='left';peerLeft(other);}
    break;
  case'closed':netFail('JOGADOR 1 SAIU — SALA FECHADA');break;
  case'err':{const msg=NETMSG[m.code]||'SEM CONEXÃO COM O SERVIDOR';
    if(NET.token){netFail(msg);break;}
    netClose();NET.role='off';LOCAL=0;if(scene==='join'){netMsg=msg;NET.name=null;listAsk();}else{toTitle();netMsg=msg;}break;}
  case'm':if(NET.role==='host'&&m.d)hostData(m.d);break;
  case'_close':
    if(m.ws!==NET.ws)break; // a connection we already closed or replaced
    NET.ws=null;
    if(NET.token&&NET.role!=='off'){if(!NET.lost){NET.lost=true;NET.lostT=0;}
      if(NET.role==='host'&&PLAYSC.has(scene)&&!stop)stop={by:0,why:'drop'};}
    else if(!NET.token){NET.role='off';LOCAL=0;NET.name=null;if(scene==='join')netMsg='SEM CONEXÃO COM O SERVIDOR';else{toTitle();netMsg='SEM CONEXÃO COM O SERVIDOR';}}
    break;
  }}
// lost connection: try to come back about once a second (15 s; a host waiting for player 2 tries for 10 min)
function netRetry(){NET.lostT++;const limit=(NET.role==='host'&&scene==='room')?36000:960;
  if(NET.lostT>limit){netFail('CONEXÃO PERDIDA');return;}
  if(!NET.ws&&NET.lostT%60===1)netOpen('/api/room/'+NET.code+'?v='+VERSION+'&token='+encodeURIComponent(NET.token));}
// the other player left for good
function peerLeft(s){
  if(!NET.started&&NET.role==='host'){toRoomWait();return;} // (a guest only hears 'leave' after the start)
  if(scene==='select'){NET.toast={v:'JOGADOR '+(s+1)+' SAIU',t:240};netLeave();return;}
  if(NET.role==='guest'){netSend({t:'leave'});netClose();NET.role='off';NET.token=null;sfxRec=null;} // the host left: this game goes on alone (D4)
  markLeft(s);}
function markLeft(s){const p=players[s];
  if(p&&!p.left){if(p.weapon){items.push({kind:'weapon',w:p.weapon.w,dur:p.weapon.dur,x:p.x,y:p.y,z:10,vz:2,vx:0,t:0});p.weapon=null;}
    releaseGrab(p);if(power&&power.by===s)endPower();p.left=true;for(const e of enemies||[])if(e.tgt===p)e.tgt=null;}
  if(party[s])party[s].left=true;
  if(stop&&stop.by===s){stop=null;if(scene==='pause'||scene==='shop'){scene='play';shop=null;}}
  if(scene==='play'&&players.length&&!act().length){scene='gameover';sceneT=0;}
  NET.toast={v:'JOGADOR '+(s+1)+' SAIU',t:240};}
// tab hidden in a room game: like pressing pause (a player who is out does not stop the game; the host always does)
function coopHide(){releaseAll();if(scene!=='play'||stop)return;const p=me();
  if(NET.role==='guest'){pauseSel=0;pauseAsk=null;netData({hide:1});return;} // the host decides (it knows if I am out)
  scene='pause';stop={by:LOCAL,why:'pause'};pauseSel=0;netSnap();}
function updRoom(){t60++;sceneT++;titleCam+=.4;cam=titleCam%2000;if(prs.pause||prs.kick){sfx('select');netLeave();}}
function updName(){t60++;sceneT++;if(NET.ws||document.activeElement===document.getElementById('roomName'))return;
  if(prs.pause||prs.kick){sfx('select');nameBack();return;} // (II on a phone presses pause and start)
  if(prs.up)nameStep(-1);else if(prs.down)nameStep(1);else if(prs.start||prs.punch||prs.jump)nameSubmit();}
function updJoin(){t60++;sceneT++;if(NET.ws||NET.role!=='off'){if(prs.pause){sfx('select');netLeave();}return;}
  if(++LIST.t>=120)listAsk();
  if(prs.pause||prs.kick){sfx('select');joinBack();return;} // (II on a phone presses pause and start)
  const n=LIST.items.length;
  if(n&&prs.up){LIST.sel=(LIST.sel+n-1)%n;sfx('select');}
  if(n&&prs.down){LIST.sel=(LIST.sel+1)%n;sfx('select');}
  if(prs.start||prs.punch||prs.jump)listJoin();}
function drawName(){R(0,0,W,H,'#140a1e');outlineText('CRIAR SALA',W/2,40,16,'#ffffff','#a01010',4);
  txt('NOME DA SALA:',W/2,72,8,'#c8a8e8','center');
  if(netMsg)txt(netMsg,W/2,206,8,/^(CRIANDO|CONECTANDO)/.test(netMsg)?'#ffe066':'#ff8a5a','center');
  txt(isTouch?'TOQUE UM NOME OU DIGITE • II = VOLTAR':'▲▼ OUTRO NOME • ENTER = CRIAR • ESC = VOLTAR',W/2,H-20,8,'#8890b0','center');}
function drawRoom(){R(0,0,W,H,'#140a1e');outlineText('SALA CRIADA!',W/2,40,16,'#ffffff','#a01010',4);
  txt('SEU AMIGO ENTRA EM "ENTRAR NA SALA":',W/2,72,8,'#c8a8e8','center');
  R(W/2-150,92,300,52,'#000');outlineText(NET.name||'',W/2,118,16,'#ffe066','#000',4);
  if(NET.lost)txt('RECONECTANDO...',W/2,166,8,'#ff8a5a','center');else if(Math.floor(sceneT/30)%2===0)txt('ESPERANDO JOGADOR 2...',W/2,166,8,'#ffffff','center');
  txt(isTouch?'II = CANCELAR':'ESC = CANCELAR',W/2,H-20,8,'#8890b0','center');}
function drawJoin(){R(0,0,W,H,'#140a1e');outlineText('ENTRAR NA SALA',W/2,34,16,'#ffffff','#a01010',4);
  const waiting=NET.ws||NET.role!=='off';
  if(!LIST.loaded)txt('PROCURANDO SALAS...',W/2,110,8,'#c8a8e8','center');
  else if(!LIST.items.length){txt('NENHUMA SALA ABERTA',W/2,104,8,'#ffffff','center');txt('PEÇA PRO SEU AMIGO CRIAR UMA',W/2,120,8,'#8890b0','center');}
  else{txt('ESCOLHA UMA SALA:',W/2,62,8,'#c8a8e8','center');
    const rows=6,top=Math.max(0,Math.min(LIST.sel-rows+1,LIST.items.length-rows));
    if(top>0)txt('▲',W/2,72,8,'#8890b0','center');
    LIST.items.slice(top,top+rows).forEach((r,k)=>{const i=top+k,on=i===LIST.sel,y=82+k*17;
      if(on)R(W/2-120,y-4,240,15,'rgba(255,224,102,.15)');
      txt((on?'► ':'  ')+r.name+(on?' ◄':'  '),W/2,y,8,on?'#ffe066':'#ffffff','center');});
    if(top+rows<LIST.items.length)txt('▼',W/2,82+rows*17,8,'#8890b0','center');}
  if(netMsg)txt(netMsg,W/2,196,8,/^(ESPERANDO|ENTRANDO)/.test(netMsg)?'#ffe066':'#ff8a5a','center');
  txt(waiting?(isTouch?'II = VOLTAR':'ESC = VOLTAR'):(isTouch?'SOCO = ENTRAR • II = VOLTAR':'▲▼ ESCOLHER • ENTER = ENTRAR • ESC = VOLTAR'),W/2,H-20,8,'#8890b0','center');}
// messages over the game in room games
function drawCoop(){if(NET.role==='off'&&!NET.toast&&inGame().length<2&&!(me()&&me().out))return;let m=null;
  if(NET.lost)m='JOGADOR '+(LOCAL+1)+' RECONECTANDO...';
  else if(stop&&(stop.by!==LOCAL||stop.why==='drop')){const n=stop.by+1;m=stop.why==='pause'?'JOGADOR '+n+' PAUSOU':stop.why==='shop'?'JOGADOR '+n+' ESTÁ NA LOJA':'JOGADOR '+n+' RECONECTANDO...';}
  else if(NET.role==='guest'&&NET.peer==='drop')m='JOGADOR 1 RECONECTANDO...';
  const p=me();if(!m&&p&&p.out&&scene==='play')m='VOCÊ ESTÁ FORA - ASSISTINDO';
  if(m){R(0,H/2-14,W,28,'rgba(0,0,0,.72)');outlineText(m,W/2,H/2,8,'#ffe066','#000',3);}
  if(NET.toast)outlineText(NET.toast.v,W/2,92,8,'#ffffff','#a01010',3);}

// ---------- game state codec: the host sends the whole game state as JSON ----------
// Shared objects stay shared ($i/$r), sets stay sets ($s), the game's fixed tables are sent by name ($k),
// and generated looks are sent once and kept in LOOKS, so the sprite cache sees the same object every time.
let REG=null,REGK=null,lookSeq=0;const LOOKS={};
function buildReg(){REG=new Map();REGK={};const add=(o,k)=>{if(o&&typeof o==='object'&&!REG.has(o)){REG.set(o,k);REGK[k]=o;}};
  for(const k in ATK)add(ATK[k],'A.'+k);BANDLOOKS.forEach((L,i)=>add(L,'BL.'+i));
  add(BASE,'BASE');add(ROBOLOOK,'ROBO');add(DRONELOOK,'DRONE');add(BOSSLOOK,'BOSS');add(DEMONLOOK,'DEMON');
  for(const k in WEAP)add(WEAP[k],'W.'+k);SHOPS.forEach((s,i)=>add(s,'S.'+i));STAGES.forEach((s,i)=>add(s,'ST.'+i));
  for(const k in MUSIC_SLOTS)add(MUSIC_SLOTS[k],'MS.'+k);for(const k in CROWD_SLOTS)add(CROWD_SLOTS[k],'CS.'+k);
  for(const k in SIGW)add(SIGW[k],'SW.'+k);}
const skipKey=k=>k[0]==='_'&&k[1]==='_';
const isSet=v=>v instanceof Set||Object.prototype.toString.call(v)==='[object Set]';
function lookId(L,ctx){if(!L._lk)L._lk=++lookSeq;
  if(!ctx.sent.has(L._lk)){ctx.sent.add(L._lk);ctx.L[L._lk]=JSON.parse(JSON.stringify(L,(k,v)=>skipKey(k)?undefined:v));}
  return L._lk;}
function encodeGraph(root,ctx){
  if(!REG)buildReg();
  const seen=new Map();
  (function count(v){if(!v||typeof v!=='object'||REG.has(v))return;const n=seen.get(v)||0;seen.set(v,n+1);if(n)return;
    if(isSet(v)||Array.isArray(v)){for(const x of v)count(x);return;}
    for(const k in v){if(skipKey(k)||k==='look')continue;count(v[k]);}})(root);
  const ids=new Map();let nid=0;
  const enc=v=>{
    if(v===null)return null;const t=typeof v;
    if(t==='number')return Number.isInteger(v)?v:Math.round(v*1000)/1000;
    if(t!=='object')return t==='function'?undefined:v;
    const rk=REG.get(v);if(rk!==undefined)return{$k:rk};
    const id=ids.get(v);if(id!==undefined)return{$r:id};
    const shared=seen.get(v)>1;let my;if(shared){my=nid++;ids.set(v,my);}
    let o;
    if(isSet(v))o={$s:[...v].map(enc)};
    else if(Array.isArray(v)){const a=v.map(enc);if(!shared)return a;o={$a:a};}
    else{o={};for(const k in v){if(skipKey(k))continue;const x=v[k];if(x===undefined||typeof x==='function')continue;
      if(k==='look'&&x&&typeof x==='object'&&!REG.has(x)){o.look={$L:lookId(x,ctx)};continue;}o[k]=enc(x);}}
    if(shared)o.$i=my;return o;};
  return enc(root);}
function addLooks(L){for(const id in L)if(!LOOKS[id])LOOKS[id]=L[id];}
function decodeGraph(data){if(!REG)buildReg();const ids=[];
  const dec=v=>{if(v===null||typeof v!=='object')return v;
    if(Array.isArray(v))return v.map(dec);
    if(v.$k!==undefined)return REGK[v.$k];
    if(v.$r!==undefined)return ids[v.$r];
    if(v.$L!==undefined)return LOOKS[v.$L]||BASE;
    if(v.$s){const s=new Set();if(v.$i!==undefined)ids[v.$i]=s;for(const x of v.$s)s.add(dec(x));return s;}
    if(v.$a){const a=[];ids[v.$i]=a;for(const x of v.$a)a.push(dec(x));return a;}
    const o={};if(v.$i!==undefined)ids[v.$i]=o;for(const k in v){if(k==='$i')continue;o[k]=dec(v[k]);}return o;};
  return dec(data);}
// every variable that makes up the shared game (local things like menus, the pause cursor and sound stay out)
function snapState(){return{SELS,scene,sceneT,STAGE,cam,t60,players,party,enemies,items,parts,projs,trigs,trigIdx,lock,waveIdx,waveDelay,goTimer,
  hitstop,shakeT,shakeM,kills,playTime,banner,bossRef,bossMinions,hintT,totalXp,winT,bonus,bonusUsed,bonusT,bonusSave,fade,areaBanner,
  zonesSeen,shop,demonWave,buddy,buddyOn,runner,runT,runN,tigasSay,power,SHOW,stop,selChar,selSkin,chosenLook};}
function loadState(s){({SELS,scene,sceneT,STAGE,cam,t60,players,party,enemies,items,parts,projs,trigs,trigIdx,lock,waveIdx,waveDelay,goTimer,
  hitstop,shakeT,shakeM,kills,playTime,banner,bossRef,bossMinions,hintT,totalXp,winT,bonus,bonusUsed,bonusT,bonusSave,fade,areaBanner,
  zonesSeen,shop,demonWave,buddy,buddyOn,runner,runT,runN,tigasSay,power,SHOW,stop,selChar,selSkin,chosenLook}=s);player=players&&players[0];}
const CODEC_SENT=new Set();
// a player with no lives left while the other still fights: removed from the fight, watches
function goOut(p){p.out=true;p.lives=0;p.dying=false;p.state='idle';p.inv=0;p.maskT=0;
  if(p.weapon){items.push({kind:'weapon',w:p.weapon.w,dur:p.weapon.dur,x:p.x,y:p.y,z:10,vz:2,vx:0,t:0});p.weapon=null;}
  releaseGrab(p);for(const e of enemies)if(e.tgt===p)e.tgt=null;}

// ---------- loop ----------
let ranPlayers=false;
function step(){
  useIn(LOCAL);ranPlayers=false;netPoll();
  if(NET.role==='guest'&&SHARED.has(scene)){if(myPauseOn())updPause();clearPresses();return;}
  switch(scene){
    case'name':updName();break;case'room':updRoom();break;case'join':updJoin();break;
    case'title':updTitle();break;case'select':updSelect();break;case'story':updStory();break;
    case'play':updPlay();break;case'shop':updShop();break;case'pause':updPause();break;case'gameover':updOver();break;case'clear':updClear();break;case'show':updShow();break;case'mut':updMut();break;
  }
  clearPresses();netAfter();
}
// presses from player 2's device arrive at any step: if the players did not run this step (hit pause,
// PODER cut-in), keep them for the next one so they are never lost
function clearPresses(){IN.forEach((I,i)=>{if(i===1&&NET.role==='host'&&scene==='play'&&!ranPlayers)return;ACTS.forEach(a=>I.prs[a]=0);I.dbl={};});useIn(LOCAL);}
function render(){
  ctx.setTransform(S,0,0,S,0,0);
  ctx.save();
  if(scene==='play'&&shakeT>0)ctx.translate(Math.round(rnd(-shakeM,shakeM)),Math.round(rnd(-shakeM,shakeM)));
  switch(scene){
    case'name':drawName();break;case'room':drawRoom();break;case'join':drawJoin();break;
    case'title':drawTitle();break;case'select':drawSelect();break;case'story':drawStory();break;case'mut':drawMut();break;
    case'play':if(myPauseOn()){drawPause();break;}drawWorld();vignette();drawHUD();drawPowerCut();drawFade();drawCoop();break;
    case'shop':if(!shop||shop.by===LOCAL||inGame().length<2)drawShop();else{drawWorld();vignette();drawHUD();drawCoop();}break;
    case'pause':if(!stop||stop.by===LOCAL)drawPause();else{drawWorld();vignette();drawHUD();drawCoop();}break;
    case'gameover':drawOver();break;case'clear':drawClear();break;case'show':drawShow();break;
    case'boot':R(0,0,W,H,'#000');txt('CARREGANDO...',W/2,H/2,8,'#fff','center');break;
  }
  if(scene!=='pause'&&scene!=='select'&&scene!=='shop'&&scene!=='mut')drawClimate();
  ctx.restore();
  if(muted){if(inGame().length>1&&scene!=='title')txt('MUDO',W/2,6,8,'#ff8080','center');else txt('MUDO',W-6,6,8,'#ff8080','right');}
  ctx.setTransform(1,0,0,1,0,0);
}
let last=performance.now(),acc=0;
function frame(now){
  let d=(now-last)/1000;last=now;if(d>.1)d=.1;acc+=d;let n=0;
  while(acc>=1/60&&n<5){step();acc-=1/60;n++;}
  render();
  requestAnimationFrame(frame);
}
const FRAME={maskOverlay:false,walkers:[]};
window.__zz={step,get players(){return players},input:s=>IN[s],get chars(){return CHARS.map(c=>c.looks[0].pix)},
  get sel(){return party.length>1?SELS:[{char:selChar,ok:false}]},get stage(){return STAGE},setStage:n=>{STAGE=n;},get cam(){return cam},get lock(){return lock},
  get trigs(){return trigs},get trigIdx(){return trigIdx},get kills(){return kills},get totalXp(){return totalXp},get buddy(){return buddy},get runner(){return runner},
  get power(){return power},get shop(){return shop},get stop(){return stop},get show(){return SHOW},version:VERSION,
  codec:{roundTrip(o={}){if(o.fresh)CODEC_SENT.clear();const ctx={sent:CODEC_SENT,L:{}};const json=JSON.stringify({s:encodeGraph(snapState(),ctx),L:ctx.L});
    const back=JSON.parse(json);addLooks(back.L);return{state:decodeGraph(back.s),size:json.length,looksSent:Object.keys(ctx.L).length};}},attack:(e,n)=>startAttack(e,n),fill:s=>{const p=players[s];if(p){p.fury=100;p.pw=100;}},runnerSoon:()=>{runT=419;},render:()=>{FRAME.maskOverlay=false;FRAME.walkers=[];render();},frame:FRAME,sfxLog,
  get scene(){return scene},setScene:s=>{scene=s;},get menu(){return{items:MENU.slice(),sel:menuSel}},get netMsg(){return netMsg},get muted(){return muted},
  get rooms(){return{items:LIST.items.map(r=>({id:r.id,name:r.name})),sel:LIST.sel,loaded:LIST.loaded}},
  get net(){return{role:NET.role,slot:LOCAL,code:NET.code,name:NET.name,peer:NET.peer,zip:NET.role==='host'?ZIP&&NET.peerZip:ZIP}},
  setSel:i=>{selChar=i},spawn:(t,s)=>spawn(t,s),enterBonus:()=>doFade('bonusIn'),get bonus(){return bonus},get player(){return player},get enemies(){return enemies},get items(){return items},get projs(){return projs},press,release,startStage};
const go=()=>{initTex();if(scene==='boot'){scene='title';sceneT=0;}};
(document.fonts&&document.fonts.load?Promise.race([document.fonts.load('8px "Press Start 2P"'),new Promise(r=>setTimeout(r,2500))]):Promise.resolve()).then(go,go);
requestAnimationFrame(frame);
})();
