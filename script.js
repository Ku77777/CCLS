(function () {
  const { CATEGORIES, STICKERS, STICKER_IMAGES } = window.ALBUM_DATA;
  const STICKERS_BY_ID = Object.fromEntries(STICKERS.map((s) => [s.id, s]));

  let state = { owned: {} }; // owned[stickerId] = cantidad de copias obtenidas
  let activeCat = CATEGORIES[0].id;
  let pendingReveal = null; // { drawn: [...ids], deltaOwned: {...} } mientras el sobre está abierto

  const el = {
    tabs: document.getElementById("tabs"),
    pageTitle: document.getElementById("pageTitle"),
    pageCount: document.getElementById("pageCount"),
    pageGrid: document.getElementById("pageGrid"),
    statOwned: document.getElementById("statOwned"),
    statTotal: document.getElementById("statTotal"),
    statPct: document.getElementById("statPct"),
    progressFill: document.getElementById("progressFill"),
    openPackBtn: document.getElementById("openPackBtn"),
    revealTray: document.getElementById("revealTray"),
    revealGrid: document.getElementById("revealGrid"),
    closeRevealBtn: document.getElementById("closeRevealBtn"),
    dupesPanel: document.getElementById("dupesPanel"),
    dupesList: document.getElementById("dupesList"),
    dupesCount: document.getElementById("dupesCount"),
    syncStatus: document.getElementById("syncStatus"),
    toast: document.getElementById("toast"),
  };

  const PACK_SIZE = 5;

  function ownedCount(id) {
    return state.owned[id] || 0;
  }

  function totalOwnedStickers() {
    return Object.keys(state.owned).filter((id) => state.owned[id] > 0).length;
  }

  function catProgress(catId) {
    const stickersInCat = STICKERS.filter((s) => s.catId === catId);
    const owned = stickersInCat.filter((s) => ownedCount(s.id) > 0).length;
    return { owned, total: stickersInCat.length };
  }

  // ---------- Render ----------

  function renderTabs() {
    el.tabs.innerHTML = "";
    CATEGORIES.forEach((cat) => {
      const { owned, total } = catProgress(cat.id);
      const btn = document.createElement("button");
      btn.className = "tab" + (cat.id === activeCat ? " tab--active" : "");
      btn.type = "button";
      btn.innerHTML = `<span class="tab__name">${cat.name}</span><span class="tab__frac">${owned}/${total}</span>`;
      btn.addEventListener("click", () => {
        activeCat = cat.id;
        renderTabs();
        renderPage();
      });
      el.tabs.appendChild(btn);
    });
  }

  function slotContent(sticker, owned) {
    if (!owned) return sticker.label;
    const img = STICKER_IMAGES[sticker.id];
    if (img) return `<img src="${img}" alt="Figurita ${sticker.label}">`;
    return sticker.label;
  }

  function renderPage() {
    const cat = CATEGORIES.find((c) => c.id === activeCat);
    const stickersInCat = STICKERS.filter((s) => s.catId === activeCat);
    const { owned, total } = catProgress(activeCat);

    el.pageTitle.textContent = cat.name;
    el.pageCount.textContent = `${owned} / ${total}`;
    el.pageGrid.innerHTML = "";

    stickersInCat.forEach((sticker) => {
      const isOwned = ownedCount(sticker.id) > 0;
      const slot = document.createElement("div");
      slot.className = "slot" + (isOwned ? " slot--filled" : " slot--empty");
      slot.innerHTML = `<span class="slot__content">${slotContent(sticker, isOwned)}</span>`;
      el.pageGrid.appendChild(slot);
    });
  }

  function renderStats() {
    const owned = totalOwnedStickers();
    const total = STICKERS.length;
    const pct = total ? Math.round((owned / total) * 100) : 0;
    el.statOwned.textContent = owned;
    el.statTotal.textContent = total;
    el.statPct.textContent = `${pct}%`;
    el.progressFill.style.width = `${pct}%`;
  }

  function renderDupes() {
    const dupeEntries = Object.entries(state.owned).filter(([, count]) => count > 1);
    el.dupesCount.textContent = `(${dupeEntries.length})`;
    if (dupeEntries.length === 0) {
      el.dupesList.innerHTML = `<p class="dupes__empty">Todavía no tenés repetidas.</p>`;
      return;
    }
    el.dupesList.innerHTML = "";
    dupeEntries
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .forEach(([id, count]) => {
        const sticker = STICKERS_BY_ID[id];
        const cat = CATEGORIES.find((c) => c.id === sticker.catId);
        const chip = document.createElement("div");
        chip.className = "dupe-chip";
        chip.innerHTML = `<span class="dupe-chip__num">${sticker.label}</span><span class="dupe-chip__cat">${cat.name}</span><span class="dupe-chip__extra">x${count - 1}</span>`;
        el.dupesList.appendChild(chip);
      });
  }

  function renderAll() {
    renderTabs();
    renderPage();
    renderStats();
    renderDupes();
  }

  // ---------- Sobres ----------

  function drawPack() {
    const drawn = [];
    for (let i = 0; i < PACK_SIZE; i++) {
      const s = STICKERS[Math.floor(Math.random() * STICKERS.length)];
      drawn.push(s.id);
    }
    return drawn;
  }

  function openPack() {
    if (pendingReveal) return; // ya hay un sobre abierto sin cerrar
    const drawn = drawPack();
    pendingReveal = { drawn };

    el.revealGrid.innerHTML = "";
    drawn.forEach((id) => {
      const sticker = STICKERS_BY_ID[id];
      const isNew = ownedCount(id) === 0;
      const card = document.createElement("div");
      card.className = "reveal-card" + (isNew ? " reveal-card--new" : " reveal-card--dupe");
      card.innerHTML = `
        <span class="reveal-card__num">${sticker.label}</span>
        <span class="reveal-card__tag">${isNew ? "¡Nueva! Pegada" : "Repetida"}</span>
      `;
      el.revealGrid.appendChild(card);
    });

    drawn.forEach((id) => {
      state.owned[id] = ownedCount(id) + 1;
    });

    // se guarda ya mismo, no hace falta cerrar la bandeja para que quede
    renderStats();
    renderDupes();
    persist();

    el.revealTray.hidden = false;
    el.openPackBtn.disabled = true;
  }

  function closeReveal() {
    pendingReveal = null;
    el.revealTray.hidden = true;
    el.openPackBtn.disabled = false;
    renderAll();
  }

  // ---------- Guardado ----------

  let saveTimeout = null;
  function persist() {
    if (!window.AlbumStorage) return;
    el.syncStatus.textContent = "Guardando…";
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      const ok = await window.AlbumStorage.save(state);
      el.syncStatus.textContent = ok
        ? window.AlbumStorage.mode === "firebase"
          ? "Guardado en la nube"
          : "Guardado en este navegador"
        : "No se pudo guardar";
    }, 150);
  }

  async function boot() {
    el.syncStatus.textContent = "Cargando álbum…";
    const loaded = window.AlbumStorage ? await window.AlbumStorage.load() : null;
    if (loaded && loaded.owned) {
      state = loaded;
    }
    el.syncStatus.textContent =
      window.AlbumStorage && window.AlbumStorage.mode === "firebase"
        ? "Guardado en la nube"
        : "Guardado en este navegador";
    renderAll();
  }

  el.openPackBtn.addEventListener("click", openPack);
  el.closeRevealBtn.addEventListener("click", closeReveal);

  window.addEventListener("beforeunload", () => {
    if (window.AlbumStorage) {
      clearTimeout(saveTimeout);
      window.AlbumStorage.save(state);
    }
  });

  if (window.AlbumStorage) {
    boot();
  } else {
    window.addEventListener("album-storage-ready", boot, { once: true });
  }
})();