import { $, apiJson, toast } from "/assets/public.js";

const adminKey = $("adminKey");
const adminLoginBtn = $("adminLoginBtn");
const adminLogoutBtn = $("adminLogoutBtn");
const publishBtn = $("publishBtn");
const adminStatus = $("adminStatus");

const reloadCreators = $("reloadCreators");
const tbody = document.querySelector("#creatorTbl tbody");

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
  await loadCreators();
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

reloadCreators.onclick = loadCreators;

async function loadCreators() {
  const r = await apiJson("/admin/api/creators", { method: "GET" });
  if (!r.ok) {
    toast("Unauthorized", "Login first");
    return;
  }
  const creators = r.data.creators || [];

  tbody.innerHTML = creators.map(c => {
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
          <input class="input" style="min-width:220px" data-act="tags" data-id="${c.id}" placeholder="comma tags e.g. genshin,hsr" />
          <button data-act="settags" data-id="${c.id}">Save Tags</button>
        </td>
      </tr>
    `;
  }).join("");
}

tbody.onclick = async (e) => {
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
    // Show once; admin copies out-of-band
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
    const inp = document.querySelector(`input[data-act="tags"][data-id="${id}"]`);
    const raw = (inp?.value || "").trim();
    const tags = raw ? raw.split(",").map(x => x.trim()).filter(Boolean) : [];

    const r = await apiJson("/admin/api/creators/allowed-tags", {
      method: "POST",
      body: JSON.stringify({ creator_id: id, tags }),
    });
    if (!r.ok) return toast("Tags failed", JSON.stringify(r.data));
    toast("Tags saved", tags.join(", ") || "(cleared)");
    return;
  }
};

await loadCreators();
