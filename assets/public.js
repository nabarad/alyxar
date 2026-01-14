export function $(id) { return document.getElementById(id); }

export function toast(title, msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = `<div class="title"></div><div class="msg"></div>`;
  t.querySelector(".title").textContent = title;
  t.querySelector(".msg").textContent = msg || "";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

export async function apiJson(path, opts = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "content-type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

export async function loadManifest() {
  const res = await fetch("/feeds/manifest.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("Manifest not found. Publish feeds first.");
  return await res.json();
}

export async function loadFeed(name, version) {
  const res = await fetch(`/feeds/${name}.v${version}.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Feed ${name}.v${version}.json not found`);
  return await res.json();
}

export function fmtIso(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString();
}
