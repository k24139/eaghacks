import { test } from "node:test";
import assert from "node:assert/strict";
import { EventBus, Events, SubscriptionBag } from "../src/core/event-bus.js";

test("listeners run in descending priority order", () => {
  const bus = new EventBus();
  const order = [];
  bus.on("x", () => order.push("low"), { priority: -10 });
  bus.on("x", () => order.push("high"), { priority: 10 });
  bus.on("x", () => order.push("mid"), { priority: 0 });
  bus.emit("x");
  assert.deepEqual(order, ["high", "mid", "low"]);
});

test("disposing a subscription stops delivery", () => {
  const bus = new EventBus();
  let count = 0;
  const sub = bus.on("x", () => count++);
  bus.emit("x");
  sub.dispose();
  bus.emit("x");
  assert.equal(count, 1);
  assert.equal(bus.listenerCount("x"), 0);
});

test("a throwing listener does not stop the others", () => {
  const bus = new EventBus();
  const seen = [];
  bus.on("x", () => {
    throw new Error("boom");
  }, { priority: 10 });
  bus.on("x", () => seen.push("second"));
  bus.emit("x");
  assert.deepEqual(seen, ["second"]);
});

test("emitCancellable reports cancellation", () => {
  const bus = new EventBus();
  bus.on(Events.KeyInput, (ev) => ev.cancel());
  const cancelled = bus.emitCancellable(Events.KeyInput, { key: "KeyW" });
  assert.equal(cancelled, true);
});

test("SubscriptionBag disposes everything it tracked", () => {
  const bus = new EventBus();
  const bag = new SubscriptionBag();
  let n = 0;
  bag.track(bus.on("a", () => n++));
  bag.track(bus.on("b", () => n++));
  bus.emit("a");
  bag.dispose();
  bus.emit("a");
  bus.emit("b");
  assert.equal(n, 1);
  assert.equal(bag.size, 0);
});

test("unsubscribing during dispatch does not corrupt the run", () => {
  const bus = new EventBus();
  const seen = [];
  const sub2 = bus.on("x", () => seen.push("b"));
  bus.on("x", () => {
    seen.push("a");
    sub2.dispose();
  }, { priority: 5 });
  bus.emit("x");
  assert.deepEqual(seen, ["a", "b"]);
  assert.equal(bus.listenerCount("x"), 1);
});
