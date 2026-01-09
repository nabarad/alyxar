async function apiGet() {
  const res = await fetch("/admin/api/creators", {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to load creators");
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

async function apiGetJson(path) {
  const res = await fetch(path, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

/* ================= UTIL ================= */

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmt(d) {
  if (!d) return "—";
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "—";
  }
}

/* ================= RENDER CELLS ================= */

function creatorCell(c) {
  return `
    <button
      type="button"
      class="creator-toggle"
      data-id="${c.id}"
      aria-expanded="false"
    >
      <strong>${escapeHtml(c.display_name || "—")}</strong>
    </button>
    <div class="muted">${escapeHtml(c.youtube_channel || "")}</div>
    <div class="muted">${escapeHtml(c.email || "")}</div>
  `;
}

function actionsCell(c) {
  const id = c.id;
  const state = c.state;
  const btn = (label, action) =>
    `<button type="button" data-action="${action}" data-id="${id}">${label}</button>`;
  const bits = [];

  if (state === "pending") bits.push(btn("Approve", "approve"));
  if (state === "approved") bits.push(btn("Suspend", "suspend"), btn("Ban", "ban"));
  if (state === "suspended") bits.push(btn("Reinstate", "reinstate"), btn("Ban", "ban"));
  if (state === "banned") bits.push(btn("Reinstate", "reinstate"));

  bits.push(btn("Issue submit token", "token"));
  bits.push(btn("Delete", "delete"));

  return `<div class="actions">${bits.join("")}</div>`;
}

function mapActionToState(action) {
  if (action === "approve") return "approved";
  if (action === "suspend") return "suspended";
  if (action === "ban") return "banned";
  if (action === "reinstate") return "approved";
  return null;
}

/* ================= DETAILS ROW ================= */

function renderCreatorDetailsRow(c) {
  return `
    <tr class="creator-details" hidden data-details-for="${c.id}">
      <td colspan="7">
        <section class="creator-panel">

          <section class="automation-config">
            <label>
              Channel ID
              <input type="text"
                     data-field="channel-id"
                     value="${escapeHtml(c.automation_channel_id || "")}"
                     placeholder="UC…" />
            </label>

            <label>
              Game
              <input type="text"
                     data-field="game-tag"
                     value="${escapeHtml(c.automation_game_tag || "")}"
                     placeholder="dragonheir" />
            </label>

            <button type="button"
                    data-action="automation-save"
                    data-id="${c.id}">
              Save automation config
            </button>
          </section>

          <section class="creator-videos">
            <h3>Active videos</h3>
            <div class="video-carousel" data-carousel-for="${c.id}"></div>
          </section>

          <section class="creator-automation">
            <h3>Automation</h3>
            <dl>
              <dt>Status</dt>
              <dd>${c.automation_enabled ? "Enabled" : "Disabled"}</dd>
              <dt>Expires</dt>
              <dd>${fmt(c.automation_expires_at)}</dd>
            </dl>
          <div class="automation-actions">
            <button type="button"
                    data-action="automation-grant"
                    data-id="${c.id}"
                    data-hours="168">
              Grant 7d
            </button>
            <button type="button"
                    data-action="automation-grant"
                    data-id="${c.id}"
                    data-hours="720">
              Grant 30d
            </button>

            <button type="button"
                    data-action="automation-revoke"
                    data-id="${c.id}">
              Revoke
            </button>
          </div>
          </section>

        </section>
      </td>
    </tr>
  `;
}

/* ================= VIDEOS ================= */

function videoCardHtml(v) {
  const youtubeId = escapeHtml(v.youtube_id || "");
  const thumb = escapeHtml(v.thumbnail_url || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`);
  const game = escapeHtml(v.game_tag || "—");
  const date = fmt(v.submitted_at);

  return `
    <article class="video-card">
      <a href="https://www.youtube.com/watch?v=${youtubeId}"
         target="_blank"
         rel="noreferrer">
        <img src="${thumb}" alt="">
      </a>
      <div class="video-meta">
        <div class="muted">${game}</div>
        <div class="muted">${date}</div>
      </div>
      <button type="button"
              data-action="video-delete"
              data-video-id="${escapeHtml(v.id)}">
        Delete
      </button>
    </article>
  `;
}

function renderVideoList(container, videos) {
  if (!videos || videos.length === 0) {
    container.innerHTML = `<div class="muted">No active videos.</div>`;
    return;
  }
  container.innerHTML = videos.map(videoCardHtml).join("");
}

async function loadCreatorVideos(creatorId) {
  const row = document.querySelector(`[data-details-for="${creatorId}"]`);
  if (!row) return;

  const carousel = row.querySelector(`[data-carousel-for="${creatorId}"]`);
  carousel.innerHTML = `<div class="muted">Loading…</div>`;

  const data = await apiGetJson(`/admin/api/creators/${creatorId}/videos`);
  renderVideoList(carousel, data.videos || []);
}

/* ================= RENDER ================= */

async function render() {
  const data = await apiGet();
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";

  for (const c of data.creators || []) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${creatorCell(c)}</td>
      <td>${escapeHtml(c.state)}</td>
      <td>${c.active_videos ?? 0}</td>
      <td>${c.total_submissions ?? 0}</td>
      <td>${fmt(c.first_submission_at)}</td>
      <td>${fmt(c.last_submission_at)}</td>
      <td>${actionsCell(c)}</td>
    `;
    tbody.appendChild(tr);
    tbody.insertAdjacentHTML("beforeend", renderCreatorDetailsRow(c));
  }
}

/* ================= EVENTS ================= */

document.addEventListener("click", async (e) => {
  const toggle = e.target.closest(".creator-toggle");
  if (toggle) {
    const id = toggle.dataset.id;
    const row = document.querySelector(`[data-details-for="${id}"]`);
    const expanded = toggle.getAttribute("aria-expanded") === "true";

    toggle.setAttribute("aria-expanded", String(!expanded));
    row.hidden = expanded;

    if (!expanded) await loadCreatorVideos(id);
    return;
  }

  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  try {
    if (action === "automation-save") {
      const panel = btn.closest(".creator-panel");
      const channelId = panel.querySelector('[data-field="channel-id"]').value;
      const gameTag = panel.querySelector('[data-field="game-tag"]').value;

      await apiPost("/admin/api/creators/automation-config", {
        id,
        channel_id: channelId,
        game_tag: gameTag
      });
      return;
    }

    if (action === "video-delete") {
      await apiPost("/admin/api/videos/delete", { id: btn.dataset.videoId });
      const row = btn.closest("tr.creator-details");
      await loadCreatorVideos(row.dataset.detailsFor);
      return;
    }

    if (action === "automation-grant") {
      const hours = Number(btn.dataset.hours);
      if (!hours) return;

      await apiPost("/admin/api/creators/automation-grant", {
        id,
        hours
      });
      await render();
      return;
    }

    if (action === "automation-revoke") {
      await apiPost("/admin/api/creators/automation-revoke", { id });
      await render();
      return;
    }

    if (action === "token") {
      const out = await apiPost("/admin/api/creators/issue-token", { id });
      navigator.clipboard?.writeText(out.token);
      return;
    }

    if (action === "delete") {
      await apiPost("/admin/api/creators/delete", { id });
      await render();
      return;
    }

    const state = mapActionToState(action);
    if (state) {
      await apiPost("/admin/api/creators/update-state", { id, state });
      await render();
    }
  } catch {
    // silent by design
  }
});

document.getElementById("refresh")?.addEventListener("click", render);
render().catch(() => {});
