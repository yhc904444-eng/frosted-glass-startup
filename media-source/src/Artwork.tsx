import React from 'react';
import {brandPath} from './brandPath';

// All movement is a pure function of the frame. There is deliberately no WebGL,
// wall-clock animation, random seed, or browser transition in this composition.
export const P = {ink: '#e6f3fa', red: '#ff8e76', cyan: '#6bdaee', paper: '#172b36', table: '#17242e'};
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const ease = (n: number) => {const x = clamp(n); return x*x*(3-2*x);};
export const p = (t: number, a: number, b: number) => ease((t-a)/(b-a));
export const mix = (a: number, b: number, n: number) => a+(b-a)*n;
export const font = 'Bahnschrift, Arial, sans-serif';
export const mono = 'Consolas, monospace';

const Cross: React.FC<{x: number; y: number; color?: string; size?: number}> = ({x,y,color=P.ink,size=13}) => (
  <g transform={`translate(${x} ${y})`} stroke={color} fill="none" strokeWidth="1.5">
    <path d={`M ${-size},0 H ${size} M 0,${-size} V ${size}`} />
    <circle r={size*.45}/>
  </g>
);

const Roller: React.FC<{x: number; y: number; horizontal?: boolean; color: string; roll: number; pressure?: boolean}> = ({x,y,horizontal=false,color,roll,pressure=false}) => {
  const length = horizontal ? 1636 : 962;
  const w = pressure ? 142 : 116;
  return <g transform={`translate(${x} ${y}) ${horizontal ? 'rotate(-90)' : ''}`}>
    <rect x={-w/2-16} y={-length/2-20} width={w+32} height={length+40} rx="28" fill="#061721" opacity=".24" filter="url(#rollerShadow)" transform="translate(25 18)"/>
    <rect x="-13" y={-length/2-62} width="26" height={length+124} rx="12" fill="url(#shaft)"/>
    {[-1,1].map(side => <g key={side} transform={`translate(0 ${side*(length/2+22)})`}>
      <rect x="-87" y="-31" width="174" height="62" rx="13" fill="#3c535d" stroke="#747971" strokeWidth="2"/>
      <rect x="-65" y="-23" width="130" height="46" rx="9" fill="#20333e"/>
      {[-61,61].map(sx => <g key={sx} transform={`translate(${sx} 0)`}><circle r="10" fill="url(#steel)"/><path d="M-4,-3 L4,3" stroke="#18201b" strokeWidth="2"/></g>)}
      <circle r="24" fill="url(#steel)" stroke="#181f1b" strokeWidth="2"/><circle r="13" fill="#252f29"/><circle r="5" fill="#a4a99c"/>
    </g>)}
    <rect x={-w/2} y={-length/2} width={w} height={length} rx={w*.48} fill="url(#rollerGlass)" stroke="#c5e8f0" strokeOpacity=".46" strokeWidth="2"/>
    <rect x={-w/2+7} y={-length/2+27} width={w-14} height={length-54} rx="16" fill={pressure ? 'url(#pressureRubber)' : 'url(#inkRubber)'}/>
    <rect x={-w/2+12} y={-length/2+42} width={w-24} height={length-84} rx="10" fill={color} opacity={pressure ? .08 : .24}/>
    <rect x={-w/2+12} y={-length/2+42} width={w-24} height={length-84} rx="10" fill="url(#rollerGloss)"/>
    {Array.from({length: 7}, (_,i) => {
      const phase = ((roll/50+i/7)%1+1)%1;
      const xx = Math.sin(phase*Math.PI*2)*w*.38;
      return <path key={i} d={`M ${xx},${-length/2+8} v 15 M ${xx},${length/2-23} v 15`} stroke="#111914" strokeWidth={2.5} opacity={Math.max(.1,Math.cos(phase*Math.PI*2)*.45+.25)}/>;
    })}
    <path d={`M ${-w*.24},${-length/2+45} V ${length/2-45}`} stroke="#ecfbff" strokeWidth="5" opacity=".25"/>
  </g>;
};

const offsets = [[-13,-4,-26],[8,-10,17],[15,3,29],[3,10,-23],[-8,12,18],[-14,3,-17]];
const FragmentMark: React.FC<{t: number; color: string; layer: number}> = ({t,color,layer}) => {
  const ui = p(t,16.9,18.8);
  const cx = mix(1080,950,ui), cy=mix(425,290,ui), size=mix(435,122,ui);
  const registration = p(t,14.25,16.65);
  const driftX = (layer===1 ? 26 : layer===2 ? -19 : 0)*(1-registration);
  const driftY = (layer===1 ? -15 : layer===2 ? 18 : 0)*(1-registration);
  return <g transform={`translate(${cx+driftX} ${cy+driftY}) scale(${size/24})`}>
    {offsets.map(([dx,dy,rotation],i) => {
      // The pressure roller reaches each row in order; the original path is
      // only repositioned, never redrawn or interpolated into another shape.
      const local = p(t,14.15+i*.14,15.9+i*.14);
      return <g key={i} transform={`translate(${dx*(1-local)} ${dy*(1-local)}) rotate(${rotation*(1-local)})`}>
        <g clipPath={`url(#markSector${i})`}><path d={brandPath} transform="translate(-12 -12)" fill={color}/></g>
      </g>;
    })}
  </g>;
};

const EditorialType: React.FC<{t: number; color: string; layer: number}> = ({t,color,layer}) => {
  const align=p(t,14.4,16.5), ui=p(t,16.9,18.8);
  const x=mix(74,49,ui)+(layer===1 ? 14 : layer===2 ? -10 : 0)*(1-align);
  const y=mix(207,166,ui)+(layer===1 ? -11 : layer===2 ? 9 : 0)*(1-align);
  return <g transform={`translate(${x} ${y}) scale(${mix(1,.285,ui)})`} fill={color}>
    <text fontFamily={font} fontWeight="900" fontSize="133" letterSpacing="-7" x="0" y="0">IDEAS</text>
    <text fontFamily={font} fontWeight="900" fontSize="133" letterSpacing="-7" x="0" y="128">TAKE</text>
    <text fontFamily={font} fontWeight="900" fontSize="133" letterSpacing="-7" x="0" y="256">SHAPE.</text>
    <path d="M 4,291 H 458" stroke={color} strokeWidth="3"/>
    <text fontFamily={mono} fontSize="15" letterSpacing="3" x="5" y="323">A WORK IN THE MAKING</text>
  </g>;
};

const BlackPlate: React.FC<{t:number}> = ({t}) => {
  const ui=p(t,16.9,18.8);
  const align=p(t,14,16.5);
  return <g fill={P.ink}>
    <g opacity={1-p(t,16.9,18.1)}>
      <text x="76" y="69" fontFamily={font} fontWeight="700" fontSize="19" letterSpacing="6">FORMED IN GLASS</text>
      <text x="1470" y="69" textAnchor="end" fontFamily={mono} fontSize="15" letterSpacing="3">VOL. 01 / 2026</text>
      <path d="M 74,93 H 1448" stroke={P.ink} strokeWidth="1.5"/>
      <path d="M 74,756 H 1448" stroke={P.ink} strokeWidth="1.5"/>
      <text x="77" y="786" fontFamily={mono} fontSize="14" letterSpacing="3">THOUGHT → FORM → POSSIBILITY</text>
      <text x="1447" y="786" textAnchor="end" fontFamily={mono} fontSize="14" letterSpacing="3">LIGHT / COLOR / REFRACTION</text>
    </g>
    <EditorialType t={t} color={P.ink} layer={0}/>
    <g transform={`translate(${mix(0,-58,ui)} ${mix(0,-175,ui)}) scale(${mix(1,.52,ui)})`} opacity={1-p(t,16.9,18.1)}>
      {Array.from({length:18},(_,i)=><path key={i} d={`M ${618+i*16},146 V ${694-i*9}`} fill="none" stroke={P.ink} strokeWidth={i%3===0 ? 2 : .8} opacity={.25+i*.024}/>)}
      <circle cx="1070" cy="425" r="302" fill="none" stroke={P.ink} strokeWidth="1"/>
      <circle cx="1070" cy="425" r="271" fill="none" stroke={P.ink} strokeWidth=".7" strokeDasharray="2 9"/>
      <path d="M 685,425 H 1455 M 1070,111 V 738" stroke={P.ink} strokeWidth=".8" strokeDasharray="5 9"/>
      <text transform="translate(1438 576) rotate(-90)" fontFamily={mono} fontSize="13" letterSpacing="5">PRECISION IS A KIND OF CARE</text>
    </g>
    <FragmentMark t={t} color={P.ink} layer={0}/>
    <g stroke={P.ink} strokeWidth="1.5" fill="none">
      {[ [40,36],[1480,36],[40,804],[1480,804] ].map(([x,y],i)=><Cross key={i} x={mix(x,i%2 ? 1480 : 40,ui)} y={y} size={11} />)}
      <path d={`M ${mix(586,314,ui)},${mix(124,0,ui)} V ${mix(714,840,ui)}`} opacity={mix(.28,.45,ui)}/>
      <path d={`M ${mix(586,314,ui)},${mix(124,92,ui)} H ${mix(1448,1520,ui)}`} opacity={ui}/>
    </g>
    <g transform={`translate(${mix(75,40,ui)} ${mix(620,357,ui)})`}>
      <rect width={mix(426,232,ui)} height={mix(82,42,ui)} rx="14" fill="#cceaf5" fillOpacity=".13" stroke={P.ink} strokeOpacity=".32"/>
      <text x={mix(22,14,ui)} y={mix(52,27,ui)} fill={P.ink} fontFamily={font} fontSize={mix(35,17,ui)} fontWeight="600" letterSpacing={mix(5,2,ui)}>NEW WORK</text>
      <path d={`M ${mix(370,202,ui)},${mix(28,15,ui)} l 9,9 -9,9 M ${mix(352,190,ui)},${mix(37,24,ui)} h 25`} stroke={P.ink} strokeWidth="2" fill="none"/>
    </g>
    <g opacity={p(t,18.15,18.7)} fontFamily={font}>
      <text x="42" y="61" fontWeight="700" fontSize="29" letterSpacing="3">CODEX</text>
      <text x="355" y="57" fontSize="15" letterSpacing="3">WORKSPACE / 001</text>
      <circle cx="1460" cy="47" r="5" fill={P.red}/>
      <text x="951" y="418" fontWeight="600" fontSize="43" textAnchor="middle" letterSpacing="-1.5">Ideas take shape here.</text>
      <text x="951" y="461" fontFamily={mono} fontSize="14" textAnchor="middle" letterSpacing="3" opacity=".65">A SPACE FOR WHAT COMES NEXT</text>
      <rect x="600" y="540" width="700" height="94" rx="26" fill="#c9e6f4" fillOpacity=".11" stroke="#d8f1fc" strokeOpacity=".3"/>
      <text x="628" y="596" fontSize="22" opacity=".55">Start with an idea</text>
      <path d="M 1237,584 H 1264 M 1253,573 L 1264,584 1253,595" fill="none" stroke={P.ink} strokeWidth="2.2"/>
      <text x="47" y="453" fontSize="15" opacity=".55" letterSpacing="1.5">RECENT WORK</text>
      {[0,1,2].map(i=><g key={i} opacity={.4-i*.08}>
        <path d={`M 48,${492+i*48} h 15 v 18 H 48 Z`} fill="none" stroke={P.ink}/>
        <path d={`M 79,${497+i*48} H ${240-i*24} M 79,${506+i*48} H ${188+i*12}`} stroke={P.ink} strokeWidth="2" opacity=".7"/>
      </g>)}
      <text x="950" y="756" fontFamily={mono} fontSize="12" textAnchor="middle" letterSpacing="4" opacity=".5">MADE TO BEGIN</text>
    </g>
  </g>;
};

const RedPlate: React.FC<{t:number}> = ({t}) => {
  const ui=p(t,16.9,18.8), align=p(t,14.4,16.5);
  return <g fill={P.red}>
    <EditorialType t={t} color={P.red} layer={1}/>
    <FragmentMark t={t} color={P.red} layer={1}/>
    <g opacity={1-p(t,16.9,18.1)}>
      <rect x="77" y="602" width="431" height="17" transform={`rotate(${mix(-2,0,align)} 77 602)`}/>
      <rect x="73" y="719" width="433" height="13"/>
      <path d={`M ${mix(1377,1335,align)},169 v 60 h 60 v -60 Z`} fill="url(#redDots)"/>
      <circle cx={mix(1086,1070,align)} cy={mix(435,425,align)} r="304" fill="none" stroke={P.red} strokeWidth="3" strokeDasharray="624 1286" transform={`rotate(${-55*(1-align)} 1070 425)`}/>
      <text x="702" y="703" fontFamily={font} fontWeight="700" fontSize="58" letterSpacing="2">LAYER / 02</text>
      <g transform={`translate(${mix(18,0,align)} ${mix(-12,0,align)})`}><Cross x={573} y={120} color={P.red}/><Cross x={1432} y={728} color={P.red}/></g>
      <text x="1400" y="144" fontFamily={mono} fontSize="13" letterSpacing="2" textAnchor="end">R + 026 / −015</text>
    </g>
    <rect x="40" y="414" width={mix(0,232,ui)} height="3"/>
  </g>;
};

const CyanPlate: React.FC<{t:number}> = ({t}) => {
  const ui=p(t,16.9,18.8), align=p(t,14.4,16.5);
  return <g fill={P.cyan}>
    <EditorialType t={t} color={P.cyan} layer={2}/>
    <FragmentMark t={t} color={P.cyan} layer={2}/>
    <g opacity={1-p(t,16.9,18.1)}>
      <path d={`M ${mix(734,716,align)},188 h 194 v 25 H ${mix(734,716,align)} Z`}/>
      <path d="M 568,637 H 1460 V 669 H 568 Z" fill="url(#cyanLines)"/>
      <circle cx={mix(1050,1070,align)} cy={mix(441,425,align)} r="304" fill="none" stroke={P.cyan} strokeWidth="3" strokeDasharray="480 1430" transform={`rotate(${mix(93,67,align)} 1070 425)`}/>
      <g transform={`translate(${mix(-20,0,align)} ${mix(16,0,align)})`}><Cross x={573} y={120} color={P.cyan}/><Cross x={1432} y={728} color={P.cyan}/></g>
      <rect x="78" y="548" width="428" height="26" fill="url(#cyanDots)"/>
      <text x="705" y="733" fontFamily={mono} fontSize="13" letterSpacing="5">C − 019 / +018</text>
    </g>
  </g>;
};

export {Roller, BlackPlate, RedPlate, CyanPlate};
