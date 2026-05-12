// Testimonial carousel
(function() {
  const track = document.getElementById('testimonial-track');
  const dotsContainer = document.getElementById('testimonial-dots');
  const prevBtn = document.getElementById('testimonial-prev');
  const nextBtn = document.getElementById('testimonial-next');

  if (!track) return;

  const cards = track.querySelectorAll('.testimonial-card');
  const total = cards.length;
  let current = 0;
  let autoplayTimer;

  cards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'testimonial-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Testimoni ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  });

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    document.querySelectorAll('.testimonial-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === current);
    });
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  if (nextBtn) nextBtn.addEventListener('click', () => { resetAutoplay(); next(); });
  if (prevBtn) prevBtn.addEventListener('click', () => { resetAutoplay(); prev(); });

  function startAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = setInterval(next, 5000);
  }

  function resetAutoplay() {
    startAutoplay();
  }

  let touchStartX = 0;
  track.addEventListener('touchstart', event => {
    touchStartX = event.touches[0].clientX;
  }, { passive: true });

  track.addEventListener('touchend', event => {
    const diff = touchStartX - event.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      resetAutoplay();
      diff > 0 ? next() : prev();
    }
  });

  const carousel = document.getElementById('testimonial-carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', () => clearInterval(autoplayTimer));
    carousel.addEventListener('mouseleave', startAutoplay);
  }

  startAutoplay();
})();
