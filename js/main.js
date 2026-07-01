/* =============================================================
   HealthBridge — Shared site behaviour
   Loaded on every page (defer). Guards each feature so a page
   that lacks a given element simply skips it.
   ============================================================= */
(function () {
  "use strict";

  /* ---------- Mobile navigation ---------- */
  const toggle = document.getElementById("navToggle");
  const panel = document.getElementById("navPanel");
  if (toggle && panel) {
    const setOpen = (open) => {
      panel.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open && window.innerWidth <= 900 ? "hidden" : "";
    };
    toggle.addEventListener("click", () => setOpen(!panel.classList.contains("open")));

    // close when a nav link is tapped
    panel.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => setOpen(false))
    );

    // reset on resize to desktop
    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) setOpen(false);
    });

    // close on outside click / escape
    document.addEventListener("click", (e) => {
      if (window.innerWidth > 900) return;
      if (!panel.classList.contains("open")) return;
      if (!e.target.closest("#navPanel") && !e.target.closest("#navToggle")) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  }

  /* ---------- Animated stat counters ---------- */
  const parseStat = (text) => {
    const t = text.trim();
    if (t.includes("/")) return null; // e.g. "24/7"
    const m = t.match(/^([\d,]+(?:\.\d+)?)(.*)$/);
    if (!m) return null;
    const numStr = m[1].replace(/,/g, "");
    const isFloat = numStr.indexOf(".") !== -1;
    return {
      value: isFloat ? parseFloat(numStr) : parseInt(numStr, 10),
      decimals: isFloat ? (numStr.split(".")[1] || "").length : 0,
      suffix: (m[2] || "").trim(),
    };
  };

  const animateStat = (el, p) => {
    const duration = 1500;
    const startTime = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const current = p.value * ease(progress);
      el.textContent =
        (p.decimals > 0
          ? current.toFixed(p.decimals)
          : Math.round(current).toLocaleString()) + p.suffix;
      if (progress < 1) requestAnimationFrame(step);
      else
        el.textContent =
          (p.decimals > 0 ? p.value.toFixed(p.decimals) : p.value.toLocaleString()) +
          p.suffix;
    };
    requestAnimationFrame(step);
  };

  const statHeads = document.querySelectorAll(".stat h3");
  if (statHeads.length && "IntersectionObserver" in window) {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          if (el.dataset.done) return;
          el.dataset.done = "1";
          const parsed = parseStat(el.textContent || "");
          if (parsed) animateStat(el, parsed);
          obs.unobserve(el);
        });
      },
      { threshold: 0.4 }
    );
    statHeads.forEach((el) => obs.observe(el));
  }

  /* ---------- Reveal-on-scroll ---------- */
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window) {
    const rObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            rObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => rObs.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("visible"));
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".faq-item").forEach((item) => {
    const q = item.querySelector(".faq-q");
    const a = item.querySelector(".faq-a");
    if (!q || !a) return;
    q.addEventListener("click", () => {
      const isOpen = item.classList.toggle("open");
      q.setAttribute("aria-expanded", isOpen ? "true" : "false");
      a.style.maxHeight = isOpen ? a.scrollHeight + "px" : "0px";
    });
  });

  /* ---------- Newsletter (footer) ---------- */
  document.querySelectorAll(".newsletter-form").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const btn = form.querySelector("button");
      if (input && input.value.trim()) {
        input.value = "";
        if (btn) {
          const original = btn.textContent;
          btn.textContent = "Subscribed ✓";
          btn.disabled = true;
          setTimeout(() => {
            btn.textContent = original;
            btn.disabled = false;
          }, 2500);
        }
      }
    });
  });

  /* ---------- Current year in footer ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Generic form validation + fake submit ----------
     Any <form data-validate> gets required-field validation and a
     success message via .form-alert. Wire real endpoints later. */
  const validators = {
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    tel: (v) => v.replace(/[^\d]/g, "").length >= 7,
  };

  document.querySelectorAll("form[data-validate]").forEach((form) => {
    const fields = form.querySelectorAll("[required]");

    const validateField = (input) => {
      const field = input.closest(".field");
      let ok = input.value.trim() !== "";
      if (ok && input.type === "email") ok = validators.email(input.value.trim());
      if (ok && input.type === "tel") ok = validators.tel(input.value.trim());
      if (field) field.classList.toggle("invalid", !ok);
      return ok;
    };

    fields.forEach((input) => {
      input.addEventListener("blur", () => validateField(input));
      input.addEventListener("input", () => {
        const field = input.closest(".field");
        if (field && field.classList.contains("invalid")) validateField(input);
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let allOk = true;
      fields.forEach((input) => {
        if (!validateField(input)) allOk = false;
      });
      if (!allOk) {
        const firstBad = form.querySelector(".field.invalid input, .field.invalid select, .field.invalid textarea");
        if (firstBad) firstBad.focus();
        return;
      }
      const alert = form.querySelector(".form-alert");
      if (alert) {
        alert.classList.add("show");
        alert.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      form.reset();
      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        setTimeout(() => (submitBtn.disabled = false), 3000);
      }
    });
  });

  /* ---------- Appointment page: min date = today ---------- */
  const dateInput = document.getElementById("apptDate");
  if (dateInput) {
    const today = new Date().toISOString().split("T")[0];
    dateInput.min = today;
  }

  /* ---------- Appointment page: preselect department from ?dept= ---------- */
  const deptSelect = document.getElementById("apptDept");
  if (deptSelect) {
    const params = new URLSearchParams(window.location.search);
    const dept = params.get("dept");
    if (dept) {
      const match = Array.from(deptSelect.options).find(
        (o) => o.value.toLowerCase() === dept.toLowerCase()
      );
      if (match) deptSelect.value = match.value;
    }
  }

  /* ---------- Scroll progress bar (injected) ---------- */
  const progress = document.createElement("div");
  progress.className = "scroll-progress";
  document.body.appendChild(progress);

  /* ---------- Back-to-top button (injected) ---------- */
  const toTop = document.createElement("button");
  toTop.className = "to-top";
  toTop.setAttribute("aria-label", "Back to top");
  toTop.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(toTop);
  toTop.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" })
  );

  /* ---------- Header shadow on scroll ---------- */
  const header = document.querySelector(".header");

  const onScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = docHeight > 0 ? (scrollTop / docHeight) * 100 + "%" : "0%";
    toTop.classList.toggle("show", scrollTop > 500);
    if (header) header.classList.toggle("scrolled", scrollTop > 10);
  };

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          onScroll();
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true }
  );
  onScroll();
})();
