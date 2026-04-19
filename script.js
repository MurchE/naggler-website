// Naggler landing — tiny JS layer for scroll reveals + OS-aware download.
// Adding .js marker so progressive-enhancement CSS rules activate.
document.documentElement.classList.add("js");

// 1. Scroll reveal — unfold elements as they come into view.
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: "0px 0px -10% 0px" });

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// 2. Pull latest version from GitHub and patch the download note + footer pill.
//    Non-critical — fail silently.
(async () => {
  try {
    const res = await fetch("https://api.github.com/repos/MurchE/naggler-ai/releases/latest", {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return;
    const data = await res.json();
    const tag = (data.tag_name || "").replace(/^v/, "");
    if (!tag) return;
    const note = document.getElementById("release-note");
    if (note) {
      note.firstChild.textContent = `v${tag} · Unsigned builds · First-launch warning is normal, we're `;
    }
    const pill = document.querySelector(".footer-links .pill");
    if (pill) pill.textContent = `v${tag}`;
  } catch (_) { /* offline or rate-limited — keep the baked-in version */ }
})();
