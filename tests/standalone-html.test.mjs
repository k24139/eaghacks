import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { repairInlineAssetTransport, removeExistingIntegration } from '../tools/standalone-html.mjs';

test('standalone asset preparation awaits bytes and produces fetch/XHR-compatible Blob URLs', async () => {
  const source = `
  window.__eagPrepareInlineAssets = function () {
    var entries = window.eaglercraftXOpts.assetsURI;
    for (var i=0; i<entries.length; i++) {
      var name=entries[i].url, id=name;
      entries[i].url = inlinePayloadPrefix + name;
    }
  };
  async function boot() { window.__eagPrepareInlineAssets(); window.ready=true; }
  boot();`;
  let resolveBytes;
  const bytes = new Promise(resolve => { resolveBytes=resolve; });
  const win = { eaglercraftXOpts: { assetsURI: [{ url:'assets.epk' }] } };
  const urls=[];
  const context={window:win, decodePayloadAsync:()=>bytes, Blob,
    URL:{createObjectURL(blob){urls.push(blob);return 'blob:verified-assets';}}};
  const completion=vm.runInNewContext(repairInlineAssetTransport(source), context);
  assert.equal(win.ready, undefined, 'game must wait for embedded asset decoding');
  resolveBytes(new Uint8Array([1,2,3]));
  await completion;
  assert.equal(win.ready, true);
  assert.equal(win.eaglercraftXOpts.assetsURI[0].url, 'blob:verified-assets#eaghacks-inline-assets.epk');
  assert.deepEqual([...new Uint8Array(await urls[0].arrayBuffer())], [1,2,3]);
  assert.equal(repairInlineAssetTransport(repairInlineAssetTransport(source)), repairInlineAssetTransport(source));
});

test('standalone repair refuses unfamiliar partial loaders', () => {
  assert.throws(()=>repairInlineAssetTransport('entries[i].url = inlinePayloadPrefix + name;'), /Unrecognized/);
});

test('refresh removes exactly the old integration and preserves payload bytes', () => {
  const payload='<script type="application/octet-stream" id="eag-inline-assets">AAA=</script>';
  const hook='/* EaglerHacks preboot: wrap the official eaglercraftXOpts screenChanged hook. */\n(function __eaghacksInstallOptsHook(){\n})();';
  const source=payload+hook+'<script id="eaghacks-integration">old code</script>';
  assert.equal(removeExistingIntegration(source),payload);
  assert.throws(()=>removeExistingIntegration(payload), /exactly one/);
  assert.throws(()=>removeExistingIntegration(source+hook), /exactly one/);
});

test('embedded server worker recognizes tagged Blob assets in fetch and XHR paths', () => {
  const loader='window.__eagPrepareInlineAssets = function () { entries[i].url = inlinePayloadPrefix + name; }; window.__eagPrepareInlineAssets();';
  const fetchCheck='url.indexOf(\\"eagler-inline-payload://assets.epk\\") !== 0';
  const xhrCheck='url.indexOf(\\"eagler-inline-payload://assets.epk\\") === 0';
  const repaired=repairInlineAssetTransport(loader+'\n'+fetchCheck+'\n'+xhrCheck);
  const lines=repaired.split('\n');
  const checks=lines.slice(-2).map(line=>line.replaceAll('\\"','"'));
  assert.equal(vm.runInNewContext(checks[0],{url:'blob:asset#eaghacks-inline-assets.epk'}),false);
  assert.equal(vm.runInNewContext(checks[1],{url:'blob:asset#eaghacks-inline-assets.epk'}),true);
  assert.equal(vm.runInNewContext(checks[1],{url:'blob:other'}),false);
});
