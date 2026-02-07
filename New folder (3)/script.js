// Initialize Garden
window.onload = () => {
    // Graceful entry
    const c = setTimeout(() => {
        // Initial state setup if needed
        clearTimeout(c);
    }, 1000);
};

const roseTrigger = document.querySelector('#rose-trigger');
let isBloomed = false;

roseTrigger.addEventListener('click', () => {
    if (isBloomed) return;
    isBloomed = true;

    // 1. Remove "not-loaded" to start CSS blooming sequence
    document.body.classList.remove("not-loaded");

    // 2. Hide Instruction
    gsap.to('.instruction-text', { opacity: 0, duration: 1 });

    // 3. Reveal Love Note
    const timeline = gsap.timeline();

    timeline.to('.love-note', {
        visibility: "visible",
        opacity: 1,
        duration: 2,
        ease: "power3.out"
    }, "+=2"); // Delay to wait for bloom

    timeline.to('.reveal-fade', {
        opacity: 1,
        y: 0,
        duration: 1.2,
        stagger: 0.3,
        ease: "power2.out"
    }, "-=1");

    timeline.to('.divider', {
        width: "120px",
        duration: 1.2,
        ease: "power2.inOut"
    }, "-=1.5");

    // 4. Celebration
    setTimeout(() => {
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#ffb7c5', '#fff0f3', '#ff8fa3', '#9bc88a']
        });
    }, 3500);
});

// Subtle Parallax Effect
window.addEventListener('mousemove', (e) => {
    if (isBloomed) return;
    const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
    const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
    gsap.to('.flower', {
        x: moveX,
        y: moveY,
        duration: 1,
        ease: "power1.out"
    });
});
