// Nav scroll behavior
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// Reveal on scroll
const revealEls = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      // Stagger siblings in same parent
      const siblings = [...entry.target.parentElement.querySelectorAll('.reveal:not(.visible)')];
      const idx = siblings.indexOf(entry.target);
      entry.target.style.transitionDelay = `${idx * 0.08}s`;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealEls.forEach(el => observer.observe(el));

// Work cards — stagger within grid
document.querySelectorAll('.work-card').forEach((card, i) => {
  card.style.transitionDelay = `${(i % 3) * 0.08}s`;
});

// Modal
const modal = document.getElementById('modal');
const modalOverlay = document.getElementById('modal-overlay');
const modalImg = document.getElementById('modal-img');
const modalClose = document.getElementById('modal-close');
let lastFocused = null;

const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function trapFocus(e) {
  const focusable = [...modal.querySelectorAll(focusableSelectors)];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.key !== 'Tab') return;
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

function openModal(src, alt, trigger) {
  lastFocused = trigger || document.activeElement;
  modalImg.src = src;
  modalImg.alt = alt;
  modal.classList.add('open');
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  modal.addEventListener('keydown', trapFocus);
  modalClose.focus();
}

function closeModal() {
  modal.classList.remove('open');
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  modal.removeEventListener('keydown', trapFocus);
  if (lastFocused) lastFocused.focus();
}

document.querySelectorAll('.work-card').forEach(card => {
  card.addEventListener('click', (e) => {
    const btn = e.target.closest('.card-expand');
    if (btn || e.currentTarget === card) {
      const img = card.querySelector('.card-image img');
      openModal(img.src, img.alt, btn || card);
    }
  });
});

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
