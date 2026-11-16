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
    syncThemeColor();
  }

  function syncThemeColor() {
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    if (!bg) return;
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      m.setAttribute('content', bg);
    });
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
  if (root.hasAttribute('data-theme')) syncThemeColor();

  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.theme-toggle');
    if (!btn) return;
    const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
    applyTheme(next);
  });

  // View transitions swap the whole <html>: carry the chosen theme over and
  // re-sync the (new) toggle button once the new page is in.
  document.addEventListener('astro:before-swap', function (e) {
    const doc = e.newDocument.documentElement;
    const current = root.getAttribute('data-theme');
    if (current) doc.setAttribute('data-theme', current);
    else doc.removeAttribute('data-theme');
  });
  document.addEventListener('astro:after-swap', function () {
    updateToggleState();
    if (root.hasAttribute('data-theme')) syncThemeColor();
  });

  // React to system changes only when no manual override is set
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener && mq.addEventListener('change', function () {
    let stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (_) {}
    if (!stored) updateToggleState();
  });
})();

/* Per-page behaviour. This module runs once; with the view-transition router
   the DOM is replaced on navigation, so everything that touches the page
   lives in initPage() and runs on every `astro:page-load` (which also fires
   on the first load). */
let navSpy = null;
let revealObserver = null;

function onScroll() {
  const nav = document.querySelector('.nav');
  if (nav) nav.setAttribute('data-scrolled', window.scrollY > 4 ? 'true' : 'false');
}
window.addEventListener('scroll', onScroll, { passive: true });

/* Sticky nav scroll state + section spy */
function initNav() {
  onScroll();
  if (navSpy) navSpy.disconnect();
  navSpy = null;
  const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  const sections = links
    .map((l) => document.querySelector(l.getAttribute('href')))
    .filter(Boolean);
  if (!('IntersectionObserver' in window) || sections.length === 0) return;
  navSpy = new IntersectionObserver(
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
  sections.forEach((s) => navSpy.observe(s));
}

/* Reveal-on-scroll (respects prefers-reduced-motion via CSS) */
function initReveal() {
  if (revealObserver) revealObserver.disconnect();
  revealObserver = null;
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
  );
  items.forEach((el) => revealObserver.observe(el));
}

/* Current year in footer */
function initYear() {
  const y = document.querySelector('[data-year]');
  if (y) y.textContent = String(new Date().getFullYear());
}

function initPage() {
  initNav();
  initReveal();
  initYear();
}
// Every init above is idempotent, so also running once now (in case this
// module executes after the first page-load already fired) is harmless.
document.addEventListener('astro:page-load', initPage);
if (document.readyState !== 'loading') initPage();
