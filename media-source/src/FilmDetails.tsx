import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import './v2.css';
import './agile.css';
import './details.css';
import {sceneTime,cameraAt} from './details-timeline.mjs';

const clamp=(x:number)=>Math.min(1,Math.max(0,x));
const ease=(x:number)=>{const a=clamp(x);return a*a*a*(a*(a*6-15)+10);};
const mix=(a:number,b:number,u:number)=>a+(b-a)*u;
const tween=(t:number,a:number,b:number,x:number,y:number)=>mix(x,y,ease((t-a)/(b-a)));
const color=(a:number[],b:number[],u:number)=>`rgb(${a.map((v,i)=>Math.round(mix(v,b[i],u))).join(',')})`;
const visible=(t:number,a:number,b:number)=>ease((t-a)/.7)*(1-ease((t-b+.7)/.7));
const Icon:React.FC<{name?:string;size?:number}>=({name='spark',size=30})=>{
 const paths:Record<string,string>={spark:'M15 2L18.5 11.5 28 15 18.5 18.5 15 28 11.5 18.5 2 15 11.5 11.5Z',plus:'M15 5V25M5 15H25',send:'M15 24V6M8 13L15 6 22 13',home:'M3 14L15 4 27 14M7 12V26H23V12',folder:'M3 8V25H27V10H15L12 6H3Z',terminal:'M7 9L13 15 7 21M17 22H24',search:'M20 20L27 27M23 13A10 10 0 1 1 3 13A10 10 0 1 1 23 13',settings:'M15 7A8 8 0 1 1 15 23A8 8 0 1 1 15 7M15 2V5M15 25V28M2 15H5M25 15H28',chevron:'M10 6L20 15 10 24',mic:'M11 6A4 4 0 0 1 19 6V15A4 4 0 0 1 11 15ZM7 14V15A8 8 0 0 0 23 15V14M15 23V28M10 28H20',check:'M6 15L12 21 25 7'};
 return <svg width={size} height={size} viewBox="0 0 30 30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]||paths.spark}/></svg>;
};
const CodexMark:React.FC<{size?:number;draw?:number;pulse?:number}>=({size=70,draw=1,pulse=0})=><svg width={size} height={size} viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:`scale(${1+pulse*.13})`,filter:`drop-shadow(0 0 ${pulse*14}px #e4faff)`}}><path pathLength="1" strokeDasharray="1" strokeDashoffset={1-draw} d="M23 23C27 9 43 7 52 16C66 9 80 19 79 32C93 39 92 57 80 65C80 82 62 90 50 79C36 90 18 80 18 66C3 60 3 41 16 33C15 28 19 24 23 23Z"/><path pathLength="1" strokeDasharray="1" strokeDashoffset={1-draw} d="M30 36L40 48 30 60M48 62H66"/></svg>;

const span=(t:number,a:number,b:number,fade=.15)=>ease((t-a)/fade)*(1-ease((t-b+fade)/fade));
const point=(u:number,a:number[],b:number[],c:number[],d:number[])=>a.map((v,i)=>(1-u)**3*v+3*(1-u)**2*u*b[i]+3*(1-u)*u*u*c[i]+u**3*d[i]);
function flight(t:number){
 const segments=[
  {a:3.14,b:4.56,p:[[1422,791],[1210,1050],[490,180],[220,402]],z:[270,145]},
  {a:5.5,b:6.95,p:[[220,402],[380,130],[720,90],[985,210]],z:[145,300]},
  {a:7.65,b:9.88,p:[[985,210],[1310,270],[1130,500],[985,370]],z:[300,1]},
 ];
 const segment=segments.find(s=>t>=s.a&&t<=s.b);if(!segment)return null;
 const u=clamp((t-segment.a)/(segment.b-segment.a)),v=ease(u),p=point(v,...segment.p as [number[],number[],number[],number[]]);
 const trail=Array.from({length:12},(_,i)=>point(Math.max(0,v-i*.010),...segment.p as [number[],number[],number[],number[]]));
 return {p,trail,z:mix(segment.z[0],segment.z[1],v),alpha:span(t,segment.a,segment.b,.075)};
}

const WorldBackground:React.FC<{t:number;light:number}>=({t,light})=><div className="v2-environment" style={{background:color([7,17,26],[219,230,233],light)}}>
 <svg className="v2-landscape" viewBox="0 0 2400 1500" style={{transform:`translate(${Math.sin(t*.14)*110}px,${Math.cos(t*.12)*60}px) rotate(${t*.35-7}deg)`,opacity:mix(.65,.95,light)}}>
  <defs>
   <linearGradient id="v2-ribbon-a" x1="0" y1="0" x2="0.8" y2="1"><stop stopColor="#dcecf4"/><stop offset=".35" stopColor="#9cbfce"/><stop offset=".65" stopColor="#415a6d"/><stop offset=".87" stopColor="#bdd6df"/><stop offset="1" stopColor="#edf6fa"/></linearGradient>
   <linearGradient id="v2-ribbon-b" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#1c3044"/><stop offset=".4" stopColor="#bbcbd7"/><stop offset=".54" stopColor="#f2f6fd"/><stop offset=".8" stopColor="#6c8799"/><stop offset="1" stopColor="#23384b"/></linearGradient>
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

export const FilmDetails:React.FC=()=>{
 const f=useCurrentFrame(),{fps,height}=useVideoConfig(),seconds=f/fps,t=sceneTime(seconds),p=cameraAt(seconds);
 const physical=(start:number,damping=19,stiffness=180)=>spring({frame:f-start*fps,fps,config:{damping,stiffness,mass:.85}});
 const daylight=ease((seconds-6.3)/3.4),joined=clamp(physical(8.1,20,120)),ink=color([232,244,251],[28,47,58],daylight);
 const componentReveal=clamp(physical(1.25)),sideArrival=physical(3.5,19,155),wideReveal=clamp(physical(5.9));
 const mainArrival=physical(6.05,20,160),navArrival=physical(6.20,20,160),headerArrival=physical(6.38,20,160);
 const zComposer=mix(270,0,physical(7.88,18,118)),zSide=mix(145,0,physical(8.02,19,118)),zMain=mix(-150,0,physical(8.16,20,118)),zHeader=mix(230,0,physical(8.30,20,118));
 const zNav=mix(80,0,physical(8.10,19,118));
 const typed='Make something new.'.slice(0,Math.floor(tween(t,7.0,8.7,0,19)));
 const pressed=ease((seconds-2.96)/.09)*(1-ease((seconds-3.12)/.10)),selected=clamp(physical(4.58,17,240));
 const wobble=seconds<3.12?0:Math.exp(-(seconds-3.12)*9)*Math.sin((seconds-3.12)*28);
 const fan=span(seconds,4.58,5.77,.18),palette=span(seconds,6.42,8.10,.18),beam=flight(seconds);
 const imprint=span(seconds,9.82,10.55,.12),markDraw=ease((seconds-6.35)/.65);
 const cursorX=t<10?tween(t,7.8,9,1130,1422):t<14?tween(t,10.1,14,1422,258):tween(t,15.5,18,258,-300);
 const cursorY=t<10?tween(t,7.8,9,820,791):t<14?tween(t,10.1,14,791,402):tween(t,15.5,18,402,500);
 const labels=[{a:.3,b:4.7,n:'01',word:'EDGE'},{a:5,b:10.4,n:'02',word:'INPUT'},{a:11.6,b:17.2,n:'03',word:'SIDEBAR'},{a:19,b:26.8,n:'04',word:'TOGETHER'}];
 return <AbsoluteFill className="v2-film v4-film v5-film" style={{color:ink,'--v4-sheen':`${tween(seconds,6.2,10,0,2100)}px`,'--v4-brand-y':`${height/2-465}px`,'--v4-note-y':`${height/2+423}px`} as React.CSSProperties}>
  <style>{`@font-face{font-family:V2CN;src:local('Segoe UI'),local('Arial'),local('Liberation Sans'),local('DejaVu Sans')}@font-face{font-family:V2Latin;src:local('Segoe UI Light'),local('Arial'),local('Liberation Sans'),local('DejaVu Sans')}.v2-side-row{opacity:.92}.v2-welcome{opacity:.85}.v2-welcome>svg{opacity:.88}.v2-main-title{opacity:.6}.v2-composer-rail{opacity:.82}`}</style>
  <WorldBackground t={t} light={daylight}/>
  <div className="v2-camera-center">
   <div className="v2-camera" style={{transform:`perspective(2700px) scale(${p.s}) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg)`}}>
    <div className="v2-world" style={{transform:`translate3d(${-p.x}px,${-p.y}px,0)`, '--v2-ink':ink,'--v2-glass-alpha':mix(.075,.095,daylight),'--v2-shadow':mix(.45,.16,joined)} as React.CSSProperties}>
     <div className="v2-window-shadow" style={{opacity:wideReveal*joined,transform:`translate3d(0,40px,-200px) scale(${mix(.91,1,joined)})`}}/>
     <div className="v2-full-shell v2-glass" style={{opacity:wideReveal,transform:`translateZ(${mix(-220,0,joined)}px) scale(${mix(1.13,1,joined)})`,borderRadius:26,boxShadow:`inset 0 2px 2px #ffffffe0,0 36px 80px -38px rgba(15,35,24,${mix(.4,.3,daylight)})`}}/>

     <div className="v2-main v2-glass" style={{transform:`translate3d(${mix(1440,0,mainArrival)}px,${mix(-150,0,mainArrival)}px,${zMain}px) rotateY(${mix(-19,0,mainArrival)}deg)`,borderRadius:`${mix(24,0,joined)}px ${mix(24,0,joined)}px ${mix(24,26,joined)}px ${mix(24,0,joined)}px`,opacity:wideReveal,backgroundColor:`rgba(245,250,253,${mix(.05,.025,joined)})`,borderColor:`rgba(255,255,255,${mix(.45,0,joined)})`,boxShadow:joined>.999?'none':undefined}}>
      <div className="v2-main-title"><span>Codex</span><Icon name="plus" size={21}/></div>
      <div className="v2-welcome"><CodexMark draw={markDraw} pulse={imprint}/><div>Start creating</div></div>
      <div className="v4-capabilities">{['Code','Design','Explore'].map((label,i)=>{const progress=physical(6.8+i*.13,20,180);return <div className="v4-capability" key={label} style={{opacity:clamp(progress),transform:`translateY(${(1-progress)*36}px) scale(${mix(.9,1,progress)})`}}><Icon name={['terminal','spark','folder'][i]} size={18}/><span>{label}</span></div>;})}</div>
      <div className="v2-main-light" style={{opacity:mix(.2,0,joined),transform:`translateX(${t*25-400}px)`}}/>
     </div>

     <div className="v2-sidebar v2-glass" style={{transform:`translate3d(${mix(-1000,0,sideArrival)}px,0,${zSide}px) rotateY(${mix(-16,0,sideArrival)}deg)`,borderRadius:mix(24,0,joined),backgroundColor:`rgba(240,246,239,${mix(.095,.035,joined)})`,borderColor:`rgba(255,255,255,${mix(.52,0,joined)})`,boxShadow:joined>.999?'none':undefined}}>
      <div className="v2-side-title">Codex <span>⌄</span></div>
      <div className="v2-new"><Icon name="plus" size={22}/><span>New chat</span></div>
      <div className="v2-side-section">Projects</div>
      <div className="v2-folder-row"><Icon name="folder" size={21}/><span>Studio</span></div>
      <div className="v2-side-selection" style={{transform:`translateY(${mix(54,0,selected)}px) scaleX(${1+.035*Math.sin(Math.PI*clamp(selected))})`,background:`rgba(245,251,242,${mix(.14,.34,clamp(selected))})`}}/>
      {['Ideas','Design','Code'].map((x,i)=>{const entry=physical(3.8+i*.10);return <div className="v2-side-row" key={x} style={{top:310+i*54,opacity:clamp(entry),transform:`translateX(${mix(26,0,entry)}px)`}}><Icon name={['spark','folder','terminal'][i]} size={18}/><span>{x}</span><span className="v2-row-dots">···</span></div>;})}
      <div className="v2-side-divider"/>
      <div className="v2-side-ghosts">{[.8,.65,.87,.5].map((w,i)=><div key={i} style={{width:`${w*100}%`}}><i/><b style={{width:`${w*70}%`}}/></div>)}</div>
      <div className="v2-side-footer"><span className="v2-person">C</span><Icon name="settings" size={21}/></div>
      <div className="v2-side-sheen" style={{transform:`translateY(${tween(t,13.7,16.5,-800,850)}px)`}}/>
     </div>

     <div className="v2-nav v2-glass" style={{transform:`translate3d(${mix(-520,0,navArrival)}px,${mix(70,0,navArrival)}px,${zNav}px)`,opacity:wideReveal,borderRadius:`${mix(24,0,joined)}px ${mix(24,0,joined)}px ${mix(24,0,joined)}px ${mix(24,26,joined)}px`,borderColor:`rgba(255,255,255,${mix(.5,0,joined)})`,boxShadow:joined>.999?'none':undefined}}>
      {['home','spark','terminal','folder'].map((name,i)=><div key={i} className={i===0?'active':''}><Icon name={name} size={25}/></div>)}<span className="v2-nav-bottom">···</span>
     </div>
     <div className="v2-topbar v2-glass" style={{transform:`translate3d(${mix(120,0,headerArrival)}px,${mix(-450,0,headerArrival)}px,${zHeader}px) rotateZ(${mix(3,0,headerArrival)}deg)`,opacity:wideReveal,borderRadius:`${mix(22,26,joined)}px ${mix(22,26,joined)}px ${mix(22,0,joined)}px ${mix(22,0,joined)}px`,borderColor:`rgba(255,255,255,${mix(.55,0,joined)})`,boxShadow:joined>.999?'none':undefined}}>
      <span>〈</span><span>〉</span><Icon name="terminal" size={21}/><div className="v2-menu-lines"><i/><i/><i/></div><span className="v2-topbrand">Codex</span><div className="v2-window-buttons"><i/><b/><span>×</span></div>
     </div>

     <div className="v2-composer v2-glass" style={{transform:`translate3d(0,0,${zComposer}px) rotateY(${mix(-2,0,joined)}deg)`,borderRadius:mix(48,32,joined)}}>
      <div className="v2-composer-inside" style={{opacity:componentReveal}}>
       <div className="v2-composer-rail"><Icon name="folder" size={20}/><span>Studio</span><span className="v2-rail-split"/><Icon name="terminal" size={20}/><span className="v2-composer-more">⌄</span></div>
       <div className="v2-typing">{typed}<i style={{opacity:t<9?1:0}}/></div>
       <div className="v2-composer-actions"><Icon name="plus" size={25}/><span className="v2-action-line"/><div className="v2-mic"><Icon name="mic" size={22}/></div><div className="v5-send-wrap"><div className="v2-send" style={{transform:`scaleX(${1-.14*pressed+.06*wobble}) scaleY(${1-.14*pressed-.05*wobble})`,background:color([222,234,215],[44,59,49],daylight),color:color([38,54,44],[240,244,230],daylight)}}><Icon name={t<9.3?'send':'check'} size={25}/></div><svg className="v5-confirm-ring" viewBox="0 0 70 70" style={{opacity:span(seconds,3.10,3.65,.08),transform:`scale(${tween(seconds,3.1,3.65,.6,1.5)})`}}><circle cx="35" cy="35" r="23" fill="none" stroke="#e6fcff" strokeWidth="1"/></svg></div></div>
      </div>
      <svg className="v2-edge-trace" viewBox="0 0 1040 195" preserveAspectRatio="none" style={{opacity:mix(1,.3,joined)}}><defs><filter id="v2-bloom"><feGaussianBlur stdDeviation="3"/></filter></defs><rect x="1.8" y="1.8" width="1036.4" height="191.4" rx={mix(47,31,joined)} fill="none" stroke="#f6ffef" strokeWidth="7" strokeDasharray="180 2290" strokeDashoffset={-t*170} opacity=".4" filter="url(#v2-bloom)"/><rect x="1.8" y="1.8" width="1036.4" height="191.4" rx={mix(47,31,joined)} fill="none" stroke="#fffffa" strokeWidth="1.7" strokeDasharray="160 2310" strokeDashoffset={-t*170}/></svg>
      <div className="v2-composer-reflection" style={{transform:`translateX(${tween(t,0,10,-450,1350)}px) rotate(-30deg)`}}/>
      <div className="v4-edge-flare" style={{transform:`translateX(${tween(seconds,.1,1.5,80,930)}px)`,opacity:visible(seconds,0,1.8)}}/>
      <svg className="v5-edge-lamina" viewBox="0 0 1040 195" preserveAspectRatio="none" style={{opacity:span(seconds,0,2.0,.22)}}>{[0,1,2].map(i=><rect key={i} x={3+i*2.6} y={3+i*2.6} width={1034-i*5.2} height={189-i*5.2} rx={44-i*2.6} fill="none" stroke={['#ffffffd9','#a8edff80','#d6c9ff66'][i]} strokeWidth={i===0?1:.7} strokeDasharray={i===0?'none':'210 2240'} strokeDashoffset={-seconds*(210+i*55)}/>)}</svg>
      <div className="v5-caustic" style={{transform:`translateX(${tween(seconds,0,1.7,-100,930)}px)`,opacity:span(seconds,0,1.9,.2)}}/>
      <div className="v2-touch-ring" style={{left:981,top:140,opacity:visible(t,9,9.9),transform:`translate(-50%,-50%) scale(${tween(t,9,10,.2,2)})`}}/>
     </div>

     <div className="v2-final-rim" style={{opacity:joined,transform:'translateZ(1px)'}}/>
     <div className="v5-file-fan" style={{opacity:fan,transform:`translate3d(${(1-fan)*-165}px,${(1-fan)*65}px,${zSide+28}px) scale(${mix(.32,1,fan)})`}}>
      <div className="v5-file-card" style={{transform:`translate3d(28px,-9px,-12px) rotate(${mix(0,9,fan)}deg)`}}><div className="v5-file-dots"><i/><i/><i/></div><div className="v5-mini-canvas"><i/><i/><i/></div></div>
      <div className="v5-file-card" style={{transform:`rotate(${mix(0,-5,fan)}deg)`}}><div className="v5-file-dots"><i/><i/><i/></div>{[0,1,2,3,4].map(i=><div className="v5-code-line" key={i} style={{opacity:ease((seconds-4.65-i*.055)/.15),transform:`translateX(${i%2?12:0}px)`}}><i style={{width:24+i*4}}/><i style={{width:53-i*3}}/><i style={{width:35+i*3}}/></div>)}</div>
     </div>
     <div className="v5-palette v2-glass" style={{opacity:palette,transform:`translate3d(${(1-palette)*80}px,${(1-palette)*-55}px,${mix(360,40,ease((seconds-7.7)/.4))}px) scale(${mix(.78,1,palette)}) rotateX(${mix(-12,0,palette)}deg)`}}>
      <div className="v5-search-row"><Icon name="search" size={22}/><span>Search</span><kbd>Ctrl K</kbd></div>
      <div className="v5-search-well" style={{transform:`translateY(${tween(seconds,7.12,7.38,43,0)}px)`}}/>
      <div className="v5-search-result"><Icon name="spark" size={18}/><span>New canvas</span><span>↵</span></div>
      <div className="v5-search-result"><Icon name="folder" size={18}/><span>Open project</span><span>↗</span></div>
     </div>
     {[0,1,2,3].map(i=><div key={i} className="v5-seat-corner" style={{left:i%2?1574:2,top:i<2?2:874,borderWidth:`${i<2?1:0}px ${i%2?1:0}px ${i>=2?1:0}px ${i%2?0:1}px`,borderRadius:i===0?'24px 0 0 0':i===1?'0 24px 0 0':i===2?'0 0 0 24px':'0 0 24px 0',opacity:span(seconds,8.75+i*.045,9.7,.15),transform:'translateZ(2px)'}}/>)}
     {beam&&<svg className="v5-flight" viewBox="0 0 1600 900" style={{opacity:beam.alpha,transform:`translateZ(${beam.z}px)`}}><defs><filter id="v5-beam-glow"><feGaussianBlur stdDeviation="4"/></filter></defs>{beam.trail.map(([x,y],i)=><circle key={i} cx={x} cy={y} r={mix(5.5,.6,i/11)} fill="#c6f4ff" opacity={mix(.75,.05,i/11)}/>)}<circle cx={beam.p[0]} cy={beam.p[1]} r="13" fill="#ccf6ff" opacity=".65" filter="url(#v5-beam-glow)"/><circle cx={beam.p[0]} cy={beam.p[1]} r="4" fill="#fff"/></svg>}
     <svg className="v2-cursor" width="28" height="36" viewBox="0 0 28 36" style={{transform:`translate3d(${cursorX}px,${cursorY}px,${t<10?zComposer+6:zSide+6}px)`,opacity:visible(t,7.7,17.5)}}><path d="M2 2V30L10 23 17 35 22 32 15 20 27 19Z" fill="#273b30" stroke="#f2f7e9" strokeWidth="1.6"/></svg>
    </div>
   </div>
  </div>
  <div className="v2-section-label" style={{color:ink}}>{labels.map(({a,b,n,word})=><div key={n} style={{opacity:visible(t,a,b),transform:`translateY(${tween(t,a,a+.8,12,0)}px)`}}><span>{n}</span><b>{word}</b></div>)}</div>
  <div className="v2-end-brand" style={{opacity:clamp(physical(11.2,22,160)),transform:`translateY(${mix(24,0,physical(11.2,22,160))}px)`}}><span>Codex</span><i/><b>LIQUID GLASS</b></div>
  <div className="v2-end-note" style={{opacity:ease((seconds-12.0)/.65)}}>MADE TO FLOW</div>
  <div className="v2-grain"/>
 </AbsoluteFill>;
};
