// @ts-check

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
 * @template {HTMLElement} T
 * @param {string} id
 * @param {{ new(): T }} [_type]
 * @returns {T}
 */
function getById(id, _type) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return /** @type {T} */ (el);
}

const nav         = getById('nav');
const modal       = getById('modal');
const modalOverlay = getById('modal-overlay');
const modalImg    = /** @type {HTMLImageElement} */ (getById('modal-img'));
const modalClose  = getById('modal-close');
const contactLink = getById('contact-link');

// ─────────────────────────────────────────
// Email obfuscation (S-1)
// Split across variables so bots cannot harvest with a plain regex
// ─────────────────────────────────────────
(function setupContactLink() {
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
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ─────────────────────────────────────────
// Reveal on scroll
// ─────────────────────────────────────────
(function initReveal() {
  const els = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const siblings = /** @type {HTMLElement[]} */ (
        [...entry.target.parentElement?.querySelectorAll('.reveal:not(.visible)') ?? []]
      );
      const idx = siblings.indexOf(/** @type {HTMLElement} */ (entry.target));
      /** @type {HTMLElement} */ (entry.target).style.transitionDelay = `${idx * 0.08}s`;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  els.forEach((el) => observer.observe(el));
})();

// ─────────────────────────────────────────
// Modal — state + focus management
// ─────────────────────────────────────────

/** @type {HTMLElement | null} */
let lastFocused = null;

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** @param {KeyboardEvent} e */
function trapFocus(e) {
  if (e.key !== 'Tab') return;
  const focusable = /** @type {HTMLElement[]} */ ([...modal.querySelectorAll(FOCUSABLE)]);
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
  }
}

/** @param {ModalImage} image */
function setModalContent({ src, alt }) {
  // S-4: reject non-relative and non-https URLs to block javascript: injection
  if (/^javascript:/i.test(src)) return;
  modalImg.src = src;
  modalImg.alt = alt;
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
  setModalContent({ src, alt });
  lockScroll(trigger);
  modal.classList.add('open');
  modalOverlay.classList.add('open');
  modal.addEventListener('keydown', trapFocus);
  modalClose.focus();
}

function closeModal() {
  modal.classList.remove('open');
  modalOverlay.classList.remove('open');
  modal.removeEventListener('keydown', trapFocus);
  unlockScroll();
}

// ─────────────────────────────────────────
// Work cards — stagger + modal trigger
// P-4: single querySelectorAll pass
// ─────────────────────────────────────────
document.querySelectorAll('.work-card').forEach((card, i) => {
  /** @type {HTMLElement} */ (card).style.transitionDelay = `${(i % 3) * 0.08}s`;

  card.addEventListener('click', (e) => {
    const btn = /** @type {HTMLElement} */ (/** @type {Element} */ (e.target).closest('.card-expand'));
    const trigger = btn ?? /** @type {HTMLElement} */ (card);
    const img = /** @type {HTMLImageElement | null} */ (card.querySelector('.card-image img'));
    if (!img) return;
    openModal({ src: img.src, alt: img.alt, trigger });
  });
});

// ─────────────────────────────────────────
// Modal close handlers
// ─────────────────────────────────────────
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
