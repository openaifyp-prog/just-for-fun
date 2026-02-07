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

const poemLines = [
    "In a garden of dreams, where the soft winds blow,",
    "One exquisite flower began to grow.",
    "With petals like silk and a heart of gold,",
    "The most beautiful story ever told.",
    "It bloomed for you, on this special day,",
    "To say what words can never say."
];

roseTrigger.addEventListener('click', () => {
    if (isBloomed) return;
    isBloomed = true;

    // 1. Remove "not-loaded" to start CSS blooming sequence
    document.body.classList.remove("not-loaded");

    // 2. Hide Instruction
    gsap.to('.instruction-text', { opacity: 0, duration: 1 });

    // 3. Reveal Sequential Love Note
    const timeline = gsap.timeline();
    const note = document.querySelector('#note');
    const poemWrapper = document.querySelector('#poem-wrapper');
    const poemLineEl = document.querySelector('.poem-line');
    const finalMessage = document.querySelector('#final-message');

    // Show Card after bloom starts
    timeline.to(note, {
        visibility: "visible",
        opacity: 1,
        duration: 2,
        ease: "power3.out"
    }, "+=1.5");

    // Cycle Poem Lines
    poemLines.forEach((line, index) => {
        timeline.to(poemLineEl, {
            onStart: () => { poemLineEl.textContent = line; },
            opacity: 1,
            duration: 1.5,
            ease: "power2.inOut"
        });
        timeline.to(poemLineEl, {
            opacity: 0,
            duration: 1,
            ease: "power2.inOut"
        }, "+=1.5"); // Pause to read
    });

    // Final Reveal
    timeline.to(poemWrapper, { display: "none", duration: 0.5 });
    timeline.to(finalMessage, {
        display: "block",
        onStart: () => {
            gsap.set('.reveal-fade', { opacity: 0, y: 20 });
        }
    });

    timeline.to('.reveal-fade', {
        opacity: 1,
        y: 0,
        duration: 1.2,
        stagger: 0.3,
        ease: "power2.out"
    });

    timeline.to('.divider', {
        width: "120px",
        duration: 1.2,
        ease: "power2.inOut"
    }, "-=1.5");

    // 4. Celebration
    timeline.call(() => {
        confetti({
            particleCount: 200,
            spread: 90,
            origin: { y: 0.7 },
            colors: ['#ffb7c5', '#fff0f3', '#ff8fa3', '#9bc88a']
        });
    }, null, "+=0.5");
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
