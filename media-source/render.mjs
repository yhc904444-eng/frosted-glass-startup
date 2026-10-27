import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {bundle} from '@remotion/bundler';
import {selectComposition,renderMedia,ensureBrowser} from '@remotion/renderer';
import sharp from 'sharp';
import {applyRipple} from './ripple.mjs';
import {FPS,DURATION,TOTAL_FRAMES} from './src/details-timeline.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(import.meta.url);
const format=process.argv.includes('--wide')?'wide':'standard';
const id=format==='wide'?'DetailsWide':'DetailsStandard',scale=format==='wide'?2:1.5;
const width=format==='wide'?3840:2880,height=2160;
const out=path.join(root,'renders',format),assets=path.resolve(root,'../assets');
await mkdir(out,{recursive:true});await mkdir(assets,{recursive:true});
sharp.concurrency(2);
await ensureBrowser();
const serveUrl=await bundle({entryPoint:path.join(root,'src/index-startup-details.tsx')});
const composition=await selectComposition({serveUrl,id,chromiumOptions:{gl:'angle'}});
const base=path.join(out,'base.mp4'),output=path.join(assets,`startup-${format}.mp4`);
await renderMedia({serveUrl,composition,scale,outputLocation:base,codec:'h264',crf:14,muted:true,pixelFormat:'yuv420p',concurrency:2,chromiumOptions:{gl:'angle'},timeoutInMilliseconds:90000,onProgress:({progress})=>process.stdout.write(`\rBase ${format}: ${Math.floor(progress*100)}%`)});
const platform=process.platform==='win32'?'win32-x64-msvc':process.platform==='darwin'?(process.arch==='arm64'?'darwin-arm64':'darwin-x64'):'linux-x64-gnu';
const ffmpeg=path.join(path.dirname(require.resolve(`@remotion/compositor-${platform}/package.json`)),process.platform==='win32'?'ffmpeg.exe':'ffmpeg');
const common=['-hide_banner','-loglevel','error','-y'];
const decoder=spawn(ffmpeg,[...common,'-i',base,'-an','-vf','format=rgb24','-c:v','rawvideo','-f','image2pipe','pipe:1'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
const encoder=spawn(ffmpeg,[...common,'-f','image2pipe','-c:v','png','-framerate',String(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','14','-pix_fmt','yuv420p','-movflags','+faststart','-t',String(DURATION),output],{stdio:['pipe','ignore','pipe'],windowsHide:true});
let errors='';for(const child of [decoder,encoder])child.stderr.on('data',chunk=>errors=(errors+chunk).slice(-4000));
const decoded=once(decoder,'close'),encoded=once(encoder,'close');
let frame=0,offset=0,buffer=Buffer.alloc(width*height*3);
try{
 for await(const chunk of decoder.stdout){
  for(let position=0;position<chunk.length;){
   const size=Math.min(buffer.length-offset,chunk.length-position);chunk.copy(buffer,offset,position,position+size);offset+=size;position+=size;
   if(offset===buffer.length){
    const changed=applyRipple(buffer,frame/FPS,{width,height,scale});
    const png=await sharp(changed,{raw:{width,height,channels:3}}).png({compressionLevel:0,adaptiveFiltering:false}).toBuffer();
    if(!encoder.stdin.write(png))await once(encoder.stdin,'drain');
    if(++frame%90===0)process.stdout.write(`\nRefraction ${format}: ${frame}/${TOTAL_FRAMES}`);offset=0;
   }
  }
 }
 encoder.stdin.end();const [dc]=await decoded,[ec]=await encoded;
 if(dc||ec||frame!==TOTAL_FRAMES||offset)throw Error(`Incomplete render: ${dc},${ec},${frame}. ${errors}`);
 execFileSync(ffmpeg,[...common,'-ss',String((TOTAL_FRAMES-1)/FPS),'-i',output,'-frames:v','1','-c:v','png',path.join(assets,`final-${format}.png`)],{windowsHide:true});
 process.stdout.write(`\nSaved ${output}\n`);
}catch(error){decoder.kill();encoder.kill();throw error;}
