import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {KeybindManager} from '../src/core/keybind-manager.js';
import {EventBus} from '../src/core/event-bus.js';

test('keybind disposal clears held keys and cancels pending capture exactly once',()=>{
 const dom=new JSDOM('<body><canvas></canvas>'),win=dom.window,manager=new KeybindManager({bus:new EventBus()});manager.attach(win);
 win.document.querySelector('canvas').dispatchEvent(new win.KeyboardEvent('keydown',{code:'KeyW',key:'w',bubbles:true}));assert.ok(manager.heldKeys.has('KeyW'));
 let calls=0;manager.capture(value=>{assert.equal(value,null);calls++});manager.dispose();manager.dispose();
 assert.equal(manager.heldKeys.size,0);assert.equal(manager.capturing,false);assert.equal(calls,1);
 win.document.dispatchEvent(new win.KeyboardEvent('keydown',{code:'KeyD',key:'d',bubbles:true}));assert.equal(manager.heldKeys.size,0);dom.window.close();
});

test('blur cancels capture once and releases keyboard state before focus returns',()=>{
 const dom=new JSDOM('<body><canvas></canvas>'),win=dom.window,manager=new KeybindManager({bus:new EventBus()});manager.attach(win);
 win.document.dispatchEvent(new win.KeyboardEvent('keydown',{code:'KeyW',key:'w',bubbles:true}));let calls=0;manager.capture(()=>calls++);
 win.dispatchEvent(new win.FocusEvent('blur'));win.dispatchEvent(new win.FocusEvent('blur'));assert.equal(manager.heldKeys.size,0);assert.equal(calls,1);assert.equal(manager.capturing,false);manager.dispose();dom.window.close();
});
