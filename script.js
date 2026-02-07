// Initialize Garden
const roseTrigger = document.querySelector('#rose-trigger');
let isBloomed = false;

window.onload = () => {
    // Graceful entry
    setTimeout(() => {
        // Initial state setup if needed
    }, 1000);
};

const poemLinePairs = [
    ["In a garden of dreams, where the soft winds blow,", "One exquisite flower began to grow."],
    ["With petals like silk and a heart of gold,", "The most beautiful story ever told."],
    ["It bloomed for you, on this special day,", "To say what words can never say."]
];

roseTrigger.addEventListener('click', () => {
    if (isBloomed) return;
    isBloomed = true;

    // 1. Remove "not-loaded" to start CSS blooming sequence
    document.body.classList.remove("not-loaded");

    // 2. Hide Instruction
    gsap.to('.instruction-text', { opacity: 0, duration: 1 });

    // 3. Reveal Sequential Love Story
    const timeline = gsap.timeline();
    const note = document.querySelector('#note');
    const poemWrapper = document.querySelector('#poem-wrapper');
    const line1 = document.querySelector('.line-1');
    const line2 = document.querySelector('.line-2');
    const finalMessage = document.querySelector('#final-message');

    // Show Card
    timeline.to(note, {
        visibility: "visible",
        opacity: 1,
        duration: 2,
        ease: "power3.out"
    }, "+=1.5");

    // Cycle Line Pairs
    poemLinePairs.forEach((pair, index) => {
        timeline.to([line1, line2], {
            onStart: () => {
                line1.textContent = pair[0];
                line2.textContent = pair[1];
            },
            opacity: 1,
            y: 0,
            duration: 1.2,
            stagger: 0.2,
            ease: "power2.out"
        });

        timeline.to([line1, line2], {
            opacity: 0,
            y: -10,
            duration: 0.8,
            ease: "power2.in"
        }, "+=2"); // Pause to read
    });

    // 4. The Final "Nice Effect" Reveal
    timeline.to(poemWrapper, { display: "none", duration: 0.5 });
    timeline.to(finalMessage, {
        display: "block",
        onStart: () => {
            gsap.set('.reveal-fade', { opacity: 0, y: 30 });
            gsap.set('.divider', { width: 0 });
        }
    });

    // Cinematic Reveal
    timeline.to('h1.reveal-fade', { opacity: 1, y: 0, duration: 1.5, ease: "power2.out" });
    timeline.to('.divider', { width: "120px", duration: 1.5, ease: "power2.inOut" }, "-=1");
    timeline.to('.cursive', { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" }, "-=0.8");
    timeline.to('.body', { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" }, "-=0.8");

    // Final Celebration
    timeline.call(() => {
        confetti({
            particleCount: 220,
            spread: 100,
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
    gsap.to('.flower', { x: moveX, y: moveY, duration: 1, ease: "power1.out" });
});
