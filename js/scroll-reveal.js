// Intersection Observer scroll reveals
(function() {
  window.addEventListener('load', () => {
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
      setTimeout(() => heroContent.classList.add('visible'), 100);
    }
  });

  const revealEls = document.querySelectorAll('.reveal:not(.hero-content), .reveal-stagger');
  if (!revealEls.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealEls.forEach(el => observer.observe(el));
})();
