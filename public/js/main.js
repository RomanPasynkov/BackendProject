/* eslint-env browser */
(() => {
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Footer year
  const yearEl = qs('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Desktop dropdown (hover + click accessibility)
  const dropdownBtn = qs('.menu__dropdownBtn');
  const dropdown = qs('#dropdown-1');
  if (dropdownBtn && dropdown) {
    let closeTimer = null;
    const open = () => {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      dropdown.classList.add('is-open');
      dropdownBtn.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
      dropdown.classList.remove('is-open');
      dropdownBtn.setAttribute('aria-expanded', 'false');
    };

    const scheduleClose = () => {
      if (closeTimer) clearTimeout(closeTimer);
      // Небольшая задержка убирает «мигание» и даёт спокойно увести курсор
      // с кнопки на выпадающее меню, не закрывая его.
      closeTimer = window.setTimeout(close, 250);
    };

    dropdownBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (dropdown.classList.contains('is-open')) close();
      else open();
    });

    // open on hover for desktop-like behavior
    const li = dropdownBtn.closest('.menu__item--dropdown');
    if (li) {
      li.addEventListener('mouseenter', open);
      li.addEventListener('mouseleave', (e) => {
        // Если курсор уходит с кнопки прямо на меню (оно может быть
        // визуально «вынесено» абсолютным позиционированием), не закрываем.
        const to = e.relatedTarget;
        if (to && (li.contains(to) || dropdown.contains(to))) return;
        scheduleClose();
      });

      dropdown.addEventListener('mouseenter', open);
      dropdown.addEventListener('mouseleave', (e) => {
        const to = e.relatedTarget;
        if (to && (li.contains(to) || dropdown.contains(to))) return;
        scheduleClose();
      });
    }

    document.addEventListener('click', (e) => {
      const target = e.target;
      const clickedInside = dropdown.contains(target) || dropdownBtn.contains(target);
      if (!clickedInside) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  // Mobile menu
  const burger = qs('#burger');
  const mobileMenu = qs('#mobileMenu');
  const mobileClose = qs('#mobileClose');
  const mobileBackdrop = qs('#mobileBackdrop');

  const lockBody = (lock) => {
    document.documentElement.classList.toggle('no-scroll', lock);
    document.body.style.overflow = lock ? 'hidden' : '';
  };

  const openMobile = () => {
    if (!mobileMenu) return;
    mobileMenu.classList.add('is-open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    if (burger) burger.setAttribute('aria-expanded', 'true');
    lockBody(true);
  };

  const closeMobile = () => {
    if (!mobileMenu) return;
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    lockBody(false);
  };

  if (burger) burger.addEventListener('click', openMobile);
  if (mobileClose) mobileClose.addEventListener('click', closeMobile);
  if (mobileBackdrop) mobileBackdrop.addEventListener('click', closeMobile);
  qsa('.mobileMenu a').forEach((a) => a.addEventListener('click', closeMobile));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobile();
  });

  // Slider (Swiper)
  if (window.Swiper) {
    // eslint-disable-next-line no-new
    new window.Swiper('#casesSwiper', {
      slidesPerView: 1,
      spaceBetween: 14,
      loop: true,
      navigation: {
        nextEl: '#casesNext',
        prevEl: '#casesPrev',
      },
      breakpoints: {
        768: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
      },
    });
  }

  // Form moved to separate page /form
})();
