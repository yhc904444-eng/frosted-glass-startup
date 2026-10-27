const assert=require('node:assert/strict');
const PlaybackGate=require('../web/gate.js');
for(const order of ['ready-first','ended-first']){
 let entered=0,held=0;
 const gate=new PlaybackGate(()=>held++,()=>entered++);
 if(order==='ready-first'){gate.receive('client-ready');assert.equal(entered,0);gate.finish();}
 else{gate.finish();assert.equal(entered,0);gate.receive('client-ready');}
 gate.finish();gate.receive('client-ready');
 assert.equal(held,1);assert.equal(entered,1);
}
let entered=0;const unready=new PlaybackGate(()=>{},()=>entered++);unready.finish();unready.receive('client-slow');assert.equal(entered,0);
console.log('PASS completion + readiness gate, one hold, one entry, no timeout bypass');
