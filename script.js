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

// 2. Pull current version from same-origin version.json and patch the
//    download note + footer pill. The source repo is private so we can't
//    hit the GitHub API; the website repo carries the canonical version
//    string and gets updated on every release.
(async () => {
  try {
    const res = await fetch("/version.json", { cache: "no-store" });
    if (!res.ok) return;
    const { version } = await res.json();
    if (!version) return;
    document.querySelectorAll(".version-pill").forEach(el => el.textContent = `v${version}`);
    const pill = document.querySelector(".footer-links .pill");
    if (pill) pill.textContent = `v${version}`;
  } catch (_) { /* offline — keep the baked-in version */ }
})();

// 3. Email-gated download flow — POST to relay worker, fall back to mailto.
//    This form is the only way in during the alpha (no direct download
//    buttons), so the failure path matters: if the worker is down we
//    offer a mailto so a human can let you in by hand.
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
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", "signup-error");
    errorEl.hidden = false;
    if (withFallback) {
      errorEl.innerHTML = `${msg} <a href="${MAILTO_FALLBACK}" style="color:inherit;text-decoration:underline;">Email us directly</a> and a human will send your links by hand.`;
    } else {
      errorEl.textContent = msg;
    }
  }

  function clearError() {
    input.classList.remove("is-invalid");
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
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
        }),
      });

      let payload = {};
      try {
        payload = await res.json();
      } catch (err) {
        payload = {};
      }

      if (res.status === 429) {
        showError("Too many signups from your network — try again in a minute.", true);
        return;
      }
      if (!res.ok) {
        showError(
          payload.error || "Couldn't reach our mail server right now.",
          true,
        );
        return;
      }

      const deliveryConfirmed = payload.ok === true && (
        payload.delivery === "sent" ||
        payload.delivery === "recently_sent"
      );
      if (!deliveryConfirmed) {
        showError(
          payload.error || "We couldn't confirm the email was sent. Please try again.",
          true,
        );
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
