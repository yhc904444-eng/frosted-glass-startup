import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const directory=process.argv[2]||path.resolve('assets');
function boxes(data,start=0,end=data.length){
 const result=[];
 for(let p=start;p+8<=end;){let size=data.readUInt32BE(p),head=8;const type=data.toString('ascii',p+4,p+8);if(size===1){size=Number(data.readBigUInt64BE(p+8));head=16;}if(size===0)size=end-p;assert(size>=head&&p+size<=end,'Invalid MP4 atom');result.push({type,start:p+head,end:p+size});p+=size;}
 return result;
}
function child(data,box,name){return boxes(data,box.start,box.end).find(b=>b.type===name);}
const results=[];
for(const [format,width] of [['standard',2880],['wide',3840]]){
 const filename=path.join(directory,`startup-${format}.mp4`),data=fs.readFileSync(filename);
 const moov=boxes(data).find(b=>b.type==='moov');assert(moov,'Missing MP4 metadata');
 const tracks=[];
 for(const track of boxes(data,moov.start,moov.end).filter(b=>b.type==='trak')){
  const media=child(data,track,'mdia'),handler=child(data,media,'hdlr'),type=data.toString('ascii',handler.start+8,handler.start+12),header=child(data,media,'mdhd'),v=data[header.start],base=header.start+(v===1?20:12),timescale=data.readUInt32BE(base),duration=v===1?Number(data.readBigUInt64BE(base+4)):data.readUInt32BE(base+4);
  const tkhd=child(data,track,'tkhd'),dimensions={width:data.readUInt32BE(tkhd.end-8)/65536,height:data.readUInt32BE(tkhd.end-4)/65536};
  const minf=child(data,media,'minf'),stbl=child(data,minf,'stbl'),stsz=child(data,stbl,'stsz');
  tracks.push({type,...dimensions,duration:duration/timescale,frames:stsz?data.readUInt32BE(stsz.start+8):null});
 }
 assert.equal(tracks.length,1);assert.equal(tracks[0].type,'vide');assert.equal(tracks[0].width,width);assert.equal(tracks[0].height,2160);assert.equal(tracks[0].duration,32);assert.equal(tracks[0].frames,960);
 results.push({format,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex'),audioStreams:0,...tracks[0]});
}
console.log(JSON.stringify({passed:true,files:results},null,2));
