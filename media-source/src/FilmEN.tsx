import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import './v2.css';

const clamp=(x:number)=>Math.min(1,Math.max(0,x));
const ease=(x:number)=>{const a=clamp(x);return a*a*a*(a*(a*6-15)+10);};
const mix=(a:number,b:number,u:number)=>a+(b-a)*u;
const tween=(t:number,a:number,b:number,x:number,y:number)=>mix(x,y,ease((t-a)/(b-a)));
const color=(a:number[],b:number[],u:number)=>`rgb(${a.map((v,i)=>Math.round(mix(v,b[i],u))).join(',')})`;
const visible=(t:number,a:number,b:number)=>ease((t-a)/.7)*(1-ease((t-b+.7)/.7));
type Pose={s:number;x:number;y:number;rx:number;ry:number;rz:number};
const cameraKeys:[number,Pose][]=[
 [0,{s:3.35,x:545,y:655,rx:23,ry:-14,rz:-12}],
 [3.2,{s:3.0,x:1040,y:655,rx:20,ry:-7,rz:-9}],
 [6.5,{s:1.37,x:981,y:744,rx:12,ry:-8,rz:-4}],
 [9.8,{s:1.37,x:981,y:744,rx:8,ry:4,rz:-1}],
 [13.6,{s:1.55,x:225,y:435,rx:11,ry:-12,rz:-3}],
 [16.4,{s:1.55,x:225,y:435,rx:8,ry:-8,rz:-3}],
 [20.5,{s:.73,x:800,y:460,rx:24,ry:-27,rz:-6}],
 [23.0,{s:.76,x:800,y:460,rx:20,ry:-23,rz:-5}],
 [26.2,{s:.84,x:800,y:450,rx:5,ry:5,rz:1}],
 [28.2,{s:.84,x:800,y:450,rx:2,ry:-2,rz:0}],
 [32,{s:.78,x:800,y:465,rx:0,ry:0,rz:0}],
];
function camera(t:number):Pose{
 let i=0;while(i<cameraKeys.length-2&&t>cameraKeys[i+1][0])i++;
 const [a,p]=cameraKeys[i],[b,q]=cameraKeys[i+1],u=ease((t-a)/(b-a));
 return Object.fromEntries(Object.keys(p).map(k=>[k,mix(p[k as keyof Pose],q[k as keyof Pose],u)])) as Pose;
}
const Icon:React.FC<{name?:string;size?:number}>=({name='spark',size=30})=>{
 const paths:Record<string,string>={spark:'M15 2L18.5 11.5 28 15 18.5 18.5 15 28 11.5 18.5 2 15 11.5 11.5Z',plus:'M15 5V25M5 15H25',send:'M15 24V6M8 13L15 6 22 13',home:'M3 14L15 4 27 14M7 12V26H23V12',folder:'M3 8V25H27V10H15L12 6H3Z',terminal:'M7 9L13 15 7 21M17 22H24',search:'M20 20L27 27M23 13A10 10 0 1 1 3 13A10 10 0 1 1 23 13',settings:'M15 7A8 8 0 1 1 15 23A8 8 0 1 1 15 7M15 2V5M15 25V28M2 15H5M25 15H28',chevron:'M10 6L20 15 10 24',mic:'M11 6A4 4 0 0 1 19 6V15A4 4 0 0 1 11 15ZM7 14V15A8 8 0 0 0 23 15V14M15 23V28M10 28H20',check:'M6 15L12 21 25 7'};
 return <svg width={size} height={size} viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]||paths.spark}/></svg>;
};
const CodexMark:React.FC<{size?:number}>=({size=70})=><svg width={size} height={size} viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 23C27 9 43 7 52 16C66 9 80 19 79 32C93 39 92 57 80 65C80 82 62 90 50 79C36 90 18 80 18 66C3 60 3 41 16 33C15 28 19 24 23 23Z"/><path d="M30 36L40 48 30 60M48 62H66"/></svg>;

const WorldBackground:React.FC<{t:number;light:number}>=({t,light})=><div className="v2-environment" style={{background:color([10,16,18],[211,221,216],light)}}>
 <svg className="v2-landscape" viewBox="0 0 2400 1500" style={{transform:`translate(${Math.sin(t*.14)*110}px,${Math.cos(t*.12)*60}px) rotate(${t*.35-7}deg)`,opacity:mix(.65,.95,light)}}>
  <defs>
   <linearGradient id="v2-ribbon-a" x1="0" y1="0" x2="0.8" y2="1"><stop stopColor="#f1e8d5"/><stop offset=".35" stopColor="#9eb8ab"/><stop offset=".65" stopColor="#455b55"/><stop offset=".87" stopColor="#b4c9c2"/><stop offset="1" stopColor="#eae7da"/></linearGradient>
   <linearGradient id="v2-ribbon-b" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#1e302c"/><stop offset=".4" stopColor="#c2cac0"/><stop offset=".54" stopColor="#f2eddf"/><stop offset=".8" stopColor="#687b73"/><stop offset="1" stopColor="#1e302c"/></linearGradient>
   <radialGradient id="v2-orb"><stop stopColor="#f4eadd"/><stop offset=".4" stopColor="#c2c4ad"/><stop offset=".75" stopColor="#b4c9c1"/><stop offset="1" stopColor="#7c9793" stopOpacity="0"/></radialGradient>
  </defs>
  <ellipse cx="1760" cy="470" rx="650" ry="460" fill="url(#v2-orb)" opacity=".36"/>
  <path d="M-330 1380C300 1660 590 120 1080 420S1790 1330 2670 320" stroke="url(#v2-ribbon-a)" strokeWidth="285" fill="none" opacity=".44"/>
  <path d="M-300 1100C100 1320 630 290 1200 660S2000 1500 2750 540" stroke="url(#v2-ribbon-b)" strokeWidth="145" fill="none" opacity=".48"/>
  <path d="M-200 1050C260 1200 610 380 1210 720S2000 1420 2670 680" stroke="#f6f5e8" strokeWidth="1.1" fill="none" opacity=".38"/>
 </svg>
 <div className="v2-softbox" style={{transform:`translateX(${mix(-260,370,Math.sin(t*.11)*.5+.5)}px) rotate(-28deg)`,opacity:mix(.23,.6,light)}}/>
 <div className="v2-vignette" style={{opacity:mix(.74,.13,light)}}/>
</div>;

export const FilmEN:React.FC=()=>{
 const f=useCurrentFrame(),t=f/30,p=camera(t);
 const daylight=ease((t-18)/8),joined=ease((t-22.5)/3.7),ink=color([232,240,231],[25,43,34],daylight);
 const componentReveal=ease((t-4.4)/1.6),sideArrival=ease((t-10.2)/3),wideReveal=ease((t-17.2)/3.2);
 const zComposer=mix(270,0,joined),zSide=mix(145,0,joined),zMain=mix(-130,0,joined),zHeader=mix(230,0,joined);
 const zNav=mix(80,0,joined);
 const typed='Make something new.'.slice(0,Math.floor(tween(t,7.0,8.7,0,19)));
 const pressed=visible(t,9,9.8),selected=ease((t-14)/.8);
 const cursorX=t<10?tween(t,7.8,9,1130,1422):t<14?tween(t,10.1,14,1422,258):tween(t,15.5,18,258,-300);
 const cursorY=t<10?tween(t,7.8,9,820,791):t<14?tween(t,10.1,14,791,402):tween(t,15.5,18,402,500);
 const labels=[{a:.3,b:4.7,n:'01',word:'EDGE'},{a:5,b:10.4,n:'02',word:'INPUT'},{a:11.6,b:17.2,n:'03',word:'SIDEBAR'},{a:19,b:26.8,n:'04',word:'TOGETHER'}];
 return <AbsoluteFill className="v2-film" style={{color:ink}}>
  <style>{`.v2-film{font-family:'Segoe UI','Arial',sans-serif}.v2-side-row{opacity:.92}.v2-welcome{opacity:.85}.v2-welcome>svg{opacity:.88}.v2-main-title{opacity:.6}.v2-composer-rail{opacity:.82}`}</style>

  <WorldBackground t={t} light={daylight}/>
  <div className="v2-camera-center">
   <div className="v2-camera" style={{transform:`perspective(2700px) scale(${p.s}) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg)`}}>
    <div className="v2-world" style={{transform:`translate3d(${-p.x}px,${-p.y}px,0)`, '--v2-ink':ink,'--v2-glass-alpha':mix(.075,.095,daylight),'--v2-shadow':mix(.45,.16,joined)} as React.CSSProperties}>
     <div className="v2-window-shadow" style={{opacity:wideReveal*joined,transform:`translate3d(0,40px,-200px) scale(${mix(.91,1,joined)})`}}/>
     <div className="v2-full-shell v2-glass" style={{opacity:wideReveal,transform:`translateZ(${mix(-220,0,joined)}px) scale(${mix(1.13,1,joined)})`,borderRadius:26,boxShadow:`inset 0 2px 2px #ffffffe0,0 36px 80px -38px rgba(15,35,24,${mix(.4,.3,daylight)})`}}/>

     <div className="v2-main v2-glass" style={{transform:`translate3d(${mix(1440,0,wideReveal)}px,${mix(-100,0,wideReveal)}px,${zMain}px) rotateY(${mix(-16,0,wideReveal)}deg)`,borderRadius:`${mix(24,0,joined)}px ${mix(24,0,joined)}px ${mix(24,26,joined)}px ${mix(24,0,joined)}px`,opacity:wideReveal,backgroundColor:`rgba(245,250,243,${mix(.05,.025,joined)})`,borderColor:`rgba(255,255,255,${mix(.45,0,joined)})`,boxShadow:joined>.999?'none':undefined}}>
      <div className="v2-main-title"><span>Codex</span><Icon name="plus" size={21}/></div>
      <div className="v2-welcome"><CodexMark/><div>Start creating</div></div>
      <div className="v2-main-light" style={{opacity:mix(.2,0,joined),transform:`translateX(${t*25-400}px)`}}/>
     </div>

     <div className="v2-sidebar v2-glass" style={{transform:`translate3d(${mix(-1000,0,sideArrival)}px,0,${zSide}px) rotateY(${mix(-16,0,sideArrival)}deg)`,borderRadius:mix(24,0,joined),backgroundColor:`rgba(240,246,239,${mix(.095,.035,joined)})`,borderColor:`rgba(255,255,255,${mix(.52,0,joined)})`,boxShadow:joined>.999?'none':undefined}}>
      <div className="v2-side-title">Codex <span>⌄</span></div>
      <div className="v2-new"><Icon name="plus" size={22}/><span>New chat</span></div>
      <div className="v2-side-section">Projects</div>
      <div className="v2-folder-row"><Icon name="folder" size={21}/><span>Studio</span></div>
      <div className="v2-side-selection" style={{transform:`translateY(${mix(54,0,selected)}px)`,background:`rgba(245,251,242,${mix(.14,.34,selected)})`}}/>
      {['Ideas','Design','Code'].map((x,i)=><div className="v2-side-row" key={x} style={{top:310+i*54}}><Icon name={['spark','folder','terminal'][i]} size={18}/><span>{x}</span><span className="v2-row-dots">···</span></div>)}
      <div className="v2-side-divider"/>
      <div className="v2-side-ghosts">{[.8,.65,.87,.5].map((w,i)=><div key={i} style={{width:`${w*100}%`}}><i/><b style={{width:`${w*70}%`}}/></div>)}</div>
      <div className="v2-side-footer"><span className="v2-person">C</span><Icon name="settings" size={21}/></div>
      <div className="v2-side-sheen" style={{transform:`translateY(${tween(t,13.7,16.5,-800,850)}px)`}}/>
     </div>

     <div className="v2-nav v2-glass" style={{transform:`translate3d(${mix(-520,0,wideReveal)}px,0,${zNav}px)`,opacity:wideReveal,borderRadius:`${mix(24,0,joined)}px ${mix(24,0,joined)}px ${mix(24,0,joined)}px ${mix(24,26,joined)}px`,borderColor:`rgba(255,255,255,${mix(.5,0,joined)})`,boxShadow:joined>.999?'none':undefined}}>
      {['home','spark','terminal','folder'].map((name,i)=><div key={i} className={i===0?'active':''}><Icon name={name} size={25}/></div>)}<span className="v2-nav-bottom">···</span>
     </div>
     <div className="v2-topbar v2-glass" style={{transform:`translate3d(0,${mix(-450,0,wideReveal)}px,${zHeader}px)`,opacity:wideReveal,borderRadius:`${mix(22,26,joined)}px ${mix(22,26,joined)}px ${mix(22,0,joined)}px ${mix(22,0,joined)}px`,borderColor:`rgba(255,255,255,${mix(.55,0,joined)})`,boxShadow:joined>.999?'none':undefined}}>
      <span>〈</span><span>〉</span><Icon name="terminal" size={21}/><div className="v2-menu-lines"><i/><i/><i/></div><span className="v2-topbrand">Codex</span><div className="v2-window-buttons"><i/><b/><span>×</span></div>
     </div>

     <div className="v2-composer v2-glass" style={{transform:`translate3d(0,0,${zComposer}px) rotateY(${mix(-2,0,joined)}deg)`,borderRadius:mix(48,32,joined)}}>
      <div className="v2-composer-inside" style={{opacity:componentReveal}}>
       <div className="v2-composer-rail"><Icon name="folder" size={20}/><span>Studio</span><span className="v2-rail-split"/><Icon name="terminal" size={20}/><span className="v2-composer-more">⌄</span></div>
       <div className="v2-typing">{typed}<i style={{opacity:t<9?1:0}}/></div>
       <div className="v2-composer-actions"><Icon name="plus" size={25}/><span className="v2-action-line"/><div className="v2-mic"><Icon name="mic" size={22}/></div><div className="v2-send" style={{transform:`scale(${mix(1,.9,pressed)})`,background:color([222,234,215],[44,59,49],daylight),color:color([38,54,44],[240,244,230],daylight)}}><Icon name={t<9.3?'send':'check'} size={25}/></div></div>
      </div>
      <svg className="v2-edge-trace" viewBox="0 0 1040 195" preserveAspectRatio="none" style={{opacity:mix(1,.3,joined)}}><defs><filter id="v2-bloom"><feGaussianBlur stdDeviation="3"/></filter></defs><rect x="1.8" y="1.8" width="1036.4" height="191.4" rx={mix(47,31,joined)} fill="none" stroke="#f6ffef" strokeWidth="7" strokeDasharray="180 2290" strokeDashoffset={-t*170} opacity=".4" filter="url(#v2-bloom)"/><rect x="1.8" y="1.8" width="1036.4" height="191.4" rx={mix(47,31,joined)} fill="none" stroke="#fffffa" strokeWidth="1.7" strokeDasharray="160 2310" strokeDashoffset={-t*170}/></svg>
      <div className="v2-composer-reflection" style={{transform:`translateX(${tween(t,0,10,-450,1350)}px) rotate(-30deg)`}}/>
      <div className="v2-touch-ring" style={{left:981,top:140,opacity:visible(t,9,9.9),transform:`translate(-50%,-50%) scale(${tween(t,9,10,.2,2)})`}}/>
     </div>

     <div className="v2-final-rim" style={{opacity:joined,transform:'translateZ(1px)'}}/>
     <svg className="v2-cursor" width="28" height="36" viewBox="0 0 28 36" style={{transform:`translate3d(${cursorX}px,${cursorY}px,${t<10?zComposer+6:zSide+6}px)`,opacity:visible(t,7.7,17.5)}}><path d="M2 2V30L10 23 17 35 22 32 15 20 27 19Z" fill="#273b30" stroke="#f2f7e9" strokeWidth="1.6"/></svg>
    </div>
   </div>
  </div>
  <div className="v2-section-label" style={{color:ink}}>{labels.map(({a,b,n,word})=><div key={n} style={{opacity:visible(t,a,b),transform:`translateY(${tween(t,a,a+.8,12,0)}px)`}}><span>{n}</span><b>{word}</b></div>)}</div>
  <div className="v2-end-brand" style={{opacity:ease((t-27.5)/1.5),transform:`translateY(${tween(t,27.5,29,18,0)}px)`}}><span>Codex</span><i/><b>LIQUID GLASS</b></div>
  <div className="v2-end-note" style={{opacity:ease((t-29)/1.4)}}>LOCAL CUSTOM BUILD</div>
  <div className="v2-grain"/>
 </AbsoluteFill>;
};
