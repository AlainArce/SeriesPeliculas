import {
  createClient
} from "https://esm.sh/@supabase/supabase-js@2";


const cfg = window.APP_CONFIG || {};


const TMDB =
  "https://api.themoviedb.org/3";


const IMG =
  "https://image.tmdb.org/t/p/w500";


let supabase = null;

let user = null;

let items = [];

let activeType = "all";


const $ = id =>
  document.getElementById(id);



/* ============================================================
   SUPABASE
============================================================ */


if (
  cfg.SUPABASE_URL &&
  cfg.SUPABASE_ANON_KEY
) {

  supabase = createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_ANON_KEY
  );


  supabase.auth.onAuthStateChange(
    async (_event, session) => {

      user =
        session?.user ?? null;

      await refreshAuthUI();

    }
  );


  const {
    data
  } = await supabase.auth.getSession();


  user =
    data.session?.user ?? null;


} else {

  $("userEmail").textContent =
    "Falta configurar Supabase";

}



/* ============================================================
   LOGIN
============================================================ */


$("authBtn").addEventListener(
  "click",
  () => {

    if (user) {

      logout();

    } else {

      $("authPanel")
        .classList
        .toggle("hidden");

    }

  }
);



$("authForm").addEventListener(
  "submit",
  async e => {

    e.preventDefault();


    if (!supabase) {

      return showAuth(
        "Configurá Supabase primero."
      );

    }


    const email =
      $("email").value.trim();


    const {
      error
    } =
      await supabase.auth.signInWithOtp({

        email,

        options: {

          emailRedirectTo:
            location.origin +
            location.pathname

        }

      });


    showAuth(

      error

        ? error.message

        : "Revisá tu correo y abrí el enlace para entrar."

    );

  }
);



async function logout() {

  await supabase.auth.signOut();


  items = [];


  render();

}



async function refreshAuthUI() {

  if (user) {

    $("userEmail").textContent =
      user.email;

    $("authBtn").textContent =
      "Cerrar sesión";


    $("authPanel")
      .classList
      .add("hidden");


    await loadItems();


  } else {

    $("userEmail").textContent =
      "No iniciada";

    $("authBtn").textContent =
      "Iniciar sesión";


    items = [];


    render();

  }

}



function showAuth(text) {

  $("authMessage")
    .textContent = text;

}



/* ============================================================
   BUSCAR EN TMDB
============================================================ */


$("searchForm").addEventListener(
  "submit",
  async e => {

    e.preventDefault();


    const q =
      $("tmdbSearch")
        .value
        .trim();


    if (!q)
      return;


    if (!cfg.TMDB_API_KEY) {

      $("searchResults").innerHTML =

        `<p class="error">
          Falta configurar la API key de TMDB en config.js.
        </p>`;

      return;

    }


    $("searchResults").innerHTML =

      `<p class="muted">
        Buscando...
      </p>`;


    const type =
      $("searchType").value;


    const url =

      `${TMDB}/search/${type}` +

      `?api_key=${encodeURIComponent(
        cfg.TMDB_API_KEY
      )}` +

      `&language=es-ES` +

      `&query=${encodeURIComponent(q)}` +

      `&include_adult=false`;


    const res =
      await fetch(url);


    const data =
      await res.json();


    if (!res.ok) {

      $("searchResults").innerHTML =

        `<p class="error">
          TMDB devolvió un error.
          Revisá tu API key.
        </p>`;

      return;

    }


    $("searchResults").innerHTML =

      data.results
        .slice(0, 8)
        .map(result => {

          const title =
            result.title ||
            result.name;


          const date =
            result.release_date ||
            result.first_air_date ||
            "";


          const year =
            date
              ? date.slice(0, 4)
              : "";


          const poster =
            result.poster_path
              ? IMG + result.poster_path
              : "";


          const overview =
            result.overview ||
            "Sin descripción disponible.";


          return `

            <article class="result-card">

              ${
                poster

                ? `
                  <img
                    src="${poster}"
                    alt="Poster de ${escapeHtml(title)}"
                  >
                `

                : `
                  <div class="poster-placeholder">
                    🎬
                  </div>
                `
              }


              <div class="result-info">

                <span class="badge">

                  ${
                    type === "movie"
                      ? "PELÍCULA"
                      : "SERIE"
                  }

                </span>


                <h3>
                  ${escapeHtml(title)}
                </h3>


                <small>
                  ${escapeHtml(year)}
                </small>


                <p>
                  ${escapeHtml(overview)}
                </p>


                <button
                  class="small-btn add-btn"

                  data-id="${result.id}"

                  data-type="${type}"

                  data-title="${escapeAttr(title)}"

                  data-year="${escapeAttr(year)}"

                  data-poster="${escapeAttr(poster)}"

                  data-overview="${escapeAttr(overview)}">

                  + Agregar a mi lista

                </button>

              </div>

            </article>

          `;

        })
        .join("");


    document
      .querySelectorAll(".add-btn")
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {

            addItem(
              btn.dataset
            );

          }
        );

      });

  }
);



/* ============================================================
   OBTENER CATEGORÍAS DE TMDB
============================================================ */


async function getGenres(
  type,
  tmdbId
) {

  const url =

    `${TMDB}/${type}/${tmdbId}` +

    `?api_key=${encodeURIComponent(
      cfg.TMDB_API_KEY
    )}` +

    `&language=es-ES`;


  const res =
    await fetch(url);


  if (!res.ok) {

    return [];

  }


  const data =
    await res.json();


  return (
    data.genres || []
  ).map(
    genre => genre.name
  );

}



/* ============================================================
   AGREGAR PELÍCULA / SERIE
============================================================ */


async function addItem(data) {

  if (!user) {

    $("authPanel")
      .classList
      .remove("hidden");


    showAuth(
      "Iniciá sesión antes de agregar títulos."
    );


    return;

  }


  const exists =
    items.some(
      x =>
        x.tmdb_id === Number(data.id) &&
        x.type === data.type
    );


  if (exists) {

    alert(
      "Ese título ya está en tu lista."
    );


    return;

  }


  const button =
    document.querySelector(
      `.add-btn[data-id="${CSS.escape(data.id)}"]`
    );


  if (button) {

    button.disabled = true;

    button.textContent =
      "Agregando...";

  }



  /* OBTENER CATEGORÍAS */

  const genres =
    await getGenres(
      data.type,
      data.id
    );



  const row = {

    user_id:
      user.id,

    tmdb_id:
      Number(data.id),

    type:
      data.type,

    title:
      data.title,

    year:
      data.year || null,

    poster_path:
      data.poster
        ? data.poster.replace(
            IMG,
            ""
          )
        : null,

    overview:
      data.overview,

    genres:
      genres,

    watched:
      false,

    rating:
      "unrated"

  };



  const {
    error
  } =
    await supabase
      .from("media")
      .insert(row);



  if (error) {

    if (button) {

      button.disabled =
        false;

      button.textContent =
        "+ Agregar a mi lista";

    }


    alert(
      error.message
    );


    return;

  }


  await loadItems();

}



/* ============================================================
   CARGAR LISTA
============================================================ */


async function loadItems() {

  if (
    !supabase ||
    !user
  )
    return;


  const {
    data,
    error
  } =
    await supabase
      .from("media")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(error);

    return;

  }


  items =
    data || [];


  updateGenreFilter();


  render();

}



/* ============================================================
   ACTUALIZAR ITEM
============================================================ */


async function updateItem(
  id,
  patch
) {

  const {
    error
  } =
    await supabase
      .from("media")
      .update(patch)
      .eq(
        "id",
        id
      );


  if (error) {

    alert(
      error.message
    );

    return;

  }


  const item =
    items.find(
      x => x.id === id
    );


  if (item) {

    Object.assign(
      item,
      patch
    );

  }


  render();

}



/* ============================================================
   ELIMINAR
============================================================ */


async function deleteItem(id) {

  if (
    !confirm(
      "¿Eliminar este título de tu lista?"
    )
  )
    return;


  const {
    error
  } =
    await supabase
      .from("media")
      .delete()
      .eq(
        "id",
        id
      );


  if (error) {

    alert(
      error.message
    );

    return;

  }


  items =
    items.filter(
      x => x.id !== id
    );


  updateGenreFilter();


  render();

}



/* ============================================================
   BOTONES DE LAS TARJETAS
============================================================ */


$("mediaGrid")
  .addEventListener(
    "click",
    e => {

      const btn =
        e.target.closest(
          "[data-action]"
        );


      if (!btn)
        return;


      const id =
        btn.closest(
          ".card"
        ).dataset.id;


      const item =
        items.find(
          x => x.id === id
        );


      if (!item)
        return;



      if (
        btn.dataset.action ===
        "watched"
      ) {

        updateItem(
          id,
          {
            watched:
              !item.watched
          }
        );

      }



      if (
        btn.dataset.action ===
        "like"
      ) {

        updateItem(
          id,
          {
            rating:
              item.rating ===
              "liked"

                ? "unrated"

                : "liked"
          }
        );

      }



      if (
        btn.dataset.action ===
        "dislike"
      ) {

        updateItem(
          id,
          {
            rating:
              item.rating ===
              "disliked"

                ? "unrated"

                : "disliked"
          }
        );

      }



      if (
        btn.dataset.action ===
        "delete"
      ) {

        deleteItem(id);

      }

    }
  );



/* ============================================================
   TABS
============================================================ */


document
  .querySelectorAll(".tab")
  .forEach(tab => {

    tab.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".tab")
          .forEach(x =>
            x.classList.remove(
              "active"
            )
          );


        tab.classList.add(
          "active"
        );


        activeType =
          tab.dataset.type;


        render();

      }
    );

  });



/* ============================================================
   FILTROS
============================================================ */


[
  $("genreFilter"),
  $("statusFilter"),
  $("ratingFilter"),
  $("listSearch")
].forEach(el => {

  el.addEventListener(
    "input",
    render
  );

  el.addEventListener(
    "change",
    render
  );

});



/* ============================================================
   GENERAR LISTA DE CATEGORÍAS
============================================================ */


function updateGenreFilter() {

  const select =
    $("genreFilter");


  const current =
    select.value;


  const genres =

    [
      ...new Set(

        items.flatMap(
          item =>

            Array.isArray(
              item.genres
            )

              ? item.genres

              : []

        )

      )
    ]
      .sort(
        (a, b) =>
          a.localeCompare(
            b,
            "es"
          )
      );


  select.innerHTML =

    `
      <option value="all">
        Todas las categorías
      </option>
    ` +

    genres
      .map(
        genre => `

          <option
            value="${escapeAttr(genre)}">

            ${escapeHtml(genre)}

          </option>

        `
      )
      .join("");


  if (
    genres.includes(
      current
    )
  ) {

    select.value =
      current;

  } else {

    select.value =
      "all";

  }

}



/* ============================================================
   ACTUALIZAR CATEGORÍAS DE LAS 400 EXISTENTES
============================================================ */


$("updateGenresBtn")
  .addEventListener(
    "click",
    updateMissingGenres
  );



async function updateMissingGenres() {

  if (!user) {

    $("authPanel")
      .classList
      .remove("hidden");


    showAuth(
      "Iniciá sesión primero."
    );


    return;

  }


  if (!cfg.TMDB_API_KEY) {

    alert(
      "Falta la API key de TMDB."
    );


    return;

  }


  const missing =

    items.filter(
      item =>

        !Array.isArray(
          item.genres
        )

        ||

        item.genres.length === 0

    );


  if (!missing.length) {

    alert(
      "Todas tus películas y series ya tienen categorías."
    );


    return;

  }


  const btn =
    $("updateGenresBtn");


  btn.disabled =
    true;


  for (
    let i = 0;
    i < missing.length;
    i++
  ) {

    btn.textContent =

      `Actualizando ${
        i + 1
      }/${missing.length}...`;


    const item =
      missing[i];


    try {

      const genres =
        await getGenres(
          item.type,
          item.tmdb_id
        );


      const {
        error
      } =
        await supabase
          .from("media")
          .update({
            genres
          })
          .eq(
            "id",
            item.id
          );


      if (!error) {

        item.genres =
          genres;

      }

    } catch (
      error
    ) {

      console.error(
        error
      );

    }

  }


  btn.disabled =
    false;


  btn.textContent =
    "Actualizar categorías";


  updateGenreFilter();


  render();


  alert(
    "Listo. Se actualizaron las categorías."
  );

}



/* ============================================================
   FILTRAR
============================================================ */


function filteredItems() {

  const genre =
    $("genreFilter").value;


  const status =
    $("statusFilter").value;


  const rating =
    $("ratingFilter").value;


  const search =
    $("listSearch")
      .value
      .trim()
      .toLowerCase();


  return items.filter(
    item => {

      const typeOk =

        activeType ===
        "all"

          ||

        item.type ===
        activeType;



      const statusOk =

        status ===
        "all"

          ||

        (
          status ===
          "watched"

            ? item.watched

            : !item.watched
        );



      const ratingOk =

        rating ===
        "all"

          ||

        item.rating ===
        rating;



      const genreOk =

        genre ===
        "all"

          ||

        (
          Array.isArray(
            item.genres
          )

          &&

          item.genres.includes(
            genre
          )
        );



      const text =

        `
          ${item.title}
          ${item.year || ""}
          ${item.overview || ""}
        `
          .toLowerCase();



      const searchOk =

        !search ||

        text.includes(
          search
        );



      return (

        typeOk &&

        statusOk &&

        ratingOk &&

        genreOk &&

        searchOk

      );

    }
  );

}



/* ============================================================
   MOSTRAR
============================================================ */


function render() {

  const list =
    filteredItems();


  $("emptyState")
    .style
    .display =
      list.length
        ? "none"
        : "block";



  $("mediaGrid").innerHTML =

    list.map(
      item => `

        <article
          class="card"
          data-id="${item.id}">


          <div class="poster-wrap">

            ${
              item.poster_path

                ? `

                  <img
                    src="${IMG}${item.poster_path}"
                    alt="Poster de ${escapeHtml(item.title)}"
                  >

                `

                : `

                  <div class="poster-placeholder">
                    🎬
                  </div>

                `
            }

          </div>



          <div class="card-content">


            <div class="card-top">

              <span
                class="badge ${
                  item.type === "tv"
                    ? "series"
                    : ""
                }">

                ${
                  item.type === "movie"
                    ? "PELÍCULA"
                    : "SERIE"
                }

              </span>


              <span class="year">

                ${
                  escapeHtml(
                    item.year ||
                    ""
                  )
                }

              </span>

            </div>



            <h3>

              ${escapeHtml(
                item.title
              )}

            </h3>



            <!-- CATEGORÍAS -->

            <div class="genres">

              ${
                (
                  Array.isArray(
                    item.genres
                  )

                    ? item.genres

                    : []
                )
                  .map(
                    genre => `

                      <span>
                        ${escapeHtml(genre)}
                      </span>

                    `
                  )
                  .join("")
              }

            </div>



            <p class="overview">

              ${escapeHtml(
                item.overview ||
                "Sin descripción."
              )}

            </p>



            <div
              class="status ${
                item.watched
                  ? "watched"
                  : ""
              }">

              ${
                item.watched
                  ? "✓ Ya la vi"
                  : "○ Pendiente"
              }

            </div>



            <div class="card-actions">


              <button
                class="small-btn"
                data-action="watched">

                ${
                  item.watched
                    ? "Marcar pendiente"
                    : "Marcar vista"
                }

              </button>



              <button
                class="small-btn good ${
                  item.rating === "liked"
                    ? "active"
                    : ""
                }"
                data-action="like">

                👍 Me gustó

              </button>



              <button
                class="small-btn bad ${
                  item.rating === "disliked"
                    ? "active"
                    : ""
                }"
                data-action="dislike">

                👎 No me gustó

              </button>



              <button
                class="small-btn delete"
                data-action="delete">

                Eliminar

              </button>


            </div>


          </div>


        </article>

      `
    )
    .join("");


  $("totalCount")
    .textContent =
      items.length;


  $("pendingCount")
    .textContent =
      items.filter(
        x => !x.watched
      ).length;


  $("watchedCount")
    .textContent =
      items.filter(
        x => x.watched
      ).length;


  $("likedCount")
    .textContent =
      items.filter(
        x => x.rating === "liked"
      ).length;

}



/* ============================================================
   ESCAPAR HTML
============================================================ */


function escapeHtml(value) {

  return String(
    value ?? ""
  )

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}



function escapeAttr(value) {

  return escapeHtml(
    value
  );

}



/* ============================================================
   INICIO
============================================================ */


if (
  !cfg.TMDB_API_KEY ||
  !cfg.SUPABASE_URL ||
  !cfg.SUPABASE_ANON_KEY
) {

  $("searchResults").innerHTML =

    `<p class="muted">

      Configurá TMDB y Supabase
      siguiendo el README.

    </p>`;

}


render();
