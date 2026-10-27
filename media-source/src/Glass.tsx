import React, {useLayoutEffect, useRef, useState} from 'react';
import {continueRender, delayRender, useCurrentFrame} from 'remotion';

const vert = `attribute vec2 p;varying vec2 v;void main(){v=p;gl_Position=vec4(p,0.,1.);}`;
const frag = `precision highp float;
varying vec2 v;uniform float time;uniform vec2 res;uniform float morph;uniform float lightMode;
float sm(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float sdf(vec3 p){
  p.xy=rot(.15*sin(time*.55))*p.xy;p.xz=rot(time*.19)*p.xz;
  vec3 q=p;q.y*=1.08;
  float a=length(q)-.92;
  float b=length(p-vec3(.58*sin(time*.6),.64*cos(time*.45),.16))-.48;
  float c=length(p-vec3(-.49*cos(time*.48),-.51*sin(time*.5),.25))-.41;
  float drop=sm(sm(a,b,.38),c,.36);
  vec3 z=p;z.xz=rot(-time*.11)*z.xz;
  float ring=length(vec2(length(z.xy)-.79,z.z))-.285;
  return mix(drop,ring,morph);
}
vec3 norm(vec3 p){vec2 e=vec2(.0015,0.);return normalize(vec3(sdf(p+e.xyy)-sdf(p-e.xyy),sdf(p+e.yxy)-sdf(p-e.yxy),sdf(p+e.yyx)-sdf(p-e.yyx)));}
vec3 env(vec3 d){
  d=normalize(d);vec3 base=mix(vec3(.20,.26,.27),vec3(.54,.6,.61),lightMode);
  float strip=exp(-pow((d.x+.25*d.y-.18)*5.5,2.));
  float top=pow(max(dot(d,normalize(vec3(-.45,.8,.4))),0.),28.);
  float side=pow(max(dot(d,normalize(vec3(1.,.1,.4))),0.),46.);
  float floor=pow(max(dot(d,normalize(vec3(.2,-.8,.2))),0.),12.);
  vec3 c=base+vec3(.64,.76,.79)*strip+vec3(1.,.96,.87)*top*3.+vec3(.66,.85,.85)*side*2.;
  c+=floor*vec3(.23,.25,.29);
  c+=vec3(.18,.1,.12)*pow(max(0.,sin(d.x*3.+d.y*2.+time*.13)),8.);
  return c;
}
void main(){
 vec2 uv=v;uv.x*=res.x/res.y;
 vec3 ro=vec3(0.,0.,4.1);vec3 rd=normalize(vec3(uv*1.47,-3.15));
 float t=0.;float h=0.;bool hit=false;
 for(int i=0;i<90;i++){vec3 p=ro+rd*t;h=sdf(p);if(h<.0015){hit=true;break;}t+=h*.85;if(t>8.)break;}
 if(!hit){gl_FragColor=vec4(0.);return;}
 vec3 p=ro+rd*t;vec3 n=norm(p);float fre=pow(1.-max(0.,dot(n,-rd)),4.5);
 vec3 refl=env(reflect(rd,n));vec3 r=refract(rd,n,.71);
 vec3 refr=env(r);float ca=.012;
 refr.r=env(refract(rd,n,.71-ca)).r;refr.b=env(refract(rd,n,.71+ca)).b;
 vec3 col=mix(refr*.92,refl,.11+.89*fre);
 float edge=pow(1.-max(0.,dot(n,-rd)),16.);col+=vec3(.85,.94,.93)*edge*.85;
 float spec=pow(max(dot(reflect(-normalize(vec3(-.6,1.,2.)),n),-rd),0.),130.);col+=spec*1.8;
 col=pow(col,vec3(.87));gl_FragColor=vec4(col,.42+.55*fre);
}`;

export const Glass: React.FC<{size?:number; morph?:number; light?:number; style?:React.CSSProperties}> = ({size=850,morph=0,light=0,style}) => {
 const frame=useCurrentFrame(); const canvas=useRef<HTMLCanvasElement>(null);
 const state=useRef<any>(null); const [handle]=useState(()=>delayRender('glass shader'));
 useLayoutEffect(()=>{
   const gl=canvas.current!.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:true})!;
   if(!gl)throw new Error('WebGL unavailable');
   const shader=(type:number,src:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'shader failed');return s;};
   const program=gl.createProgram()!;gl.attachShader(program,shader(gl.VERTEX_SHADER,vert));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('shader link failed');
   gl.useProgram(program);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const a=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
   state.current={gl,program};continueRender(handle);
   return ()=>{gl.deleteProgram(program);gl.deleteBuffer(b);};
 },[]);
 useLayoutEffect(()=>{
   if(!state.current)return;const {gl,program}=state.current;
   gl.viewport(0,0,canvas.current!.width,canvas.current!.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
   gl.uniform1f(gl.getUniformLocation(program,'time'),frame/30);gl.uniform2f(gl.getUniformLocation(program,'res'),size,size);
   gl.uniform1f(gl.getUniformLocation(program,'morph'),morph);gl.uniform1f(gl.getUniformLocation(program,'lightMode'),light);gl.drawArrays(gl.TRIANGLES,0,6);gl.finish();
 },[frame,morph,light,size]);
 return <canvas ref={canvas} width={Math.round(size*.85)} height={Math.round(size*.85)} style={{width:size,height:size,...style}}/>;
};
