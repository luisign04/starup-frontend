"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");

// A minimal DOM for the actual client code. Network/bootstrap is deliberately
// excluded; every test drives the same handlers and rendering functions as the UI.
function application() {
  const nodes = new Map();
  class Element {
    constructor(tag = "div") {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.attributes = new Map();
      this.handlers = {};
      this.dataset = {};
      this.value = "";
      this.style = {};
      this.hidden = false;
      this.open = false;
      this._text = "";
      const classes = new Set();
      this.classList = {
        add: (...values) => values.forEach((value) => classes.add(value)),
        contains: (value) => classes.has(value),
        toggle: (value, active) => {
          const present = active ?? !classes.has(value);
          if (present) classes.add(value); else classes.delete(value);
          return present;
        },
      };
      this.elements = new Proxy({}, { get: (target, key) => {
        if (!target[key]) {
          if (["role", "visibility"].includes(key)) {
            target[key] = [];
            target[key].value = key === "role" ? "CLIENT" : "PUBLIC";
          } else target[key] = new Element("input");
        }
        return target[key];
      } });
    }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this._text = ""; this.children = [...nodes]; }
    get childNodes() { return this.children; }
    get options() { return this.children; }
    add(option) { this.append(option); }
    set textContent(value) { this._text = String(value); this.children = []; }
    get textContent() { return this._text + this.children.map((node) => node.textContent).join(""); }
    setAttribute(key, value) { this.attributes.set(key, String(value)); }
    getAttribute(key) { return this.attributes.get(key) ?? null; }
    removeAttribute(key) { this.attributes.delete(key); }
    addEventListener(type, callback) { this.handlers[type] = callback; }
    querySelectorAll() { return []; }
    querySelector(selector) {
      if (selector === ".form-feedback") return null;
      return this.children.find((node) => node.tagName === "BUTTON") || new Element("button");
    }
    reset() {}
    close() { this.open = false; }
    showModal() { this.open = true; }
    focus() {}
  }
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, new Element(id.includes("dialog") ? "dialog" : "div"));
    return nodes.get(id);
  };
  const document = {
    getElementById: node,
    createElement: (tag) => new Element(tag),
    createElementNS: (_, tag) => new Element(tag),
    createTextNode: (text) => { const result = new Element("#text"); result.textContent = text; return result; },
    querySelectorAll: (selector) => selector === "dialog[open]" ? [...nodes.values()].filter((element) => element.open) : [],
    querySelector: (selector) => selector === "dialog[open]" ? [...nodes.values()].find((element) => element.open) : new Element("a"),
  };
  const context = vm.createContext({
    document, console, URL, URLSearchParams, FormData, Blob, Intl, Date, Map, Set, Object, Math, Number, String, Error,
    AbortController, setTimeout, clearTimeout,
    navigator: { onLine: true },
    location: { origin: "http://localhost", hash: "#inicio" },
    history: { replaceState() {} },
    window: { matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {}, scrollTo() {} },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    Option: function(text, value) { const result = new Element("option"); result.textContent = text; result.value = value; return result; },
  });
  const bootstrap = source.lastIndexOf("registrationRole();\nnetworkState();\nrenderAccount();");
  assert.ok(bootstrap > 0, "client bootstrap marker exists");
  vm.runInContext(source.slice(0, bootstrap), context);
  node("profile-form").elements.category = node("profile-category");
  const evaluate = (code) => vm.runInContext(code, context);
  return { context, node, evaluate, setAccount(role = "STARTUP") {
    context.testAccount = { id: "account-1", email: "startup@example.test", role, profile: { id: "profile-1", name: "Startup", category: "technology" } };
    evaluate("account = testAccount");
  } };
}
const details = { c_setor: 1, m_auditoria: 0.8, e_economia: 0.6, t_maturidade: 0.39 };
const startup = { startup_id: "startup-1", startup_name: "Public startup", startup_category: "technology", average_rating: 4, completed_tests: 1, score: 76.9, has_seal: true, details };
const recommendation = { demand_id: "demand-1", title: "Private recommendations", description: "A problem", category_name: "Tecnologia", score: 76.9, has_seal: true, details };
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
const flush = () => new Promise((resolve) => setImmediate(resolve));

test("recommended demand opens the actual proposal form and submits its demand ID", async () => {
  const app = application(); app.setAccount();
  const calls = [];
  app.context.mockApi = async (path, options) => {
    calls.push({ path, options });
    if (path === "/api/v1/solutions/")
      return { id: "solution-1", demand_id: "demand-1", status: "SUBMITTED", proposal: options.data.proposal };
    if (path.includes("recommended-demands")) return [];
    return { id: "demand-1", title: "A problem", description: "Solve it", category_name: "Tecnologia", status: "OPEN" };
  };
  app.context.recommendation = recommendation;
  app.evaluate('api = mockApi; loadWorkspace = async () => {}; currentRoute = "matchmaking"; activeMatchTab = "role"; matchmakingData = [recommendation]; renderMatchmaking();');
  await app.evaluate('openRecommendedDemand("demand-1")');
  assert.equal(app.node("detail-dialog").open, true);
  const form = app.node("detail-content").children.find((node) => node.tagName === "FORM");
  assert.ok(form, "existing proposal form is rendered");
  form.children[0].children[0].value = "Our solution";
  form.handlers.submit({ preventDefault() {} });
  await flush();
  assert.equal(calls[0].path, "/api/v1/demands/demand-1/");
  assert.equal(calls[1].path, "/api/v1/solutions/");
  assert.equal(calls[1].options.method, "POST");
  assert.equal(calls[1].options.data.demand_id, "demand-1");
  assert.equal(calls[1].options.data.proposal, "Our solution");
  assert.equal(app.node("detail-dialog").open, false);
  assert.equal(calls[2].path, "/api/v1/matchmaking/recommended-demands/");
  assert.equal(app.evaluate("matchmakingData.length"), 0);
  assert.doesNotMatch(app.node("matchmaking-results").textContent, /Private recommendations|Enviar proposta/);
  // A stale card/reference still resolves to the existing proposal notice.
  await app.evaluate('openRecommendedDemand("demand-1")');
  assert.equal(app.node("detail-content").children.some((node) => node.tagName === "FORM"), false);
  assert.match(app.node("detail-content").textContent, /já enviou uma proposta/);
});

test("late recommendation response cannot overwrite a newer traction tab", async () => {
  const app = application(); app.setAccount();
  const pending = deferred(), calls = [];
  app.context.mockApi = (path, options) => {
    calls.push({ path, options });
    return path.includes("recommended") ? pending.promise : Promise.resolve([startup]);
  };
  app.evaluate('api = mockApi; activeMatchTab = "role"');
  const previous = app.evaluate("loadMatchmaking()");
  app.evaluate('activeMatchTab = "traction"');
  await app.evaluate("loadMatchmaking()");
  pending.resolve([recommendation]); await previous;
  assert.match(app.node("matchmaking-results").textContent, /Public startup/);
  assert.doesNotMatch(app.node("matchmaking-results").textContent, /Private recommendations/);
  assert.equal(calls[0].options.publicRead, false);
  assert.equal(calls[1].options.publicRead, true);
  assert.equal(app.node("tab-match-all").getAttribute("aria-pressed"), "true");
});

test("logout clears private matchmaking immediately and invalidates pending requests", async () => {
  const app = application(); app.setAccount();
  const pending = deferred(); app.context.mockApi = () => pending.promise;
  app.evaluate('api = mockApi; activeMatchTab = "role"');
  const previous = app.evaluate("loadMatchmaking()");
  app.evaluate("clearPrivateState()");
  pending.resolve([recommendation]); await previous;
  assert.equal(app.node("matchmaking-results").textContent, "");
  assert.equal(app.evaluate("matchmakingData.length"), 0);
  assert.equal(app.evaluate("activeMatchTab"), "traction");
  assert.equal(app.node("tab-match-role").hidden, true);
  assert.equal(app.node("matchmaking-results").getAttribute("aria-busy"), null);
});

test("failed refresh removes previous recommendations and exposes retry feedback", async () => {
  const app = application(); app.setAccount();
  app.context.mockApi = async () => [recommendation];
  app.evaluate('api = mockApi; activeMatchTab = "role"');
  await app.evaluate("loadMatchmaking()");
  assert.match(app.node("matchmaking-results").textContent, /Private recommendations/);
  app.context.mockApi = async () => { throw new Error("offline"); };
  app.evaluate("api = mockApi");
  await assert.rejects(app.evaluate("loadMatchmaking()"), /offline/);
  assert.doesNotMatch(app.node("matchmaking-results").textContent, /Private recommendations/);
  assert.match(app.node("matchmaking-results").textContent, /Atualizar/);
  assert.equal(app.node("matchmaking-results").getAttribute("aria-busy"), null);
});

test("pending recommended demand detail cannot open after logout", async () => {
  const app = application(); app.setAccount();
  const pending = deferred(); app.context.mockApi = () => pending.promise;
  app.evaluate("api = mockApi");
  const previous = app.evaluate('openRecommendedDemand("demand-1")');
  app.evaluate("clearPrivateState()");
  pending.resolve({ id: "demand-1", title: "Secret", status: "OPEN" }); await previous;
  assert.equal(app.node("detail-dialog").open, false);
  assert.equal(app.node("detail-content").textContent, "");
});

test("startup categories use backend slugs and preserve existing profile values", () => {
  const app = application(); app.setAccount();
  app.evaluate('categories = [{ id: "category-1", slug: "technology", name: "Tecnologia" }]; renderStartupCategories()');
  assert.equal(app.node("profile-category").value, "technology");
  assert.equal(app.node("profile-category").options[1].textContent, "Tecnologia");
  assert.equal(app.node("registration-category").options[1].value, "technology");
  app.evaluate('account.profile.category = "legacy sector"; renderStartupCategories()');
  assert.equal(app.node("profile-category").value, "legacy sector");
  assert.equal(app.node("profile-category").options[2].value, "legacy sector");
});

test("clients can reach scoped demand rankings and logout discards demand context", async () => {
  const app = application(); app.setAccount("CLIENT");
  const calls = [];
  app.context.mockApi = async (path, options) => { calls.push({ path, options }); return [startup]; };
  app.evaluate('api = mockApi; currentRoute = "matchmaking"');
  await app.evaluate('showDemandMatches({ id: "demand-1", title: "Our challenge" })');
  assert.equal(calls[0].path, "/api/v1/matchmaking/demands/demand-1/");
  assert.equal(calls[0].options.publicRead, false);
  assert.match(app.node("matchmaking-subtitle").textContent, /Our challenge/);
  assert.equal(app.node("tab-match-demand").hidden, false);
  app.evaluate("clearPrivateState()");
  assert.equal(app.evaluate("matchingDemand"), null);
  assert.equal(app.node("tab-match-demand").hidden, true);
  assert.doesNotMatch(app.node("matchmaking-subtitle").textContent, /Our challenge/);
});


test("late session restoration cannot restore a logged-out account", async () => {
  const app = application(); app.setAccount();
  const pending = deferred(); app.context.mockApi = () => pending.promise;
  app.evaluate("api = mockApi");
  const previous = app.evaluate("restoreAccount()");
  app.evaluate("clearPrivateState()");
  pending.resolve(app.context.testAccount); await previous;
  assert.equal(app.evaluate("account"), null);
  assert.equal(app.node("profile-email").textContent, "");
});


test("proposal completion after logout cannot repopulate recommendation state", async () => {
  const app = application(); app.setAccount();
  const pending = deferred();
  app.context.mockApi = (path) => path === "/api/v1/solutions/" ? pending.promise : Promise.resolve({ id: "demand-1", title: "Challenge", status: "OPEN" });
  app.evaluate("api = mockApi");
  await app.evaluate('openRecommendedDemand("demand-1")');
  const form = app.node("detail-content").children.find((node) => node.tagName === "FORM");
  form.children[0].children[0].value = "Our solution";
  form.handlers.submit({ preventDefault() {} });
  app.evaluate("clearPrivateState()");
  pending.resolve({ id: "solution-1", demand_id: "demand-1", status: "SUBMITTED" });
  await flush();
  assert.equal(app.evaluate("solutions.length"), 0);
  assert.equal(app.evaluate("matchmakingData.length"), 0);
  assert.equal(app.node("detail-dialog").open, false);
  assert.equal(app.node("matchmaking-results").textContent, "");
});
