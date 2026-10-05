// Four small jobs. The page works without any of them: phones show Discord and
// GitHub in the top bar (nojs.css), the video link goes to YouTube, the
// screenshots and clips open as plain files, and the APK button goes to the
// latest GitHub release.

// 0. Phone menu: the Menu button opens the section links as a panel.
const topNav = document.querySelector(".top");
const menuBtn = topNav?.querySelector(".menu-btn");
if (menuBtn) {
  const setMenu = (open) => {
    topNav.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
  };
  menuBtn.addEventListener("click", () => setMenu(!topNav.classList.contains("open")));
  topNav.querySelectorAll(".top-links a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
  document.addEventListener("click", (event) => { if (!topNav.contains(event.target)) setMenu(false); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && topNav.classList.contains("open")) { setMenu(false); menuBtn.focus(); }
  });
}

// 1. Video: load YouTube only when someone presses play.
document.querySelectorAll("[data-youtube]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const frame = document.createElement("iframe");
    frame.src = `https://www.youtube-nocookie.com/embed/${link.dataset.youtube}?autoplay=1&rel=0`;
    frame.title = link.querySelector(".video-label")?.textContent || "Video";
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    link.replaceChildren(frame);
    link.classList.add("is-playing");
    link.removeAttribute("href");
  }, { once: true });
});

// 2. Screenshots and clips: open full size in a lightbox, arrows to step through.
const box = document.querySelector(".lightbox");
const shots = [...document.querySelectorAll(".gallery .shot")];
let current = 0;

const stillMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function show(i) {
  current = (i + shots.length) % shots.length;
  const shot = shots[current];
  const img = box.querySelector("img");
  const clip = box.querySelector("video");
  const isClip = shot.hasAttribute("data-video");
  img.hidden = isClip;
  clip.hidden = !isClip;
  if (isClip) {
    img.removeAttribute("src");
    clip.src = shot.href;
    clip.controls = stillMotion.matches;
    if (!stillMotion.matches) clip.play().catch(() => {});
  } else {
    clip.pause();
    clip.removeAttribute("src");
    img.src = shot.href;
    img.alt = shot.querySelector("img").alt;
  }
  box.querySelector("figcaption").textContent =
    shot.closest("figure").querySelector("figcaption")?.textContent || "";
}

if (box && typeof box.showModal === "function") {
  shots.forEach((shot, i) => {
    shot.addEventListener("click", (event) => {
      event.preventDefault();
      show(i);
      box.showModal();
    });
  });
  box.querySelector(".lb-close").addEventListener("click", () => box.close());
  box.querySelector(".lb-prev").addEventListener("click", () => show(current - 1));
  box.querySelector(".lb-next").addEventListener("click", () => show(current + 1));
  box.addEventListener("click", (event) => {
    if (event.target === box || event.target.tagName === "FIGURE") box.close();
  });
  box.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") show(current - 1);
    if (event.key === "ArrowRight") show(current + 1);
  });
  box.addEventListener("close", () => {
    box.querySelector("img").removeAttribute("src");
    const clip = box.querySelector("video");
    clip.pause();
    clip.removeAttribute("src");
  });
}

// Gallery clips loop only while on screen, and not at all for people who
// asked their system for less motion (they get the poster and can open it).
const tileClips = [...document.querySelectorAll(".gallery video")];
if (tileClips.length && "IntersectionObserver" in window) {
  const watcher = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting && !stillMotion.matches) target.play().catch(() => {});
      else target.pause();
    });
  }, { threshold: 0.4 });
  tileClips.forEach((clip) => watcher.observe(clip));
}

// 3. Latest release: put the version on the APK button and link the file itself.
fetch("https://api.github.com/repos/MrSco/goldeneye-vr/releases/latest", {
  headers: { Accept: "application/vnd.github+json" },
})
  .then((res) => (res.ok ? res.json() : null))
  .then((release) => {
    if (!release) return;
    const apks = (release.assets || []).filter((a) => a.name.endsWith(".apk"));
    const apk = apks.find((a) => /^GoldenEye-VR-v[\d.]+\.apk$/.test(a.name)) || apks[0];
    document.querySelectorAll("[data-version]").forEach((el) => { el.textContent = release.tag_name; });
    if (apk) document.querySelectorAll("[data-apk]").forEach((el) => { el.href = apk.browser_download_url; });
  })
  .catch(() => {});
// 4. Live lobbies activity board
const stages = { 34:"Facility", 31:"Complex", 38:"Temple", 46:"Stack", 39:"Caverns", 48:"Library", 45:"Basement", 50:"Caves", 32:"Egypt", 27:"Bunker II", 24:"Archives" };
const missions = { 33:"Dam", 34:"Facility", 35:"Runway", 36:"Surface I", 9:"Bunker I", 20:"Silo", 26:"Frigate", 43:"Surface II", 27:"Bunker II", 22:"Statue", 24:"Archives", 29:"Streets", 30:"Depot", 25:"Train", 37:"Jungle", 23:"Control", 39:"Caverns", 41:"Cradle", 28:"Aztec", 32:"Egyptian" };
// A co-op game lists 0x80 | where the party is (90: its menus, else a mission's level id).
const stageLabel = (stage) => {
  if (stage & 0x80) {
    const where = stage & 0x7f;
    if (where === 90) return "Co-op campaign, in the menus";
    if (missions[where]) return `Co-op: ${missions[where]}`;
  }
  return stages[stage] || `Stage ${stage}`;
};
const liveSummary = document.getElementById("live-summary");
const liveList = document.getElementById("live-games-list");
const liveDot = document.getElementById("live-indicator");

function formatTimeAgo(ms) {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m ago` : `${h}h ago`;
}

function formatDuration(ms) {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

async function updateLiveLobbies() {
  if (!liveSummary || !liveList) return;
  try {
    const res = await fetch("https://lobbies.goldeneyevr.com/v1/activity", { cache: "no-store" });
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (liveDot) liveDot.classList.add("active");
    const pub = data.counts?.public || 0;
    const players = data.counts?.players || 0;
    const inProg = data.counts?.inProgress || 0;
    if (pub === 0) {
      liveSummary.textContent = "No public games right now. Host one in your headset!";
      liveList.innerHTML = "";
    } else {
      liveSummary.textContent = `${pub} public ${pub === 1 ? "game" : "games"} (${players} ${players === 1 ? "player" : "players"}, ${inProg} in match)`;
      liveList.replaceChildren(...data.lobbies.slice(0, 3).map((g) => {
        const row = document.createElement("div");
        row.className = "live-item";
        const titleRow = document.createElement("div");
        titleRow.className = "live-item-top";
        const name = document.createElement("strong");
        name.textContent = g.name;
        const phase = document.createElement("span");
        phase.className = "live-badge" + (g.phase === "in_progress" ? " in-prog" : "");
        phase.textContent = { waiting: "In lobby", warmup: "Warmup", in_progress: "In progress" }[g.phase] || "Live";
        titleRow.append(name, phase);

        const sub = document.createElement("div");
        sub.className = "live-item-sub";
        const stageName = stageLabel(g.stage);
        const hosted = g.createdAt ? formatTimeAgo(g.createdAt) : null;
        const dur = g.phaseChangedAt ? formatDuration(g.phaseChangedAt) : null;
        const phaseStr = { waiting: "in lobby", warmup: "in warmup", in_progress: "playing" }[g.phase] || "live";
        const timePart = hosted && dur ? ` · ${hosted} (${phaseStr} ${dur})` : hosted ? ` · ${hosted}` : "";
        sub.textContent = `${stageName} · ${g.players}/${g.maxPlayers} players${timePart}`;

        row.append(titleRow, sub);
        return row;
      }));
    }
  } catch {
    if (liveDot) liveDot.classList.remove("active");
    liveSummary.textContent = "See public games and matches happening now, then join from your headset.";
  }
}

if (liveSummary) {
  const POLL_MS = 60_000;
  const liveCard = document.getElementById("live-lobbies-card");
  let pollTimer = null;

  const stopPolling = () => {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const startPolling = () => {
    if (pollTimer !== null) return;
    updateLiveLobbies();
    pollTimer = setInterval(updateLiveLobbies, POLL_MS);
  };

  if (typeof IntersectionObserver === "function" && liveCard) {
    let cardOnScreen = false;
    new IntersectionObserver((entries) => {
      cardOnScreen = entries.some((entry) => entry.isIntersecting);
      if (cardOnScreen && !document.hidden) startPolling();
      else stopPolling();
    }, { threshold: 0 }).observe(liveCard);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && cardOnScreen) startPolling();
      else stopPolling();
    });
  } else {
    updateLiveLobbies();
    setInterval(() => { if (!document.hidden) updateLiveLobbies(); }, POLL_MS);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) updateLiveLobbies(); });
  }
}
