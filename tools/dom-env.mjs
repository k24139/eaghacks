/**
 * Shared jsdom environment. Node 24 exposes some DOM globals as getters, so they
 * must be redefined rather than assigned.
 */
import { JSDOM } from "jsdom";

export function installDom({ url = "http://localhost/" } = {}) {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    pretendToBeVisual: true,
    url,
  });
  const define = (key, value) => {
    try {
      Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
    } catch {
      /* ignore read-only globals we do not need */
    }
  };
  define("window", dom.window);
  define("document", dom.window.document);
  define("navigator", dom.window.navigator);
  define("HTMLElement", dom.window.HTMLElement);
  define("Event", dom.window.Event);
  define("MouseEvent", dom.window.MouseEvent);
  define("KeyboardEvent", dom.window.KeyboardEvent);
  define("localStorage", dom.window.localStorage);
  define("requestAnimationFrame", dom.window.requestAnimationFrame.bind(dom.window));
  define("cancelAnimationFrame", dom.window.cancelAnimationFrame.bind(dom.window));
  if (!globalThis.performance) define("performance", dom.window.performance);
  return dom;
}
