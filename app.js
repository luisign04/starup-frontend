"use strict";

// Buildless, same-origin client. Personal data stays in memory, never localStorage.
const $ = (id) => document.getElementById(id);
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
  const url = new URL(path, location.origin);
  if (url.origin !== location.origin || !url.pathname.startsWith("/api/v1/"))
    throw new Error("Destino não permitido.");
  if (method !== "GET" && !navigator.onLine)
    throw new Error("Conecte-se à internet para concluir esta ação.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(url.href, {
      method,
      credentials: publicRead ? "omit" : "same-origin",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...(!publicRead ? { "X-CSRFToken": csrfToken } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
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
  "como-funciona": "Como funciona",
  conta: "Minha conta",
};
function route() {
  const name = location.hash.slice(1) || "inicio";
  const validName = Object.hasOwn(routeNames, name) ? name : "inicio";
  if (["demandas", "propostas", "conta"].includes(validName) && !account) {
    currentRoute = "inicio";
    history.replaceState(null, "", "#inicio");
    showAuth("login");
  } else if (
    (validName === "demandas" && account.role !== "CLIENT") ||
    (validName === "propostas" && !["CLIENT", "STARTUP"].includes(account.role))
  ) {
    currentRoute = "vitrine";
    history.replaceState(null, "", "#vitrine");
  } else {
    currentRoute = validName;
  }
  const home = currentRoute === "inicio",
    market = home || currentRoute === "vitrine";
  $("home-view").hidden = !home;
  $("market-view").hidden = !market;
  $("demands-view").hidden = currentRoute !== "demandas";
  $("workspace-view").hidden = currentRoute !== "propostas";
  $("matchmaking-view").hidden = currentRoute !== "matchmaking";
  $("how-view").hidden = currentRoute !== "como-funciona";
  $("account-view").hidden = currentRoute !== "conta";
  document.querySelectorAll("[data-route]").forEach((node) => {
    const active = node.dataset.route === currentRoute;
    node.classList.toggle("active", active);
    if (active) node.setAttribute("aria-current", "page");
    else node.removeAttribute("aria-current");
  });
  $("breadcrumb-current").textContent = routeNames[currentRoute];
  document.title = routeNames[currentRoute] + " — StarUP";
  $("market-eyebrow").style.display = home ? "none" : "block";
  $("feed-title").textContent = home
    ? "Explore o que está acontecendo"
    : "Uma boa conexão começa aqui.";
  $("market-description").textContent = home
    ? "Encontre uma oportunidade para começar algo bom."
    : "Descubra demandas, conheça startups e explore resultados reais.";
  $("see-all-feed").hidden = !home;
  setMenu(false);
  renderFeed();
  if (currentRoute === "demandas" && !ownDemandsLoaded)
    run(() => loadOwnDemands());
  if (currentRoute === "propostas" && !workspaceLoaded)
    run(() => loadWorkspace());
  if (currentRoute === "matchmaking")
    run(() => loadMatchmaking());
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
function renderPost(post) {
  const c = post.content,
    demand = post.kind === "DEMAND",
    startup = post.kind === "STARTUP";
  const card = el("article", undefined, "feed-card"),
    top = el("div", undefined, "card-top"),
    mark = el(
      "span",
      undefined,
      "entity-icon " + (startup ? "startup" : demand ? "" : "review"),
    );
  mark.append(
    startup
      ? document.createTextNode(initials(c.name))
      : icon(demand ? "briefcase" : "star"),
  );
  top.append(
    mark,
    demand
      ? statusBadge(c.status)
      : badge(
          startup ? "Startup" : "Solução avaliada",
          startup ? "startup" : "review",
        ),
  );
  const body = el("div", undefined, "card-body");
  body.append(el("h3", c.title || c.name || c.demand_title));
  body.append(
    el(
      "p",
      demand || startup
        ? c.description || "Conheça esta startup e suas soluções."
        : c.startup_name +
            " entregou uma solução avaliada com " +
            c.rating +
            " de 5 estrelas.",
      "card-description",
    ),
  );
  const foot = el("div", undefined, "card-footer"),
    meta = el("span", undefined, "card-date");
  if (startup && c.review_count) {
    meta.append(
      icon("star"),
      document.createTextNode(
        Number(c.average_rating).toLocaleString("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }) +
          " · " +
          c.review_count +
          " avaliações",
      ),
    );
  } else if (startup) meta.textContent = "Novas possibilidades";
  else if (!demand) {
    meta.append(
      icon("star"),
      document.createTextNode(c.rating + "/5 · Resultado real"),
    );
  } else {
    meta.append(
      icon("clock"),
      document.createTextNode(shortDate(post.published_at)),
    );
  }
  foot.append(
    meta,
    action(
      demand ? "Ver demanda" : startup ? "Conhecer" : "Ver resultado",
      () => openPost(post),
      "text-link icon-button-link",
      "arrow",
    ),
  );
  card.append(top, body, foot);
  return card;
}
function renderFeed() {
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
            $("feed-search").value = "";
            updateTabs();
            renderFeed();
          } else if (account?.role === "CLIENT") showDemand();
          else if (!account) showAuth("register");
          else location.hash = "como-funciona";
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
    renderFeed();
  }),
);
$("feed-search").addEventListener("input", renderFeed);
async function loadFeed(append = false) {
  const sequence = ++feedSequence;
  try {
    const result = await api(append && nextFeed ? nextFeed : "/api/v1/feed/", {
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
async function showDemand(demand = null) {
  if (!account) {
    showAuth("register", "CLIENT");
    return;
  }
  if (account.role !== "CLIENT") return;
  await loadCategories();
  editingDemand = demand;
  const form = $("demand-form");
  form.reset();
  $("demand-form-title").textContent = demand
    ? "Ajuste os detalhes do desafio."
    : "O que você precisa resolver?";
  if (demand) {
    ["title", "description", "category_id"].forEach((field) => {
      form.elements[field].value = demand[field];
    });
    form.elements.visibility.value = demand.visibility;
  }
  updateDemandSubmit();
  showDialog($("demand-dialog"));
}
function updateDemandSubmit() {
  $("demand-submit").textContent = editingDemand
    ? "Salvar alterações"
    : $("demand-form").elements.visibility.value === "PRIVATE"
      ? "Salvar demanda privada"
      : "Publicar demanda";
}
$("demand-form").elements.visibility.forEach((input) =>
  input.addEventListener("change", updateDemandSubmit),
);
$("new-demand").addEventListener("click", (event) =>
  run(() => showDemand(), event.currentTarget),
);
$("publish-cta").addEventListener("click", (event) =>
  run(() => showDemand(), event.currentTarget),
);
$("demand-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  run(async () => {
    const editing = Boolean(editingDemand);
    const result = await api(
      editing
        ? "/api/v1/demands/" + editingDemand.id + "/"
        : "/api/v1/demands/",
      {
        method: editing ? "PATCH" : "POST",
        data: Object.fromEntries(new FormData(form)),
      },
    );
    $("demand-dialog").close();
    form.reset();
    editingDemand = null;
    await Promise.all([loadOwnDemands(), loadFeed()]);
    notice(
      editing
        ? "Sua demanda foi atualizada."
        : result.visibility === "PRIVATE"
          ? "Demanda salva. Publique na vitrine quando quiser receber propostas."
          : "Demanda publicada! Startups já podem enviar propostas.",
    );
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
      const heading = el("h3", item.startup_name);
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
