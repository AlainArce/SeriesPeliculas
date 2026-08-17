import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.APP_CONFIG || {};
const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";

let supabase = null;
let user = null;
let items = [];
let activeType = "all";

const $ = id => document.getElementById(id);

function configured() {
  return cfg.TMDB_API_KEY && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY;
}

if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) {
  supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  supabase.auth.onAuthStateChange(async (_event, session) => {
    user = session?.user ?? null;
    await refreshAuthUI();
  });
  const { data } = await supabase.auth.getSession();
  user = data.session?.user ?? null;
} else {
  $("userEmail").textContent = "Falta configurar Supabase";
}

$("authBtn").addEventListener("click", () => {
  if (user) logout();
  else $("authPanel").classList.toggle("hidden");
});

$("authForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!supabase) return showAuth("Configurá Supabase primero.");
  const email = $("email").value.trim();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname }
  });
  showAuth(error ? error.message : "Revisá tu correo y abrí el enlace para entrar.");
});

async function logout() {
  await supabase.auth.signOut();
  items = [];
  render();
}

async function refreshAuthUI() {
  if (user) {
    $("userEmail").textContent = user.email;
    $("authBtn").textContent = "Cerrar sesión";
    $("authPanel").classList.add("hidden");
    await loadItems();
  } else {
    $("userEmail").textContent = "No iniciada";
    $("authBtn").textContent = "Iniciar sesión";
    items = [];
    render();
  }
}

function showAuth(text) {
  $("authMessage").textContent = text;
}

$("searchForm").addEventListener("submit", async e => {
  e.preventDefault();
  const q = $("tmdbSearch").value.trim();
  if (!q) return;
  if (!cfg.TMDB_API_KEY) {
    $("searchResults").innerHTML = `<p class="error">Falta configurar la API key de TMDB en config.js.</p>`;
    return;
  }

  $("searchResults").innerHTML = `<p class="muted">Buscando...</p>`;
  const type = $("searchType").value;
  const url = `${TMDB}/search/${type}?api_key=${encodeURIComponent(cfg.TMDB_API_KEY)}&language=es-ES&query=${encodeURIComponent(q)}&include_adult=false`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    $("searchResults").innerHTML = `<p class="error">TMDB devolvió un error. Revisá tu API key.</p>`;
    return;
  }

  $("searchResults").innerHTML = data.results.slice(0, 8).map(result => {
    const title = result.title || result.name;
    const date = result.release_date || result.first_air_date || "";
    const year = date ? date.slice(0, 4) : "";
    const poster = result.poster_path ? IMG + result.poster_path : "";
    const overview = result.overview || "Sin descripción disponible.";

    return `
      <article class="result-card">
        ${poster ? `<img src="${poster}" alt="Poster de ${escapeHtml(title)}">` : `<div class="poster-placeholder">🎬</div>`}
        <div class="result-info">
          <span class="badge">${type === "movie" ? "PELÍCULA" : "SERIE"}</span>
          <h3>${escapeHtml(title)}</h3>
          <small>${escapeHtml(year)}</small>
          <p>${escapeHtml(overview)}</p>
          <button class="small-btn add-btn"
            data-id="${result.id}"
            data-type="${type}"
            data-title="${escapeAttr(title)}"
            data-year="${escapeAttr(year)}"
            data-poster="${escapeAttr(poster)}"
            data-overview="${escapeAttr(overview)}">
            + Agregar a mi lista
          </button>
        </div>
      </article>`;
  }).join("");

  document.querySelectorAll(".add-btn").forEach(btn => btn.addEventListener("click", () => addItem(btn.dataset)));
});

async function addItem(data) {
  if (!user) {
    $("authPanel").classList.remove("hidden");
    showAuth("Iniciá sesión antes de agregar títulos.");
    return;
  }

  const exists = items.some(x => x.tmdb_id === Number(data.id) && x.type === data.type);
  if (exists) return alert("Ese título ya está en tu lista.");

  const row = {
    user_id: user.id,
    tmdb_id: Number(data.id),
    type: data.type,
    title: data.title,
    year: data.year || null,
    poster_path: data.poster ? data.poster.replace(IMG, "") : null,
    overview: data.overview,
    watched: false,
    rating: "unrated"
  };

  const { error } = await supabase.from("media").insert(row);
  if (error) return alert(error.message);

  await loadItems();
}

async function loadItems() {
  if (!supabase || !user) return;
  const { data, error } = await supabase
    .from("media")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }
  items = data || [];
  render();
}

async function updateItem(id, patch) {
  const { error } = await supabase.from("media").update(patch).eq("id", id);
  if (error) return alert(error.message);
  const item = items.find(x => x.id === id);
  if (item) Object.assign(item, patch);
  render();
}

async function deleteItem(id) {
  if (!confirm("¿Eliminar este título de tu lista?")) return;
  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) return alert(error.message);
  items = items.filter(x => x.id !== id);
  render();
}

$("mediaGrid").addEventListener("click", e => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = btn.closest(".card").dataset.id;
  const item = items.find(x => x.id === id);
  if (!item) return;

  if (btn.dataset.action === "watched") updateItem(id, { watched: !item.watched });
  if (btn.dataset.action === "like") updateItem(id, { rating: item.rating === "liked" ? "unrated" : "liked" });
  if (btn.dataset.action === "dislike") updateItem(id, { rating: item.rating === "disliked" ? "unrated" : "disliked" });
  if (btn.dataset.action === "delete") deleteItem(id);
});

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    tab.classList.add("active");
    activeType = tab.dataset.type;
    render();
  });
});

[$("statusFilter"), $("ratingFilter"), $("listSearch")].forEach(el => {
  el.addEventListener("input", render);
  el.addEventListener("change", render);
});

function filteredItems() {
  const status = $("statusFilter").value;
  const rating = $("ratingFilter").value;
  const search = $("listSearch").value.trim().toLowerCase();

  return items.filter(x => {
    const typeOk = activeType === "all" || x.type === activeType;
    const statusOk = status === "all" || (status === "watched" ? x.watched : !x.watched);
    const ratingOk = rating === "all" || x.rating === rating;
    const text = `${x.title} ${x.year || ""} ${x.overview || ""}`.toLowerCase();
    return typeOk && statusOk && ratingOk && (!search || text.includes(search));
  });
}

function render() {
  const list = filteredItems();
  $("emptyState").style.display = list.length ? "none" : "block";

  $("mediaGrid").innerHTML = list.map(x => `
    <article class="card" data-id="${x.id}">
      <div class="poster-wrap">
        ${x.poster_path ? `<img src="${IMG}${x.poster_path}" alt="Poster de ${escapeHtml(x.title)}">` : `<div class="poster-placeholder">🎬</div>`}
      </div>
      <div class="card-content">
        <div class="card-top">
          <span class="badge ${x.type === "tv" ? "series" : ""}">${x.type === "movie" ? "PELÍCULA" : "SERIE"}</span>
          <span class="year">${escapeHtml(x.year || "")}</span>
        </div>
        <h3>${escapeHtml(x.title)}</h3>
        <p class="overview">${escapeHtml(x.overview || "Sin descripción.")}</p>
        <div class="status ${x.watched ? "watched" : ""}">${x.watched ? "✓ Ya la vi" : "○ Pendiente"}</div>
        <div class="card-actions">
          <button class="small-btn" data-action="watched">${x.watched ? "Marcar pendiente" : "Marcar vista"}</button>
          <button class="small-btn good ${x.rating === "liked" ? "active" : ""}" data-action="like">👍 Me gustó</button>
          <button class="small-btn bad ${x.rating === "disliked" ? "active" : ""}" data-action="dislike">👎 No me gustó</button>
          <button class="small-btn delete" data-action="delete">Eliminar</button>
        </div>
      </div>
    </article>
  `).join("");

  $("totalCount").textContent = items.length;
  $("pendingCount").textContent = items.filter(x => !x.watched).length;
  $("watchedCount").textContent = items.filter(x => x.watched).length;
  $("likedCount").textContent = items.filter(x => x.rating === "liked").length;
}

function escapeHtml(v) {
  return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function escapeAttr(v) { return escapeHtml(v); }

if (!configured()) {
  $("searchResults").innerHTML = `<p class="muted">Configurá TMDB y Supabase siguiendo el README para empezar.</p>`;
}
render();
