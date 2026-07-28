/* =========================================================
   Project detail overlay
   Native <dialog> + showModal(): focus trap, Escape and top-layer
   come from the platform. This file adds what it does not give us:
   backdrop click, page scroll lock, a linkable ?<param>=<id> URL
   handled with pushState, and focus returning to the opening card.
   ========================================================= */
(function () {
  const dialogs = Array.from(document.querySelectorAll('[data-pmodal]'));
  if (dialogs.length === 0) return;
  if (typeof HTMLDialogElement === 'undefined') return;

  const root = document.documentElement;
  // Localised query param: ?proyecto=tallerapp (ES) / ?project=tallerapp (EN)
  const PARAM = dialogs[0].getAttribute('data-pmodal-param') || 'project';

  const byId = new Map(dialogs.map((d) => [d.getAttribute('data-pmodal'), d]));
  let current = null;
  let lastTrigger = null;
  let pointerDownTarget = null;
  // Cleared for closes that are *reacting* to a history change instead of causing one.
  let historyOnClose = true;

  function triggerFor(id) {
    return document.querySelector('[data-pmodal-open="' + CSS.escape(id) + '"]');
  }

  function lockScroll(lock) {
    if (lock) {
      // Compensate the scrollbar so the page behind does not shift sideways.
      const gap = window.innerWidth - root.clientWidth;
      if (gap > 0) root.style.setProperty('--pmodal-scrollbar', gap + 'px');
      root.classList.add('pmodal-open');
    } else {
      root.classList.remove('pmodal-open');
      root.style.removeProperty('--pmodal-scrollbar');
    }
  }

  function urlWith(id) {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set(PARAM, id);
    else url.searchParams.delete(PARAM);
    url.hash = '';
    return url.pathname + url.search;
  }

  /** Warm the screenshots: lazy images inside a closed dialog are never fetched. */
  function preload(dialog) {
    if (dialog.dataset.pmodalPreloaded) return;
    dialog.dataset.pmodalPreloaded = 'true';
    const img = dialog.querySelector('[data-pmodal-hero] img');
    if (!img) return;
    const warm = new Image();
    if (img.sizes) warm.sizes = img.sizes;
    if (img.srcset) warm.srcset = img.srcset;
    warm.src = img.src;
  }

  function open(id, options) {
    const dialog = byId.get(id);
    if (!dialog || current === dialog) return;
    const previous = current;

    lastTrigger = triggerFor(id) || null;
    current = dialog;
    if (previous) previous.close();

    preload(dialog);
    dialog.showModal();
    lockScroll(true);

    // Land on the scrollable region: the title is announced through aria-label
    // and arrow keys scroll the panel straight away.
    const scroller = dialog.querySelector('[data-pmodal-scroll]');
    if (scroller) {
      scroller.scrollTop = 0;
      scroller.focus({ preventScroll: true });
    }

    if (options && options.push) {
      history.pushState({ pmodal: id, pmodalPushed: true }, '', urlWith(id));
    }
  }

  /**
   * Ask the current dialog to close. Everything that has to happen afterwards
   * lives in the 'close' listener, which also covers Escape.
   */
  function close(options) {
    if (!current) return;
    historyOnClose = !(options && options.silent);
    current.close();
  }

  /** Single source of truth whenever the history entry changes. */
  function syncFromLocation() {
    const id = new URLSearchParams(window.location.search).get(PARAM);
    if (id && byId.has(id)) {
      if (current !== byId.get(id)) open(id, null);
    } else {
      close({ silent: true });
    }
  }

  dialogs.forEach((dialog) => {
    // Fires for Escape, close() and form[method=dialog] alike — the one place
    // where the scroll lock, the URL and the focus can never drift apart.
    dialog.addEventListener('close', function () {
      if (!dialogs.some((d) => d.open)) lockScroll(false);
      // A stale close (we already opened another dialog) must not undo anything.
      if (current !== dialog) return;
      current = null;

      const syncHistory = historyOnClose;
      historyOnClose = true;
      if (syncHistory) {
        const state = history.state;
        if (state && state.pmodalPushed) history.back();
        else if (new URLSearchParams(window.location.search).has(PARAM)) {
          history.pushState({}, '', urlWith(null));
        }
      }

      if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
      lastTrigger = null;
    });

    // Click outside the panel — the backdrop dispatches on the dialog itself.
    // Both press and release must land there so a text drag never closes it.
    dialog.addEventListener('pointerdown', function (e) {
      pointerDownTarget = e.target;
    });
    dialog.addEventListener('click', function (e) {
      if (e.target !== dialog || pointerDownTarget !== dialog) return;
      close(null);
    });
  });

  document.addEventListener('click', function (e) {
    const closer = e.target.closest('[data-pmodal-close]');
    if (closer) {
      close(null);
      return;
    }

    const trigger = e.target.closest('[data-pmodal-open]');
    if (!trigger) return;
    // Real links inside the card (repo, demo) keep behaving as links.
    if (e.target.closest('a')) return;
    // Do not hijack the mouseup that ends a text selection.
    const selection = window.getSelection();
    if (selection && selection.type === 'Range' && String(selection).trim() !== '') return;
    e.preventDefault();
    open(trigger.getAttribute('data-pmodal-open'), { push: true });
  });

  // Fetch the hero on the first hint of intent, before it is needed.
  ['pointerenter', 'focusin'].forEach(function (type) {
    document.addEventListener(
      type,
      function (e) {
        const target = e.target;
        if (!target || typeof target.closest !== 'function') return;
        const trigger = target.closest('[data-pmodal-open]');
        if (!trigger) return;
        const dialog = byId.get(trigger.getAttribute('data-pmodal-open'));
        if (dialog) preload(dialog);
      },
      true
    );
  });

  window.addEventListener('popstate', syncFromLocation);

  // Deep link: ?proyecto=tallerapp lands with the overlay already open. No
  // pmodalPushed flag on this entry, so closing writes a clean URL instead of
  // navigating the visitor off the site.
  syncFromLocation();
})();
