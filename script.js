(function () {
    'use strict';

    const header = document.getElementById('header');
    const burger = document.getElementById('burger');
    const mobileMenu = document.getElementById('mobile-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');

    // Header scroll state
    function onScroll() {
        if (header) {
            header.classList.toggle('scrolled', window.scrollY > 20);
        }
        updateActiveNav();
    }

    // Active nav link
    function updateActiveNav() {
        const line = window.scrollY + window.innerHeight * 0.3;
        let current = 'home';
        sections.forEach((section) => {
            if (line >= section.offsetTop) {
                current = section.id;
            }
        });
        navLinks.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + current);
        });
    }

    // Mobile menu
    function closeMenu() {
        if (!burger || !mobileMenu) return;
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        mobileMenu.classList.remove('open');
    }

    if (burger && mobileMenu) {
        burger.addEventListener('click', () => {
            const open = !mobileMenu.classList.contains('open');
            burger.classList.toggle('open', open);
            burger.setAttribute('aria-expanded', String(open));
            mobileMenu.classList.toggle('open', open);
        });

        mobileMenu.querySelectorAll('a').forEach((a) => {
            a.addEventListener('click', closeMenu);
        });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
})();
