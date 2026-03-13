/* ============================================
   FLUID — WebGL2 GPU-Accelerated Fluid Sim
   Based on Jos Stam's "Stable Fluids" (1999)
   ============================================ */

'use strict';

// ── WebGL Helpers ──
function getWebGL(canvas) {
    const gl = canvas.getContext('webgl2', { alpha: false, preserveDrawingBuffer: false });
    if (!gl) { alert('WebGL2 not supported'); return null; }
    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('OES_texture_float_linear');
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
    // Gather uniform locations
    const uniforms = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
        const info = gl.getActiveUniform(p, i);
        uniforms[info.name] = gl.getUniformLocation(p, info.name);
    }
    return { program: p, uniforms };
}

// Fullscreen quad
const VERT = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUV;
void main() {
    vUV = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

// ── SHADER SOURCES ──

const ADVECT_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uDissipation;
in vec2 vUV;
out vec4 fragColor;
void main() {
    vec2 vel = texture(uVelocity, vUV).xy;
    vec2 coord = vUV - uDt * vel * uTexelSize;
    fragColor = uDissipation * texture(uSource, coord);
}`;

const DIVERGENCE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
in vec2 vUV;
out vec4 fragColor;
void main() {
    float L = texture(uVelocity, vUV - vec2(uTexelSize.x, 0.0)).x;
    float R = texture(uVelocity, vUV + vec2(uTexelSize.x, 0.0)).x;
    float B = texture(uVelocity, vUV - vec2(0.0, uTexelSize.y)).y;
    float T = texture(uVelocity, vUV + vec2(0.0, uTexelSize.y)).y;
    float div = 0.5 * (R - L + T - B);
    fragColor = vec4(div, 0.0, 0.0, 1.0);
}`;

const PRESSURE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexelSize;
in vec2 vUV;
out vec4 fragColor;
void main() {
    float L = texture(uPressure, vUV - vec2(uTexelSize.x, 0.0)).x;
    float R = texture(uPressure, vUV + vec2(uTexelSize.x, 0.0)).x;
    float B = texture(uPressure, vUV - vec2(0.0, uTexelSize.y)).x;
    float T = texture(uPressure, vUV + vec2(0.0, uTexelSize.y)).x;
    float div = texture(uDivergence, vUV).x;
    float p = (L + R + B + T - div) * 0.25;
    fragColor = vec4(p, 0.0, 0.0, 1.0);
}`;

const GRADIENT_SUB_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
in vec2 vUV;
out vec4 fragColor;
void main() {
    float L = texture(uPressure, vUV - vec2(uTexelSize.x, 0.0)).x;
    float R = texture(uPressure, vUV + vec2(uTexelSize.x, 0.0)).x;
    float B = texture(uPressure, vUV - vec2(0.0, uTexelSize.y)).x;
    float T = texture(uPressure, vUV + vec2(0.0, uTexelSize.y)).x;
    vec2 vel = texture(uVelocity, vUV).xy;
    vel -= vec2(R - L, T - B) * 0.5;
    fragColor = vec4(vel, 0.0, 1.0);
}`;

const SPLAT_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTarget;
uniform vec2 uPoint;
uniform vec3 uColor;
uniform float uRadius;
uniform float uAspect;
in vec2 vUV;
out vec4 fragColor;
void main() {
    vec2 d = vUV - uPoint;
    d.x *= uAspect;
    float dist = dot(d, d);
    float strength = exp(-dist / uRadius);
    vec4 base = texture(uTarget, vUV);
    fragColor = vec4(base.rgb + uColor * strength, 1.0);
}`;

const BLOOM_EXTRACT_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTexture;
uniform float uThreshold;
in vec2 vUV;
out vec4 fragColor;
void main() {
    vec3 c = texture(uTexture, vUV).rgb;
    float brightness = dot(c, vec3(0.2126, 0.7152, 0.0722));
    if (brightness > uThreshold) fragColor = vec4(c, 1.0);
    else fragColor = vec4(0.0, 0.0, 0.0, 1.0);
}`;

const BLUR_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uTexelSize;
uniform vec2 uDirection;
in vec2 vUV;
out vec4 fragColor;
void main() {
    vec2 off = uTexelSize * uDirection;
    vec3 c = texture(uTexture, vUV).rgb * 0.2270270270;
    c += texture(uTexture, vUV + off * 1.3846153846).rgb * 0.3162162162;
    c += texture(uTexture, vUV - off * 1.3846153846).rgb * 0.3162162162;
    c += texture(uTexture, vUV + off * 3.2307692308).rgb * 0.0702702703;
    c += texture(uTexture, vUV - off * 3.2307692308).rgb * 0.0702702703;
    fragColor = vec4(c, 1.0);
}`;

const BLOOM_COMPOSITE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uExposure;
uniform float uBloomIntensity;
in vec2 vUV;
out vec4 fragColor;
void main() {
    vec3 scene = texture(uScene, vUV).rgb;
    vec3 bloom = texture(uBloom, vUV).rgb;
    vec3 result = scene + bloom * uBloomIntensity;
    // Tone mapping
    result = vec3(1.0) - exp(-result * uExposure);
    // Gamma correction
    result = pow(result, vec3(1.0 / 2.2));
    fragColor = vec4(result, 1.0);
}`;


const PARTICLE_UPDATE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uParticles;
uniform sampler2D uVelocity;
uniform float uDt;
in vec2 vUV;
out vec4 fragColor;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void main() {
    vec4 pData = texture(uParticles, vUV);
    vec2 pos = pData.xy;
    vec2 vel = texture(uVelocity, pos).xy;
    pos += vel * uDt * 0.5;

    if (pos.x < 0.0 || pos.x > 1.0 || pos.y < 0.0 || pos.y > 1.0 || hash(pos + uDt) < 0.005) {
        pos = vec2(hash(vUV + uDt), hash(vUV * 1.3 + uDt));
    }

    fragColor = vec4(pos, 0.0, 1.0);
}`;

const PARTICLE_DRAW_VERT = `#version 300 es
precision highp float;
uniform sampler2D uParticles;
uniform int uRes;
void main() {
    int x = gl_VertexID % uRes;
    int y = gl_VertexID / uRes;
    vec2 uv = (vec2(x, y) + 0.5) / vec2(uRes);
    vec2 pos = texture(uParticles, uv).xy;
    gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
    gl_PointSize = 1.2;
}`;

const PARTICLE_DRAW_FRAG = `#version 300 es
precision highp float;
uniform vec3 uColor;
out vec4 fragColor;
void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    fragColor = vec4(uColor, (0.5 - d) * 2.0 * 0.35);
}`;

const DISPLAY_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTexture;
in vec2 vUV;
out vec4 fragColor;
void main() {
    fragColor = texture(uTexture, vUV);
}`;

const POST_PROCESS_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTexture;
uniform float uVignette;
uniform float uChromatic;
uniform float uTime;
in vec2 vUV;
out vec4 fragColor;
void main() {
    vec2 center = vUV - 0.5;
    float d = length(center);
    float v = smoothstep(0.8, 0.4, d * uVignette);
    
    // Chromatic aberration
    vec2 off = vec2(uChromatic * 0.015, 0.0) * d;
    float r = texture(uTexture, vUV - off).r;
    float g = texture(uTexture, vUV).g;
    float b = texture(uTexture, vUV + off).b;
    
    vec3 c = vec3(r, g, b);
    
    // Slight noise/grain for texture
    float n = fract(sin(dot(vUV, vec2(12.9898, 78.233))) * 43758.5453);
    c += (n - 0.5) * 0.02;
    
    fragColor = vec4(c * v, 1.0);
}`;

const CURL_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
in vec2 vUV;
out vec4 fragColor;
void main() {
    float L = texture(uVelocity, vUV - vec2(uTexelSize.x, 0.0)).y;
    float R = texture(uVelocity, vUV + vec2(uTexelSize.x, 0.0)).y;
    float B = texture(uVelocity, vUV - vec2(0.0, uTexelSize.y)).x;
    float T = texture(uVelocity, vUV + vec2(0.0, uTexelSize.y)).x;
    fragColor = vec4(R - L - T + B, 0.0, 0.0, 1.0);
}`;

const VORTICITY_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2 uTexelSize;
uniform float uCurlAmount;
uniform float uDt;
in vec2 vUV;
out vec4 fragColor;
void main() {
    float L = texture(uCurl, vUV - vec2(uTexelSize.x, 0.0)).x;
    float R = texture(uCurl, vUV + vec2(uTexelSize.x, 0.0)).x;
    float B = texture(uCurl, vUV - vec2(0.0, uTexelSize.y)).x;
    float T = texture(uCurl, vUV + vec2(0.0, uTexelSize.y)).x;
    float C = texture(uCurl, vUV).x;
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    float len = max(length(force), 1e-5);
    force = force / len * uCurlAmount * C;
    vec2 vel = texture(uVelocity, vUV).xy + force * uDt;
    fragColor = vec4(vel, 0.0, 1.0);
}`;

const DISPLAY_VEL_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTexture;
in vec2 vUV;
out vec4 fragColor;
void main() {
    vec2 v = texture(uTexture, vUV).xy;
    float mag = length(v) * 5.0;
    vec3 c = vec3(
        0.5 + 0.5 * cos(mag * 3.1 + 0.0),
        0.5 + 0.5 * cos(mag * 3.1 + 2.1),
        0.5 + 0.5 * cos(mag * 3.1 + 4.2)
    ) * mag;
    fragColor = vec4(c, 1.0);
}`;

const DISPLAY_PRESSURE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTexture;
in vec2 vUV;
out vec4 fragColor;
void main() {
    float p = texture(uTexture, vUV).x;
    vec3 c = vec3(
        max(0.0, p) * 3.0,
        abs(p) * 1.5,
        max(0.0, -p) * 3.0
    );
    fragColor = vec4(c, 1.0);
}`;

const CLEAR_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTexture;
uniform float uValue;
in vec2 vUV;
out vec4 fragColor;
void main() {
    fragColor = uValue * texture(uTexture, vUV);
}`;

// ══════════════════════════════════════════════
// FLUID SIMULATION
// ══════════════════════════════════════════════
class FluidSim {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.gl = getWebGL(this.canvas);
        if (!this.gl) return;

        this.simW = 256;
        this.simH = 256;
        this.dyeW = 1024;
        this.dyeH = 1024;

        this.config = {
            dyeColor: [1, 0.27, 0.27],
            brushSize: 0.002,
            viscosity: 0,
            curl: 35,
            pressureIter: 40,
            dissipation: 0.97,
            velocityDissipation: 0.98,
            displayMode: 'dye',
            rainbowMode: false,
            bloom: true,
            bloomThreshold: 0.15,
            bloomIntensity: 1.0,
            exposure: 1.2,
            particles: true,
            particleColor: [1, 1, 1]
        };

        this.pointers = new Map();
        this.hue = 0;

        this.resize();
        this.initGL();
        this.bindEvents();
        this.loop();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.aspect = this.canvas.width / this.canvas.height;
    }

    initGL() {
        const gl = this.gl;

        // Fullscreen quad
        const quad = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
        this.quadBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
        gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

        // Compile programs
        this.advectProg = createProgram(gl, VERT, ADVECT_FRAG);
        this.divProg = createProgram(gl, VERT, DIVERGENCE_FRAG);
        this.pressureProg = createProgram(gl, VERT, PRESSURE_FRAG);
        this.gradSubProg = createProgram(gl, VERT, GRADIENT_SUB_FRAG);
        this.splatProg = createProgram(gl, VERT, SPLAT_FRAG);
        this.curlProg = createProgram(gl, VERT, CURL_FRAG);
        this.vortProg = createProgram(gl, VERT, VORTICITY_FRAG);
        this.displayProg = createProgram(gl, VERT, DISPLAY_FRAG);
        this.displayVelProg = createProgram(gl, VERT, DISPLAY_VEL_FRAG);
        this.displayPresProg = createProgram(gl, VERT, DISPLAY_PRESSURE_FRAG);
        this.clearProg = createProgram(gl, VERT, CLEAR_FRAG);

        // Bloom programs
        this.bloomExtractProg = createProgram(gl, VERT, BLOOM_EXTRACT_FRAG);
        this.blurProg = createProgram(gl, VERT, BLUR_FRAG);
        this.bloomCompositeProg = createProgram(gl, VERT, BLOOM_COMPOSITE_FRAG);
        this.postProg = createProgram(gl, VERT, POST_PROCESS_FRAG);

        // Create framebuffer objects (double-buffered)
        this.velocity = this.createDoubleFBO(this.simW, this.simH, gl.RG32F, gl.RG, gl.FLOAT);
        this.pressure = this.createDoubleFBO(this.simW, this.simH, gl.R32F, gl.RED, gl.FLOAT);
        this.dye = this.createDoubleFBO(this.dyeW, this.dyeH, gl.RGBA32F, gl.RGBA, gl.FLOAT);
        this.divergence = this.createFBO(this.simW, this.simH, gl.R32F, gl.RED, gl.FLOAT);
        this.curl = this.createFBO(this.simW, this.simH, gl.R32F, gl.RED, gl.FLOAT);

        // Bloom FBOs (lower res)
        this.bloomW = this.dyeW / 4;
        this.bloomH = this.dyeH / 4;
        this.bloomExtract = this.createFBO(this.bloomW, this.bloomH, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
        this.blur1 = this.createFBO(this.bloomW, this.bloomH, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
        this.blur2 = this.createFBO(this.bloomW, this.bloomH, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);
        
        // Final composite FBO for post-processing
        this.finalScene = this.createFBO(this.dyeW, this.dyeH, gl.RGBA32F, gl.RGBA, gl.FLOAT);

        // Particle system
        this.particleRes = 512;
        this.particles = this.createDoubleFBO(this.particleRes, this.particleRes, gl.RGBA32F, gl.RGBA, gl.FLOAT);
        this.particleProg = createProgram(gl, VERT, PARTICLE_UPDATE_FRAG);
        this.particleDrawProg = createProgram(gl, PARTICLE_DRAW_VERT, PARTICLE_DRAW_FRAG);
        
        this.initParticles();
    }

    initParticles() {
        const gl = this.gl;
        const res = this.particleRes;
        const data = new Float32Array(res * res * 4);
        for (let i = 0; i < res * res; i++) {
            data[i * 4] = Math.random();
            data[i * 4 + 1] = Math.random();
            data[i * 4 + 2] = 0;
            data[i * 4 + 3] = 1;
        }
        gl.bindTexture(gl.TEXTURE_2D, this.particles.read.tex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, res, res, gl.RGBA, gl.FLOAT, data);
    }

    createFBO(w, h, internalFormat, format, type) {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return { fbo, tex, w, h };
    }

    createDoubleFBO(w, h, internalFormat, format, type) {
        return {
            read: this.createFBO(w, h, internalFormat, format, type),
            write: this.createFBO(w, h, internalFormat, format, type),
            swap() { const tmp = this.read; this.read = this.write; this.write = tmp; }
        };
    }

    blit(target) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(0);
        if (target) {
            gl.viewport(0, 0, target.w, target.h);
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        } else {
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    useProgram(prog) {
        this.gl.useProgram(prog.program);
        return prog.uniforms;
    }

    bindEvents() {
        this.canvas.addEventListener('pointerdown', e => {
            this.pointers.set(e.pointerId, {
                x: e.clientX / this.canvas.width,
                y: 1 - e.clientY / this.canvas.height,
                dx: 0,
                dy: 0,
                down: true
            });
        });

        this.canvas.addEventListener('pointermove', e => {
            let p = this.pointers.get(e.pointerId);
            if (!p) return;
            const nx = e.clientX / this.canvas.width;
            const ny = 1 - e.clientY / this.canvas.height;
            p.dx = (nx - p.x) * 50;
            p.dy = (ny - p.y) * 50;
            p.x = nx;
            p.y = ny;
        });

        this.canvas.addEventListener('pointerup', e => {
            this.pointers.delete(e.pointerId);
        });

        this.canvas.addEventListener('pointerleave', e => {
            this.pointers.delete(e.pointerId);
        });

        // Touch
        this.canvas.addEventListener('touchstart', e => { e.preventDefault(); }, { passive: false });
        this.canvas.addEventListener('touchmove', e => { e.preventDefault(); }, { passive: false });

        window.addEventListener('resize', () => this.resize());

        // Controls
        document.getElementById('dye-color').addEventListener('input', e => {
            const hex = e.target.value;
            this.config.dyeColor = [
                parseInt(hex.slice(1,3), 16) / 255,
                parseInt(hex.slice(3,5), 16) / 255,
                parseInt(hex.slice(5,7), 16) / 255
            ];
            this.config.rainbowMode = false;
        });

        document.getElementById('brush-size').addEventListener('input', e => {
            this.config.brushSize = e.target.value / 20000;
        });

        document.getElementById('viscosity').addEventListener('input', e => {
            this.config.viscosity = e.target.value / 100;
        });

        document.getElementById('curl').addEventListener('input', e => {
            this.config.curl = parseFloat(e.target.value);
        });

        document.getElementById('display-mode').addEventListener('change', e => {
            this.config.displayMode = e.target.value;
        });

        document.getElementById('presets').addEventListener('change', e => {
            this.applyPreset(e.target.value);
        });

        document.getElementById('btn-clear').addEventListener('click', () => this.clearAll());
        document.getElementById('btn-rainbow').addEventListener('click', () => {
            this.config.rainbowMode = !this.config.rainbowMode;
        });
    }

    applyPreset(id) {
        const p = {
            default: { color: "#ff4444", curl: 35, dissipation: 0.97, bloom: 0.15, particles: [1, 1, 1] },
            electric: { color: "#00ffff", curl: 60, dissipation: 0.94, bloom: 0.05, particles: [0, 1, 1] },
            ink: { color: "#ffffff", curl: 20, dissipation: 0.99, bloom: 0.8, particles: [0.2, 0.2, 0.2] },
            nebula: { color: "#aa00ff", curl: 45, dissipation: 0.98, bloom: 0.1, particles: [0.8, 0.4, 1] }
        }[id];

        if (!p) return;
        
        document.getElementById('dye-color').value = p.color;
        this.config.dyeColor = [
            parseInt(p.color.slice(1,3), 16) / 255,
            parseInt(p.color.slice(3,5), 16) / 255,
            parseInt(p.color.slice(5,7), 16) / 255
        ];
        this.config.curl = p.curl;
        document.getElementById('curl').value = p.curl;
        this.config.dissipation = p.dissipation;
        this.config.bloomThreshold = p.bloom;
        this.config.particleColor = p.particles;
        this.config.exposure = p.exposure || 1.2;
        this.config.rainbowMode = false;
        this.clearAll(); // Refresh for new preset
    }

    clearAll() {
        const gl = this.gl;
        const u = this.useProgram(this.clearProg);
        gl.uniform1f(u.uValue, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.tex);
        gl.uniform1i(u.uTexture, 0);
        this.blit(this.velocity.write);
        this.velocity.swap();

        gl.bindTexture(gl.TEXTURE_2D, this.dye.read.tex);
        this.blit(this.dye.write);
        this.dye.swap();

        gl.bindTexture(gl.TEXTURE_2D, this.pressure.read.tex);
        this.blit(this.pressure.write);
        this.pressure.swap();
    }

    splat(x, y, dx, dy, color) {
        const gl = this.gl;

        // Velocity splat
        let u = this.useProgram(this.splatProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.tex);
        gl.uniform1i(u.uTarget, 0);
        gl.uniform2f(u.uPoint, x, y);
        gl.uniform3f(u.uColor, dx * 500, dy * 500, 0); // FURTHER INCREASED
        gl.uniform1f(u.uRadius, this.config.brushSize * 2.0); // Larger brush for velocity
        gl.uniform1f(u.uAspect, this.aspect);
        this.blit(this.velocity.write);
        this.velocity.swap();

        // Dye splat
        u = this.useProgram(this.splatProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.dye.read.tex);
        gl.uniform1i(u.uTarget, 0);
        gl.uniform2f(u.uPoint, x, y);
        gl.uniform3f(u.uColor, color[0], color[1], color[2]);
        gl.uniform1f(u.uRadius, this.config.brushSize);
        gl.uniform1f(u.uAspect, this.aspect);
        this.blit(this.dye.write);
        this.dye.swap();
    }

    step(dt) {
        const gl = this.gl;
        const ts = [1 / this.simW, 1 / this.simH];
        const dyeTs = [1 / this.dyeW, 1 / this.dyeH];

        // 1. Curl
        let u = this.useProgram(this.curlProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.tex);
        gl.uniform1i(u.uVelocity, 0);
        gl.uniform2f(u.uTexelSize, ts[0], ts[1]);
        this.blit(this.curl);

        // 2. Vorticity confinement
        if (this.config.curl > 0) {
            u = this.useProgram(this.vortProg);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.tex);
            gl.uniform1i(u.uVelocity, 0);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.curl.tex);
            gl.uniform1i(u.uCurl, 1);
            gl.uniform2f(u.uTexelSize, ts[0], ts[1]);
            gl.uniform1f(u.uCurlAmount, this.config.curl);
            gl.uniform1f(u.uDt, dt);
            this.blit(this.velocity.write);
            this.velocity.swap();
        }

        // 3. Advect velocity
        u = this.useProgram(this.advectProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.tex);
        gl.uniform1i(u.uVelocity, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.tex);
        gl.uniform1i(u.uSource, 1);
        gl.uniform2f(u.uTexelSize, ts[0], ts[1]);
        gl.uniform1f(u.uDt, dt);
        gl.uniform1f(u.uDissipation, this.config.velocityDissipation);
        this.blit(this.velocity.write);
        this.velocity.swap();

        // 4. Advect dye
        u = this.useProgram(this.advectProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.tex);
        gl.uniform1i(u.uVelocity, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.dye.read.tex);
        gl.uniform1i(u.uSource, 1);
        gl.uniform2f(u.uTexelSize, dyeTs[0], dyeTs[1]);
        gl.uniform1f(u.uDt, dt);
        gl.uniform1f(u.uDissipation, this.config.dissipation);
        this.blit(this.dye.write);
        this.dye.swap();

        // 5. Divergence
        u = this.useProgram(this.divProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.tex);
        gl.uniform1i(u.uVelocity, 0);
        gl.uniform2f(u.uTexelSize, ts[0], ts[1]);
        this.blit(this.divergence);

        // 6. Clear pressure
        u = this.useProgram(this.clearProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.pressure.read.tex);
        gl.uniform1i(u.uTexture, 0);
        gl.uniform1f(u.uValue, 0.8);
        this.blit(this.pressure.write);
        this.pressure.swap();

        // 7. Pressure solve (Jacobi iterations)
        u = this.useProgram(this.pressureProg);
        gl.uniform2f(u.uTexelSize, ts[0], ts[1]);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.divergence.tex);
        gl.uniform1i(u.uDivergence, 1);
        for (let i = 0; i < this.config.pressureIter; i++) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.pressure.read.tex);
            gl.uniform1i(u.uPressure, 0);
            this.blit(this.pressure.write);
            this.pressure.swap();
        }

        // 8. Subtract pressure gradient from velocity
        u = this.useProgram(this.gradSubProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.pressure.read.tex);
        gl.uniform1i(u.uPressure, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.tex);
        gl.uniform1i(u.uVelocity, 1);
        gl.uniform2f(u.uTexelSize, ts[0], ts[1]);
        this.blit(this.velocity.write);
        this.velocity.swap();

        // 9. Particles
        if (this.config.particles) {
            u = this.useProgram(this.particleProg);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.particles.read.tex);
            gl.uniform1i(u.uParticles, 0);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.tex);
            gl.uniform1i(u.uVelocity, 1);
            gl.uniform1f(u.uDt, dt);
            this.blit(this.particles.write);
            this.particles.swap();
        }

        // Flow Field (Auto Splatter)
        if (Math.random() < 0.02) {
            const x = Math.random();
            const y = Math.random();
            const dx = (Math.random() - 0.5) * 0.1;
            const dy = (Math.random() - 0.5) * 0.1;
            const color = this.config.rainbowMode ? hslToRgb(Math.random(), 0.8, 0.6) : this.config.dyeColor;
            this.splat(x, y, dx, dy, color);
        }
    }

    render() {
        const gl = this.gl;

        if (this.config.bloom && this.config.displayMode === 'dye') {
            // 1. Extract bright parts
            let u = this.useProgram(this.bloomExtractProg);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.dye.read.tex);
            gl.uniform1i(u.uTexture, 0);
            gl.uniform1f(u.uThreshold, this.config.bloomThreshold);
            this.blit(this.bloomExtract);

            // 2. Blur horizontally
            u = this.useProgram(this.blurProg);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.bloomExtract.tex);
            gl.uniform1i(u.uTexture, 0);
            gl.uniform2f(u.uTexelSize, 1 / this.bloomW, 1 / this.bloomH);
            gl.uniform2f(u.uDirection, 1, 0);
            this.blit(this.blur1);

            // 3. Blur vertically
            gl.bindTexture(gl.TEXTURE_2D, this.blur1.tex);
            gl.uniform2f(u.uDirection, 0, 1);
            this.blit(this.blur2);

            // 4. Composite
            u = this.useProgram(this.bloomCompositeProg);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.dye.read.tex);
            gl.uniform1i(u.uScene, 0);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.blur2.tex);
            gl.uniform1i(u.uBloom, 1);
            gl.uniform1f(u.uExposure, this.config.exposure);
            gl.uniform1f(u.uBloomIntensity, this.config.bloomIntensity);
            this.blit(this.finalScene);

            // 5. Final Post-Process Pass
            u = this.useProgram(this.postProg);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.finalScene.tex);
            gl.uniform1i(u.uTexture, 0);
            gl.uniform1f(u.uVignette, 1.2);
            gl.uniform1f(u.uChromatic, 0.5);
            gl.uniform1f(u.uTime, this.time);
            this.blit(null);

            if (this.config.particles) this.renderParticles();
        } else {
            let prog;
            if (this.config.displayMode === 'velocity') prog = this.displayVelProg;
            else if (this.config.displayMode === 'pressure') prog = this.displayPresProg;
            else prog = this.displayProg;

            const u = this.useProgram(prog);
            gl.activeTexture(gl.TEXTURE0);
            if (this.config.displayMode === 'velocity') {
                gl.bindTexture(gl.TEXTURE_2D, this.velocity.read.tex);
            } else if (this.config.displayMode === 'pressure') {
                gl.bindTexture(gl.TEXTURE_2D, this.pressure.read.tex);
            } else {
                gl.bindTexture(gl.TEXTURE_2D, this.dye.read.tex);
            }
            gl.uniform1i(u.uTexture, 0);
            this.blit(null);

            if (this.config.particles) this.renderParticles();
        }
    }

    renderParticles() {
        const gl = this.gl;
        const u = this.useProgram(this.particleDrawProg);
        // Particles draw to the finalScene before post-processing
        gl.viewport(0, 0, this.finalScene.w, this.finalScene.h);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.finalScene.fbo);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.particles.read.tex);
        gl.uniform1i(u.uParticles, 0);
        gl.uniform1i(u.uRes, this.particleRes);
        gl.uniform3f(u.uColor, this.config.particleColor[0], this.config.particleColor[1], this.config.particleColor[2]);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive blend for glow
        gl.drawArrays(gl.POINTS, 0, this.particleRes * this.particleRes);
        gl.disable(gl.BLEND);
    }

    loop(time) {
        const dt = 0.016;
        this.time = time * 0.001;

        // Pointer input
        this.pointers.forEach((p, id) => {
            if (p.down) {
                let color = this.config.dyeColor;
                if (this.config.rainbowMode) {
                    this.hue += 0.008;
                    color = hslToRgb((this.hue + id * 0.1) % 1, 0.9, 0.7);
                }
                this.splat(p.x, p.y, p.dx, p.dy, color);
                p.dx *= 0.85;
                p.dy *= 0.85;
            }
        });

        this.step(dt);
        this.render();

        requestAnimationFrame(() => this.loop());
    }
}

// HSL to RGB helper
function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [r, g, b];
}

// ── BOOT ──
window.onload = () => new FluidSim();
