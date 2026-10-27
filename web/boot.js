(() => {
 'use strict';
 const video=document.getElementById('boot-video');
 const finalFrame=document.getElementById('final-frame');
 const root=document.documentElement;
 const aspect=innerWidth/innerHeight;
 const format=Math.abs(Math.log(aspect/(4/3)))<=Math.abs(Math.log(aspect/(16/9)))?'standard':'wide';
 root.dataset.format=format;
 const revision='details-14s';root.dataset.revision=revision;
 video.src=`assets/startup-${format}.mp4?v=${revision}`;
 finalFrame.src=`assets/final-${format}.png?v=${revision}`;
 const bridge=window.chrome&&window.chrome.webview;
 const post=message=>{if(bridge)bridge.postMessage(message);};
 let playCount=0;
 const gate=new window.PlaybackGate(ready=>{
  video.pause();video.autoplay=false;video.loop=false;
  finalFrame.classList.add('held');document.documentElement.dataset.phase='held';
  post('animation-ended');
  if(!ready)post('video-holding');
 },()=>post('enter-workspace'));
 video.loop=false;
 video.addEventListener('ended',()=>gate.finish());
 video.addEventListener('play',()=>{if(gate.ended){video.pause();return;}document.documentElement.dataset.playCount=String(++playCount);post('video-playing');});
 video.addEventListener('error',()=>{post('media-error');gate.finish();});
 if(bridge)bridge.addEventListener('message',event=>{gate.receive(event.data);document.getElementById('slow-help').hidden=event.data!=='client-slow';});
 finalFrame.decode().catch(()=>{});
 post('page-ready');
 video.play().catch(()=>{video.muted=true;video.play().catch(()=>{post('media-error');gate.finish();});});
})();
