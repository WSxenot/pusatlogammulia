// Gold particle canvas animation
(function() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationId = null;

  function getParticleCount() {
    return window.innerWidth < 768 ? 35 : 65;
  }

  function resizeCanvas() {
    const hero = document.getElementById('hero');
    canvas.width = hero.offsetWidth;
    canvas.height = hero.offsetHeight;
  }

  function createParticle(atBottom) {
    return {
      x: Math.random() * canvas.width,
      y: atBottom ? canvas.height + 10 : Math.random() * canvas.height,
      size: Math.random() * 3 + 1,
      speedY: -(Math.random() * 0.3 + 0.1),
      speedX: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.4 + 0.1,
      baseOpacity: 0,
      twinkleSpeed: Math.random() * 0.01 + 0.005,
      twinklePhase: Math.random() * Math.PI * 2,
    };
  }

  function initParticles() {
    particles = Array.from({ length: getParticleCount() }, () => {
      const particle = createParticle(false);
      particle.baseOpacity = particle.opacity;
      return particle;
    });
  }

  function drawParticle(particle) {
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(201, 168, 76, ${particle.opacity})`;
    ctx.fill();
  }

  function drawStaticParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(drawParticle);
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((particle, index) => {
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      particle.twinklePhase += particle.twinkleSpeed;
      particle.opacity = Math.max(0.05, Math.min(0.6, particle.baseOpacity + Math.sin(particle.twinklePhase) * 0.15));

      if (particle.y < -10 || particle.x < -10 || particle.x > canvas.width + 10) {
        particles[index] = createParticle(true);
        particles[index].baseOpacity = particles[index].opacity;
        drawParticle(particles[index]);
        return;
      }

      drawParticle(particle);
    });

    animationId = requestAnimationFrame(animate);
  }

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resizeCanvas();
      initParticles();
      if (!animationId) drawStaticParticles();
    }, 200);
  });

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  resizeCanvas();
  initParticles();

  if (prefersReducedMotion.matches) {
    drawStaticParticles();
    return;
  }

  const heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animationId) {
        animate();
      } else if (!entry.isIntersecting && animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    });
  }, { threshold: 0 });

  heroObserver.observe(document.getElementById('hero'));
})();
