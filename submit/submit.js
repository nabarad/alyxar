const form = document.getElementById("form");
const statusEl = document.getElementById("status");

const tokenRow = document.getElementById("token-row");
const tokenEl = document.getElementById("token");

const youtubeEl = document.getElementById("youtube_url");
const gameEl = document.getElementById("game_tag");

const whoEl = document.getElementById("who");

/* -------------------------
   Check submit session
-------------------------- */
async function hasSubmitSession() {
  try {
    const res = await fetch("/api/submit/session", {
      credentials: "include",
    });
    const data = await res.json();
    return !!data.ok;
  } catch {
    return false;
  }
}

/* -------------------------
   Load creator display name
-------------------------- */
async function loadCreator() {
  try {
    const res = await fetch("/api/submit/me", {
      credentials: "include",
    });
    if (!res.ok) return;

    const data = await res.json();
    if (data.display_name) {
      whoEl.textContent = `Submitting as ${data.display_name}`;
    }
  } catch {
    // silent
  }
}

/* -------------------------
   One-time token login
-------------------------- */
async function loginWithToken(token) {
  const res = await fetch("/api/submit/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token }),
  });
  return res.ok;
}

/* -------------------------
   Submit video
-------------------------- */
async function submitVideo(youtube_url, game_tag) {
  return fetch("/api/submit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ youtube_url, game_tag }),
  });
}

/* -------------------------
   Init (CRITICAL)
-------------------------- */
(async () => {
  const hasSession = await hasSubmitSession();

  if (hasSession) {
    tokenRow.hidden = true;
    tokenEl.value = "";
    loadCreator();
  } else {
    tokenRow.hidden = false;
  }
})();

/* -------------------------
   Submit handler
-------------------------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "";

  const youtube_url = youtubeEl.value.trim();
  const game_tag = gameEl.value.trim();

  if (!youtube_url || !game_tag) {
    statusEl.textContent = "Missing fields.";
    return;
  }

  try {
    // Token step ONLY if token row is visible
    if (!tokenRow.hidden) {
      const token = tokenEl.value.trim();
      if (!token) {
        statusEl.textContent = "Token required.";
        return;
      }

      const ok = await loginWithToken(token);
      if (!ok) {
        statusEl.textContent = "Invalid token.";
        return;
      }

      tokenRow.hidden = true;
      tokenEl.value = "";
      loadCreator();
    }

    const res = await submitVideo(youtube_url, game_tag);
    if (!res.ok) {
      statusEl.textContent = "Rejected.";
      return;
    }

    statusEl.textContent = "Submitted.";
    youtubeEl.value = "";
    gameEl.value = "";
  } catch {
    // silent
  }
});
