(function(root){
 'use strict';
 class PlaybackGate{
  constructor(hold,enter){this.ready=false;this.ended=false;this.entered=false;this.hold=hold;this.enter=enter;}
  receive(state){if(this.entered)return;this.ready=state==='client-ready';this.tryEnter();}
  finish(){if(this.ended)return;this.ended=true;this.hold(this.ready);this.tryEnter();}
  tryEnter(){if(!this.ended||!this.ready||this.entered)return;this.entered=true;this.enter();}
 }
 if(typeof module!=='undefined'&&module.exports)module.exports=PlaybackGate;
 else root.PlaybackGate=PlaybackGate;
})(typeof window!=='undefined'?window:globalThis);
