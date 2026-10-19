import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureDom, FakeStorage, bootTestClient, sleep } from "./helpers.mjs";

ensureDom();

test("settings survive a save/reload cycle", async () => {
  const storage = new FakeStorage();
  const a = await bootTestClient({ storage, inWorld: true });
  const rangeSetting = a.client.modules.get("kill-aura").settings.get("range");
  rangeSetting.set(4.5);
  a.client.config.save(true);
  const raw = storage.getItem("meteor.eagler.default.config");
  assert.ok(raw, "config written to storage");

  // New client, same storage.
  const b = await bootTestClient({ storage, inWorld: true });
  const reloaded = b.client.modules.get("kill-aura").settings.get("range");
  assert.equal(reloaded.value, 4.5);
});

test("module enabled state is restored", async () => {
  const storage = new FakeStorage();
  const a = await bootTestClient({ storage });
  const fps = a.client.modules.get("fps-display");
  fps.enable();
  a.client.config.save(true);

  const b = await bootTestClient({ storage });
  assert.equal(b.client.modules.get("fps-display").active, true);
});

test("keybinds persist", async () => {
  const storage = new FakeStorage();
  const a = await bootTestClient({ storage });
  a.client.modules.get("zoom").bind.set({ key: "KeyZ", mouse: null, modifiers: {} });
  a.client.config.save(true);
  const b = await bootTestClient({ storage });
  assert.equal(b.client.modules.get("zoom").bind.value.key, "KeyZ");
});

test("corrupt JSON is quarantined and startup continues", async () => {
  const storage = new FakeStorage();
  storage.setItem("meteor.eagler.default.config", "{ this is not json");
  const { client } = await bootTestClient({ storage });
  assert.equal(client.diagnostics().modules > 0, true);
  assert.ok(client.config.lastLoadDiagnostics.recovered);
  assert.ok(storage.getItem("meteor.eagler.default.config.corrupt"), "original preserved for recovery");
});

test("structurally invalid config falls back to defaults per-field", async () => {
  const storage = new FakeStorage();
  storage.setItem(
    "meteor.eagler.default.config",
    JSON.stringify({
      version: 1,
      modules: [
        { id: "kill-aura", settings: { range: "not-a-number", unknown: 1 } },
        { id: "module-that-does-not-exist", settings: {} },
        "garbage entry",
      ],
    }),
  );
  const { client } = await bootTestClient({ storage });
  const diag = client.config.lastLoadDiagnostics;
  assert.ok(diag.recovered);
  assert.equal(client.modules.get("kill-aura").settings.get("range").value, 3.2, "reset to default");
  assert.ok(diag.errors.some((e) => /unknown module/.test(e)));
});

test("export/import round-trips settings", async () => {
  const a = await bootTestClient({ storage: new FakeStorage() });
  a.client.modules.get("kill-aura").settings.get("cps").set(14);
  const exported = a.client.config.exportProfile();

  const b = await bootTestClient({ storage: new FakeStorage() });
  const res = b.client.config.importProfile(exported);
  assert.equal(res.ok, true);
  assert.equal(b.client.modules.get("kill-aura").settings.get("cps").value, 14);
});

test("importing invalid data reports an error instead of throwing", async () => {
  const { client } = await bootTestClient({ storage: new FakeStorage() });
  const res = client.config.importProfile("definitely not base64 json");
  assert.equal(res.ok, false);
  assert.ok(res.errors.length > 0);
});

test("profiles can be created, switched and deleted", async () => {
  const { client } = await bootTestClient({ storage: new FakeStorage() });
  assert.deepEqual(client.config.listProfiles(), ["default"]);
  assert.equal(client.config.createProfile("pvp"), true);
  assert.equal(client.config.createProfile("pvp"), false, "duplicate rejected");
  assert.equal(client.config.createProfile("bad name!"), false, "invalid characters rejected");

  client.modules.get("kill-aura").settings.get("cps").set(17);
  client.config.save(true);
  client.config.switchProfile("pvp");

  // Profile 'pvp' starts clean, so the value returns to default.
  assert.equal(client.modules.get("kill-aura").settings.get("cps").value, 8);
  assert.equal(client.config.deleteProfile("pvp"), true);
  assert.equal(client.config.deleteProfile("default"), false, "default cannot be deleted");
});

test("a storage backend that fails on probing falls back to memory", async () => {
  const storage = new FakeStorage();
  storage.failWrites = true; // e.g. localStorage disabled by the browser
  const { client } = await bootTestClient({ storage });
  assert.equal(client.modules.all().length > 0, true, "client still boots");
  assert.equal(client.config.save(true), true, "writes go to the in-memory fallback");
});

test("a write failure mid-session is reported, not thrown", async () => {
  const storage = new FakeStorage();
  const { client } = await bootTestClient({ storage });
  storage.failWrites = true; // quota exhausted after a successful boot
  assert.equal(client.config.save(true), false, "save reports failure");
  assert.equal(client.modules.all().length > 0, true, "client keeps running");
});

test("resetAll clears module state and favourites", async () => {
  const { client } = await bootTestClient({ storage: new FakeStorage() });
  const ka = client.modules.get("kill-aura");
  ka.settings.get("cps").set(19);
  client.modules.setFavourite(ka, true);
  client.config.resetAll();
  assert.equal(ka.settings.get("cps").value, 8);
  assert.equal(client.modules.isFavourite(ka), false);
});

test("debounced save coalesces writes", async () => {
  const storage = new FakeStorage();
  let writes = 0;
  const orig = storage.setItem.bind(storage);
  storage.setItem = (k, v) => {
    writes++;
    return orig(k, v);
  };
  const { client } = await bootTestClient({ storage });
  writes = 0; // ignore the storage probe performed during boot
  client.config._debounceMs = 20;
  client.config.save();
  client.config.save();
  client.config.save();
  await sleep(60);
  assert.equal(writes, 1, "three scheduled saves collapse into one write");
});

test('module keybind/API toggles schedule configuration autosave', async () => {
  const { bootTestClient } = await import('./helpers.mjs');
  const { client } = await bootTestClient({ inWorld: true });
  client.modules.get('sprint').enable();
  assert.equal(client.config._dirty, true);
  assert.notEqual(client.config._timer, null);
  client.stop();
  assert.equal(client.config._timer, null);
});

test('saved active modules wait for a world and explicit disable cancels restoration',async()=>{
 const{client,adapter}=await bootTestClient();client.config.deserialiseModules([{id:'sprint',active:true}]);const module=client.modules.get('sprint');assert.equal(module.active,false);assert.equal(client.config.serialiseModules().find(m=>m.id==='sprint').active,true);adapter.setWorldLoaded(true);client.modules.revalidateAll();assert.equal(module.active,true);adapter.setWorldLoaded(false);client.modules.revalidateAll();assert.equal(module.active,false);assert.equal(client.config.serialiseModules().find(m=>m.id==='sprint').active,true);module.disable();adapter.setWorldLoaded(true);client.modules.revalidateAll();assert.equal(module.active,false);client.stop();
});
