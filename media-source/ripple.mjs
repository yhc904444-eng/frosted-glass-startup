// Optical ripple shares the exact camera pose with the 14-second composition.
import {cameraAt as pose,RIPPLE_START,RIPPLE_END} from './src/details-timeline.mjs';
export {RIPPLE_START,RIPPLE_END};
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{const u=clamp(x);return u*u*u*(u*(u*6-15)+10);};
const lerp=(a,b,u)=>a+(b-a)*u;
function homography(t,W=1920,H=1080,scale=1){
 const p=pose(t),d=Math.PI/180;
 const cx=Math.cos(p.rx*d),sx=Math.sin(p.rx*d),cy=Math.cos(p.ry*d),sy=Math.sin(p.ry*d),cz=Math.cos(p.rz*d),sz=Math.sin(p.rz*d);
 // R = Rx * Ry * Rz, matching the CSS camera transform and two perspective parents.
 const r00=cy*cz,r01=-cy*sz,r10=cx*sz+sx*sy*cz,r11=cx*cz-sx*sy*sz,r20=sx*sz-cx*sy*cz,r21=sx*cz+cx*sy*sz;
 const a=p.s*r00,b=p.s*r01,c=-a*p.x-b*p.y,d0=p.s*r10,e=p.s*r11,f=-d0*p.x-e*p.y;
 const g=-2*p.s*r20/2700,h=-2*p.s*r21/2700,k=1-g*p.x-h*p.y;
 return [a*scale+W/2*g,b*scale+W/2*h,c*scale+W/2*k,d0*scale+H/2*g,e*scale+H/2*h,f*scale+H/2*k,g,h,k];
}
function invert(m){const [a,b,c,d,e,f,g,h,i]=m;const A=e*i-f*h,B=c*h-b*i,C=b*f-c*e,D=f*g-d*i,E=a*i-c*g,F=c*d-a*f,G=d*h-e*g,J=b*g-a*h,K=a*e-b*d;const k=1/(a*A+b*D+c*G);return [A,B,C,D,E,F,G,J,K].map(v=>v*k);}
function point(m,x,y){const z=m[6]*x+m[7]*y+m[8];return [(m[0]*x+m[1]*y+m[2])/z,(m[3]*x+m[4]*y+m[5])/z];}

export function applyRipple(input,t,{width:W=1920,height:H=1080,scale=1}={}){
 if(t<=RIPPLE_START||t>=RIPPLE_END)return input;
 const output=Buffer.from(input),m=homography(t,W,H,scale),inv=invert(m),age=t-RIPPLE_START;
 const corners=[[0,0],[1600,0],[1600,900],[0,900]].map(([x,y])=>point(m,x,y));
 const x0=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[0])))),x1=Math.min(W-1,Math.ceil(Math.max(...corners.map(p=>p[0]))));
 const y0=Math.max(0,Math.floor(Math.min(...corners.map(p=>p[1])))),y1=Math.min(H-1,Math.ceil(Math.max(...corners.map(p=>p[1]))));
 const waves=[0,.13,.26].map((lag,j)=>{
  const a=age-lag;if(a<=0)return null;
  return {radius:a*850,width:18+a*10,amp:[9.8,5.8,3.1][j]*ease(a/.12)*Math.exp(-a*.72)*(1-ease((age-1.8)/.55))};
 }).filter(Boolean);
 for(let y=y0;y<=y1;y++){
  let nx=inv[0]*x0+inv[1]*y+inv[2],ny=inv[3]*x0+inv[4]*y+inv[5],nw=inv[6]*x0+inv[7]*y+inv[8];
  for(let x=x0;x<=x1;x++,nx+=inv[0],ny+=inv[3],nw+=inv[6]){
   const X=nx/nw,Y=ny/nw;
   const qx=Math.abs(X-800)-774,qy=Math.abs(Y-450)-424;
   const inside=26-Math.sqrt(Math.max(qx,0)**2+Math.max(qy,0)**2)-Math.min(Math.max(qx,qy),0);
   if(inside<=0)continue;
   const dx=X-985,dy=Y-370,r=Math.sqrt(dx*dx+dy*dy),ux=dx/(r||1),uy=dy/(r||1);
   let displacement=0,shade=0;
   for(const wave of waves){
    const q=(r-wave.radius)/wave.width;if(Math.abs(q)>3.8)continue;
    const envelope=Math.exp(-q*q*.55),osc=Math.sin(q*2.15);
    displacement+=wave.amp*osc*envelope;
    // A directional highlight and a dark counter-slope read as curved water, rather than an outlined circle.
    shade+=wave.amp*envelope*(1.35*Math.cos(q*2.15)+2.15*osc*(-.50*ux-.72*uy));
   }
   const edge=ease(inside/24);displacement*=edge;shade*=.42+.58*edge;
   if(Math.abs(displacement)<.025&&Math.abs(shade)<.08)continue;
   const sx=X+ux*displacement,sy=Y+uy*displacement,z=m[6]*sx+m[7]*sy+m[8];
   const px=Math.max(0,Math.min(W-1.001,(m[0]*sx+m[1]*sy+m[2])/z));
   const py=Math.max(0,Math.min(H-1.001,(m[3]*sx+m[4]*sy+m[5])/z));
   const ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy;
   const i00=(iy*W+ix)*3,i10=i00+3,i01=i00+W*3,i11=i01+3,out=(y*W+x)*3;
   for(let channel=0;channel<3;channel++){
    const a=lerp(input[i00+channel],input[i10+channel],fx),b=lerp(input[i01+channel],input[i11+channel],fx);
    output[out+channel]=Math.max(0,Math.min(255,Math.round(lerp(a,b,fy)+shade)));
   }
  }
 }
 return output;
}
