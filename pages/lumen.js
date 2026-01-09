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
  // VIDEO SYSTEM (NEW)
  // ----------------------
  const track = document.querySelector(".video-track");
  let allVideos = [];

  async function loadVideos() {
    try {
      const res = await fetch("/api/videos/lumen", {
        headers: { "accept": "application/json" }
      });
      if (!res.ok) return;
      allVideos = await res.json();
      renderVideos("lumen");
    } catch {
      // fail silently
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

      li.innerHTML = `
        <a href="https://www.youtube.com/watch?v=${v.youtube_id}"
           target="_blank"
           rel="noopener">
          <img src="${v.thumbnail_url}" alt="">
          <div class="video-meta">
            <span class="video-title">${v.title}</span>
            <span class="video-creator">${v.creator_display_name}</span>
          </div>
        </a>
      `;

      track.appendChild(li);
    }
  }

  document.addEventListener("alyxar:context-change", (e) => {
    renderVideos(e.detail);
  });

  loadVideos();
})();
