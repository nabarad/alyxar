(() => {
  const consoleEl = document.querySelector(".console");
  if (!consoleEl) return;

  let core = consoleEl.querySelector(".node.core");
  if (!core) return;

  // ----------------------
  // Context system (existing)
  // ----------------------
  const allContextNodes = Array.from(document.querySelectorAll("[data-context]"));
  const tokenToNodes = new Map();

  for (const el of allContextNodes) {
    const raw = (el.dataset.context || "").trim();
    if (!raw) continue;
    for (const t of raw.split(/\s+/)) {
      if (!tokenToNodes.has(t)) tokenToNodes.set(t, new Set());
      tokenToNodes.get(t).add(el);
    }
  }

  function setActiveContext(context) {
    for (const el of allContextNodes) el.hidden = true;
    const group = tokenToNodes.get(context);
    if (group) for (const el of group) el.hidden = false;
  }

  setActiveContext("lumen");

  consoleEl.addEventListener("click", (e) => {
    const target = e.target.closest(".node.primary");
    if (!target) return;
    swapWithCore(target);
  });

  consoleEl.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const target = e.target.closest(".node.primary");
    if (!target) return;
    e.preventDefault();
    swapWithCore(target);
  });

  function swapWithCore(target) {
    if (target === core) return;

    const coreSlot = getSlotClass(core);
    const targetSlot = getSlotClass(target);

    if (coreSlot) core.classList.remove(coreSlot);
    if (targetSlot) target.classList.remove(targetSlot);
    if (targetSlot) core.classList.add(targetSlot);
    if (coreSlot) target.classList.add(coreSlot);

    core.classList.remove("core");
    core.classList.add("primary");
    target.classList.remove("primary");
    target.classList.add("core");

    core.removeAttribute("aria-current");
    target.setAttribute("aria-current", "true");
    core = target;

    setActiveContext(target.dataset.node);
    document.dispatchEvent(
      new CustomEvent("alyxar:context-change", { detail: target.dataset.node })
    );
  }

  function getSlotClass(el) {
    return Array.from(el.classList).find(c => /^p\d+$/.test(c)) || null;
  }
  // ----------------------
  // VIDEO SYSTEM (FEEDS)
  // ----------------------
  const track = document.querySelector(".video-track");
  let allVideos = [];

  async function loadManifest() {
    const res = await fetch("/feeds/manifest.json", { cache: "no-cache" });
    if (!res.ok) return null;
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  async function loadLumenFeed(version) {
    const res = await fetch(`/feeds/lumen.v${version}.json`, { cache: "no-cache" });
    if (!res.ok) return [];
    try {
      return await res.json();
    } catch {
      return [];
    }
  }

  async function loadVideos() {
    try {
      const manifest = await loadManifest();
      if (!manifest || !Number.isFinite(Number(manifest.latest_version))) return;

      const v = Number(manifest.latest_version);
      const feed = await loadLumenFeed(v);

      // Normalize to the shape this page needs.
      // Phase 3 publisher emits: { youtube_id, thumbnail_url, creator, game, submitted_at }
      allVideos = Array.isArray(feed)
        ? feed.map(item => ({
            youtube_id: item.youtube_id,
            thumbnail_url: item.thumbnail_url,
            game_tag: item.game,
            creator_display_name: item.creator,
            submitted_at: item.submitted_at
          }))
        : [];

      renderVideos("lumen");
    } catch {
      // fail silently (consistent with existing behavior)
    }
  }

  function renderVideos(context) {
    if (!track) return;
    track.innerHTML = "";

    const visible = allVideos.filter(v =>
      context === "lumen" || v.game_tag === context
    );

    for (const v of visible) {
      const li = document.createElement("li");
      li.className = "video-item";

      // We do not have a YouTube title yet (publisher doesn't fetch metadata).
      // Use YouTube ID as a stable label.
      const label = v.youtube_id;

      li.innerHTML = `
        <a href="https://www.youtube.com/watch?v=${escapeAttr(v.youtube_id)}"
           target="_blank"
           rel="noopener">
          <img src="${escapeAttr(v.thumbnail_url)}" alt="">
          <div class="video-meta">
            <span class="video-title">${escapeHtml(label)}</span>
            <span class="video-creator">${escapeHtml(v.creator_display_name || "")}</span>
          </div>
        </a>
      `;

      track.appendChild(li);
    }
  }

  document.addEventListener("alyxar:context-change", (e) => {
    renderVideos(e.detail);
  });

  // Minimal escaping helpers for safety.
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttr(s) {
    // Attribute-safe encoding (keeps URLs/ids safe in quotes)
    return escapeHtml(s).replaceAll("`", "&#96;");
  }

  loadVideos();

})();
