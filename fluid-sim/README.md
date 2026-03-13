# Fluid — Interactive 2D Fluid Dynamics

A GPU-accelerated fluid simulation built with WebGL2 shaders. Click and drag to paint with colored smoke that flows, swirls, and dissipates in real-time.

## Features

- **Real-time GPU physics** — Navier-Stokes equations solved on the GPU via fragment shaders
- **Interactive painting** — Click & drag to inject dye and velocity
- **Controls** — Color picker, brush size, viscosity, curl, pressure iterations
- **Display modes** — Dye (default), Velocity field, Pressure field
- **Rainbow mode** — Continuously cycling colors as you paint
- **Vorticity confinement** — Curl forces create beautiful swirling patterns

## How It Works

Based on Jos Stam's "Stable Fluids" (1999):

1. **Advection** — Move quantities through the velocity field
2. **Vorticity** — Add curl forces for swirling detail
3. **Pressure Solve** — Jacobi iteration to make velocity divergence-free
4. **Gradient Subtraction** — Project velocity to be incompressible

## Controls

| Control      | Effect               |
| ------------ | -------------------- |
| Click & drag | Add dye + velocity   |
| Color picker | Change dye color     |
| Brush        | Adjust splat radius  |
| Viscosity    | Fluid thickness      |
| Curl         | Swirling intensity   |
| Pressure     | Solver accuracy      |
| Mode         | Switch visualization |
| RAINBOW      | Toggle color cycling |
| CLEAR        | Reset simulation     |

## Run

Open `index.html` in any modern browser (Chrome, Firefox, Edge).
