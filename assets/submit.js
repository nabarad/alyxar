import { $, apiJson, toast, fmtIso } from "/assets/public.js";

const token = $("token");
const loginBtn = $("loginBtn");
const logoutBtn = $("logoutBtn");
const me = $("me");

const youtubeUrl = $("youtubeUrl");
const gameTag = $("gameTag");
const submitBtn = $("submitBtn");
const submitStatus = $("submitStatus");

const refreshBtn = $("refreshBtn");
const tbody = document.querySelector("#videoTbl tbody");

async function loadMe() {
  const r = await apiJson("/api/submit/me", { method: "GET" });
  if (!r.ok) {
    me.textContent = "Not logged in.";
    return null;
  }
  const c = r.data.creator;
  me.innerHTML = `Logged in as <b>${c.display_name}</b> (<span class="badge">${c.state}</span>)`;
  return c;
}

async function loadDashboard() {
  const c = await loadMe();
  if (!c) return;

  const r = await apiJson("/api/submit/videos", { method: "GET" });
  if (!r.ok) {
    toast("Load failed", JSON.stringify(r.data));
    return;
  }

  const tags = r.data.allowed_tags || [];
  gameTag.innerHTML = tags.map(t => `<option value="${t}">${t}</option>`).join("") || `<option value="">(no allowed tags)</option>`;

  const vids = r.data.videos || [];
  tbody.innerHTML = vids.map(v => {
    const yt = `https://www.youtube.com/watch?v=${v.youtube_video_id}`;
    const badgeClass = v.status === "active" ? "ok" : (v.status === "inactive" ? "warn" : "danger");
    const canRepost = v.status === "inactive" || v.status === "deleted";
    const canDelete = v.status !== "deleted";
    return `
      <tr>
        <td class="meta">${v.id}</td>
        <td><a href="${yt}" target="_blank" rel="noreferrer">${v.youtube_video_id}</a></td>
        <td><span class="badge">${v.game_tag}</span></td>
        <td><span class="badge ${badgeClass}">${v.status}</span></td>
        <td class="meta">${fmtIso(v.expires_at)}</td>
        <td>
          <button data-act="delete" data-id="${v.id}" ${canDelete ? "" : "disabled"} class="danger">Delete</button>
          <button data-act="repost" data-id="${v.id}" ${canRepost ? "" : "disabled"}>Repost</button>
        </td>
      </tr>
    `;
  }).join("");
}

loginBtn.onclick = async () => {
  const t = token.value.trim();
  if (!t) return toast("Missing", "Enter token");

  const r = await apiJson("/api/submit/login", {
    method: "POST",
    body: JSON.stringify({ token: t }),
  });

  if (!r.ok) return toast("Login failed", JSON.stringify(r.data));
  toast("Logged in", "Session established");
  await loadDashboard();
};

logoutBtn.onclick = async () => {
  await apiJson("/api/submit/logout", { method: "POST" });
  toast("Logged out", "Session cleared");
  await loadDashboard();
};

submitBtn.onclick = async () => {
  submitStatus.textContent = "";
  const url = youtubeUrl.value.trim();
  const tag = gameTag.value;

  const r = await apiJson("/api/submit", {
    method: "POST",
    body: JSON.stringify({ youtube_url: url, game_tag: tag }),
  });

  if (!r.ok) {
    submitStatus.textContent = `Error: ${JSON.stringify(r.data)}`;
    toast("Submit failed", JSON.stringify(r.data));
    return;
  }

  submitStatus.textContent = `OK (${r.data.mode})`;
  toast("Submitted", `Mode: ${r.data.mode}`);
  youtubeUrl.value = "";
  await loadDashboard();
};

refreshBtn.onclick = loadDashboard;

tbody.onclick = async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const act = btn.dataset.act;
  const id = btn.dataset.id;
  if (!act || !id) return;

  if (act === "delete") {
    const r = await apiJson("/api/video/delete", {
      method: "POST",
      body: JSON.stringify({ video_id: id }),
    });
    if (!r.ok) return toast("Delete failed", JSON.stringify(r.data));
    toast("Deleted", "Takedown published");
    await loadDashboard();
  }

  if (act === "repost") {
    const r = await apiJson("/api/video/repost", {
      method: "POST",
      body: JSON.stringify({ video_id: id }),
    });
    if (!r.ok) return toast("Repost failed", JSON.stringify(r.data));
    toast("Reposted", "Now active");
    await loadDashboard();
  }
};

await loadDashboard();
