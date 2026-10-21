import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {KeybindManager} from '../src/core/keybind-manager.js';
import {EventBus} from '../src/core/event-bus.js';
import {ModuleManager} from '../src/core/module-manager.js';
import {MockAdapter} from '../src/core/adapter.js';
import {AutoClicker} from '../src/modules/combat-modules.js';

function fixture(){
 const dom=new JSDOM('<body><canvas></canvas>'),win=dom.window;
 const keys=new KeybindManager({bus:new EventBus()});keys.attach(win);
 const game=new MockAdapter();game.setWorldLoaded(true);let attacks=0,uses=0;
 game.attack=()=>{attacks++;return true};game.useItem=()=>{uses++;return true};
 const manager=new ModuleManager({game,bus:new EventBus()});manager.client={keybinds:keys};
 const m=manager.register(new AutoClicker());m.settings.get('hold').set(true);m.settings.get('cps').set(20);m.enable();
 return {win,keys,m,counts:()=>({attacks,uses}),key:(type,code)=>win.dispatchEvent(new win.KeyboardEvent(type,{code,bubbles:true})),close:()=>{keys.dispose();win.close()}};
}
test('AutoClicker hold requires matching modifiers and stops when a modifier releases',()=>{
 const f=fixture();try{
  f.m.settings.get('activation-key').set({key:'KeyV',modifiers:{ctrl:true}});
  f.key('keydown','KeyV');f.m.onTick();assert.equal(f.counts().attacks,0);
  f.key('keydown','ControlRight');f.m.onTick();assert.equal(f.counts().attacks,1);
  f.key('keydown','ShiftLeft');f.m.onTick();assert.equal(f.counts().attacks,1);
  f.key('keyup','ShiftLeft');f.key('keyup','ControlRight');f.m.onTick();assert.equal(f.counts().attacks,1);
 }finally{f.close()}
});
test('mouse hold activates AutoClicker and releases through GUI, blur and disposal',()=>{
 const f=fixture();try{
  f.m.settings.get('activation-key').set({key:null,mouse:1,modifiers:{}});
  f.win.dispatchEvent(new f.win.MouseEvent('mousedown',{button:1,bubbles:true}));f.m.onTick();assert.equal(f.counts().attacks,1);
  f.keys.guiOpen=true;f.win.dispatchEvent(new f.win.MouseEvent('mouseup',{button:1,bubbles:true}));f.keys.guiOpen=false;f.m.onTick();assert.equal(f.counts().attacks,1);
  f.win.dispatchEvent(new f.win.MouseEvent('mousedown',{button:1,bubbles:true}));f.win.dispatchEvent(new f.win.FocusEvent('blur'));f.m.onTick();assert.equal(f.counts().attacks,1);
  f.win.dispatchEvent(new f.win.MouseEvent('mousedown',{button:1,bubbles:true}));f.keys.dispose();assert.equal(f.keys.heldKeys.size,0);
 }finally{f.close()}
});

test('adapter mounts the user-menu listener once and removes it on shutdown',async()=>{
 const {EaglercraftBrowserAdapter}=await import('../src/integration/eaglercraft-adapter.js');
 const dom=new JSDOM('<body></body>'),win=dom.window;
 win.HTMLCanvasElement.prototype.getContext=()=>({setTransform(){}});
 const added=[],removed=[],add=win.addEventListener.bind(win),remove=win.removeEventListener.bind(win);
 win.addEventListener=(...args)=>{added.push(args);add(...args)};win.removeEventListener=(...args)=>{removed.push(args);remove(...args)};
 const adapter=new EaglercraftBrowserAdapter({window:win,document:win.document});
 adapter.mount();adapter.mount();assert.equal(added.filter(([type,fn])=>type==='keydown'&&fn===adapter._userKeyDown).length,1);
 adapter.dispose();assert.equal(removed.filter(([type,fn,capture])=>type==='keydown'&&fn===adapter._userKeyDown&&capture===true).length,1);win.close();
});
