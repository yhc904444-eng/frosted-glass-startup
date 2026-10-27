export const FPS=30;
export const DURATION=14;
export const TOTAL_FRAMES=FPS*DURATION;
export const RIPPLE_START=9.9;
export const RIPPLE_END=12.25;
export const clamp=x=>Math.max(0,Math.min(1,x));
const mix=(a,b,u)=>a+(b-a)*u;
const story=[[0,0],[1.25,4.4],[2.10,7],[3.45,10],[5.65,17.2],[7.75,22.5],[9.8,26.2],[9.9,26.3],[12.25,29.7],[13,32],[14,32]];
export function sceneTime(t){
 let i=0;while(i<story.length-2&&t>story[i+1][0])i++;
 const [a,x]=story[i],[b,y]=story[i+1];return mix(x,y,clamp((t-a)/(b-a)));
}
const poses=[
 [0,{s:2.40,x:1050,y:730,rx:22,ry:-15,rz:-11}],
 [.75,{s:2.0,x:1070,y:730,rx:18,ry:-12,rz:-8}],
 [1.65,{s:1.15,x:982,y:744,rx:10,ry:-6,rz:-3}],
 [2.05,{s:1.15,x:1000,y:744,rx:8,ry:1,rz:-1}],
 [2.7,{s:2.05,x:1385,y:782,rx:7,ry:6,rz:2}],
 [3.12,{s:2.05,x:1390,y:782,rx:5,ry:4,rz:1}],
 [3.55,{s:1.05,x:990,y:650,rx:10,ry:-3,rz:-1}],
 [4.35,{s:1.43,x:300,y:421,rx:10,ry:-10,rz:-4}],
 [5.15,{s:1.45,x:340,y:421,rx:7,ry:-6,rz:-2}],
 [5.55,{s:1.25,x:380,y:425,rx:11,ry:-10,rz:-3}],
 [6.4,{s:.75,x:795,y:460,rx:24,ry:-26,rz:-5}],
 [7.45,{s:.73,x:800,y:450,rx:22,ry:-23,rz:-5}],
 [8.6,{s:.80,x:800,y:450,rx:12,ry:-12,rz:-2}],
 [9.8,{s:.84,x:800,y:450,rx:4,ry:3,rz:.5}],
 [10.8,{s:.84,x:800,y:450,rx:2,ry:-1,rz:0}],
 [12.4,{s:.80,x:800,y:450,rx:0,ry:0,rz:0}],
 [13,{s:.80,x:800,y:450,rx:0,ry:0,rz:0}],
 [14,{s:.80,x:800,y:450,rx:0,ry:0,rz:0}],
];
// Time-aware cubic Hermite interpolation shares velocity at camera keyframes.
// Final repeated poses remove residual drift before the exact held frame.
export function cameraAt(t){
 t=Math.max(0,Math.min(14,t));
 let i=0;while(i<poses.length-2&&t>poses[i+1][0])i++;
 const [a,p]=poses[i],[b,q]=poses[i+1],u=clamp((t-a)/(b-a));
 const [before,r]=poses[Math.max(0,i-1)],[after,s]=poses[Math.min(poses.length-1,i+2)];
 const result={};
 for(const key of Object.keys(p)){
  const m0=i===0?0:(q[key]-r[key])/(b-before);
  const m1=i+2>=poses.length?0:(s[key]-p[key])/(after-a);
  result[key]=(2*u**3-3*u*u+1)*p[key]+(u**3-2*u*u+u)*(b-a)*m0+(-2*u**3+3*u*u)*q[key]+(u**3-u*u)*(b-a)*m1;
 }
 return result;
}
