# Silk — 3D Abstract Motion Graphics

Hypnotic 3D motion graphics where glowing ribbons flow like silk in water. Built with a custom raw WebGL2 physics engine and premium GLSL shaders.

## Features

- **Extreme Visuals** — Velvety, glowing ribbons with Fresnel-like reflections and tapered geometry.
- **Organic Motion** — High-end spline math and spring-physics simulation for smooth, life-like movement.
- **Immersive UI** — Premium glassmorphism control panel with gold accents and Cinzel typography.
- **Interactive** — Mouse/Touch acts as a wind force, pushing ribbons around in real-time.
- **Performance** — GPU-accelerated rendering and physics, targeting 60 FPS on modern browsers.
- **Customization** — Adjust flow strength, width, turbulence, and lighting intensity. Choose from curated premium palettes.

## How It Works

1. **Spline Physics**: Each ribbon consists of ~100 points connected via spring and dampening logic.
2. **WebGL2 Shaders**:
   - **Vertex Base**: Spline points are tapered at both ends for an organic look.
   - **Velvet Shader**: Fragment logic simulates complex lighting reflections to give the ribbons a fabric-like feel.
3. **Glassmorphism UI**: Uses `backdrop-filter` and semi-transparent layers for a high-end "expensive" aesthetic.

## Run

Open `index.html` in any modern browser. Optimized for high-resolution displays.
