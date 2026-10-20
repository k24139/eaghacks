import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bootTestClient} from './helpers.mjs';

test('ClickGUI category refresh, reset and shutdown release settings listeners',async()=>{
 const {client:c,doc,win}=await bootTestClient();c.ticker.stop();c.clickgui.show();
 const m=c.modules.get('zoom'),setting=m.settings.get('factor'),baseline=setting._listeners.length;
 const expand=(root)=>{
  const row=[...root.querySelectorAll('.mt-row')].find(n=>n.textContent.includes('Zoom'));
  assert.ok(row);row.dispatchEvent(new win.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
 };
 const category=doc.querySelector('.mt-window[data-category="Render"]');expand(category);
 assert.equal(setting._listeners.length,baseline+1);
 for(let i=0;i<3;i++){
  const reset=[...category.querySelectorAll('button')].find(b=>b.textContent==='Reset settings');
  assert.ok(reset);reset.click();assert.equal(setting._listeners.length,baseline+1,'reset retains only current controls');
 }
 c.clickgui.refreshAll();assert.equal(setting._listeners.length,baseline,'category refresh removes callbacks');
 for(let i=0;i<3;i++){
  expand(category);assert.equal(setting._listeners.length,baseline+1);
  c.clickgui.refreshAll();assert.equal(setting._listeners.length,baseline);
 }
 expand(category);c.stop();
 assert.equal(setting._listeners.length,baseline,'shutdown removes callbacks');
});
