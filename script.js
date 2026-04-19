// Naggler landing — tiny JS layer.
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

// Footer year — keeps the copyright current without deploys.
const yearEl = document.getElementById("footer-year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

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
    document.querySelectorAll(".version-pill").forEach(el => el.textContent = `v${tag}`);
    const pill = document.querySelector(".footer-links .pill");
    if (pill) pill.textContent = `v${tag}`;
  } catch (_) { /* offline or rate-limited — keep the baked-in version */ }
})();

// 3. Email-gated download flow — POST to relay worker, fall back to mailto.
//    UX goals: instant feedback, graceful degradation, no dark-pattern
//    gating (if the worker is down we offer the GitHub link in the error).
(function setupSignup() {
  const SIGNUP_URL = "https://naggy-relay.naggler.workers.dev/signup";
  const MAILTO_FALLBACK = "mailto:feedback@naggler.com"
    + "?subject=" + encodeURIComponent("Send me the Naggler download link")
    + "&body=" + encodeURIComponent(
      "Hi Naggy — please send me the download link for Naggler when you get a chance. Thanks!"
    );

  const form = document.getElementById("signup-form");
  const input = document.getElementById("signup-email");
  const submit = document.getElementById("signup-submit");
  const errorEl = document.getElementById("signup-error");
  const success = document.getElementById("signup-success");
  if (!form || !input || !submit || !errorEl || !success) return;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function showError(msg, withFallback = false) {
    input.classList.add("is-invalid");
    errorEl.hidden = false;
    if (withFallback) {
      errorEl.innerHTML = `${msg} <a href="${MAILTO_FALLBACK}" style="color:inherit;text-decoration:underline;">Email us directly</a> or grab the <a href="https://github.com/MurchE/naggler-ai/releases/latest" style="color:inherit;text-decoration:underline;">latest GitHub release</a>.`;
    } else {
      errorEl.textContent = msg;
    }
  }

  function clearError() {
    input.classList.remove("is-invalid");
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  input.addEventListener("input", clearError);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    const email = input.value.trim();
    if (!EMAIL_RE.test(email)) {
      showError("That doesn't look like a valid email — try again?");
      input.focus();
      return;
    }

    submit.disabled = true;
    const originalLabel = submit.querySelector(".btn-label").textContent;
    submit.querySelector(".btn-label").textContent = "Sending…";

    try {
      const res = await fetch(SIGNUP_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          source: "naggler.com",
          ua: navigator.userAgent.slice(0, 120),
          ts: new Date().toISOString(),
        }),
      });

      if (res.status === 429) {
        showError("Too many signups from your network — try again in a minute.", true);
        return;
      }
      if (!res.ok) {
        showError("Couldn't reach our mail server right now.", true);
        return;
      }

      // Success: hide form, reveal success card, scroll it into view.
      form.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      showError("Couldn't reach our mail server right now.", true);
    } finally {
      submit.disabled = false;
      submit.querySelector(".btn-label").textContent = originalLabel;
    }
  });
})();
