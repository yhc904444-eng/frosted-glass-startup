import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {P, p, mix, mono, Roller, BlackPlate, RedPlate, CyanPlate} from './Artwork';
import {sourceTime} from './timing';

const W=1520, H=840;

function glassShape(t:number, feed:number){
  const rx=mix(760,62,feed), ry=mix(420,62,feed), k=.5522848;
  const wave=(Math.sin(t*2.8)*3+Math.sin(t*4.1)*1.7)*(1-p(t,15.8,17.5))*feed;
  return `M ${rx},0 H ${W-rx}
    C ${W-rx+rx*k},0 ${W},${ry-ry*k} ${W},${ry}
    C ${W+wave},${mix(ry,H-ry,.33)} ${W-wave},${mix(ry,H-ry,.67)} ${W},${H-ry}
    C ${W},${H-ry+ry*k} ${W-rx+rx*k},${H} ${W-rx},${H}
    C ${W*.64},${H+wave} ${W*.36},${H-wave} ${rx},${H}
    C ${rx-rx*k},${H} 0,${H-ry+ry*k} 0,${H-ry}
    C ${-wave},${mix(H-ry,ry,.33)} ${wave},${mix(H-ry,ry,.67)} 0,${ry}
    C 0,${ry-ry*k} ${rx-rx*k},0 ${rx},0 Z`;
}

function Meniscus({x,y,horizontal,amount,color}:{x:number;y:number;horizontal?:boolean;amount:number;color:string}){
  const d=horizontal
    ? `M 0,${y} C 360,${y-15} 1110,${y+15} 1520,${y}`
    : `M ${x},0 C ${x-14},210 ${x+16},630 ${x},840`;
  return <g opacity={amount}>
    <path d={d} fill="none" stroke={color} strokeWidth="27" opacity=".15" filter="url(#waveSoft)"/>
    <path d={d} fill="none" stroke="#e8faff" strokeWidth="2.4" opacity=".72"/>
    <path d={d} transform={horizontal?'translate(0 13)':'translate(13 0)'} fill="none" stroke={color} strokeWidth="6" opacity=".17"/>
    <path d={d} transform={horizontal?'translate(0 28)':'translate(28 0)'} fill="none" stroke="#f1faff" strokeWidth="1" opacity=".18"/>
  </g>;
}

export const PrintFilm:React.FC=()=>{
  const frame=useCurrentFrame(),{fps}=useVideoConfig(),t=sourceTime(frame/fps);
  const feed=p(t,0,2.2),ui=p(t,16.9,18.8);
  const angle=mix(-8,-4,p(t,0,3))+4*p(t,13.8,17.7);
  const cameraScale=1.035+.08*p(t,2,4.5)-.08*p(t,11.2,16.8)-.065*ui;
  const cameraX=24*p(t,2,5)-24*p(t,11,16);
  const sx=mix(.24,1,feed),sy=mix(.42,1,feed);
  const shape=glassShape(t,feed);
  const black=p(t,2.35,5.85),red=p(t,6.15,9.65),cyan=p(t,10.05,13.5),press=p(t,14,16.75);
  const bx=mix(-190,1710,black),ry=mix(1040,-180,red),cx=mix(1700,-180,cyan),py=mix(-210,1050,press);
  const pass=(v:number)=>Math.sin(Math.PI*v);
  const pressure=Math.max(pass(black),pass(red),pass(cyan),pass(press));
  const flow=(1-p(t,15.3,16.75))*pressure;
  const lensZoom=mix(1.19,1.035,feed);
  const inverse=`translate(760 420) scale(${1/sx} ${1/sy}) translate(-760 -420) translate(-200 -120) translate(960 540) rotate(${-angle}) scale(${1/cameraScale}) translate(${-960-cameraX} -540)`;
  const travel=p(t,0,18.8);
  const phase=t<2.35?'LIQUID TO SURFACE':t<6.15?'01 / ETCHED LIGHT':t<10.05?'02 / WARM LAYER':t<14?'03 / COOL LAYER':t<17?'04 / FUSION':'READY TO CREATE';

  return <AbsoluteFill style={{backgroundColor:P.table}}>
    <Img src={staticFile('openai-mark.svg')} style={{position:'absolute',width:1,height:1,opacity:0}}/>
    <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="environment" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#192e3a"/><stop offset=".46" stopColor="#344c5b"/><stop offset="1" stopColor="#627885"/></linearGradient>
        <radialGradient id="vignette"><stop offset=".36" stopColor="#0b1a25" stopOpacity="0"/><stop offset="1" stopColor="#091722" stopOpacity=".55"/></radialGradient>
        <filter id="environmentSoft" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="98"/></filter>
        <filter id="shadowSoft" x="-30%" y="-40%" width="170%" height="190%"><feGaussianBlur stdDeviation="19"/></filter>
        <filter id="rollerShadow" x="-60%" y="-20%" width="240%" height="150%"><feGaussianBlur stdDeviation="13"/></filter>
        <filter id="waveSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
        <filter id="glassRefraction" x="-60" y="-60" width="1640" height="960" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency=".0025 .006" numOctaves="2" seed="17" result="noise"/>
          <feOffset in="noise" dx={t*13} dy={t*4} result="movingNoise"/>
          <feDisplacementMap in="SourceGraphic" in2="movingNoise" scale={mix(42,10,feed)+flow*15} xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <filter id="fluidEtching" x="-45" y="-45" width="1610" height="930" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency=".004 .012" numOctaves="1" seed="9" result="flowNoise"/>
          <feOffset in="flowNoise" dx={t*17} dy={-t*7} result="advected"/>
          <feDisplacementMap in="SourceGraphic" in2="advected" scale={flow*15} xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <linearGradient id="glassTint" x1="0" y1="0" x2=".85" y2="1"><stop stopColor="#d4eef5" stopOpacity=".17"/><stop offset=".36" stopColor="#99c3d8" stopOpacity=".045"/><stop offset="1" stopColor="#7caac4" stopOpacity=".17"/></linearGradient>
        <linearGradient id="rim" x1="0" y1="0" x2=".75" y2="1"><stop stopColor="#f8feff" stopOpacity=".94"/><stop offset=".26" stopColor="#dcf5ff" stopOpacity=".30"/><stop offset=".54" stopColor="#789eae" stopOpacity=".15"/><stop offset=".82" stopColor="#d1eeff" stopOpacity=".70"/><stop offset="1" stopColor="#5c8fa6" stopOpacity=".34"/></linearGradient>
        <linearGradient id="edgeDepth" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#dff7ff" stopOpacity=".42"/><stop offset=".35" stopColor="#b0d4e9" stopOpacity=".08"/><stop offset="1" stopColor="#142d3e" stopOpacity=".50"/></linearGradient>
        <linearGradient id="surfaceShine" x1="0" y1="0" x2="1" y2=".1"><stop stopColor="#fff" stopOpacity="0"/><stop offset=".35" stopColor="#fff" stopOpacity="0"/><stop offset=".48" stopColor="#f1fbff" stopOpacity=".14"/><stop offset=".52" stopColor="#e7f7ff" stopOpacity=".03"/><stop offset=".65" stopColor="#fff" stopOpacity="0"/></linearGradient>
        <linearGradient id="steel"><stop stopColor="#213946"/><stop offset=".16" stopColor="#a0bdc6"/><stop offset=".29" stopColor="#eefbff"/><stop offset=".48" stopColor="#7899aa"/><stop offset=".70" stopColor="#344f5c"/><stop offset=".87" stopColor="#bed8de"/><stop offset="1" stopColor="#243e4a"/></linearGradient>
        <linearGradient id="shaft"><stop stopColor="#4d7d91" stopOpacity=".25"/><stop offset=".5" stopColor="#e8faff" stopOpacity=".75"/><stop offset="1" stopColor="#325467" stopOpacity=".3"/></linearGradient>
        <linearGradient id="rollerGlass"><stop stopColor="#cbf4ff" stopOpacity=".30"/><stop offset=".16" stopColor="#fff" stopOpacity=".68"/><stop offset=".27" stopColor="#e0f3ff" stopOpacity=".14"/><stop offset=".63" stopColor="#badbef" stopOpacity=".035"/><stop offset=".84" stopColor="#8ad4e7" stopOpacity=".16"/><stop offset="1" stopColor="#102b3c" stopOpacity=".45"/></linearGradient>
        <linearGradient id="inkRubber"><stop stopColor="#d6f1ff" stopOpacity=".17"/><stop offset=".37" stopColor="#d6f1ff" stopOpacity=".04"/><stop offset=".79" stopColor="#789eae" stopOpacity=".06"/><stop offset="1" stopColor="#173b50" stopOpacity=".35"/></linearGradient>
        <linearGradient id="pressureRubber"><stop stopColor="#e6f8ff" stopOpacity=".30"/><stop offset=".28" stopColor="#fff" stopOpacity=".14"/><stop offset=".62" stopColor="#dbf8ff" stopOpacity=".025"/><stop offset="1" stopColor="#8abacc" stopOpacity=".28"/></linearGradient>
        <linearGradient id="rollerGloss"><stop stopColor="#071e2c" stopOpacity=".20"/><stop offset=".24" stopColor="#fff" stopOpacity=".34"/><stop offset=".44" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#113245" stopOpacity=".30"/></linearGradient>
        <pattern id="redDots" patternUnits="userSpaceOnUse" width="7" height="7"><circle cx="2" cy="2" r="1.4" fill={P.red}/></pattern>
        <pattern id="cyanDots" patternUnits="userSpaceOnUse" width="5" height="5"><circle cx="1.5" cy="1.5" r=".9" fill={P.cyan}/></pattern>
        <pattern id="cyanLines" patternUnits="userSpaceOnUse" width="9" height="9" patternTransform="rotate(45)"><path d="M0,0 V9" stroke={P.cyan} strokeWidth="2"/></pattern>
        <clipPath id="sheet"><path d={shape}/></clipPath>
        <clipPath id="blackWipe"><rect width={Math.max(0,bx)} height={H}/></clipPath>
        <clipPath id="redWipe"><rect y={Math.max(0,ry)} width={W} height={Math.max(0,H-ry)}/></clipPath>
        <clipPath id="cyanWipe"><rect x={Math.max(0,cx)} width={Math.max(0,W-cx)} height={H}/></clipPath>
        {Array.from({length:6},(_,i)=>{
          const a=(i*60-90)*Math.PI/180,b=((i+1)*60-90)*Math.PI/180;
          return <clipPath id={'markSector'+i} key={i}><path d={'M 0,0 L '+Math.cos(a)*40+','+Math.sin(a)*40+' L '+Math.cos(b)*40+','+Math.sin(b)*40+' Z'}/></clipPath>;
        })}
        <g id="studioEnvironment">
          <rect width="1920" height="1080" fill="url(#environment)"/>
          <g filter="url(#environmentSoft)">
            <ellipse cx={mix(370,520,travel)} cy="80" rx="390" ry="190" fill="#dbc5ac" opacity=".39"/>
            <ellipse cx={mix(1660,1530,travel)} cy="880" rx="550" ry="320" fill="#7aa7c8" opacity=".38"/>
            <ellipse cx="980" cy="570" rx="590" ry="160" fill="#112c3f" opacity=".52"/>
          </g>
          <g transform={'translate('+mix(-45,55,travel)+' 0) rotate(-21 960 540)'}>
            <rect x="258" y="-450" width="92" height="2050" fill="#e7e5d7" opacity=".095"/>
            <rect x="365" y="-450" width="4" height="2050" fill="#e7f5fc" opacity=".20"/>
            <rect x="1070" y="-450" width="140" height="2050" fill="#b9d6e9" opacity=".10"/>
            <rect x="1230" y="-450" width="7" height="2050" fill="#dcecf5" opacity=".19"/>
            <rect x="1632" y="-450" width="35" height="2050" fill="#e0eff4" opacity=".07"/>
          </g>
          <path d="M0,866 C560,812 1240,850 1920,772 V1080 H0 Z" fill="#122b3c" opacity=".25"/>
          <rect width="1920" height="1080" fill="url(#vignette)"/>
        </g>
      </defs>
      <use href="#studioEnvironment"/>
      <g transform={`translate(${960+cameraX} 540) scale(${cameraScale}) rotate(${angle}) translate(-960 -540)`}>
        <g transform={`translate(200 120) translate(760 420) scale(${sx} ${sy}) translate(-760 -420)`}>
          <path d={shape} transform="translate(18 28)" fill="#031320" opacity=".24" filter="url(#shadowSoft)"/>
          <path d={shape} transform="translate(16 25)" fill="none" stroke="#a3ddea" strokeWidth="9" opacity={.14+.08*pressure} filter="url(#waveSoft)"/>
          <path d={shape} transform="translate(7 10)" fill="url(#edgeDepth)" stroke="#caedfb" strokeOpacity=".28" strokeWidth="2"/>
          <g clipPath="url(#sheet)" style={{isolation:'isolate'}}>
            <g transform={`translate(760 420) scale(${lensZoom}) translate(-760 -420)`} filter="url(#glassRefraction)">
              <g transform={inverse}><use href="#studioEnvironment"/></g>
            </g>
            <path d={shape} fill="url(#glassTint)"/>
            <rect width="314" height={H} fill="#d2ecf7" opacity={ui*.065}/>
            <g filter="url(#fluidEtching)" style={{mixBlendMode:'screen'}}>
              <g clipPath="url(#blackWipe)" opacity=".88"><BlackPlate t={t}/></g>
              <g clipPath="url(#redWipe)" opacity=".82"><RedPlate t={t}/></g>
              <g clipPath="url(#cyanWipe)" opacity=".76"><CyanPlate t={t}/></g>
            </g>
            <g opacity={.72*(1-ui)}>
              {t>=2.35&&t<5.85?<Meniscus x={bx+78} y={0} amount={pass(black)} color="#c6edf4"/>:null}
              {t>=6.15&&t<9.65?<Meniscus x={0} y={ry-76} horizontal amount={pass(red)} color="#f0c8b6"/>:null}
              {t>=10.05&&t<13.5?<Meniscus x={cx-78} y={0} amount={pass(cyan)} color="#a6e8f3"/>:null}
              {t>=14&&t<16.75?<Meniscus x={0} y={py+88} horizontal amount={pass(press)} color="#d4f1ff"/>:null}
            </g>
            <rect x={mix(-1280,1850,travel)} y="-600" width="1150" height="2100" fill="url(#surfaceShine)" transform="rotate(-23 760 420)"/>
            <path d={shape} fill="none" stroke="url(#rim)" strokeWidth="23" opacity=".12"/>
          </g>
          <path d={shape} fill="none" stroke="url(#rim)" strokeWidth="2.8"/>
          <path d={shape} transform="translate(2 3)" fill="none" stroke="#d6f2fc" strokeWidth=".9" opacity=".25"/>
          {t>=2.1&&t<6.05?<Roller x={bx} y={420} color="#b4e6f7" roll={bx}/>:null}
          {t>=5.9&&t<9.85?<Roller x={760} y={ry} horizontal color={P.red} roll={ry}/>:null}
          {t>=9.8&&t<13.8?<Roller x={cx} y={420} color={P.cyan} roll={cx}/>:null}
          {t>=13.8&&t<16.95?<Roller x={760} y={py} horizontal color="#d5f1fc" pressure roll={py}/>:null}
        </g>
      </g>
      <g fill="#d6e6eb" opacity=".64" fontFamily={mono} fontSize="13" letterSpacing="3">
        <text x="74" y="1038">Nº 001 / {phase}</text>
        <text x="1844" y="1038" textAnchor="end">LIQUID GLASS / CHROMATIC PRESS</text>
      </g>
      <g transform="translate(1807 44)" opacity=".76">{[P.ink,P.red,P.cyan].map((c,i)=><rect key={c} x={i*17} width="11" height="11" rx="3" fill={c}/>)}</g>
    </svg>
  </AbsoluteFill>;
};
