"use strict";

// Buildless, same-origin client. Personal data stays in memory, never localStorage.
const $ = (id) => document.getElementById(id);
// Base URL for API (set via Vite env variable or fallback to same origin)
const API_BASE = "";
const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.3"/><rect x="14" y="3" width="7" height="7" rx="1.3"/><rect x="3" y="14" width="7" height="7" rx="1.3"/><rect x="14" y="14" width="7" height="7" rx="1.3"/>',
  compass:
    '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
  briefcase:
    '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V4h8v3M3 12a26 26 0 0 0 18 0M12 11v4"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  route:
    '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h8a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h8"/>',
  settings:
    '<path d="m9 3-1 3-3 1-2 4 2 2v4l4 3 3-1 3 1 4-3v-4l2-2-2-4-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
  shield:
    '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  external: '<path d="M14 3h7v7m0-7L11 13M10 4H4v16h16v-6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  rocket:
    '<path d="M14 4c3-2 7-1 7-1s1 4-1 7l-7 7-6-6Zm-7 7H3l5-6h5m0 12v4l6-5v-5M6 15l-3 6 6-3"/><circle cx="16" cy="8" r="1.5"/>',
  star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  refresh:
    '<path d="M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  logout: '<path d="M9 4H4v16h5m-1-8h13m-5-5 5 5-5 5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  bell: '<path d="M4 17h16l-2-4V9A6 6 0 0 0 6 9v4Zm6 3h4M12 3V1"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
function icon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("icon");
  svg.innerHTML = icons[name] || icons.grid;
  return svg;
}
document
  .querySelectorAll("[data-icon]")
  .forEach((node) => node.replaceChildren(icon(node.dataset.icon)));
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function action(text, handler, className = "btn btn-dark", iconName) {
  const node = el("button", undefined, className);
  node.type = "button";
  node.append(el("span", text));
  if (iconName) node.append(icon(iconName));
  node.addEventListener("click", () => run(handler, node));
  return node;
}
const statuses = {
  OPEN: "Aberta",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  SUBMITTED: "Enviada",
  ACCEPTED: "Aceita",
  DELIVERED: "Entregue",
  REJECTED: "Rejeitada",
  WITHDRAWN: "Retirada",
};
const roleLabels = {
  CLIENT: "Cliente",
  STARTUP: "Startup",
  INVESTOR: "Investidor · leitura privada",
  INTERNAL: "Conta interna",
};
const fieldLabels = {
  email: "E-mail",
  password: "Senha",
  document: "Documento",
  display_name: "Nome de apresentação",
  startup_name: "Nome da startup",
  policy_version: "Política de privacidade",
  title: "Título",
  description: "Descrição",
  category_id: "Categoria",
  category: "Setor da startup",
  website: "Site",
  proposal: "Proposta",
  delivery: "Entrega",
  rating: "Avaliação",
  non_field_errors: "Dados informados",
};
let account = null,
  csrfToken = "",
  policyVersion = "",
  waitingWorker = null,
  updateRequested = false;
let feed = [],
  nextFeed = null,
  feedFilter = "ALL",
  feedTag = "",
  feedLoaded = false,
  cachedAt = null;
let solutions = [],
  nextSolutions = null,
  ownDemands = [],
  nextDemands = null,
  demandFilter = "ALL";
let categories = [],
  editingDemand = null,
  confirmHandler = null,
  feedSequence = 0,
  accountSequence = 0,
  accountRestoreSequence = 0;
let currentRoute = "inicio",
  workspaceSequence = 0,
  ownDemandSequence = 0;
let workspaceLoaded = false,
  ownDemandsLoaded = false;
let activeMatchTab = "traction",
  matchmakingData = [],
  matchmakingSequence = 0,
  matchingDemand = null;
let composerInitialized = false,
  demandTags = [],
  demandImages = [],
  publicProfile = null,
  publicProfileKey = "",
  publicProfileRows = [],
  nextProfileDemands = null,
  profileStatus = "ALL",
  publicProfileSequence = 0;
const demandDrafts = new Map();
const demandTitles = new Map();
const PUSH_STORAGE_KEY = "starup-push-id";
try {
  const old = localStorage.getItem("nexora-push-id");
  if (old && !localStorage.getItem(PUSH_STORAGE_KEY))
    localStorage.setItem(PUSH_STORAGE_KEY, old);
  localStorage.removeItem("nexora-push-id");
} catch {
  /* Browser storage can be restricted; the application still works. */
}
function notice(message, error = false) {
  $("notice-text").textContent = message;
  $("notice").hidden = !message;
  $("notice").classList.toggle("error", error);
  if (currentRoute === "publicar-demanda") {
    $("demand-feedback").textContent = message;
    $("demand-feedback").hidden = !message;
  }
  const dialog = document.querySelector("dialog[open]");
  if (dialog) {
    const feedback = dialog.querySelector(".form-feedback");
    if (feedback) {
      feedback.textContent = message;
      feedback.hidden = !message;
    }
  }
}
async function run(task, node) {
  if (node?.disabled) return;
  if ($("notice").classList.contains("error")) notice("");
  if (node) {
    node.disabled = true;
    node.setAttribute("aria-busy", "true");
  }
  try {
    return await task();
  } catch (error) {
    notice(
      error.message || "Não foi possível concluir. Tente novamente.",
      true,
    );
  } finally {
    if (node) {
      node.disabled = false;
      node.removeAttribute("aria-busy");
    }
  }
}
async function api(path, { method = "GET", data, publicRead = false } = {}) {
  const base = API_BASE || location.origin;
  const url = new URL(path, base);
  // Allow only API paths under /api/v1/
  if (!url.pathname.startsWith("/api/v1/"))
    throw new Error("Destino não permitido.");
  if (method !== "GET" && !navigator.onLine)
    throw new Error("Conecte-se à internet para concluir esta ação.");
  const multipart = typeof FormData !== "undefined" && data instanceof FormData;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), multipart ? 60000 : 15000);
  let response;
  try {
    response = await fetch(url.href, {
      method,
      credentials: publicRead ? "omit" : "same-origin",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        ...(data && !multipart ? { "Content-Type": "application/json" } : {}),
        ...(!publicRead ? { "X-CSRFToken": csrfToken } : {}),
      },
      body: multipart ? data : data ? JSON.stringify(data) : undefined,
    });
  } catch (error) {
    throw new Error(
      error.name === "AbortError"
        ? "A conexão demorou mais que o esperado. Tente novamente."
        : "Não foi possível conectar à StarUP. Verifique sua conexão e tente novamente.",
    );
  } finally {
    clearTimeout(timer);
  }
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (body.code === "csrf_failed") {
      await initCsrf();
      throw new Error(
        "Sua sessão de segurança foi renovada. Envie o formulário novamente.",
      );
    }
    const fields = body.fields
      ? Object.entries(body.fields)
          .map(
            ([key, value]) =>
              (fieldLabels[key] || key) +
              ": " +
              (Array.isArray(value)
                ? value.join(" ")
                : typeof value === "object"
                  ? Object.values(value).flat().join(" ")
                  : value),
          )
          .join(" ")
      : "";
    if (
      response.status === 403 &&
      method !== "GET" &&
      account &&
      body.code === "permission_denied"
    ) {
      // DRF also reports expired CSRF cookies as permission_denied. Renew for a
      // deliberate retry, without repeating a possibly consequential request.
      try {
        await initCsrf();
      } catch {
        /* Keep the original server error. */
      }
    }
    const error = new Error(
      [body.message || "Não foi possível concluir a solicitação.", fields]
        .filter(Boolean)
        .join(" "),
    );
    error.status = response.status;
    error.code = body.code;
    throw error;
  }
  if (publicRead && response.headers.get("X-StarUP-Cached-At"))
    body.cachedAt = Number(response.headers.get("X-StarUP-Cached-At"));
  return body;
}
async function initCsrf() {
  const data = await api("/api/v1/auth/csrf/");
  csrfToken = data.csrf_token;
  policyVersion = data.policy_version;
}
async function allPages(path, options) {
  const rows = [];
  let next = path;
  while (next) {
    const page = await api(next, options);
    rows.push(...page.results);
    next = page.next;
  }
  return rows;
}
function accountName() {
  if (account?.role === "INVESTOR") return "Leitura privada";
  return (
    account?.profile?.name ||
    account?.profile?.display_name ||
    account?.profile?.alias ||
    "Minha conta"
  );
}
function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
function renderAccount() {
  const isMember = Boolean(account);
  document.querySelectorAll("[data-role]").forEach((node) => {
    node.hidden = node.dataset.role !== account?.role;
  });
  document.querySelectorAll('[data-member="workspace"]').forEach((node) => {
    node.hidden = !isMember || !["CLIENT", "STARTUP"].includes(account.role);
  });
  $("sidebar-invite").hidden = isMember;
  $("header-login").hidden = isMember;
  $("account-chip").hidden = !isMember;
  $("account-link").hidden = !isMember;
  $("publish-cta").hidden = isMember && account.role !== "CLIENT";
  if (isMember) {
    const name = accountName();
    $("header-name").textContent = name;
    $("header-avatar").textContent = initials(name);
    $("profile-avatar").textContent = initials(name);
    $("profile-name").textContent = name;
    $("profile-email").textContent = account.email;
    $("profile-role").textContent = roleLabels[account.role] || "Conta";
    $("workspace-nav-label").textContent =
      account.role === "CLIENT"
        ? "Propostas recebidas"
        : "Propostas e entregas";
    $("workspace-description").textContent =
      account.role === "CLIENT"
        ? "Escolha uma solução para seus desafios e acompanhe os resultados."
        : "Acompanhe suas conexões, do primeiro contato à entrega.";
    $("profile-form").hidden = account.role !== "STARTUP";
    if (account.role === "STARTUP") {
      renderStartupCategories();
      ["name", "description", "website", "category"].forEach((field) => {
        $("profile-form").elements[field].value = account.profile[field] || "";
      });
    }
    $("home-title").replaceChildren(
      document.createTextNode("Boas conexões começam por aqui"),
      el("span", ".", "yellow-text"),
    );
  } else {
    $("home-title").replaceChildren(
      document.createTextNode("O seu próximo passo está aqui"),
      el("span", ".", "yellow-text"),
    );
  }
}
async function restoreAccount() {
  const sequence = accountSequence,
    requestSequence = ++accountRestoreSequence;
  const isCurrent = () => sequence === accountSequence &&
    requestSequence === accountRestoreSequence;
  try {
    const restored = await api("/api/v1/me/");
    if (!isCurrent()) return;
    if (account && account.id !== restored.id) clearPrivateState();
    account = restored;
  } catch (error) {
    if (!isCurrent()) return;
    if ([401, 403].includes(error.status)) {
      // A first anonymous visit is not a logout. Clearing here races the public
      // feed and removes its offline copy immediately after it is saved.
      if (account || workspaceLoaded || ownDemandsLoaded) clearPrivateState();
      else account = null;
    } else throw error;
  }
  renderAccount();
}
const mobileSidebar = window.matchMedia("(max-width: 760px)");
function setMenu(open) {
  $("sidebar").inert = mobileSidebar.matches && !open;
  $("sidebar").classList.toggle("open", open);
  $("sidebar-scrim").hidden = !open;
  $("menu-toggle").setAttribute("aria-expanded", String(open));
  $("menu-toggle").setAttribute(
    "aria-label",
    open ? "Fechar navegação" : "Abrir navegação",
  );
}
mobileSidebar.addEventListener("change", () => setMenu(false));
const routeNames = {
  inicio: "Visão geral",
  vitrine: "Explorar vitrine",
  demandas: "Minhas demandas",
  propostas: "Propostas e entregas",
  matchmaking: "Matchmaking Inteligente",
  "publicar-demanda": "Publicar demanda",
  perfil: "Perfil público",
  conta: "Minha conta",
};
function route() {
  if ($("detail-dialog").open) $("detail-dialog").close();
  if (currentRoute === "publicar-demanda" && composerInitialized) saveDemandDraft();
  const name = location.hash.slice(1) || "inicio";
  const profileRoute = /^perfil\/(startup|cliente)\/([a-z0-9-]+)$/i.exec(name);
  const validName = profileRoute ? "perfil" : name === "como-funciona" ? "inicio"
    : Object.hasOwn(routeNames, name) ? name : "inicio";
  if (["demandas", "propostas", "conta", "publicar-demanda"].includes(validName) && !account) {
    currentRoute = "inicio";
    history.replaceState(null, "", "#inicio");
    showAuth("login");
  } else if (
    (["demandas", "publicar-demanda"].includes(validName) && account?.role !== "CLIENT") ||
    (validName === "propostas" && !["CLIENT", "STARTUP"].includes(account?.role))
  ) {
    currentRoute = "vitrine";
    history.replaceState(null, "", "#vitrine");
  } else currentRoute = validName;
  const home = currentRoute === "inicio", market = home || currentRoute === "vitrine";
  $("home-view").hidden = !home;
  $("how-view").hidden = !home;
  $("market-view").hidden = !market;
  $("demands-view").hidden = currentRoute !== "demandas";
  $("workspace-view").hidden = currentRoute !== "propostas";
  $("matchmaking-view").hidden = currentRoute !== "matchmaking";
  $("account-view").hidden = currentRoute !== "conta";
  $("publish-view").hidden = currentRoute !== "publicar-demanda";
  $("public-profile-view").hidden = currentRoute !== "perfil";
  document.querySelectorAll("[data-route]").forEach((node) => {
    const active = node.dataset.route === currentRoute;
    node.classList.toggle("active", active);
    if (active) node.setAttribute("aria-current", "page");
    else node.removeAttribute("aria-current");
  });
  $("breadcrumb-current").textContent = routeNames[currentRoute];
  document.title = routeNames[currentRoute] + " — StarUP";
  $("market-eyebrow").style.display = home ? "none" : "block";
  $("feed-title").textContent = home ? "No seu ecossistema" : "A vitrine de quem faz acontecer.";
  $("market-description").textContent = home
    ? "As publicações mais recentes de demandas, startups e resultados."
    : "Conheça os desafios, as pessoas e as soluções por trás de cada conexão.";
  $("see-all-feed").hidden = !home;
  setMenu(false);
  renderFeed();
  if (currentRoute === "demandas" && !ownDemandsLoaded) run(() => loadOwnDemands());
  if (currentRoute === "propostas" && !workspaceLoaded) run(() => loadWorkspace());
  if (currentRoute === "matchmaking") run(() => loadMatchmaking());
  if (currentRoute === "publicar-demanda" && !composerInitialized) run(() => showDemand());
  if (currentRoute === "perfil" && profileRoute)
    run(() => loadPublicProfile(profileRoute[1].toLowerCase(), profileRoute[2]));
}
window.addEventListener("hashchange", () => {
  route();
  window.scrollTo({ top: 0 });
  $("main-content").focus({ preventScroll: true });
});
$("menu-toggle").addEventListener("click", () =>
  setMenu(!$("sidebar").classList.contains("open")),
);
$("sidebar-scrim").addEventListener("click", () => {
  setMenu(false);
  $("menu-toggle").focus();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && $("sidebar").classList.contains("open")) {
    setMenu(false);
    $("menu-toggle").focus();
  }
});
$("account-chip").addEventListener("click", () => {
  location.hash = "conta";
});
document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  $("main-content").focus();
});
$("dismiss-notice").addEventListener("click", () => {
  $("notice").hidden = true;
});
$("today").textContent = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
}).format(new Date());
function showDialog(dialog) {
  dialog.querySelectorAll(".form-feedback").forEach((node) => {
    node.hidden = true;
    node.textContent = "";
  });
  document.querySelectorAll("dialog[open]").forEach((open) => {
    if (open !== dialog) open.close();
  });
  if (!dialog.open) dialog.showModal();
}
document
  .querySelectorAll("[data-close-dialog]")
  .forEach((node) =>
    node.addEventListener("click", () => node.closest("dialog").close()),
  );
document.querySelectorAll("dialog").forEach((dialog) =>
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      dialog.close();
  }),
);
function showAuth(mode = "login", role) {
  $("login-form").hidden = mode !== "login";
  $("register-form").hidden = mode !== "register";
  $("auth-title").textContent =
    mode === "login"
      ? "Que bom ter você por aqui."
      : "Vamos criar boas conexões.";
  $("auth-description").textContent =
    mode === "login"
      ? "Entre para continuar suas conexões."
      : "Escolha seu perfil e faça parte do ecossistema.";
  document
    .querySelectorAll("[data-auth-tab]")
    .forEach((node) =>
      node.classList.toggle("active", node.dataset.authTab === mode),
    );
  if (role)
    $("register-form").querySelector(
      '[name="role"][value="' + role + '"]',
    ).checked = true;
  registrationRole();
  if (mode === "register") run(() => loadCategories());
  showDialog($("auth-dialog"));
}
document
  .querySelectorAll("[data-auth]")
  .forEach((node) =>
    node.addEventListener("click", () => showAuth(node.dataset.auth)),
  );
document
  .querySelectorAll("[data-auth-tab]")
  .forEach((node) =>
    node.addEventListener("click", () => showAuth(node.dataset.authTab)),
  );
document.querySelectorAll("[data-join-role]").forEach((node) =>
  node.addEventListener("click", () => {
    if (account) location.hash = "vitrine";
    else showAuth("register", node.dataset.joinRole);
  }),
);
document.querySelectorAll(".password-toggle").forEach((node) =>
  node.addEventListener("click", () => {
    const input = node.parentElement.querySelector("input");
    const visible = input.type === "password";
    input.type = visible ? "text" : "password";
    node.setAttribute(
      "aria-label",
      visible ? "Ocultar senha" : "Mostrar senha",
    );
  }),
);
function registrationRole() {
  const role = $("register-form").elements.role.value;
  document.querySelectorAll("[data-registration]").forEach((node) => {
    node.hidden = node.dataset.registration !== role;
    node.querySelectorAll("input,select,textarea").forEach((input) => {
      input.disabled = node.hidden;
    });
  });
}
$("register-form").elements.role.forEach((input) =>
  input.addEventListener("change", registrationRole),
);
$("register-form").elements.person_type.addEventListener("change", (event) => {
  const isPerson = event.target.value === "PF",
    input = $("register-form").elements.document;
  $("document-label").firstChild.textContent = isPerson ? "CPF" : "CNPJ";
  input.placeholder = isPerson ? "000.000.000-00" : "00.000.000/0000-00";
});
$("login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  run(async () => {
    await initCsrf();
    const response = await api("/api/v1/auth/login/", {
      method: "POST",
      data: Object.fromEntries(new FormData(form)),
    });
    csrfToken = response.csrf_token;
    form.reset();
    await restoreAccount();
    $("auth-dialog").close();
    await loadPrivateState();
    route();
    renderFeed();
    notice("Você entrou na StarUP. Vamos criar boas conexões.");
  }, form.querySelector('button[type="submit"],.btn-full'));
});
$("register-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  run(async () => {
    await initCsrf();
    const data = Object.fromEntries(new FormData(form));
    delete data.policy;
    data.policy_version = policyVersion;
    await api("/api/v1/auth/register/", { method: "POST", data });
    const email = data.email;
    form.reset();
    registrationRole();
    showAuth("login");
    $("login-form").elements.email.value = email;
    notice(
      "Solicitação de cadastro recebida. Entre com seu e-mail e senha para continuar.",
    );
  }, form.querySelector(".btn-full"));
});
function clearPrivateState() {
  accountSequence++;
  accountRestoreSequence++;
  workspaceSequence++;
  ownDemandSequence++;
  matchmakingSequence++;
  activeMatchTab = "traction";
  matchmakingData = [];
  matchingDemand = null;
  $("matchmaking-results").replaceChildren();
  $("matchmaking-results").removeAttribute("aria-busy");
  $("tab-match-role").hidden = true;
  $("tab-match-demand").hidden = true;
  $("matchmaking-subtitle").textContent =
    "Startups ordenadas por avaliações de entregas e histórico de testes concluídos.";
  account = null;
  updateMatchmakingTabs();
  solutions = [];
  ownDemands = [];
  nextSolutions = null;
  nextDemands = null;
  editingDemand = null;
  clearDemandDrafts();
  publicProfileSequence++;
  publicProfile = null;
  publicProfileKey = "";
  publicProfileRows = [];
  $("public-profile-header").replaceChildren();
  $("public-profile-demands").replaceChildren();
  confirmHandler = null;
  demandTitles.clear();
  workspaceLoaded = false;
  ownDemandsLoaded = false;
  document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
  $("detail-content").replaceChildren();
  $("detail-kind").textContent = "";
  $("confirm-title").textContent = "";
  $("confirm-description").textContent = "";
  $("demand-form").reset();
  $("login-form").reset();
  $("register-form").reset();
  registrationRole();
  $("solutions").replaceChildren();
  $("own-demands").replaceChildren();
  $("workspace-summary").replaceChildren();
  $("profile-form").reset();
  renderStartupCategories();
  [
    "profile-name",
    "profile-email",
    "profile-avatar",
    "header-name",
    "header-avatar",
    "profile-role",
  ].forEach((id) => {
    $(id).textContent = "";
  });
  if ("serviceWorker" in navigator)
    navigator.serviceWorker.controller?.postMessage({
      type: "CLEAR_PRIVATE_DATA",
    });
  renderAccount();
  renderFeed();
}
$("logout").addEventListener("click", (event) =>
  run(async () => {
    await api("/api/v1/auth/logout/", { method: "POST" });
    clearPrivateState();
    csrfToken = "";
    location.hash = "inicio";
    await initCsrf();
    notice("Você saiu da sua conta com segurança.");
  }, event.currentTarget),
);
function confirmAction(
  title,
  description,
  handler,
  label = "Confirmar",
  danger = false,
) {
  $("confirm-title").textContent = title;
  $("confirm-description").textContent = description;
  confirmHandler = handler;
  $("confirm-action").textContent = label;
  $("confirm-action").className = danger ? "btn btn-danger" : "btn btn-dark";
  showDialog($("confirm-dialog"));
}
$("confirm-action").addEventListener("click", (event) =>
  run(async () => {
    if (confirmHandler) await confirmHandler();
    $("confirm-dialog").close();
  }, event.currentTarget),
);
$("erase-account").addEventListener("click", () =>
  confirmAction(
    "Excluir sua conta?",
    "Seus identificadores e conteúdos serão removidos. O histórico mínimo de avaliações permanece sem sua identidade pública. Esta ação não pode ser desfeita.",
    async () => {
      await api("/api/v1/me/", { method: "DELETE" });
      clearPrivateState();
      location.hash = "inicio";
      await initCsrf();
      await loadFeed();
      notice("Sua conta foi excluída.");
    },
    "Excluir minha conta",
    true,
  ),
);
function badge(text, type = "") {
  return el("span", text, "badge " + type);
}
function shortDate(date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(new Date(date))
    .replace(" de ", " ");
}
function statusBadge(status) {
  return badge(
    statuses[status] || status,
    ["COMPLETED", "OPEN"].includes(status)
      ? ""
      : ["IN_PROGRESS", "ACCEPTED", "DELIVERED"].includes(status)
        ? "warning"
        : "neutral",
  );
}
function emptyState(title, description, iconName = "compass", cta, handler) {
  const node = el("div", undefined, "empty-state"),
    circle = el("span", undefined, "empty-icon");
  circle.append(icon(iconName));
  node.append(circle, el("h3", title), el("p", description));
  if (cta)
    node.append(action(cta, handler, "btn btn-outline btn-small", "arrow"));
  return node;
}
function profileHref(type, id) {
  return id ? "#perfil/" + (type === "STARTUP" ? "startup" : "cliente") + "/" + encodeURIComponent(id) : "";
}
function profileLink(type, id, name, className = "profile-name-link") {
  const link = el(id ? "a" : "span", name || (type === "STARTUP" ? "Startup" : "Cliente"), className);
  if (id) link.href = profileHref(type, id);
  return link;
}
function ratingStars(value, count) {
  const rating = Number(value), stars = el("span", undefined, "public-rating");
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    stars.textContent = "Ainda sem avaliações";
    return stars;
  }
  stars.setAttribute("aria-label", rating.toFixed(1) + " de 5 estrelas" + (count ? ", " + count + " avaliações" : ""));
  const glyphs = el("span", "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating)), "rating-glyphs");
  glyphs.setAttribute("aria-hidden", "true");
  stars.append(glyphs, el("strong", rating.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "/5"));
  if (count) stars.append(el("span", " · " + count + (count === 1 ? " avaliação" : " avaliações")));
  return stars;
}
function safeImageUrl(value) {
  try {
    const url = new URL(value, location.origin);
    return url.origin === location.origin && ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
function imageGallery(images = [], title = "demanda") {
  const gallery = el("div", undefined, "post-gallery gallery-" + Math.min(images.length, 4));
  images.slice(0, 4).forEach((item, index) => {
    const url = safeImageUrl(item.url);
    if (!url) return;
    const link = el("a"), image = el("img");
    link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
    image.src = url; image.alt = "Imagem " + (index + 1) + " de " + title;
    image.loading = "lazy"; image.decoding = "async";
    link.append(image); gallery.append(link);
  });
  return gallery;
}
function tagList(tags = [], clickable = true) {
  const list = el("div", undefined, "tag-list post-tags");
  tags.forEach((tag) => {
    const chip = clickable ? action("#" + tag, () => {
      feedTag = tag; location.hash = "vitrine"; updateTabs(); return loadFeed();
    }, "post-tag") : el("span", "#" + tag, "post-tag");
    list.append(chip);
  });
  return list;
}
function postAuthor(post) {
  const c = post.content, startup = post.kind !== "DEMAND";
  return {
    type: post.author_type || (startup ? "STARTUP" : "CLIENT"),
    id: post.author_id || (startup ? c.startup_id || (post.kind === "STARTUP" ? c.id : null) : c.client_id),
    name: post.author_name || (startup ? c.startup_name || c.name : c.client_name) || (startup ? "Startup" : "Cliente"),
  };
}
function renderPost(post) {
  const c = post.content, demand = post.kind === "DEMAND", startup = post.kind === "STARTUP", author = postAuthor(post);
  const card = el("article", undefined, "social-post"), top = el("header", undefined, "post-header");
  const avatar = profileLink(author.type, author.id, initials(author.name), "post-avatar " + (author.type === "STARTUP" ? "startup-avatar" : ""));
  avatar.setAttribute("aria-label", "Ver perfil de " + author.name);
  const identity = el("div", undefined, "post-identity");
  identity.append(profileLink(author.type, author.id, author.name));
  const meta = el("div", undefined, "post-meta");
  meta.append(el("span", author.type === "STARTUP" ? "Startup" : "Cliente"));
  if (post.published_at || c.created_at) {
    const time = el("time", " · " + shortDate(post.published_at || c.created_at));
    time.dateTime = post.published_at || c.created_at; meta.append(time);
  }
  identity.append(meta);
  top.append(avatar, identity, demand ? statusBadge(c.status) : badge(startup ? "Startup" : "Resultado avaliado", startup ? "startup" : "review"));
  const body = el("div", undefined, "post-body");
  body.append(el("p", startup ? "Conheça nossa startup" : demand ? "Compartilhando um desafio" : "Uma conexão que virou resultado", "post-kind"));
  body.append(el("h3", c.title || c.name || c.demand_title));
  const description = c.description || c.demand_description || (startup ? "Conheça esta startup e suas soluções." : c.startup_name + " entregou uma solução para este desafio.");
  body.append(el("p", description, "post-description"));
  if (c.category_name || c.category) body.append(badge(c.category_name || c.category, "neutral"));
  if (c.tags?.length) body.append(tagList(c.tags));
  if (c.images?.length) body.append(imageGallery(c.images, c.title || c.demand_title));
  if (c.rating) body.append(ratingStars(c.rating));
  else if (startup) body.append(ratingStars(c.average_rating, c.review_count));
  if (c.selected_startup_id || (!demand && c.client_id)) {
    const connected = el("p", undefined, "post-connection");
    connected.append(document.createTextNode(demand ? "Solução por " : "Desafio de "),
      demand ? profileLink("STARTUP", c.selected_startup_id, c.selected_startup_name)
        : profileLink("CLIENT", c.client_id, c.client_name));
    body.append(connected);
  }
  const actions = el("footer", undefined, "post-actions");
  actions.append(action(demand ? (account?.role === "STARTUP" && c.status === "OPEN" ? "Conhecer desafio e propor solução" : "Ver demanda") : startup ? "Ver perfil da startup" : "Ver resultado",
    () => { if (startup && c.id) location.hash = profileHref("STARTUP", c.id); else return openPost(post); }, "btn btn-outline btn-small", "arrow"));
  if (author.id) actions.append(profileLink(author.type, author.id, "Ver perfil", "text-link"));
  card.append(top, body, actions);
  return card;
}
function renderFeedContext() {
  const context = $("market-context"); context.replaceChildren();
  if (account) {
    context.append(el("span", initials(accountName()), "post-avatar"), el("h3", accountName()), el("p", roleLabels[account.role] || "Minha conta"));
    if (account.role === "CLIENT") context.append(action("Publicar um desafio", () => showDemand(), "btn btn-dark btn-small", "plus"));
    else if (account.role === "STARTUP") {
      const proposals = el("a", "Minhas propostas", "text-link"); proposals.href = "#propostas"; context.append(proposals);
    }
    if (account.role === "INVESTOR") context.append(el("p", "Sua identidade permanece privada enquanto você explora perfis e resultados.", "field-help"));
  } else context.append(el("h3", "Boas conexões começam aqui."), el("p", "Conheça quem publica e quem transforma desafios em resultados."), action("Fazer parte", () => showAuth("register"), "btn btn-dark btn-small"));
  const recent = $("recent-results"); recent.replaceChildren();
  const results = feed.filter((post) => post.kind === "REVIEWED_SOLUTION").slice(0, 3);
  if (!results.length) recent.append(el("p", "As entregas avaliadas aparecem aqui conforme novas conexões são concluídas.", "field-help"));
  results.forEach((post) => {
    const row = el("a", undefined, "recent-result"); row.href = profileHref("STARTUP", post.content.startup_id) || "#vitrine";
    row.append(el("strong", post.content.startup_name), el("span", post.content.demand_title), ratingStars(post.content.rating)); recent.append(row);
  });
}
function renderFeed() {
  renderFeedContext();
  feed.forEach((post) => {
    if (post.kind === "DEMAND")
      demandTitles.set(post.content.id, post.content.title);
  });
  const normalize = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const search = normalize($("feed-search").value.trim());
  const filtered = feed.filter(
    (post) =>
      (feedFilter === "ALL" || post.kind === feedFilter) &&
      (!search ||
        normalize(
          [
            post.content.title,
            post.content.name,
            post.content.demand_title,
            post.content.description,
            post.content.startup_name,
            post.content.category_name,
            post.content.client_name,
            post.author_name,
            ...(post.content.tags || []),
          ]
            .filter(Boolean)
            .join(" "),
        ).includes(search)),
  );
  const shown = currentRoute === "inicio" ? filtered.slice(0, 4) : filtered;
  $("feed").replaceChildren(...shown.map(renderPost));
  $("feed").setAttribute("aria-busy", "false");
  if (feedLoaded && !shown.length)
    $("feed").append(
      emptyState(
        feed.length
          ? "Nenhuma conexão com estes filtros"
          : "O próximo desafio pode ser o seu.",
        feed.length
          ? "Tente outro termo ou outra categoria de conteúdo. A busca considera os itens carregados."
          : "A vitrine ainda não tem publicações. Compartilhe uma demanda ou cadastre sua startup para começar.",
        "search",
        feed.length ? "Limpar filtros" : "Fazer parte",
        () => {
          if (feed.length) {
            feedFilter = "ALL";
            feedTag = "";
            $("feed-search").value = "";
            updateTabs();
            return loadFeed();
          } else if (account?.role === "CLIENT") showDemand();
          else if (!account) showAuth("register");
          else location.hash = "inicio";
        },
      ),
    );
  if (!feedLoaded) {
    $("feed").replaceChildren(
      el("div", undefined, "skeleton"),
      el("div", undefined, "skeleton"),
    );
    $("feed").setAttribute("aria-busy", "true");
  }
  ["DEMAND", "STARTUP", "REVIEWED_SOLUTION"].forEach((kind, i) => {
    $("stat-" + ["demands", "startups", "reviews"][i]).textContent = feedLoaded
      ? feed.filter((post) => post.kind === kind).length
      : "—";
  });
  $("more-feed").hidden = !nextFeed || currentRoute === "inicio";
  if (feedLoaded)
    $("feed-status").textContent =
      (search || feedFilter !== "ALL"
        ? filtered.length +
          " resultados nos " +
          feed.length +
          " conteúdos carregados"
        : feed.length + " conteúdos carregados · Vitrine pública") +
      (cachedAt
        ? " · Cópia salva em " + new Date(cachedAt).toLocaleString("pt-BR")
        : "");
}
function updateTabs() {
  const activeTag = $("active-tag-filter"); activeTag.replaceChildren(); activeTag.hidden = !feedTag;
  if (feedTag) activeTag.append(el("span", "Filtrando por #" + feedTag), action("Remover filtro ×", () => { feedTag = ""; updateTabs(); return loadFeed(); }, "post-tag"));
  document.querySelectorAll("[data-filter]").forEach((node) => {
    const active = node.dataset.filter === feedFilter;
    node.classList.toggle("active", active);
    node.setAttribute("aria-pressed", String(active));
  });
}
document.querySelectorAll("[data-filter]").forEach((node) =>
  node.addEventListener("click", () => {
    feedFilter = node.dataset.filter;
    updateTabs();
    run(() => loadFeed());
  }),
);
$("feed-search").addEventListener("input", renderFeed);
async function loadFeed(append = false) {
  const sequence = ++feedSequence;
  try {
    const result = await api(append && nextFeed ? nextFeed : "/api/v1/feed/?" + new URLSearchParams({ kind: feedFilter, ...(feedTag ? { tag: feedTag } : {}) }), {
      publicRead: true,
    });
    if (sequence !== feedSequence) return;
    feed = append
      ? [
          ...feed,
          ...result.results.filter(
            (post) => !feed.some((existing) => existing.id === post.id),
          ),
        ]
      : result.results;
    nextFeed = result.next;
    cachedAt = result.cachedAt || null;
    feedLoaded = true;
    renderFeed();
  } catch (error) {
    if (!feedLoaded) {
      $("feed").setAttribute("aria-busy", "false");
      $("feed").replaceChildren(
        emptyState(
          "A vitrine ainda não está disponível.",
          "Verifique sua conexão. Se o problema continuar, tente novamente em alguns instantes.",
          "compass",
          "Tentar novamente",
          () => loadFeed(),
        ),
      );
      $("feed-status").textContent = "Não foi possível carregar os conteúdos.";
    }
    throw error;
  }
}
$("refresh-feed").addEventListener("click", (event) =>
  run(() => loadFeed(), event.currentTarget),
);
$("more-feed").addEventListener("click", (event) =>
  run(() => loadFeed(true), event.currentTarget),
);
async function openPost(post) {
  const c = post.content;
  $("detail-kind").textContent = {
    DEMAND: "UMA OPORTUNIDADE REAL",
    STARTUP: "CONHEÇA QUEM FAZ ACONTECER",
    REVIEWED_SOLUTION: "CONEXÃO QUE VIROU RESULTADO",
  }[post.kind];
  const container = $("detail-content");
  container.replaceChildren();
  const title = el("h2", c.title || c.name || c.demand_title);
  title.id = "detail-title";
  container.append(title);
  const meta = el("div", undefined, "detail-meta");
  if (post.kind === "DEMAND") {
    meta.append(statusBadge(c.status), badge(c.category_name || "Demanda"));
    container.append(meta, el("p", c.description, "detail-description"));
    if (c.client_id) container.append(profileLink("CLIENT", c.client_id, c.client_name));
    if (c.tags?.length) container.append(tagList(c.tags));
    if (c.images?.length) container.append(imageGallery(c.images, c.title));
    if (c.rating) container.append(ratingStars(c.rating));
    if (c.selected_startup_id) container.append(profileLink("STARTUP", c.selected_startup_id, c.selected_startup_name));
    if (account?.role === "STARTUP" && c.status === "OPEN") {
      if (solutions.some((s) => s.demand_id === c.id))
        container.append(
          el(
            "p",
            "Sua startup já enviou uma proposta para esta demanda. Acompanhe os próximos passos em Propostas e entregas.",
            "privacy-note",
          ),
        );
      else {
        const form = el("form"),
          label = el("label", "Como sua startup pode ajudar?"),
          input = el("textarea");
        input.name = "proposal";
        input.required = true;
        input.maxLength = 10000;
        input.rows = 5;
        input.placeholder =
          "Descreva sua solução, abordagem e o que pode entregar.";
        label.append(input);
        const submit = el("button", "Enviar proposta", "btn btn-dark");
        form.append(label, submit);
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          run(async () => {
            const sequence = accountSequence;
            let submitted;
            try {
              submitted = await api("/api/v1/solutions/", {
                method: "POST",
                data: { demand_id: c.id, proposal: input.value },
              });
            } catch (error) {
              if (error.status === 409)
                throw new Error(
                  "Já existe uma proposta desta startup para a demanda, ou ela não aceita novas propostas. Confira Propostas e entregas e atualize a vitrine.",
                );
              throw error;
            }
            if (sequence !== accountSequence || account?.role !== "STARTUP") return;
            // Update immediately, including while the following network refresh is pending.
            solutions = [...solutions.filter((solution) => solution.demand_id !== c.id), submitted];
            if (activeMatchTab === "role") {
              matchmakingSequence++;
              matchmakingData = matchmakingData.filter((item) => item.demand_id !== c.id);
              renderMatchmaking();
              $("matchmaking-results").removeAttribute("aria-busy");
            }
            $("detail-dialog").close();
            try {
              await loadWorkspace();
              if (sequence !== accountSequence) return;
              if (currentRoute === "matchmaking" && activeMatchTab === "role")
                await loadMatchmaking();
            } catch {
              if (sequence === accountSequence)
                notice("Proposta enviada. Atualize as conexões para carregar os dados mais recentes.", true);
              return;
            }
            if (sequence === accountSequence)
              notice("Proposta enviada. Acompanhe os próximos passos em Propostas e entregas.");
          }, submit);
        });
        container.append(form);
      }
    } else if (!account && c.status === "OPEN")
      container.append(
        action(
          "Quero resolver este desafio",
          () => showAuth("register", "STARTUP"),
          "btn btn-dark",
          "arrow",
        ),
      );
    else if (
      account?.role === "CLIENT" &&
      ownDemands.some((demand) => demand.id === c.id)
    )
      container.append(
        action(
          "Ver propostas recebidas",
          () => {
            $("detail-dialog").close();
            location.hash = "propostas";
          },
          "btn btn-dark",
          "arrow",
        ),
      );
    else if (account?.role === "INVESTOR")
      container.append(
        el(
          "p",
          "Você está explorando a vitrine em modo de leitura privada.",
          "privacy-note",
        ),
      );
  } else if (post.kind === "STARTUP") {
    meta.append(
      badge("Startup", "startup"),
      badge(
        c.review_count
          ? Number(c.average_rating).toLocaleString("pt-BR", {
              maximumFractionDigits: 1,
            }) +
              "/5 · " +
              c.review_count +
              " avaliações"
          : "Ainda sem avaliações",
        "neutral",
      ),
    );
    container.append(
      meta,
      el(
        "p",
        c.description || "Uma nova startup para você conhecer.",
        "detail-description",
      ),
    );
    if (c.website) {
      try {
        const url = new URL(c.website);
        if (["http:", "https:"].includes(url.protocol)) {
          const link = el("a", "Visitar site da startup", "btn btn-dark");
          link.href = url.href;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.append(icon("external"));
          container.append(link);
        }
      } catch {
        /* Invalid legacy URLs are not links. */
      }
    }
  } else {
    meta.append(badge("Solução avaliada", "review"));
    container.append(
      meta,
      el(
        "p",
        c.startup_name +
          " entregou uma solução para este desafio. O cliente confirmou a entrega com uma avaliação de " +
          c.rating +
          " de 5 estrelas.",
        "detail-description",
      ),
      el("p", "★".repeat(c.rating) + "☆".repeat(5 - c.rating), "result-stars"),
    );
  }
  showDialog($("detail-dialog"));
}
function renderStartupCategories() {
  ["profile-category", "registration-category"].forEach((id) => {
    const select = $(id), previous = select.value;
    const saved = id === "profile-category" ? account?.profile?.category : previous;
    select.replaceChildren(
      new Option("Selecione um setor (opcional)", ""),
      ...categories.filter((category) => category.slug.length <= 40)
        .map((category) => new Option(category.name, category.slug)),
    );
    // Preserve legacy profile values until the owner selects a current category.
    if (saved && ![...select.options].some((option) => option.value === saved))
      select.add(new Option(saved, saved));
    select.value = saved || "";
  });
}
async function loadCategories() {
  if (!categories.length)
    categories = await allPages("/api/v1/categories/", { publicRead: true });
  renderStartupCategories();
  const selectedCategory = $("category-select").value;
  $("category-select").replaceChildren(
    new Option("Selecione uma categoria", ""),
    ...categories.map((c) => new Option(c.name, c.id)),
  );
  $("category-select").value = selectedCategory;
}
function draftKey(demand = editingDemand) { return demand?.id || "new"; }
function saveDemandDraft() {
  if (!composerInitialized) return;
  const form = $("demand-form");
  demandDrafts.set(draftKey(), {
    values: Object.fromEntries(["title", "description", "category_id", "visibility"].map((field) => [field, form.elements[field].value])),
    tags: [...demandTags], images: [...demandImages],
  });
}
function clearDemandDrafts() {
  const images = [...demandImages, ...[...demandDrafts.values()].flatMap((draft) => draft.images)];
  new Set(images.filter((image) => image.file).map((image) => image.url)).forEach((url) => URL.revokeObjectURL(url));
  demandDrafts.clear(); demandTags = []; demandImages = []; composerInitialized = false;
  $("demand-tags").replaceChildren(); $("demand-image-previews").replaceChildren();
  $("demand-tag-input").value = ""; $("demand-images").value = "";
}
async function showDemand(demand = null) {
  if (!account) { showAuth("register", "CLIENT"); return; }
  if (account.role !== "CLIENT") return;
  const sequence = accountSequence;
  saveDemandDraft();
  await loadCategories();
  if (sequence !== accountSequence || account?.role !== "CLIENT") return;
  editingDemand = demand;
  const form = $("demand-form"), draft = demandDrafts.get(draftKey(demand));
  form.reset();
  const values = draft?.values || demand || { title: "", description: "", category_id: "", visibility: "PUBLIC" };
  ["title", "description", "category_id", "visibility"].forEach((field) => { form.elements[field].value = values[field] || (field === "visibility" ? "PUBLIC" : ""); });
  demandTags = [...(draft?.tags || demand?.tags || [])];
  demandImages = [...(draft?.images || demand?.images || [])];
  composerInitialized = true;
  $("demand-form-title").textContent = demand ? "Edite seu desafio." : "Publique seu próximo desafio.";
  $("composer-author").replaceChildren(el("span", initials(accountName()), "post-avatar"), el("strong", accountName()), badge("Cliente", "neutral"));
  $("demand-feedback").hidden = true;
  renderComposer(); updateDemandSubmit();
  location.hash = "publicar-demanda";
}
function renderComposer() {
  $("description-counter").textContent = $("demand-form").elements.description.value.length.toLocaleString("pt-BR") + " / 10.000 caracteres";
  $("demand-tags").replaceChildren(...demandTags.map((tag, index) => action("#" + tag + " ×", () => { demandTags.splice(index, 1); renderComposer(); }, "post-tag")));
  $("demand-image-previews").replaceChildren(...demandImages.map((item, index) => {
    const figure = el("figure", undefined, "image-preview"), image = el("img");
    image.src = item.file ? item.url : safeImageUrl(item.url); image.alt = "Imagem " + (index + 1) + " da publicação";
    const remove = action("Remover imagem " + (index + 1) + " ×", () => {
      const [removed] = demandImages.splice(index, 1);
      if (removed.file) URL.revokeObjectURL(removed.url);
      renderComposer();
    }, "remove-image");
    figure.append(image, remove); return figure;
  }));
}
function addDemandTag() {
  const input = $("demand-tag-input"), tag = input.value.trim().replace(/^#+/, "");
  if (!tag) { input.value = ""; return; }
  if (tag.length > 30) throw new Error("Cada tag pode ter no máximo 30 caracteres.");
  if (demandTags.some((value) => value.toLocaleLowerCase("pt-BR") === tag.toLocaleLowerCase("pt-BR"))) { input.value = ""; return; }
  if (demandTags.length >= 8) throw new Error("Use no máximo 8 tags por demanda.");
  demandTags.push(tag); input.value = ""; renderComposer();
}
function addDemandImages(files) {
  const selected = [...files];
  if (demandImages.length + selected.length > 4) throw new Error("Adicione no máximo 4 imagens por demanda.");
  for (const file of selected) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use imagens JPEG, PNG ou WebP.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Cada imagem deve ter no máximo 5 MB.");
  }
  demandImages.push(...selected.map((file) => ({ file, url: URL.createObjectURL(file) })));
  renderComposer();
}
function demandPayload() {
  addDemandTag();
  const form = $("demand-form"), data = new FormData();
  ["title", "description", "category_id", "visibility"].forEach((field) => data.append(field, form.elements[field].value));
  data.append("tags", JSON.stringify(demandTags));
  if (editingDemand) data.append("keep_image_ids", JSON.stringify(demandImages.filter((image) => !image.file).map((image) => image.id)));
  demandImages.filter((image) => image.file).forEach((image) => data.append("images", image.file, image.file.name));
  return data;
}
function updateDemandSubmit() {
  const isPrivate = $("demand-form").elements.visibility.value === "PRIVATE";
  $("demand-submit").textContent = editingDemand ? "Salvar alterações" : isPrivate ? "Salvar demanda privada" : "Publicar demanda";
  $("composer-visibility-note").replaceChildren(badge(isPrivate ? "Publicação privada" : "Publicação pública", "neutral"), el("p", isPrivate ? "Sua demanda fica disponível apenas na sua conta." : "Sua demanda pode ser encontrada por startups, clientes e investidores."));
}
$("demand-form").elements.visibility.forEach((input) => input.addEventListener("change", updateDemandSubmit));
$("demand-form").elements.description.addEventListener("input", renderComposer);
$("demand-tag-input").addEventListener("keydown", (event) => {
  if (["Enter", ","].includes(event.key)) { event.preventDefault(); run(() => addDemandTag()); }
});
$("demand-images").addEventListener("change", (event) => {
  run(() => addDemandImages(event.currentTarget.files)); event.currentTarget.value = "";
});
$("new-demand").addEventListener("click", (event) => run(() => showDemand(), event.currentTarget));
$("publish-cta").addEventListener("click", (event) => run(() => showDemand(), event.currentTarget));
$("demand-form").addEventListener("submit", (event) => {
  event.preventDefault();
  run(async () => {
    if (account?.role !== "CLIENT") return;
    const sequence = accountSequence, editing = Boolean(editingDemand), key = draftKey();
    const result = await api(editing ? "/api/v1/demands/" + editingDemand.id + "/" : "/api/v1/demands/", {
      method: editing ? "PATCH" : "POST", data: demandPayload(),
    });
    if (sequence !== accountSequence) return;
    demandImages.filter((image) => image.file).forEach((image) => URL.revokeObjectURL(image.url));
    demandDrafts.delete(key); demandTags = []; demandImages = []; composerInitialized = false; editingDemand = null;
    $("demand-form").reset(); $("demand-tag-input").value = "";
    location.hash = "demandas";
    await Promise.all([loadOwnDemands(), loadFeed()]);
    if (sequence !== accountSequence) return;
    notice(editing ? "Sua demanda foi atualizada." : result.visibility === "PRIVATE" ? "Demanda salva. Publique quando quiser receber propostas." : "Demanda publicada! Startups já podem enviar propostas.");
  }, $("demand-submit"));
});
function renderOwnDemands() {
  const rows = ownDemands.filter(
    (d) => demandFilter === "ALL" || d.visibility === demandFilter,
  );
  $("own-demands").replaceChildren(
    ...rows.map((demand) => {
      demandTitles.set(demand.id, demand.title);
      const card = el("article", undefined, "feed-card own-demand"),
        top = el("div", undefined, "card-top");
      top.append(
        statusBadge(demand.status),
        badge(
          demand.visibility === "PRIVATE" ? "Privada" : "Pública",
          "neutral",
        ),
      );
      card.append(
        top,
        el("h3", demand.title),
        el("p", demand.description, "card-description"),
      );
      if (demand.tags?.length) card.append(tagList(demand.tags));
      if (demand.images?.length) card.append(imageGallery(demand.images, demand.title));
      if (demand.rating) card.append(ratingStars(demand.rating));
      const controls = el("div", undefined, "card-actions");
      if (demand.status === "OPEN") {
        controls.append(
          action("Encontrar startups", () => showDemandMatches(demand), "btn btn-dark btn-small", "star"),
        );
        controls.append(
          action(
            "Editar",
            () => showDemand(demand),
            "btn btn-outline btn-small",
          ),
        );
        controls.append(
          action(
            "Cancelar",
            () =>
              confirmAction(
                "Cancelar esta demanda?",
                "A demanda será encerrada e suas propostas pendentes serão canceladas. Você não poderá reabri-la.",
                async () => {
                  await api("/api/v1/demands/" + demand.id + "/cancel/", {
                    method: "POST",
                  });
                  await Promise.all([
                    loadOwnDemands(),
                    loadFeed(),
                    loadWorkspace(),
                  ]);
                  notice("Demanda cancelada.");
                },
                "Cancelar demanda",
                true,
              ),
            "btn btn-outline btn-small",
          ),
        );
      }
      controls.append(
        action(
          demand.visibility === "PRIVATE"
            ? "Publicar na vitrine"
            : "Tornar privada",
          async () => {
            await api("/api/v1/demands/" + demand.id + "/", {
              method: "PATCH",
              data: {
                visibility:
                  demand.visibility === "PRIVATE" ? "PUBLIC" : "PRIVATE",
              },
            });
            await Promise.all([loadOwnDemands(), loadFeed()]);
            notice("Visibilidade atualizada.");
          },
          "btn btn-dark btn-small",
        ),
      );
      card.append(controls);
      return card;
    }),
  );
  if (!rows.length)
    $("own-demands").append(
      emptyState(
        "Seu próximo resultado começa com um desafio.",
        demandFilter === "PRIVATE"
          ? "Suas demandas privadas aparecem aqui antes de você publicá-las."
          : "Descreva o que você precisa resolver e receba propostas de startups.",
        "briefcase",
        "Criar uma demanda",
        () => showDemand(),
      ),
    );
  $("more-demands").hidden = !nextDemands;
}
async function loadOwnDemands(append = false) {
  if (account?.role !== "CLIENT") return;
  const sequence = accountSequence,
    requestSequence = ++ownDemandSequence;
  const result = await api(
    append && nextDemands ? nextDemands : "/api/v1/demands/?mine=true",
  );
  if (
    sequence !== accountSequence ||
    requestSequence !== ownDemandSequence ||
    account?.role !== "CLIENT"
  )
    return;
  ownDemands = append ? [...ownDemands, ...result.results] : result.results;
  nextDemands = result.next;
  ownDemandsLoaded = true;
  renderOwnDemands();
}
document.querySelectorAll("[data-demand-filter]").forEach((node) =>
  node.addEventListener("click", () => {
    demandFilter = node.dataset.demandFilter;
    document.querySelectorAll("[data-demand-filter]").forEach((tab) => {
      const active = tab === node;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-pressed", String(active));
    });
    renderOwnDemands();
  }),
);
$("more-demands").addEventListener("click", (event) =>
  run(() => loadOwnDemands(true), event.currentTarget),
);
async function transition(solution, status, delivery) {
  await api("/api/v1/solutions/" + solution.id + "/transition/", {
    method: "POST",
    data: { status, ...(delivery ? { delivery } : {}) },
  });
  await Promise.all([
    loadWorkspace(),
    loadFeed(),
    account?.role === "CLIENT" ? loadOwnDemands() : Promise.resolve(),
  ]);
  notice("Proposta atualizada: " + statuses[status].toLowerCase() + ".");
}
function renderSolutions() {
  $("solutions").replaceChildren(
    ...solutions.map((solution) => {
      const card = el("article", undefined, "solution-card"),
        top = el("div", undefined, "card-top");
      top.append(
        statusBadge(solution.status),
        el("span", shortDate(solution.created_at), "muted"),
      );
      card.append(
        top,
        el(
          "h3",
          demandTitles.get(solution.demand_id) || "Proposta para demanda",
        ),
        el("p", solution.startup_name, "muted"),
        el("p", solution.proposal, "proposal-text"),
      );
      const order = [
          "SUBMITTED",
          "ACCEPTED",
          "IN_PROGRESS",
          "DELIVERED",
          "COMPLETED",
        ],
        progress = el("div", undefined, "solution-progress");
      progress.setAttribute(
        "aria-label",
        "Etapa: " + statuses[solution.status],
      );
      order.forEach((_, i) =>
        progress.append(
          el(
            "span",
            undefined,
            i <= order.indexOf(solution.status) ? "done" : "",
          ),
        ),
      );
      card.append(progress);
      if (solution.delivery) {
        const block = el("div", undefined, "delivery-block");
        block.append(
          el("h4", "Entrega registrada"),
          el("p", solution.delivery, "delivery-text"),
        );
        card.append(block);
      }
      const actions = el("div", undefined, "card-actions");
      if (account.role === "CLIENT" && solution.status === "SUBMITTED") {
        actions.append(
          action(
            "Aceitar proposta",
            () =>
              confirmAction(
                "Iniciar esta conexão?",
                "Ao aceitar esta proposta, as demais propostas para a mesma demanda serão rejeitadas automaticamente.",
                () => transition(solution, "ACCEPTED"),
                "Aceitar proposta",
              ),
            "btn btn-dark btn-small",
            "check",
          ),
        );
        actions.append(
          action(
            "Rejeitar",
            () =>
              confirmAction(
                "Rejeitar esta proposta?",
                "Esta startup não continuará no processo para a demanda.",
                () => transition(solution, "REJECTED"),
                "Rejeitar proposta",
              ),
            "btn btn-outline btn-small",
          ),
        );
      }
      if (account.role === "STARTUP" && solution.status === "SUBMITTED")
        actions.append(
          action(
            "Retirar proposta",
            () =>
              confirmAction(
                "Retirar esta proposta?",
                "A proposta será retirada. Não será possível enviar outra para a mesma demanda.",
                () => transition(solution, "WITHDRAWN"),
                "Retirar proposta",
              ),
            "btn btn-outline btn-small",
          ),
        );
      if (account.role === "STARTUP" && solution.status === "ACCEPTED")
        actions.append(
          action(
            "Iniciar execução",
            () => transition(solution, "IN_PROGRESS"),
            "btn btn-dark btn-small",
            "arrow",
          ),
        );
      if (actions.childNodes.length) card.append(actions);
      if (account.role === "STARTUP" && solution.status === "IN_PROGRESS") {
        const form = el("form"),
          label = el("label", "Descreva o que foi entregue"),
          input = el("textarea");
        input.required = true;
        input.maxLength = 10000;
        input.name = "delivery";
        input.placeholder =
          "Conte a solução implementada e os resultados alcançados.";
        label.append(input);
        const submit = el("button", "Registrar entrega", "btn btn-dark");
        form.append(label, submit);
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          run(() => transition(solution, "DELIVERED", input.value), submit);
        });
        card.append(form);
      }
      if (account.role === "CLIENT" && solution.status === "DELIVERED") {
        const form = el("form"),
          label = el("label", "Como você avalia esta entrega?"),
          select = el("select", undefined, "rating-select");
        select.name = "rating";
        select.required = true;
        select.append(new Option("Selecione de 1 a 5 estrelas", ""));
        [5, 4, 3, 2, 1].forEach((n) =>
          select.append(
            new Option(
              "★".repeat(n) + " · " + n + (n === 1 ? " estrela" : " estrelas"),
              String(n),
            ),
          ),
        );
        label.append(select);
        const submit = el(
          "button",
          "Confirmar entrega e avaliar",
          "btn btn-dark",
        );
        form.append(
          label,
          el(
            "p",
            "A avaliação confirma a conclusão e aparece na vitrine quando a demanda é pública.",
            "muted",
          ),
          submit,
        );
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          confirmAction(
            "Concluir e avaliar esta entrega?",
            "Sua nota será " +
              select.value +
              " de 5 estrelas. A avaliação é definitiva e confirma a conclusão da demanda.",
            async () => {
              await api("/api/v1/reviews/", {
                method: "POST",
                data: {
                  solution_id: solution.id,
                  rating: Number(select.value),
                },
              });
              await Promise.all([
                loadWorkspace(),
                loadOwnDemands(),
                loadFeed(),
              ]);
              notice(
                "Entrega concluída e avaliação registrada. Obrigado por construir uma conexão real!",
              );
            },
            "Confirmar avaliação",
          );
        });
        card.append(form);
      }
      return card;
    }),
  );
  if (!solutions.length)
    $("solutions").append(
      emptyState(
        account.role === "STARTUP"
          ? "Sua próxima conexão está na vitrine."
          : "As boas propostas vão aparecer aqui.",
        account.role === "STARTUP"
          ? "Encontre uma demanda aberta e mostre como sua startup pode ajudar."
          : "Publique uma demanda para que startups conheçam seu desafio e enviem propostas.",
        "layers",
        account.role === "STARTUP" ? "Explorar demandas" : "Publicar demanda",
        () => {
          if (account.role === "STARTUP") {
            feedFilter = "DEMAND";
            updateTabs();
            location.hash = "vitrine";
          } else return showDemand();
        },
      ),
    );
  const groups = [
    ["Enviadas", ["SUBMITTED"]],
    ["Em execução", ["ACCEPTED", "IN_PROGRESS"]],
    ["Entregues", ["DELIVERED", "COMPLETED"]],
  ];
  $("workspace-summary").replaceChildren(
    ...groups.map(([text, states]) => {
      const span = el("span");
      span.append(
        el("strong", solutions.filter((s) => states.includes(s.status)).length),
        document.createTextNode(text),
      );
      return span;
    }),
  );
  $("more-solutions").hidden = !nextSolutions;
}
async function loadWorkspace(append = false) {
  if (!account || !["STARTUP", "CLIENT"].includes(account.role)) return;
  const sequence = accountSequence,
    requestSequence = ++workspaceSequence;
  const result = await api(
    append && nextSolutions ? nextSolutions : "/api/v1/solutions/",
  );
  if (
    sequence !== accountSequence ||
    requestSequence !== workspaceSequence ||
    !account
  )
    return;
  solutions = append ? [...solutions, ...result.results] : result.results;
  nextSolutions = result.next;
  const missing = [...new Set(solutions.map((s) => s.demand_id))].filter(
    (id) => !demandTitles.has(id),
  );
  await Promise.all(
    missing.map(async (id) => {
      try {
        const demand = await api("/api/v1/demands/" + id + "/");
        if (sequence === accountSequence) demandTitles.set(id, demand.title);
      } catch {
        /* A demand may no longer be available; keep its proposal accessible. */
      }
    }),
  );
  if (
    sequence === accountSequence &&
    requestSequence === workspaceSequence &&
    account
  ) {
    workspaceLoaded = true;
    renderSolutions();
  }
}
async function loadPrivateState() {
  if (account && ["CLIENT", "STARTUP"].includes(account.role))
    await Promise.all([
      loadWorkspace(),
      account.role === "CLIENT" ? loadOwnDemands() : loadCategories(),
    ]);
}
$("refresh-workspace").addEventListener("click", (event) =>
  run(() => loadWorkspace(), event.currentTarget),
);
$("more-solutions").addEventListener("click", (event) =>
  run(() => loadWorkspace(true), event.currentTarget),
);
$("profile-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  run(async () => {
    if (account?.role !== "STARTUP") return;
    await api("/api/v1/my-startups/" + account.profile.id + "/", {
      method: "PATCH",
      data: Object.fromEntries(new FormData(form)),
    });
    await restoreAccount();
    await loadFeed();
    notice(
      "Perfil atualizado. A vitrine já está com as suas novas informações.",
    );
  }, form.querySelector("button"));
});
function base64Bytes(value) {
  const decoded = atob(
    value.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (value.length % 4)) % 4),
  );
  return Uint8Array.from(decoded, (c) => c.charCodeAt(0));
}
$("enable-push").addEventListener("click", (event) =>
  run(async () => {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    )
      throw new Error("Este navegador não oferece notificações push.");
    const config = await api("/api/v1/push/config/");
    if (!config.public_key)
      throw new Error(
        "As notificações ainda não foram configuradas para esta plataforma.",
      );
    if ((await Notification.requestPermission()) !== "granted")
      throw new Error(
        "Notificações não autorizadas. Você pode mudar isso nas configurações do navegador.",
      );
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64Bytes(config.public_key),
    });
    const result = await api("/api/v1/push/subscriptions/", {
      method: "POST",
      data: {
        endpoint: subscription.endpoint,
        keys: subscription.toJSON().keys,
        consent: true,
      },
    });
    localStorage.setItem(PUSH_STORAGE_KEY, result.id);
    notice("Notificações ativadas. Você receberá avisos de novidades.");
  }, event.currentTarget),
);
$("disable-push").addEventListener("click", (event) =>
  run(async () => {
    const id = localStorage.getItem(PUSH_STORAGE_KEY);
    if (id)
      await api("/api/v1/push/subscriptions/" + id + "/", { method: "DELETE" });
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
    }
    localStorage.removeItem(PUSH_STORAGE_KEY);
    notice("Notificações desativadas.");
  }, event.currentTarget),
);

function updateMatchmakingTabs() {
  const isStartup = account?.role === "STARTUP";
  $("tab-match-role").hidden = !isStartup;
  $("tab-match-demand").hidden = !matchingDemand || account?.role !== "CLIENT";
  if ((activeMatchTab === "role" && !isStartup) ||
      (activeMatchTab === "demand" && (!matchingDemand || account?.role !== "CLIENT")))
    activeMatchTab = "traction";
  [["tab-match-all", "traction"], ["tab-match-role", "role"], ["tab-match-demand", "demand"]]
    .forEach(([id, value]) => {
      $(id).classList.toggle("active", activeMatchTab === value);
      $(id).setAttribute("aria-pressed", String(activeMatchTab === value));
    });
}
function showDemandMatches(demand) {
  if (account?.role !== "CLIENT") return;
  matchingDemand = { id: demand.id, title: demand.title };
  activeMatchTab = "demand";
  if (currentRoute === "matchmaking") return loadMatchmaking();
  location.hash = "matchmaking";
}
async function loadMatchmaking() {
  updateMatchmakingTabs();
  const sequence = accountSequence,
    requestSequence = ++matchmakingSequence,
    tab = activeMatchTab,
    container = $("matchmaking-results");
  const isCurrent = () => sequence === accountSequence &&
    requestSequence === matchmakingSequence && tab === activeMatchTab;
  matchmakingData = [];
  container.replaceChildren(el("p", "Calculando conexões…", "muted"));
  container.setAttribute("aria-busy", "true");
  let path = "/api/v1/matchmaking/traction-showcase/";
  if (tab === "role") {
    const category = categories.find((item) => item.slug === account.profile.category);
    $("matchmaking-subtitle").textContent =
      "Demandas abertas, ordenadas por compatibilidade com o setor da sua startup (" +
      (category?.name || account.profile.category || "não definido") +
      "). A pontuação combina o setor da demanda com o histórico da sua startup.";
    path = "/api/v1/matchmaking/recommended-demands/";
  } else if (tab === "demand") {
    $("matchmaking-subtitle").textContent = "Startups compatíveis com sua demanda: " + matchingDemand.title;
    path = "/api/v1/matchmaking/demands/" + matchingDemand.id + "/";
  } else {
    $("matchmaking-subtitle").textContent =
      "Startups ordenadas por avaliações de entregas e histórico de testes concluídos.";
  }
  try {
    const result = await api(path, { publicRead: tab === "traction" });
    if (!isCurrent()) return;
    matchmakingData = result;
    renderMatchmaking();
  } catch (error) {
    if (!isCurrent()) return;
    container.replaceChildren(emptyState(
      "Não foi possível carregar as conexões.",
      "Conecte-se à internet e use Atualizar para tentar novamente.", "refresh",
    ));
    throw error;
  } finally {
    if (isCurrent()) container.removeAttribute("aria-busy");
  }
}
function matchMetrics(details) {
  const metrics = el("div", undefined, "match-metrics-grid");
  [["Aderência setorial", "c_setor"], ["Qualidade das avaliações", "m_auditoria"],
    ["Estimativa de impacto", "e_economia"], ["Maturidade dos testes", "t_maturidade"]]
    .forEach(([label, field]) => {
      const metric = el("div");
      metric.append(document.createTextNode(label + ": "), el("strong", Math.round(details[field] * 100) + "%"));
      metrics.append(metric);
    });
  return metrics;
}
async function openRecommendedDemand(id) {
  if (account?.role !== "STARTUP") return;
  const sequence = accountSequence;
  // Re-read current visibility/status before opening the existing proposal form.
  const demand = await api("/api/v1/demands/" + id + "/");
  if (sequence !== accountSequence || account?.role !== "STARTUP") return;
  return openPost({ kind: "DEMAND", content: demand });
}
function renderMatchmaking() {
  const container = $("matchmaking-results");
  container.replaceChildren();
  if (!matchmakingData.length) {
    container.append(emptyState(
      "Nenhuma conexão calculada no momento.",
      activeMatchTab === "role"
        ? "Escolha um setor no perfil para melhorar as recomendações ou aguarde novas demandas abertas."
        : "Nenhuma startup disponível para estes critérios.", "rocket",
    ));
    return;
  }
  matchmakingData.forEach((item) => {
    const card = el("article", undefined, "feed-card matchmaking-card"),
      top = el("div", undefined, "card-top"),
      rightBadges = el("div", undefined, "match-badges");
    const badgeClass = item.score >= 75 ? "match-score-badge badge-high"
      : item.score >= 50 ? "match-score-badge badge-mid" : "match-score-badge";
    const scoreBadge = el("span", undefined, badgeClass);
    scoreBadge.append(icon("star"), document.createTextNode("Score: " + item.score + "%"));
    rightBadges.append(scoreBadge);
    if (item.has_seal)
      rightBadges.append(el("span", "✓ Entrega bem avaliada", "match-seal-badge"));
    if (activeMatchTab === "role") {
      top.append(el("h3", item.title), rightBadges);
      const actions = el("div", undefined, "card-actions");
      const submitted = solutions.some((solution) => solution.demand_id === item.demand_id);
      actions.append(action(submitted ? "Ver proposta enviada" : "Enviar proposta",
        () => openRecommendedDemand(item.demand_id), "btn btn-dark btn-small", "arrow"));
      card.append(top, badge(item.category_name || "Geral", "neutral"),
        el("p", item.description, "card-description"), matchMetrics(item.details), actions);
    } else {
      const heading = el("h3"); heading.append(profileLink("STARTUP", item.startup_id, item.startup_name));
      top.append(heading, rightBadges);
      const stats = el("p", "Avaliação média: " +
        (item.average_rating ? Number(item.average_rating).toFixed(1) + " ★" : "Sem notas ainda") +
        " · Testes concluídos: " + item.completed_tests, "muted");
      const category = categories.find((category) => category.slug === item.startup_category);
      card.append(top, badge(item.startup_category ? "Setor: " + (category?.name || item.startup_category) : "Sem setor", "neutral"),
        el("p", item.startup_description || "Startup focada em resolução de desafios reais.", "card-description"),
        stats, matchMetrics(item.details));
    }
    container.append(card);
  });
}
[["tab-match-all", "traction"], ["tab-match-role", "role"], ["tab-match-demand", "demand"]]
  .forEach(([id, tab]) => $(id).addEventListener("click", (event) => {
    activeMatchTab = tab;
    run(() => loadMatchmaking(), event.currentTarget);
  }));
$("refresh-matchmaking").addEventListener("click", (event) =>
  run(() => loadMatchmaking(), event.currentTarget),
);
function profilePath(type, id) {
  return "/api/v1/" + (type === "startup" ? "startups" : "clients") + "/" + encodeURIComponent(id) + "/";
}
function renderPublicProfileHeader(type, profile) {
  const header = el("article", undefined, "surface public-profile-hero"), identity = el("div", undefined, "public-profile-identity");
  const name = type === "startup" ? profile.name : profile.display_name;
  identity.append(el("span", initials(name), "profile-hero-avatar"));
  const title = el("div"), heading = el("h1", name); heading.id = "public-profile-title";
  title.append(badge(type === "startup" ? "Startup" : "Cliente", "neutral"), heading);
  if (profile.category) {
    const category = categories.find((item) => item.slug === profile.category);
    title.append(el("p", category?.name || profile.category));
  }
  identity.append(title); header.append(identity);
  if (profile.description) header.append(el("p", profile.description, "public-profile-description"));
  if (profile.website) {
    try {
      const url = new URL(profile.website);
      if (["http:", "https:"].includes(url.protocol)) {
        const link = el("a", url.hostname, "text-link"); link.href = url.href; link.target = "_blank"; link.rel = "noopener noreferrer";
        link.append(icon("external")); header.append(link);
      }
    } catch { /* A legacy invalid URL remains plain profile data. */ }
  }
  const stats = el("div", undefined, "public-profile-stats");
  const count = (label, value) => { const item = el("div"); item.append(el("strong", value ?? 0), el("span", label)); return item; };
  stats.append(count(type === "startup" ? "Em andamento" : "Demandas em aberto", type === "startup" ? profile.in_progress_count : profile.open_count), count("Demandas concluídas", profile.completed_count));
  const ratings = el("div"); ratings.append(ratingStars(profile.average_rating, profile.review_count), el("span", type === "startup" ? "Avaliações das soluções entregues" : "Avaliações das entregas recebidas")); stats.append(ratings);
  header.append(stats); $("public-profile-header").replaceChildren(header);
  $("public-profile-history-note").textContent = type === "startup" ? "Demandas públicas em que esta startup foi selecionada. As notas são de clientes que confirmaram as entregas." : "Demandas públicas deste cliente e as avaliações que ele atribuiu às entregas recebidas.";
}
function renderPublicProfileDemands() {
  $("public-profile-demands").replaceChildren(...publicProfileRows.map((demand) => renderPost({ kind: "DEMAND", published_at: demand.created_at, author_type: "CLIENT", author_id: demand.client_id, author_name: demand.client_name, content: demand })));
  if (!publicProfileRows.length) $("public-profile-demands").append(emptyState("Nenhuma demanda pública neste filtro.", "Experimente outro status para conhecer as conexões deste perfil.", "briefcase"));
  $("more-profile-demands").hidden = !nextProfileDemands;
}
async function loadPublicProfile(type, id, append = false) {
  const key = type + "/" + id, requestSequence = ++publicProfileSequence;
  if (key !== publicProfileKey) { profileStatus = "ALL"; publicProfileRows = []; publicProfile = null; }
  publicProfileKey = key;
  if (!append) {
    $("public-profile-header").replaceChildren(el("p", "Carregando perfil público…"));
    $("public-profile-demands").replaceChildren();
  }
  const base = profilePath(type, id);
  const isCurrent = () => requestSequence === publicProfileSequence && publicProfileKey === key;
  try {
    const [profile, page] = await Promise.all([
      publicProfile && append ? Promise.resolve(publicProfile) : api(base, { publicRead: true }),
      api(append && nextProfileDemands ? nextProfileDemands : base + "demands/" + (profileStatus === "ALL" ? "" : "?status=" + profileStatus), { publicRead: true }),
    ]);
    if (!isCurrent()) return;
    publicProfile = profile;
    publicProfileRows = append ? [...publicProfileRows, ...page.results] : page.results;
    nextProfileDemands = page.next;
    renderPublicProfileHeader(type, profile); renderPublicProfileDemands();
    document.querySelectorAll("[data-profile-status]").forEach((tab) => {
      tab.hidden = type === "startup" && tab.dataset.profileStatus === "OPEN";
      const active = tab.dataset.profileStatus === profileStatus; tab.classList.toggle("active", active); tab.setAttribute("aria-pressed", String(active));
    });
  } catch (error) {
    if (!isCurrent()) return;
    $("public-profile-header").replaceChildren(emptyState("Perfil indisponível.", error.status === 404 ? "Este perfil não está disponível publicamente." : "Verifique sua conexão e tente atualizar.", "compass"));
    $("more-profile-demands").hidden = true;
    throw error;
  }
}
$("more-profile-demands").addEventListener("click", (event) => run(() => {
  const [type, id] = publicProfileKey.split("/"); return loadPublicProfile(type, id, true);
}, event.currentTarget));
$("refresh-public-profile").addEventListener("click", (event) => run(() => {
  const [type, id] = publicProfileKey.split("/"); return loadPublicProfile(type, id);
}, event.currentTarget));
document.querySelectorAll("[data-profile-status]").forEach((tab) => tab.addEventListener("click", (event) => {
  profileStatus = tab.dataset.profileStatus;
  const [type, id] = publicProfileKey.split("/"); run(() => loadPublicProfile(type, id), event.currentTarget);
}));
function networkState() {
  $("network-status").hidden = navigator.onLine;
  $("network-status").textContent =
    "Você está offline. A vitrine salva continua disponível. Conecte-se para publicar e acompanhar suas propostas.";
}
window.addEventListener("offline", networkState);
window.addEventListener("online", () => {
  networkState();
  run(async () => {
    await initCsrf();
    await restoreAccount();
    await Promise.all([loadFeed(), loadPrivateState()]);
    route();
  });
});
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/service-worker.js")
    .then((registration) => {
      const update = () => {
        waitingWorker = registration.waiting;
        $("update-banner").hidden = !waitingWorker;
      };
      update();
      registration.addEventListener("updatefound", () => {
        registration.installing?.addEventListener("statechange", update);
      });
    })
    .catch(() =>
      notice("O modo offline não está disponível neste navegador.", true),
    );
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!updateRequested || reloading) return;
    reloading = true;
    location.reload();
  });
}
$("update-app").addEventListener("click", () => {
  updateRequested = true;
  waitingWorker?.postMessage({ type: "ACTIVATE_UPDATE" });
});
registrationRole();
networkState();
renderAccount();
// The public feed is independent of session restoration, including when offline.
run(() => loadFeed());
run(async () => {
  if (navigator.onLine) {
    try {
      await initCsrf();
      await restoreAccount();
      await loadPrivateState();
    } catch (error) {
      notice(
        "O acesso à conta está indisponível. Você pode continuar explorando o conteúdo público. " +
          error.message,
        true,
      );
    }
  }
  route();
});
