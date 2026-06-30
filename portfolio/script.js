// @ts-check

// ─────────────────────────────────────────
// ERR-5: surface otherwise-silent runtime failures to the console so they
// are discoverable in error monitoring / devtools instead of vanishing.
// ─────────────────────────────────────────
window.addEventListener('error', (e) => {
  console.error('Unhandled error:', e.error ?? e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});

// ─────────────────────────────────────────
// Type aliases (JSDoc)
// ─────────────────────────────────────────

/**
 * @typedef {{ src: string; alt: string }} ModalImage
 */

// ─────────────────────────────────────────
// DOM helpers — null-safe element queries
// ─────────────────────────────────────────

/**
 * Null-safe element lookup. Returns null instead of throwing so that a
 * missing id only disables the feature that depends on it, rather than
 * aborting the entire script (ERR-1).
 * @template {HTMLElement} [T=HTMLElement]
 * @param {string} id
 * @returns {T | null}
 */
function getById(id) {
  const el = document.getElementById(id);
  return /** @type {T | null} */ (el);
}

const nav         = getById('nav');
const modal       = getById('modal');
const modalOverlay = getById('modal-overlay');
const modalImg    = /** @type {HTMLImageElement | null} */ (getById('modal-img'));
const modalClose  = getById('modal-close');
const contactLink = getById('contact-link');

// ERR-4: if the modal image fails to load, show a text fallback instead of
// the browser's broken-image icon.
modalImg?.addEventListener('error', () => {
  if (!modalImg) return;
  modalImg.alt = '画像を読み込めませんでした';
  modalImg.style.display = 'none';
});
modalImg?.addEventListener('load', () => {
  if (!modalImg) return;
  modalImg.style.display = '';
});

// ─────────────────────────────────────────
// Email obfuscation (S-1)
// Split across variables so bots cannot harvest with a plain regex
// ─────────────────────────────────────────
(function setupContactLink() {
  if (!contactLink) return;
  const user   = 'l7eo.ma4tsu';
  const domain = 'gmail.com';
  contactLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = `mailto:${user}@${domain}`;
  });
})();

// ─────────────────────────────────────────
// Navigation — scroll state
// ─────────────────────────────────────────
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

// ─────────────────────────────────────────
// Reveal on scroll
// PERF-2: stagger index is computed once per group up front instead of
// re-querying the DOM inside every IntersectionObserver callback.
// ─────────────────────────────────────────
(function initReveal() {
  try {
    /** @type {Map<Element, number>} */
    const staggerIndex = new Map();
    const groups = new Map();
    document.querySelectorAll('.reveal').forEach((el) => {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(el);
    });
    groups.forEach((siblings) => {
      siblings.forEach((el, idx) => staggerIndex.set(el, idx));
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const idx = staggerIndex.get(entry.target) ?? 0;
        /** @type {HTMLElement} */ (entry.target).style.transitionDelay = `${idx * 0.08}s`;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    staggerIndex.forEach((_idx, el) => observer.observe(el));
  } catch (err) {
    console.error('reveal init failed', err);
  }
})();

// ─────────────────────────────────────────
// Modal — state + focus management
// ─────────────────────────────────────────

/** @type {HTMLElement | null} */
let lastFocused = null;

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** @param {KeyboardEvent} e */
function trapFocus(e) {
  if (e.key !== 'Tab' || !modal) return;
  const focusable = /** @type {HTMLElement[]} */ ([...modal.querySelectorAll(FOCUSABLE)]);
  // ERR-2: nothing focusable inside the modal — nothing to trap, bail out safely
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
  }
}

// SEC-1: allow-list only relative paths / http(s) URLs instead of a single
// `javascript:` regex, which is bypassable with tabs/newlines or other
// dangerous schemes (data:, vbscript:, etc.)
const SAFE_SRC_RE = /^(?:https?:\/\/|\.{0,2}\/|[\w-]+\/)/i;

/**
 * @param {ModalImage} image
 * @returns {boolean} true if the image was accepted and rendered
 */
function setModalContent({ src, alt }) {
  if (!modalImg) return false;
  if (!SAFE_SRC_RE.test(src)) {
    // ERR-3: surface the rejection instead of failing silently
    console.error(`Blocked unsafe modal image src: ${src}`);
    return false;
  }
  modalImg.src = src;
  modalImg.alt = alt;
  return true;
}

/** @param {HTMLElement} trigger */
function lockScroll(trigger) {
  lastFocused = trigger;
  document.body.style.overflow = 'hidden';
}

function unlockScroll() {
  document.body.style.overflow = '';
  lastFocused?.focus();
  lastFocused = null;
}

/** @param {ModalImage & { trigger: HTMLElement }} options */
function openModal({ src, alt, trigger }) {
  if (!modal || !modalOverlay) return;
  const accepted = setModalContent({ src, alt });
  if (!accepted) return;
  // A11Y-6: tie the dialog's accessible name to the project currently shown
  modal.setAttribute('aria-label', `プロジェクト詳細: ${alt}`);
  lockScroll(trigger);
  modal.classList.add('open');
  modalOverlay.classList.add('open');
  modal.addEventListener('keydown', trapFocus);
  modalClose?.focus();
}

function closeModal() {
  if (!modal || !modalOverlay) return;
  modal.classList.remove('open');
  modalOverlay.classList.remove('open');
  modal.removeEventListener('keydown', trapFocus);
  unlockScroll();
}

// ─────────────────────────────────────────
// Work cards — stagger + modal trigger
// P-4: single querySelectorAll pass
// A11Y-2: cards are keyboard-operable (tabindex+role in HTML); Enter/Space
// opens the modal the same way a click does.
// ─────────────────────────────────────────
document.querySelectorAll('.work-card').forEach((card, i) => {
  /** @type {HTMLElement} */ (card).style.transitionDelay = `${(i % 3) * 0.08}s`;

  const triggerModalFromCard = (/** @type {Event} */ e) => {
    const btn = /** @type {HTMLElement | null} */ (
      e.target instanceof Element ? e.target.closest('.card-expand') : null
    );
    const trigger = btn ?? /** @type {HTMLElement} */ (card);
    const img = /** @type {HTMLImageElement | null} */ (card.querySelector('.card-image img'));
    if (!img) return;
    openModal({ src: img.src, alt: img.alt, trigger });
  };

  card.addEventListener('click', triggerModalFromCard);

  card.addEventListener('keydown', (e) => {
    const ke = /** @type {KeyboardEvent} */ (e);
    if (ke.key !== 'Enter' && ke.key !== ' ') return;
    // Avoid double-handling when the focused .card-expand button itself
    // already triggers a native click on Enter/Space.
    if (document.activeElement !== card) return;
    ke.preventDefault();
    triggerModalFromCard(ke);
  });
});

// ─────────────────────────────────────────
// Modal close handlers
// ─────────────────────────────────────────
modalClose?.addEventListener('click', closeModal);
modalOverlay?.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
