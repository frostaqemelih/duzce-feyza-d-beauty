const isFinePointer = window.matchMedia('(pointer: fine)').matches;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Loader ----------
const loader = document.getElementById('loader');
function hideLoader() {
  if (!loader || loader.classList.contains('is-hidden')) return;
  loader.classList.add('is-hidden');
  setTimeout(() => loader.remove(), 1000);
}
if (loader) {
  requestAnimationFrame(() => loader.classList.add('is-ready'));
  window.addEventListener('load', () => setTimeout(hideLoader, 500));
  setTimeout(hideLoader, 2500); // safety net
}

// ---------- Header + scroll progress ----------
const header = document.getElementById('site-header');
const progressBar = document.getElementById('scroll-progress');
const onScroll = () => {
  if (window.scrollY > 40) header.classList.add('scrolled');
  else header.classList.remove('scrolled');
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  progressBar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---------- Custom cursor ----------
if (isFinePointer && !prefersReducedMotion) {
  document.body.classList.add('has-cursor');
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  let mx = 0, my = 0, rx = 0, ry = 0;
  window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; dot.style.left = mx + 'px'; dot.style.top = my + 'px'; });
  function loop() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';
    requestAnimationFrame(loop);
  }
  loop();
  document.querySelectorAll('a, button, .service-card, .gallery-card, [data-magnetic]').forEach((el) => {
    el.addEventListener('mouseenter', () => ring.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('is-hover'));
  });
}

// ---------- Cursor-reactive hero portrait ----------
if (isFinePointer && !prefersReducedMotion && hasGSAPGlobal()) {
  const heroImg = document.querySelector('.hero-image');
  const heroVisual = document.querySelector('.hero-visual');
  if (heroImg && heroVisual) {
    const moveX = gsap.quickTo(heroImg, 'x', { duration: 0.8, ease: 'power3.out' });
    const moveY = gsap.quickTo(heroImg, 'y', { duration: 0.8, ease: 'power3.out' });
    heroVisual.addEventListener('mousemove', (e) => {
      const r = heroVisual.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      moveX(-px * 18);
      moveY(-py * 18);
    });
    heroVisual.addEventListener('mouseleave', () => { moveX(0); moveY(0); });
  }
}
function hasGSAPGlobal() { return typeof gsap !== 'undefined'; }

// ---------- Magnetic buttons ----------
if (isFinePointer && !prefersReducedMotion) {
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.25;
      const y = (e.clientY - r.top - r.height / 2) * 0.25;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
}

// ---------- Split heading into a line-mask reveal ----------
function splitHeading(el) {
  if (el.querySelector('.word')) return;
  const html = el.innerHTML.trim();
  el.innerHTML = `<span class="line"><span class="word">${html}</span></span>`;
}
document.querySelectorAll('[data-split]').forEach(splitHeading);

const hasGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

if (hasGSAP) {
  gsap.registerPlugin(ScrollTrigger);
  gsap.config({ nullTargetWarn: false });

  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => el.classList.add('in-view') });
  });

  ScrollTrigger.batch('[data-reveal-stagger]', {
    start: 'top 92%',
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1, overwrite: true });
      batch.forEach((el) => el.classList.add('in-view'));
    },
  });

  gsap.utils.toArray('[data-split]').forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => el.classList.add('in-view') });
  });

  // Hero image gentle parallax + scale-in on load
  gsap.fromTo('.hero-image', { scale: 1.12, clipPath: 'inset(4% round 1.2rem)' }, { scale: 1, clipPath: 'inset(0% round 1.2rem)', duration: 1.3, ease: 'power3.out', delay: 0.3 });
  gsap.to('.hero-visual', {
    y: -40, ease: 'none',
    scrollTrigger: { trigger: '.hero-wrap', start: 'top top', end: 'bottom top', scrub: true },
  });

  // Count-up numbers
  gsap.utils.toArray('.count-up').forEach((el) => {
    const target = parseFloat(el.dataset.target || '0');
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const proxy = { val: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 92%', once: true,
      onEnter: () => gsap.to(proxy, { val: target, duration: 1.3, ease: 'power2.out', onUpdate: () => { el.textContent = proxy.val.toFixed(decimals); } }),
    });
  });
} else {
  const revealEls = document.querySelectorAll('[data-reveal], [data-reveal-stagger], [data-split]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); io.unobserve(entry.target); } });
  }, { threshold: 0.15 });
  revealEls.forEach((el) => io.observe(el));
  document.querySelectorAll('.count-up').forEach((el) => {
    el.textContent = parseFloat(el.dataset.target || '0').toFixed(parseInt(el.dataset.decimals || '0', 10));
  });
}

// ---------- Reveal safety net ----------
// If a CDN is slow/blocked or a ScrollTrigger check never fires for some
// element, content must never stay permanently invisible. Force-reveal
// anything still hidden a few seconds after load, no matter what.
function forceRevealAll() {
  document.querySelectorAll('[data-reveal]:not(.in-view), [data-reveal-stagger]:not(.in-view), [data-split]:not(.in-view)')
    .forEach((el) => el.classList.add('in-view'));
  document.querySelectorAll('.count-up').forEach((el) => {
    if (el.textContent === '0' || el.textContent === '0.0') {
      el.textContent = parseFloat(el.dataset.target || '0').toFixed(parseInt(el.dataset.decimals || '0', 10));
    }
  });
}
setTimeout(forceRevealAll, 3500);
window.addEventListener('load', () => setTimeout(forceRevealAll, 3500));

// ---------- Service category tabs ----------
const tabBtns = document.querySelectorAll('.tab-btn');
const serviceList = document.getElementById('service-list');
if (tabBtns.length && serviceList) {
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('is-active')) return;
      const cat = btn.dataset.cat;
      const rows = [...serviceList.querySelectorAll('.service-card')];
      const showRows = rows.filter((r) => r.dataset.cat === cat);
      const hideRows = rows.filter((r) => r.dataset.cat !== cat && r.style.display !== 'none');

      tabBtns.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      if (hasGSAP) {
        gsap.to(hideRows, {
          opacity: 0, y: -8, duration: 0.25, ease: 'power2.in', stagger: 0.03,
          onComplete: () => {
            hideRows.forEach((r) => { r.style.display = 'none'; });
            showRows.forEach((r) => { r.style.display = 'block'; });
            gsap.fromTo(showRows, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', stagger: 0.05 });
          },
        });
      } else {
        rows.forEach((r) => { r.style.display = r.dataset.cat === cat ? 'block' : 'none'; });
      }
    });
  });
}

// ---------- Gallery filmstrip focus transition (desktop hover) ----------
const galleryCards = document.querySelectorAll('.gallery-card');
if (galleryCards.length && isFinePointer && !prefersReducedMotion) {
  galleryCards.forEach((card) => {
    card.addEventListener('mouseenter', () => {
      galleryCards.forEach((c) => {
        if (c === card) {
          if (hasGSAP) gsap.to(c, { scale: 1.06, zIndex: 2, duration: 0.5, ease: 'power3.out' });
          else c.style.transform = 'scale(1.06)';
        } else {
          if (hasGSAP) gsap.to(c, { scale: 0.94, opacity: 0.55, zIndex: 1, duration: 0.5, ease: 'power3.out' });
          else { c.style.transform = 'scale(0.94)'; c.style.opacity = '0.55'; }
        }
      });
    });
    card.addEventListener('mouseleave', () => {
      galleryCards.forEach((c) => {
        if (hasGSAP) gsap.to(c, { scale: 1, opacity: 1, zIndex: 1, duration: 0.5, ease: 'power3.out' });
        else { c.style.transform = 'scale(1)'; c.style.opacity = '1'; }
      });
    });
  });
}

// ---------- Gallery lightbox (click/tap to open full size, any device) ----------
const lightbox = document.getElementById('lightbox');
const lightboxImg = lightbox ? lightbox.querySelector('img') : null;
const lightboxCaption = lightbox ? lightbox.querySelector('.lightbox-caption') : null;

function openLightbox(src, caption) {
  if (!lightbox || !lightboxImg) return;
  lightboxImg.src = src;
  if (lightboxCaption) lightboxCaption.textContent = caption || '';
  lightbox.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove('is-open');
  document.body.style.overflow = '';
}
const lightboxTargets = [...galleryCards, ...document.querySelectorAll('.service-card')];
lightboxTargets.forEach((card) => {
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  const openThis = () => {
    const img = card.querySelector('img');
    const cap = card.querySelector('figcaption h3') || card.querySelector('figcaption');
    if (img) openLightbox(img.currentSrc || img.src, cap ? cap.textContent : '');
  };
  card.addEventListener('click', openThis);
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openThis(); } });
});
if (lightbox) {
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.closest('.lightbox-close')) closeLightbox();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
}

// ---------- Horizontal rail prev/next (reviews + gallery) ----------
function wireRailNav(railId, prevId, nextId, cardSelector) {
  const rail = document.getElementById(railId);
  const prevBtn = document.getElementById(prevId);
  const nextBtn = document.getElementById(nextId);
  if (!rail || !prevBtn || !nextBtn) return;
  const scrollByCard = (dir) => {
    const card = rail.querySelector(cardSelector);
    const amount = card ? card.getBoundingClientRect().width + 20 : 320;
    rail.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };
  prevBtn.addEventListener('click', () => scrollByCard(-1));
  nextBtn.addEventListener('click', () => scrollByCard(1));
}
wireRailNav('quote-rail', 'quote-prev', 'quote-next', '.quote-card');
wireRailNav('gallery-rail', 'gallery-prev', 'gallery-next', '.gallery-card');

// ---------- Back to top ----------
const backToTop = document.getElementById('back-to-top');
if (backToTop) backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ---------- Appointment form ----------
const dateInput = document.getElementById('date');
if (dateInput) {
  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;
  dateInput.value = today;
}
const form = document.getElementById('appointment-form');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const message =
      `Merhaba, randevu almak istiyorum.%0A` +
      `Ad Soyad: ${encodeURIComponent(data.get('name'))}%0A` +
      `Hizmet: ${encodeURIComponent(data.get('service'))}%0A` +
      `Tarih: ${encodeURIComponent(data.get('date'))}%0A` +
      `Saat: ${encodeURIComponent(data.get('time'))}%0A` +
      `Telefon: ${encodeURIComponent(data.get('phone'))}`;
    window.open(`https://wa.me/905347049081?text=${message}`, '_blank', 'noopener');
    const success = document.getElementById('form-success');
    if (success) success.classList.add('is-visible');
  });
}
