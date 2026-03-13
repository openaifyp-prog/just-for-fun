/* ============================================
   SILK — WebGL2 Motion Graphics Engine
   High-fidelity Splines & GPU Shaders
   ============================================ */

'use strict';

// ── WebGL Helpers ──
function getWebGL(canvas) {
    const gl = canvas.getContext('webgl2', { 
        alpha: false, 
        antialias: true, 
        preserveDrawingBuffer: true 
    });
    if (!gl) { alert('WebGL2 not supported'); return null; }
    return gl;
}

function compileShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
    }
    return s;
}

function createProgram(gl, vSrc, fSrc) {
    const v = compileShader(gl, gl.VERTEX_SHADER, vSrc);
    const f = compileShader(gl, gl.FRAGMENT_SHADER, fSrc);
    const p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error('Link error:', gl.getProgramInfoLog(p));
        return null;
    }
    return p;
}

// ── SHADERS ──

// Vertex Shader: Draws lines with varying width and alpha
const VERT_SRC = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in float aAlpha;
layout(location = 2) in float aThickness;

uniform mat4 uProjection;
uniform float uTime;

out float vAlpha;

void main() {
    vAlpha = aAlpha;
    gl_Position = uProjection * vec4(aPosition, 1.0);
    gl_PointSize = aThickness;
}`;

// Fragment Shader: Glowing velvet effect
const FRAG_SRC = `#version 300 es
precision highp float;

in float vAlpha;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uIntensity;

out vec4 fragColor;

void main() {
    // Soft circle for point sprites
    vec2 p = gl_PointCoord - 0.5;
    float r = length(p);
    if (r > 0.5) discard;

    float glow = smoothstep(0.5, 0.0, r);
    vec3 color = mix(uColorA, uColorB, vAlpha);
    
    // Add "expensive" velvet glow (fresnel-like)
    float edgeGlow = pow(1.0 - r * 2.0, 2.0);
    vec3 finalColor = color * (1.0 + edgeGlow * uIntensity);
    
    fragColor = vec4(finalColor, vAlpha * glow * 0.4);
}`;

// ── SIMULATION CLASSES ──

class Spline {
    constructor(pointCount, colorIndex) {
        this.points = [];
        this.pointCount = pointCount;
        this.colorIndex = colorIndex;
        
        // Use random start positions
        const startX = (Math.random() - 0.5) * 2;
        const startY = (Math.random() - 0.5) * 2;
        const startZ = (Math.random() - 0.5) * 2;

        for (let i = 0; i < pointCount; i++) {
            this.points.push({
                x: startX,
                y: startY,
                z: startZ,
                vx: 0,
                vy: 0,
                vz: 0
            });
        }
    }

    update(target, config, time) {
        // Leader follows target
        const head = this.points[0];
        const tx = target.x + Math.sin(time * 0.5 + this.colorIndex) * config.turbulence * 0.01;
        const ty = target.y + Math.cos(time * 0.3 + this.colorIndex) * config.turbulence * 0.01;
        
        head.vx += (tx - head.x) * config.flow * 0.001;
        head.vy += (ty - head.y) * config.flow * 0.001;
        
        // Dampening
        head.vx *= 0.95;
        head.vy *= 0.95;
        
        head.x += head.vx;
        head.y += head.vy;

        // Followers follow their predecessor with spring physics
        for (let i = 1; i < this.pointCount; i++) {
            const p = this.points[i];
            const prev = this.points[i - 1];
            
            p.vx += (prev.x - p.x) * 0.15;
            p.vy += (prev.y - p.y) * 0.15;
            p.vz += (prev.z - p.z) * 0.15;
            
            // Add some "floating" turbulence
            p.vx += Math.sin(time * 0.2 + i * 0.05) * 0.001;
            p.vy += Math.cos(time * 0.25 + i * 0.05) * 0.001;

            p.vx *= 0.85;
            p.vy *= 0.85;
            p.vz *= 0.85;

            p.x += p.vx;
            p.y += p.vy;
            p.z += p.vz;
        }
    }
}

// ══════════════════════════════════════════════
// ENGINE CLASS
// ══════════════════════════════════════════════

class SilkEngine {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.gl = getWebGL(this.canvas);
        if (!this.gl) return;

        this.config = {
            flow: 50,
            width: 8,
            turbulence: 30,
            intensity: 0.7,
            palette: 'gold',
            paused: false
        };

        this.palettes = {
            gold:   { a: [0.92, 0.71, 0.07], b: [0.75, 0.22, 0.17] }, // Gold to Crimson
            teal:   { a: [0.16, 0.35, 0.35], b: [0.0, 0.1, 0.1] },    // Deep Sea
            aurora: { a: [0.31, 0.19, 0.61], b: [0.2, 0.88, 0.77] }   // Cosmic Aurora
        };

        this.target = { x: 0, y: 0 };
        this.time = 0;
        this.splines = [];
        this.splineCount = 120; // Reduced for silky smooth performance
        this.pointsPerSpline = 100;

        this.initGL();
        this.initSplines();
        this.resize();
        this.bindEvents();
        this.loop();
    }

    initGL() {
        const gl = this.gl;
        this.prog = createProgram(gl, VERT_SRC, FRAG_SRC);
        
        // Buffers for one big draw call
        this.posBuf = gl.createBuffer();
        this.alphaBuf = gl.createBuffer();
        this.thickBuf = gl.createBuffer();

        // Locations
        this.uProj = gl.getUniformLocation(this.prog, 'uProjection');
        this.uColorA = gl.getUniformLocation(this.prog, 'uColorA');
        this.uColorB = gl.getUniformLocation(this.prog, 'uColorB');
        this.uIntensity = gl.getUniformLocation(this.prog, 'uIntensity');
        this.uTime = gl.getUniformLocation(this.prog, 'uTime');

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.clearColor(0.04, 0.04, 0.04, 1.0);
    }

    initSplines() {
        this.splines = [];
        for (let i = 0; i < this.splineCount; i++) {
            this.splines.push(new Spline(this.pointsPerSpline, i));
        }
        document.getElementById('spline-count').textContent = (this.splineCount * this.pointsPerSpline).toLocaleString();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Orthographic projection that maintains aspect ratio
        const aspect = this.canvas.width / this.canvas.height;
        this.projectionMatrix = new Float32Array([
            1/aspect, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());
        
        window.addEventListener('mousemove', e => {
            const aspect = this.canvas.width / this.canvas.height;
            this.target.x = (e.clientX / this.canvas.width * 2 - 1) * aspect;
            this.target.y = -(e.clientY / this.canvas.height * 2 - 1);
        });

        // Touch
        window.addEventListener('touchmove', e => {
            const t = e.touches[0];
            const aspect = this.canvas.width / this.canvas.height;
            this.target.x = (t.clientX / this.canvas.width * 2 - 1) * aspect;
            this.target.y = -(t.clientY / this.canvas.height * 2 - 1);
        }, { passive: false });

        // Sliders
        document.getElementById('flow-strength').oninput = e => this.config.flow = e.target.value;
        document.getElementById('ribbon-width').oninput = e => this.config.width = e.target.value;
        document.getElementById('turbulence').oninput = e => this.config.turbulence = e.target.value;
        document.getElementById('light-intensity').oninput = e => this.config.intensity = e.target.value / 100;

        // Palette
        document.querySelectorAll('.palette-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.config.palette = btn.dataset.palette;
            };
        });

        // Buttons
        const pauseBtn = document.getElementById('btn-pause');
        pauseBtn.onclick = () => {
            this.config.paused = !this.config.paused;
            pauseBtn.querySelector('.btn-text').textContent = this.config.paused ? 'RESUME' : 'PAUSE';
            pauseBtn.querySelector('.icon').textContent = this.config.paused ? '▶' : '⏸';
        };

        document.getElementById('btn-clear').onclick = () => this.initSplines();
        
        document.getElementById('btn-export').onclick = () => {
            const link = document.createElement('a');
            link.download = 'silk-snapshot.png';
            link.href = this.canvas.toDataURL();
            link.click();
        };
    }

    update() {
        if (this.config.paused) return;
        this.time += 0.01;
        for (const s of this.splines) {
            s.update(this.target, this.config, this.time);
        }
    }

    draw() {
        const gl = this.gl;
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.prog);

        // Prepare data arrays
        const positions = new Float32Array(this.splineCount * this.pointsPerSpline * 3);
        const alphas = new Float32Array(this.splineCount * this.pointsPerSpline);
        const thicknesses = new Float32Array(this.splineCount * this.pointsPerSpline);

        let i = 0;
        for (const s of this.splines) {
            for (let j = 0; j < s.pointCount; j++) {
                const p = s.points[j];
                positions[i * 3]     = p.x;
                positions[i * 3 + 1] = p.y;
                positions[i * 3 + 2] = p.z;
                
                // Alpha tapers at both ends
                const t = j / (s.pointCount - 1);
                alphas[i] = Math.sin(t * Math.PI);
                
                // Thickness also tapers
                thicknesses[i] = this.config.width * alphas[i];
                
                i++;
            }
        }

        // Upload to GPU
        gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.alphaBuf);
        gl.bufferData(gl.ARRAY_BUFFER, alphas, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.thickBuf);
        gl.bufferData(gl.ARRAY_BUFFER, thicknesses, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);

        // Uniforms
        gl.uniformMatrix4fv(this.uProj, false, this.projectionMatrix);
        const pal = this.palettes[this.config.palette];
        gl.uniform3fv(this.uColorA, pal.a);
        gl.uniform3fv(this.uColorB, pal.b);
        gl.uniform1f(this.uIntensity, this.config.intensity);
        gl.uniform1f(this.uTime, this.time);

        gl.drawArrays(gl.POINTS, 0, this.splineCount * this.pointsPerSpline);
    }

    loop() {
        const start = performance.now();
        this.update();
        this.draw();
        
        // FPS Counter
        const end = performance.now();
        const fps = Math.round(1000 / (end - start + 1));
        if (this.time % 0.5 < 0.01) {
            document.getElementById('fps-counter').textContent = fps;
        }

        requestAnimationFrame(() => this.loop());
    }
}

// ── BOOT ──
window.onload = () => new SilkEngine();
