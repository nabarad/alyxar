import { $, apiJson, toast } from "/assets/public.js";

const adminKey = $("adminKey");
const adminLoginBtn = $("adminLoginBtn");
const adminLogoutBtn = $("adminLogoutBtn");
const publishBtn = $("publishBtn");
const adminStatus = $("adminStatus");

const newTag = $("newTag");
const newLabel = $("newLabel");
const addTagBtn = $("addTagBtn");
const tagStatus = $("tagStatus");
const tagTbody = document.querySelector("#tagTbl tbody");

const reloadCreators = $("reloadCreators");
const creatorTbody = document.querySelector("#creatorTbl tbody");

let gameTags = []; // [{tag,label}]

adminLoginBtn.onclick = async () => {
  const k = adminKey.value.trim();
  if (!k) return toast("Missing", "Enter ADMIN_KEY");

  const r = await apiJson("/admin/login", {
    method: "POST",
    body: JSON.stringify({ key: k }),
  });

  if (!r.ok) return toast("Login failed", JSON.stringify(r.data));
  toast("Logged in", "Admin session established");
  adminStatus.textContent = "Admin session active.";

  await loadAll();
};

adminLogoutBtn.onclick = async () => {
  await apiJson("/admin/logout", { method: "POST" });
  toast("Logged out", "Session cleared");
  adminStatus.textContent = "Logged out.";
};

publishBtn.onclick = async () => {
  const r = await apiJson("/admin/api/feeds/publish", { method: "POST" });
  if (!r.ok) return toast("Publish failed", JSON.stringify(r.data));
  toast("Published", `Version v${r.data.version}`);
};

reloadCreators.onclick = () => loadCreators();

addTagBtn.onclick = async () => {
  tagStatus.textContent = "";
  const tag = newTag.value.trim();
  const label = newLabel.value.trim();

  const r = await apiJson("/admin/api/game-tags/upsert", {
    method: "POST",
    body: JSON.stringify({ tag, label }),
  });

  if (!r.ok) {
    const msg = JSON.stringify(r.data);
    tagStatus.textContent = `Error: ${msg}`;
    return toast("Tag update failed", msg);
  }

  toast("Saved", `${tag}`);
  newTag.value = "";
  newLabel.value = "";
  await loadGameTags();
  await loadCreators(); // refresh creator tag selectors
};

async function loadAll() {
  await loadGameTags();
  await loadCreators();
}

async function loadGameTags() {
  const r = await apiJson("/admin/api/game-tags", { method: "GET" });
  if (!r.ok) {
    toast("Unauthorized", "Login first");
    return;
  }
  gameTags = r.data.tags || [];
  renderTags();
}

function renderTags() {
  tagTbody.innerHTML = gameTags.map(t => {
    return `
      <tr>
        <td><span class="badge">${t.tag}</span></td>
        <td class="meta">${t.label || ""}</td>
        <td>
          <button data-act="edit-tag" data-tag="${t.tag}">Edit</button>
          <button data-act="delete-tag" data-tag="${t.tag}" class="danger">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

tagTbody.onclick = async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const act = btn.dataset.act;
  const tag = btn.dataset.tag;

  if (act === "edit-tag") {
    const item = gameTags.find(x => x.tag === tag);
    newTag.value = item?.tag || "";
    newLabel.value = item?.label || "";
    newTag.focus();
    return;
  }

  if (act === "delete-tag") {
    if (!confirm(`Delete tag "${tag}"?`)) return;

    const r = await apiJson("/admin/api/game-tags/delete", {
      method: "POST",
      body: JSON.stringify({ tag }),
    });

    if (!r.ok) return toast("Delete failed", JSON.stringify(r.data));
    toast("Deleted", tag);
    await loadGameTags();
    await loadCreators();
  }
};

async function loadCreators() {
  const r = await apiJson("/admin/api/creators", { method: "GET" });
  if (!r.ok) {
    toast("Unauthorized", "Login first");
    return;
  }
  const creators = r.data.creators || [];

  creatorTbody.innerHTML = creators.map(c => {
    return `
      <tr>
        <td class="meta">${c.id}</td>
        <td>
          <div><b>${c.display_name}</b></div>
          <div class="meta">${c.email}</div>
        </td>
        <td><span class="badge">${c.state}</span></td>
        <td>
          <button data-act="token" data-id="${c.id}" class="primary">Issue Token</button>
          <select data-act="state" data-id="${c.id}">
            ${["approved","waitlisted","suspended","banned"].map(s => `<option value="${s}" ${c.state===s?"selected":""}>${s}</option>`).join("")}
          </select>
          <button data-act="setstate" data-id="${c.id}">Update State</button>
        </td>
        <td>
          ${renderTagSelector(c.id, c.allowed_tags || [])}
          <div style="margin-top:8px;">
            <button data-act="settags" data-id="${c.id}">Save Tags</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// Renders checkbox list from canonical gameTags.
// We do not currently fetch per-creator assigned tags in the /admin/api/creators response.
// So we provide a selection UI, but it will not show pre-checked values until we add:
// GET /admin/api/creators/tags?creator_id=... OR include tags in /admin/api/creators.
  function renderTagSelector(creatorId, allowedTags) {
    const allowed = new Set(Array.isArray(allowedTags) ? allowedTags : []);

    if (!gameTags.length) {
      return `<div class="meta">(no game tags defined yet)</div>`;
    }

    return `
      <div class="card" style="padding:10px;">
        ${gameTags.map(t => {
          const checked = allowed.has(t.tag) ? "checked" : "";
          return `
            <label style="display:inline-flex; align-items:center; gap:8px; margin-right:12px; margin-bottom:6px;">
              <input type="checkbox" data-act="tagchk" data-creator="${creatorId}" value="${t.tag}" ${checked} />
              <span class="badge">${t.tag}</span>
            </label>
          `;
        }).join("")}
      </div>
    `;
  }

creatorTbody.onclick = async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const act = btn.dataset.act;
  const id = btn.dataset.id;
  if (!act || !id) return;

  if (act === "token") {
    const r = await apiJson("/admin/api/creators/issue-token", {
      method: "POST",
      body: JSON.stringify({ creator_id: id }),
    });
    if (!r.ok) return toast("Token failed", JSON.stringify(r.data));
    toast("Token issued", r.data.token);
    return;
  }

  if (act === "setstate") {
    const sel = document.querySelector(`select[data-act="state"][data-id="${id}"]`);
    const state = sel?.value;
    const r = await apiJson("/admin/api/creators/update-state", {
      method: "POST",
      body: JSON.stringify({ creator_id: id, state }),
    });
    if (!r.ok) return toast("Update failed", JSON.stringify(r.data));
    toast("State updated", `${id} → ${state}`);
    await loadCreators();
    return;
  }

  if (act === "settags") {
    const checks = document.querySelectorAll(`input[data-act="tagchk"][data-creator="${id}"]`);
    const tags = [...checks].filter(c => c.checked).map(c => c.value);

    const r = await apiJson("/admin/api/creators/allowed-tags", {
      method: "POST",
      body: JSON.stringify({ creator_id: id, tags }),
    });

    if (!r.ok) return toast("Tags failed", JSON.stringify(r.data));
    toast("Tags saved", tags.join(", ") || "(cleared)");
    return;
  }
};

// Initial load (works even if logged out; will show toast on unauthorized)
await loadAll();
