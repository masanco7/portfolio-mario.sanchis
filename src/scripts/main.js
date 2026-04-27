/* Theme toggle with localStorage + prefers-color-scheme */
(function () {
  const root = document.documentElement;
  const STORAGE_KEY = 'msc-theme';

  function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
    updateToggleState();
  }

  function getEffectiveTheme() {
    const stored = root.getAttribute('data-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function updateToggleState() {
    const btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    const eff = getEffectiveTheme();
    btn.setAttribute('aria-pressed', eff === 'dark' ? 'true' : 'false');
    const labelLight = btn.getAttribute('data-label-light') || 'Cambiar a modo claro';
    const labelDark = btn.getAttribute('data-label-dark') || 'Cambiar a modo oscuro';
    btn.setAttribute('aria-label', eff === 'dark' ? labelLight : labelDark);
  }

  // Init from storage (set early via inline script in <head>; this just reflects state)
  updateToggleState();

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.theme-toggle');
    if (!btn) return;
    const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
    applyTheme(next);
  });

  // React to system changes only when no manual override is set
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener && mq.addEventListener('change', function () {
    let stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (_) {}
    if (!stored) updateToggleState();
  });
})();

/* Sticky nav scroll state + section spy */
(function () {
  const nav = document.querySelector('.nav');
  const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  const sections = links
    .map((l) => document.querySelector(l.getAttribute('href')))
    .filter(Boolean);

  function onScroll() {
    if (!nav) return;
    nav.setAttribute('data-scrolled', window.scrollY > 4 ? 'true' : 'false');
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (!('IntersectionObserver' in window) || sections.length === 0) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        links.forEach((l) => {
          const active = l.getAttribute('href') === '#' + id;
          if (active) l.setAttribute('aria-current', 'true');
          else l.removeAttribute('aria-current');
        });
      });
    },
    { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
  );
  sections.forEach((s) => io.observe(s));
})();

/* Reveal-on-scroll (respects prefers-reduced-motion via CSS) */
(function () {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
  );
  items.forEach((el) => io.observe(el));
})();

/* Current year in footer */
(function () {
  const y = document.querySelector('[data-year]');
  if (y) y.textContent = String(new Date().getFullYear());
})();
