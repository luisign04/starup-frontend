"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const code = fs.readFileSync(
  path.join(__dirname, "../service-worker.js"),
  "utf8",
);
const ORIGIN = "http://localhost";
function worker(fetcher) {
  const handlers = {};
  const stores = new Map();
  const calls = [];
  const keyOf = (value) =>
    new URL(typeof value === "string" ? value : value.url, ORIGIN).href;
  const cacheStorage = {
    async open(name) {
      if (!stores.has(name)) {
        const entries = new Map();
        stores.set(name, {
          entries,
          async put(key, value) {
            entries.set(keyOf(key), value.clone());
          },
          async match(key) {
            return entries.get(keyOf(key))?.clone();
          },
          async delete(key) {
            return entries.delete(keyOf(key));
          },
          async keys() {
            return [...entries.keys()].map((url) => new Request(url));
          },
          async addAll(urls) {
            for (const url of urls)
              entries.set(keyOf(url), new Response("shell"));
          },
        });
      }
      return stores.get(name);
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name) {
      return stores.delete(name);
    },
    async match(key) {
      for (const store of stores.values()) {
        const value = await store.match(key);
        if (value) return value;
      }
    },
  };
  const self = {
    location: { origin: ORIGIN },
    clients: {
      async claim() {},
      async matchAll() {
        return [];
      },
      async openWindow() {},
    },
    registration: { async showNotification() {} },
    skipWaitingCalled: false,
    async skipWaiting() {
      self.skipWaitingCalled = true;
    },
    addEventListener(type, callback) {
      handlers[type] = callback;
    },
  };
  vm.runInNewContext(code, {
    self,
    caches: cacheStorage,
    URL,
    Request,
    Response,
    Headers,
    Date,
    fetch: async (...args) => {
      calls.push(args);
      return fetcher(...args);
    },
  });
  function fetchEvent(path, options = {}) {
    const pending = [];
    const event = {
      request: new Request(new URL(path, ORIGIN), options),
      waitUntil(promise) {
        pending.push(promise);
      },
      respondWith(promise) {
        event.response = promise;
      },
    };
    handlers.fetch(event);
    return { event, pending };
  }
  return { self, handlers, stores, cacheStorage, calls, fetchEvent };
}
const publicFeed = () =>
  new Response(JSON.stringify({ results: [{ id: "public" }] }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=0",
    },
  });
test("private endpoints and mutations never enter cache", async () => {
  const state = worker(async () => {
    throw new Error("Unexpected network interception");
  });
  for (const route of ["/api/v1/me/", "/api/v1/solutions/", "/admin/"]) {
    const { event } = state.fetchEvent(route, {
      headers: { Authorization: "private-token" },
    });
    assert.equal(event.response, undefined);
  }
  assert.equal(
    state.fetchEvent("/api/v1/feed/", { method: "POST" }).event.response,
    undefined,
  );
  assert.equal(state.stores.size, 0);
});
test("feed refresh discards credentials and authorization headers", async () => {
  const state = worker(async () => publicFeed());
  const { event, pending } = state.fetchEvent("/api/v1/feed/", {
    credentials: "include",
    headers: { Authorization: "secret" },
  });
  assert.equal((await event.response).status, 200);
  await Promise.all(pending);
  assert.equal(state.calls[0][1].credentials, "omit");
  assert.equal(state.calls[0][1].headers, undefined);
  assert.equal(state.stores.get("starup-v8-feed").entries.size, 1);
});
test("cached feed remains available offline", async () => {
  let online = true;
  const state = worker(async () => {
    if (!online) throw new Error("offline");
    return publicFeed();
  });
  let result = state.fetchEvent("/api/v1/feed/");
  await result.event.response;
  await Promise.all(result.pending);
  online = false;
  result = state.fetchEvent("/api/v1/feed/");
  assert.equal((await result.event.response).status, 200);
  await Promise.all(result.pending);
});
test("refresh returns current public feed instead of the previous cached version", async () => {
  let version = "before-mutation";
  const state = worker(
    async () =>
      new Response(JSON.stringify({ results: [{ id: version }] }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=0",
        },
      }),
  );
  let result = state.fetchEvent("/api/v1/feed/");
  assert.equal(
    (await (await result.event.response).json()).results[0].id,
    "before-mutation",
  );
  version = "after-mutation";
  result = state.fetchEvent("/api/v1/feed/");
  const response = await result.event.response;
  assert.equal((await response.json()).results[0].id, "after-mutation");
  assert.equal(response.headers.has("X-StarUP-Cached-At"), false);
  const saved = await state.cacheStorage.match(ORIGIN + "/api/v1/feed/");
  assert.equal((await saved.json()).results[0].id, "after-mutation");
  assert.equal(state.calls.length, 2);
});
test("a saved feed is used only after a network failure", async () => {
  let online = true;
  const state = worker(async () => {
    if (!online) throw new Error("offline");
    return publicFeed();
  });
  let result = state.fetchEvent("/api/v1/feed/");
  assert.equal(
    (await result.event.response).headers.has("X-StarUP-Cached-At"),
    false,
  );
  online = false;
  result = state.fetchEvent("/api/v1/feed/");
  const fallback = await result.event.response;
  assert.equal(fallback.status, 200);
  assert.equal(fallback.headers.has("X-StarUP-Cached-At"), true);
  assert.equal((await fallback.json()).results[0].id, "public");
});
test("unavailable cache storage does not discard a successful network response", async () => {
  const state = worker(async () => publicFeed());
  state.cacheStorage.open = async () => {
    throw new Error("quota unavailable");
  };
  const { event } = state.fetchEvent("/api/v1/feed/");
  assert.equal((await (await event.response).json()).results[0].id, "public");
});
test("expired cached feed is rejected offline", async () => {
  const state = worker(async () => {
    throw new Error("offline");
  });
  const cache = await state.cacheStorage.open("starup-v8-feed");
  await cache.put(
    ORIGIN + "/api/v1/feed/",
    new Response("stale", {
      headers: {
        "X-StarUP-Cached-At": String(Date.now() - 25 * 60 * 60 * 1000),
      },
    }),
  );
  const { event, pending } = state.fetchEvent("/api/v1/feed/");
  assert.equal((await event.response).status, 503);
  await Promise.all(pending);
  assert.equal(cache.entries.size, 0);
});
test("a private response is never cached even on the public feed URL", async () => {
  const state = worker(
    async () =>
      new Response('{"private":"secret"}', {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
        },
      }),
  );
  const { event, pending } = state.fetchEvent("/api/v1/feed/");
  await event.response;
  await Promise.all(pending);
  assert.equal(state.stores.get("starup-v8-feed").entries.size, 0);
});
test("feed cache is capped at ten pages", async () => {
  const state = worker(async () => publicFeed());
  for (let page = 0; page < 12; page++) {
    const { event, pending } = state.fetchEvent("/api/v1/feed/?cursor=" + page);
    await event.response;
    await Promise.all(pending);
  }
  assert.equal(state.stores.get("starup-v8-feed").entries.size, 10);
});
test("activation removes previous-brand caches and preserves current StarUP caches", async () => {
  const state = worker(async () => publicFeed());
  for (const name of [
    "nexora-v3-shell",
    "nexora-v3-feed",
    "starup-v0-feed",
    "starup-v8-shell",
    "starup-v8-feed",
    "unrelated-cache",
  ])
    await state.cacheStorage.open(name);
  let done;
  state.handlers.activate({
    waitUntil(value) {
      done = value;
    },
  });
  await done;
  assert.equal(state.stores.has("starup-v0-feed"), false);
  assert.equal(state.stores.has("nexora-v3-shell"), false);
  assert.equal(state.stores.has("nexora-v3-feed"), false);
  assert.equal(state.stores.has("starup-v8-shell"), true);
  assert.equal(state.stores.has("starup-v8-feed"), true);
  assert.equal(state.stores.has("unrelated-cache"), true);
});
test("worker update waits for explicit activation", async () => {
  const state = worker(async () => publicFeed());
  assert.equal(state.self.skipWaitingCalled, false);
  state.handlers.message({ data: { type: "ACTIVATE_UPDATE" } });
  assert.equal(state.self.skipWaitingCalled, true);
});
test("logout clears data cache while preserving shell", async () => {
  const state = worker(async () => publicFeed());
  await state.cacheStorage.open("starup-v8-feed");
  await state.cacheStorage.open("starup-v8-shell");
  await state.cacheStorage.open("nexora-v3-feed");
  await state.cacheStorage.open("nexora-v3-shell");
  let done;
  state.handlers.message({
    data: { type: "CLEAR_PRIVATE_DATA" },
    waitUntil(value) {
      done = value;
    },
  });
  await done;
  assert.equal(state.stores.has("starup-v8-feed"), false);
  assert.equal(state.stores.has("nexora-v3-feed"), false);
  assert.equal(state.stores.has("nexora-v3-shell"), false);
  assert.equal(state.stores.has("starup-v8-shell"), true);
});
