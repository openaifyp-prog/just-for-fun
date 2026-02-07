// Initialize Garden
const roseTrigger = document.querySelector('#rose-trigger');
const note = document.querySelector('#note');
const poemWrapper = document.querySelector('#poem-wrapper');
const line1 = document.querySelector('.line-1');
const line2 = document.querySelector('.line-2');
const finalMessage = document.querySelector('#final-message');
const instruction = document.querySelector('.instruction-text');
const nextHint = document.querySelector('.next-hint');
const petalsContainer = document.querySelector('#petals-container');

let isBloomed = false;
let currentVerse = 0;
let isAnimating = false;

const poemLinePairs = [
    ["In a garden of dreams, where the soft winds blow,", "One exquisite flower began to grow."],
    ["With petals like silk and a heart of gold,", "The most beautiful story ever told."],
    ["Every moment with you is a gift so rare,", "A fragrance of love that fills the air."],
    ["In your eyes, I see my forever shine,", "Forever grateful that you are mine."],
    ["It bloomed for you, on this special day,", "To say what words can never say."]
];

// 1. Ambient Petals Generator
function createPetal() {
    const petal = document.createElement('div');
    petal.classList.add('ambient-petal');

    // Randomize
    const size = Math.random() * 10 + 5 + 'px';
    petal.style.width = size;
    petal.style.height = size;
    petal.style.left = Math.random() * 100 + 'vw';
    petal.style.top = '-10px';

    petalsContainer.appendChild(petal);

    // Animate with GSAP
    gsap.to(petal, {
        y: '110vh',
        x: '+=100', // Sway
        rotation: Math.random() * 360,
        duration: Math.random() * 5 + 5,
        ease: "none",
        onComplete: () => {
            petal.remove();
        }
    });
}

// Start ambient particles
setInterval(createPetal, 400);

// 2. Story Progression Logic
function showNextVerse() {
    if (isAnimating) return;
    isAnimating = true;

    // Hide hints during transition
    nextHint.classList.remove('visible');
    note.classList.remove('waiting');

    const tl = gsap.timeline({
        onComplete: () => {
            isAnimating = false;
            // Show hint after transition if not finished
            if (currentVerse <= poemLinePairs.length) {
                nextHint.classList.add('visible');
                note.classList.add('waiting');
            }
        }
    });

    if (currentVerse === 0) {
        // First Touch: Bloom + Show First Verse
        isBloomed = true;
        document.body.classList.remove("not-loaded");
        gsap.to(instruction, { opacity: 0, duration: 1 });

        tl.to(note, {
            visibility: "visible",
            opacity: 1,
            duration: 1.5,
            ease: "power3.out"
        }, "+=1.5");

        tl.to([line1, line2], {
            onStart: () => {
                line1.textContent = poemLinePairs[currentVerse][0];
                line2.textContent = poemLinePairs[currentVerse][1];
            },
            opacity: 1,
            y: 0,
            duration: 1.2,
            stagger: 0.3,
            ease: "power2.out"
        });

        tl.call(() => {
            instruction.textContent = "Tap anywhere to continue";
            gsap.to(instruction, { opacity: 0.4, duration: 1 });
        }, null, "+=0.5");

        currentVerse++;
    } else if (currentVerse < poemLinePairs.length) {
        // Intermediate Touches: Cycle Verses
        tl.to([line1, line2], {
            opacity: 0,
            y: -15,
            duration: 0.8,
            ease: "power2.in",
            stagger: 0.1
        });

        tl.to([line1, line2], {
            onStart: () => {
                line1.textContent = poemLinePairs[currentVerse][0];
                line2.textContent = poemLinePairs[currentVerse][1];
                gsap.set([line1, line2], { y: 15 });
            },
            opacity: 1,
            y: 0,
            duration: 1.2,
            stagger: 0.3,
            ease: "power2.out"
        });
        currentVerse++;
    } else if (currentVerse === poemLinePairs.length) {
        // Last Touch: Final Message
        gsap.to(instruction, { opacity: 0, duration: 0.5 });
        nextHint.style.display = 'none';

        tl.to([line1, line2], {
            opacity: 0,
            y: -20,
            duration: 0.8,
            ease: "power2.in"
        });

        tl.to(poemWrapper, { display: "none", duration: 0.5 });

        tl.to(finalMessage, {
            display: "block",
            onStart: () => {
                gsap.set('.reveal-fade', { opacity: 0, y: 30 });
                gsap.set('.divider', { width: 0 });
            }
        });

        // Cinematic Reveal
        tl.to('h1.reveal-fade', { opacity: 1, y: 0, duration: 1.5, ease: "power2.out" });
        tl.to('.divider', { width: "120px", duration: 1.5, ease: "power2.inOut" }, "-=1");
        tl.to('.cursive', { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" }, "-=0.8");
        tl.to('.body', { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" }, "-=0.8");

        // Celebration
        tl.call(() => {
            confetti({
                particleCount: 250,
                spread: 100,
                origin: { y: 0.7 },
                colors: ['#ffb7c5', '#fff0f3', '#ff8fa3', '#9bc88a']
            });
        }, null, "+=0.5");

        currentVerse++; // End of journey
    }
}

// Global click/touch for progression
document.body.addEventListener('click', (e) => {
    if (currentVerse > poemLinePairs.length) return;
    showNextVerse();
});

// Subtle Parallax Effect
window.addEventListener('mousemove', (e) => {
    if (isBloomed) return;
    const moveX = (e.clientX - window.innerWidth / 2) * 0.01;
    const moveY = (e.clientY - window.innerHeight / 2) * 0.01;
    gsap.to('.flower', { x: moveX, y: moveY, duration: 1, ease: "power1.out" });
});
