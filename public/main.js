// Three small jobs. The page works without any of them: the video link goes
// to YouTube, the screenshots open as images and the APK button goes to the
// latest GitHub release.

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

// 2. Screenshots: open full size in a lightbox, arrows to step through.
const box = document.querySelector(".lightbox");
const shots = [...document.querySelectorAll(".gallery .shot")];
let current = 0;

function show(i) {
  current = (i + shots.length) % shots.length;
  const shot = shots[current];
  const img = box.querySelector("img");
  img.src = shot.href;
  img.alt = shot.querySelector("img").alt;
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
  box.addEventListener("close", () => { box.querySelector("img").removeAttribute("src"); });
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
