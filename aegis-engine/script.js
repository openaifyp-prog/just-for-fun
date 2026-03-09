/* ============================================
   GRIMHOLD — Dark Fantasy Tower Defense
   3-Level Campaign with unique paths & enemies
   ============================================ */

const TILE = 40;
const WAVES_PER_LEVEL = 30;

// ── LEVEL CONFIGURATIONS ──
const LEVELS = [
    {
        name: 'Greenwood Pass',
        desc: 'The horde marches through the forest valleys. Hold the pass!',
        bg: '#2a351a', pathColor: '#5a4a32', pathInner: '#4a3a22',
        grassAlt: 'rgba(0,50,0,0.04)',
        startGold: 300, startLives: 20,
        availableTowers: ['archer', 'mage', 'frost', 'cannon'],
        enemyPool: ['grunt', 'runner', 'shield', 'healer'],
        miniboss: 'miniboss', boss: 'boss',
        buildPaths: function(cols, rows) {
            const midY = Math.floor(rows / 2);
            const topY = 3, botY = rows - 5;
            const pathA = [];
            for (let x = 0; x <= 3; x++) pathA.push({x, y: midY});
            for (let y = midY - 1; y >= topY; y--) pathA.push({x: 3, y});
            for (let x = 4; x <= cols - 4; x++) pathA.push({x, y: topY});
            for (let y = topY + 1; y <= midY; y++) pathA.push({x: cols - 4, y});
            for (let x = cols - 3; x < cols; x++) pathA.push({x, y: midY});

            const pathB = [];
            for (let x = 0; x <= 3; x++) pathB.push({x, y: midY});
            for (let y = midY + 1; y <= botY; y++) pathB.push({x: 3, y});
            for (let x = 4; x <= cols - 4; x++) pathB.push({x, y: botY});
            for (let y = botY - 1; y >= midY; y--) pathB.push({x: cols - 4, y});
            for (let x = cols - 3; x < cols; x++) pathB.push({x, y: midY});
            return [pathA, pathB];
        }
    },
    {
        name: 'Ashen Wastes',
        desc: 'The undead rise from scorched earth. Necromancers raise the fallen.',
        bg: '#2a2218', pathColor: '#4a4040', pathInner: '#3a3030',
        grassAlt: 'rgba(50,30,10,0.05)',
        startGold: 400, startLives: 18,
        availableTowers: ['archer', 'mage', 'frost', 'cannon', 'poison'],
        enemyPool: ['grunt', 'runner', 'shield', 'healer', 'necro'],
        miniboss: 'bone_giant', boss: 'lich_king',
        buildPaths: function(cols, rows) {
            const midY = Math.floor(rows / 2);
            // 3-lane: top, mid, bottom
            const pathA = [];
            for (let x = 0; x <= 2; x++) pathA.push({x, y: 3});
            for (let x = 3; x <= cols - 3; x++) pathA.push({x, y: 3});
            for (let y = 4; y <= midY; y++) pathA.push({x: cols - 3, y});
            for (let x = cols - 2; x < cols; x++) pathA.push({x, y: midY});

            const pathB = [];
            for (let x = 0; x < cols; x++) pathB.push({x, y: midY});

            const pathC = [];
            for (let x = 0; x <= 2; x++) pathC.push({x, y: rows - 4});
            for (let x = 3; x <= cols - 3; x++) pathC.push({x, y: rows - 4});
            for (let y = rows - 5; y >= midY; y--) pathC.push({x: cols - 3, y});
            for (let x = cols - 2; x < cols; x++) pathC.push({x, y: midY});
            return [pathA, pathB, pathC];
        }
    },
    {
        name: 'Demon Gate',
        desc: 'At the edge of the abyss, demons pour from a burning rift.',
        bg: '#1a1010', pathColor: '#4a2a20', pathInner: '#3a1a10',
        grassAlt: 'rgba(80,10,0,0.04)',
        startGold: 500, startLives: 15,
        availableTowers: ['archer', 'mage', 'frost', 'cannon', 'poison', 'holy'],
        enemyPool: ['grunt', 'runner', 'shield', 'healer', 'necro', 'demon'],
        miniboss: 'pit_fiend', boss: 'demon_lord',
        buildPaths: function(cols, rows) {
            const midY = Math.floor(rows / 2);
            // Zigzag path
            const pathA = [];
            for (let x = 0; x <= 5; x++) pathA.push({x, y: 2});
            for (let y = 3; y <= rows - 3; y++) pathA.push({x: 5, y});
            for (let x = 6; x <= cols - 6; x++) pathA.push({x, y: rows - 3});
            for (let y = rows - 4; y >= 2; y--) pathA.push({x: cols - 6, y});
            for (let x = cols - 5; x < cols; x++) pathA.push({x, y: 2});

            const pathB = [];
            for (let x = 0; x <= 5; x++) pathB.push({x, y: rows - 3});
            for (let y = rows - 4; y >= 2; y--) pathB.push({x: 5, y});
            for (let x = 6; x <= cols - 6; x++) pathB.push({x, y: 2});
            for (let y = 3; y <= rows - 3; y++) pathB.push({x: cols - 6, y});
            for (let x = cols - 5; x < cols; x++) pathB.push({x, y: rows - 3});
            return [pathA, pathB];
        }
    }
];

// ── TOWER DEFINITIONS ──
const TOWERS = {
    archer: {
        name: 'Archer', cost: 50,
        levels: [
            { damage: 10, range: 130, rate: 18, splash: 0 },
            { damage: 18, range: 150, rate: 14, splash: 0 },
            { damage: 30, range: 170, rate: 10, splash: 0 }
        ],
        upgradeCosts: [80, 160],
        color: '#7a5c2e', accent: '#d4a843',
        ability: 'Fast single-target arrows'
    },
    mage: {
        name: 'Mage', cost: 100,
        levels: [
            { damage: 20, range: 110, rate: 50, splash: 60 },
            { damage: 35, range: 130, rate: 45, splash: 75 },
            { damage: 55, range: 150, rate: 38, splash: 90 }
        ],
        upgradeCosts: [120, 250],
        color: '#4a2040', accent: '#c0392b',
        ability: 'Area splash damage'
    },
    frost: {
        name: 'Frost', cost: 75,
        levels: [
            { damage: 5, range: 100, rate: 30, slow: 0.4, slowDur: 60 },
            { damage: 10, range: 120, rate: 25, slow: 0.5, slowDur: 90 },
            { damage: 15, range: 140, rate: 20, slow: 0.6, slowDur: 120 }
        ],
        upgradeCosts: [100, 200],
        color: '#2a4a5a', accent: '#6bb5d4',
        ability: 'Slows enemies on hit'
    },
    cannon: {
        name: 'Cannon', cost: 150,
        levels: [
            { damage: 45, range: 160, rate: 70, splash: 50 },
            { damage: 80, range: 180, rate: 60, splash: 60 },
            { damage: 130, range: 200, rate: 50, splash: 75 }
        ],
        upgradeCosts: [200, 400],
        color: '#3d3328', accent: '#f0c75e',
        ability: 'Heavy AoE bombardment'
    },
    poison: {
        name: 'Poison', cost: 125, minLevel: 2,
        levels: [
            { damage: 3, range: 110, rate: 35, dot: 4, dotDur: 90 },
            { damage: 6, range: 130, rate: 30, dot: 7, dotDur: 120 },
            { damage: 10, range: 150, rate: 25, dot: 12, dotDur: 150 }
        ],
        upgradeCosts: [150, 300],
        color: '#2a4a2a', accent: '#4caf50',
        ability: 'Poisons enemies over time'
    },
    holy: {
        name: 'Holy', cost: 200, minLevel: 3,
        levels: [
            { damage: 25, range: 140, rate: 45, bonus: 2.0 },
            { damage: 40, range: 160, rate: 38, bonus: 2.5 },
            { damage: 60, range: 180, rate: 30, bonus: 3.0 }
        ],
        upgradeCosts: [250, 500],
        color: '#5a5a2a', accent: '#ffd700',
        ability: 'Double damage vs undead & demons'
    }
};

// ── ENEMY DEFINITIONS ──
const ENEMIES = {
    grunt:      { hp: 50,   speed: 1.0, reward: 12, size: 8,  color: '#5a3a2a', name: 'Grunt' },
    runner:     { hp: 25,   speed: 2.2, reward: 8,  size: 6,  color: '#8b5e3c', name: 'Runner' },
    shield:     { hp: 120,  speed: 0.8, reward: 20, size: 10, color: '#4a4a5a', name: 'Shield',   armor: 0.3 },
    healer:     { hp: 40,   speed: 1.0, reward: 25, size: 7,  color: '#2a5a2a', name: 'Healer',   healRadius: 60, healAmt: 0.3 },
    necro:      { hp: 60,   speed: 0.9, reward: 30, size: 8,  color: '#4a2a4a', name: 'Necro',    undead: true },
    demon:      { hp: 90,   speed: 1.3, reward: 35, size: 9,  color: '#6a1a0a', name: 'Demon',    demon: true },
    miniboss:   { hp: 400,  speed: 0.6, reward: 80, size: 16, color: '#6b1a1a', name: 'Warlord' },
    boss:       { hp: 1200, speed: 0.4, reward: 250,size: 22, color: '#2a0a0a', name: 'Dark Lord' },
    bone_giant: { hp: 600,  speed: 0.5, reward: 100,size: 18, color: '#5a5a4a', name: 'Bone Giant',  undead: true },
    lich_king:  { hp: 1800, speed: 0.35,reward: 350,size: 24, color: '#3a3a5a', name: 'Lich King',   undead: true },
    pit_fiend:  { hp: 800,  speed: 0.55,reward: 120,size: 18, color: '#5a1a0a', name: 'Pit Fiend',   demon: true },
    demon_lord: { hp: 2500, speed: 0.3, reward: 500,size: 26, color: '#3a0a0a', name: 'Demon Lord',  demon: true }
};

// ══════════════════════════════════════════════
// GAME CLASS
// ══════════════════════════════════════════════
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        this.currentLevel = 0;
        this.running = false;
        this.selectedTower = null;
        this.selectedPlaced = null;
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];

        this.bindEvents();
        this.loadLevel(0);
    }

    resize() {
        const p = this.canvas.parentElement;
        this.width = p.clientWidth;
        this.height = p.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.cols = Math.floor(this.width / TILE);
        this.rows = Math.floor(this.height / TILE);
    }

    loadLevel(idx) {
        const cfg = LEVELS[idx];
        this.currentLevel = idx;
        this.gold = cfg.startGold;
        this.lives = cfg.startLives;
        this.score = 0;
        this.wave = 0;
        this.waveActive = false;
        this.spawning = false;
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.selectedTower = null;
        this.selectedPlaced = null;

        this.levelCfg = cfg;
        this.paths = cfg.buildPaths(this.cols, this.rows);
        this.pathTiles = new Set();
        this.paths.forEach(p => p.forEach(t => this.pathTiles.add(`${t.x},${t.y}`)));
        this.slots = this.buildSlots();
        this.slotMap = {};
        this.slots.forEach(s => { this.slotMap[`${s.x},${s.y}`] = s; });

        this.spawnTile = this.paths[0][0];
        this.castleTile = this.paths[0][this.paths[0].length - 1];

        // Update tower shop visibility
        this.updateShopVisibility();
        this.updateHUD();

        // Show level intro
        document.getElementById('level-name').textContent = cfg.name;
        document.getElementById('level-desc').textContent = cfg.desc;
        document.getElementById('level-num').textContent = `Level ${idx + 1} of 3`;
        document.getElementById('level-screen').classList.add('active');
    }

    updateShopVisibility() {
        const lvl = this.currentLevel + 1; // 1-indexed for display
        document.querySelectorAll('.tower-btn').forEach(btn => {
            const type = btn.dataset.tower;
            const data = TOWERS[type];
            const minLvl = data.minLevel || 1;
            if (minLvl > lvl) {
                btn.style.display = 'none';
            } else {
                btn.style.display = 'flex';
                if (minLvl === lvl && minLvl > 1) {
                    btn.classList.add('new-unlock');
                    setTimeout(() => btn.classList.remove('new-unlock'), 3000);
                }
            }
        });
    }

    buildSlots() {
        const slotSet = new Set();
        const slots = [];
        this.paths.forEach(path => {
            path.forEach(t => {
                [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dx, dy]) => {
                    const nx = t.x + dx, ny = t.y + dy;
                    const key = `${nx},${ny}`;
                    if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows &&
                        !this.pathTiles.has(key) && !slotSet.has(key)) {
                        slotSet.add(key);
                        slots.push({ x: nx, y: ny, tower: null });
                    }
                });
            });
        });
        return slots;
    }

    bindEvents() {
        this.canvas.addEventListener('click', e => this.onClick(e));
        this.canvas.addEventListener('contextmenu', e => { e.preventDefault(); this.deselectAll(); });

        document.querySelectorAll('.tower-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.deselectAll();
                document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedTower = btn.dataset.tower;
            });
        });

        document.getElementById('start-btn').addEventListener('click', () => {
            document.getElementById('start-screen').classList.remove('active');
            this.loadLevel(0);
        });

        document.getElementById('level-start-btn').addEventListener('click', () => {
            document.getElementById('level-screen').classList.remove('active');
            if (!this.running) { this.running = true; this.loop(); }
        });

        document.getElementById('next-wave-btn').addEventListener('click', () => {
            if (!this.waveActive) this.startWave();
        });

        document.getElementById('upgrade-btn').addEventListener('click', () => this.upgradeTower());
        document.getElementById('sell-btn').addEventListener('click', () => this.sellTower());
        window.addEventListener('resize', () => this.resize());
    }

    deselectAll() {
        this.selectedTower = null;
        this.selectedPlaced = null;
        document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('tower-info').classList.add('hidden');
    }

    onClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const tx = Math.floor((e.clientX - rect.left) / TILE);
        const ty = Math.floor((e.clientY - rect.top) / TILE);
        const key = `${tx},${ty}`;

        const existing = this.towers.find(t => t.tx === tx && t.ty === ty);
        if (existing) {
            this.selectedTower = null;
            document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('active'));
            this.selectedPlaced = existing;
            this.showTowerInfo(existing);
            return;
        }

        if (this.selectedTower && this.slotMap[key] && !this.slotMap[key].tower) {
            const data = TOWERS[this.selectedTower];
            if (this.gold < data.cost) return;
            this.gold -= data.cost;
            const tower = new Tower(tx, ty, this.selectedTower, this);
            this.towers.push(tower);
            this.slotMap[key].tower = tower;
            this.updateHUD();
            for (let i = 0; i < 8; i++) this.particles.push(new Particle(tower.x, tower.y, data.accent, 3));
            return;
        }

        this.deselectAll();
    }

    showTowerInfo(tower) {
        const panel = document.getElementById('tower-info');
        panel.classList.remove('hidden');
        const data = TOWERS[tower.type];
        const lvl = data.levels[tower.level];
        document.getElementById('info-name').textContent = data.name;
        document.getElementById('info-level').textContent = `Lv${tower.level + 1}`;
        document.getElementById('info-dmg').textContent = lvl.damage;
        document.getElementById('info-rng').textContent = lvl.range;
        document.getElementById('info-spd').textContent = lvl.rate;
        const upgradeBtn = document.getElementById('upgrade-btn');
        if (tower.level < 2) {
            document.getElementById('upgrade-cost').textContent = data.upgradeCosts[tower.level];
            upgradeBtn.disabled = false;
        } else {
            document.getElementById('upgrade-cost').textContent = 'MAX';
            upgradeBtn.disabled = true;
        }
        document.getElementById('sell-value').textContent = tower.sellValue();
    }

    upgradeTower() {
        if (!this.selectedPlaced) return;
        const tower = this.selectedPlaced;
        const data = TOWERS[tower.type];
        if (tower.level >= 2) return;
        const cost = data.upgradeCosts[tower.level];
        if (this.gold < cost) return;
        this.gold -= cost;
        tower.level++;
        tower.applyLevel();
        this.updateHUD();
        this.showTowerInfo(tower);
        for (let i = 0; i < 12; i++) this.particles.push(new Particle(tower.x, tower.y, '#f0c75e', 4));
    }

    sellTower() {
        if (!this.selectedPlaced) return;
        const tower = this.selectedPlaced;
        this.gold += tower.sellValue();
        const key = `${tower.tx},${tower.ty}`;
        if (this.slotMap[key]) this.slotMap[key].tower = null;
        this.towers = this.towers.filter(t => t !== tower);
        this.deselectAll();
        this.updateHUD();
    }

    startWave() {
        this.wave++;
        this.waveActive = true;
        this.spawning = true;
        this.updateHUD();

        const cfg = this.levelCfg;
        const isBossWave = this.wave % 10 === 0;
        const isMiniBossWave = this.wave % 5 === 0 && !isBossWave;
        const baseCount = 6 + this.wave * 3;
        const queue = [];

        for (let i = 0; i < baseCount; i++) {
            const pool = cfg.enemyPool;
            const r = Math.random();
            let type = pool[0]; // default
            if (this.wave >= 3 && pool.length > 1 && r < 0.25) type = pool[1];
            if (this.wave >= 6 && pool.length > 2 && r < 0.15) type = pool[2];
            if (this.wave >= 10 && pool.length > 3 && r < 0.10) type = pool[3];
            if (this.wave >= 15 && pool.length > 4 && r < 0.08) type = pool[4];
            queue.push(type);
        }

        if (isMiniBossWave) queue.push(cfg.miniboss);
        if (isBossWave) queue.push(cfg.boss);

        let idx = 0;
        const interval = setInterval(() => {
            if (idx >= queue.length) {
                clearInterval(interval);
                this.spawning = false;
                return;
            }
            const pathIdx = Math.floor(Math.random() * this.paths.length);
            this.enemies.push(new Enemy(queue[idx], this.wave, this, pathIdx));
            idx++;
        }, Math.max(250, 450 - this.wave * 5));
    }

    updateHUD() {
        document.getElementById('gold-count').textContent = this.gold;
        document.getElementById('wave-number').textContent = this.wave ? `${this.wave}/${WAVES_PER_LEVEL}` : '—';
        document.getElementById('lives-count').textContent = this.lives;
        document.getElementById('score-count').textContent = this.score;
    }

    loop() {
        if (!this.running) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    update() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update();

            if (e.hp <= 0) {
                this.gold += e.reward;
                this.score += e.reward;
                for (let j = 0; j < 10; j++) this.particles.push(new Particle(e.x, e.y, e.color, 4));
                this.enemies.splice(i, 1);
                this.updateHUD();
                continue;
            }
            if (e.reachedEnd) {
                this.lives--;
                this.enemies.splice(i, 1);
                this.updateHUD();
                if (this.lives <= 0) {
                    this.running = false;
                    document.getElementById('final-wave').textContent = this.wave;
                    document.getElementById('final-score').textContent = this.score;
                    document.getElementById('final-level').textContent = this.levelCfg.name;
                    document.getElementById('game-over-screen').classList.add('active');
                }
            }
        }

        // Healer aura
        this.enemies.forEach(e => {
            if (e.healRadius) {
                this.enemies.forEach(ally => {
                    if (ally !== e && Math.hypot(e.x - ally.x, e.y - ally.y) < e.healRadius) {
                        ally.hp = Math.min(ally.maxHp, ally.hp + e.healAmt);
                    }
                });
            }
        });

        this.towers.forEach(t => t.update());

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            if (!this.projectiles[i].update()) this.projectiles.splice(i, 1);
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            if (!this.particles[i].update()) this.particles.splice(i, 1);
        }

        // Wave complete
        if (this.waveActive && !this.spawning && this.enemies.length === 0) {
            this.waveActive = false;
            this.gold += 40 + this.wave * 8;
            this.updateHUD();

            // Level complete?
            if (this.wave >= WAVES_PER_LEVEL) {
                if (this.currentLevel < LEVELS.length - 1) {
                    this.loadLevel(this.currentLevel + 1);
                } else {
                    // Victory!
                    document.getElementById('victory-score').textContent = this.score;
                    document.getElementById('victory-screen').classList.add('active');
                    this.running = false;
                }
            }
        }
    }

    // ── DOT ticks (called from Enemy) ──
    applyDot(enemy, dmgPerTick, duration) {
        enemy.dotTimer = duration;
        enemy.dotDmg = dmgPerTick;
    }

    draw() {
        const ctx = this.ctx;
        const cfg = this.levelCfg;
        ctx.clearRect(0, 0, this.width, this.height);

        // Background
        ctx.fillStyle = cfg.bg;
        ctx.fillRect(0, 0, this.width, this.height);

        // Checkerboard grass texture
        ctx.fillStyle = cfg.grassAlt;
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                if ((x + y) % 2 === 0) ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
            }
        }

        // Paths
        this.paths.forEach(path => {
            path.forEach(t => {
                ctx.fillStyle = cfg.pathColor;
                ctx.fillRect(t.x * TILE, t.y * TILE, TILE, TILE);
                ctx.fillStyle = cfg.pathInner;
                ctx.fillRect(t.x * TILE + 2, t.y * TILE + 2, TILE - 4, TILE - 4);
            });
        });

        // Tower slots
        this.slots.forEach(s => {
            if (!s.tower) {
                ctx.strokeStyle = this.selectedTower ? 'rgba(212,168,67,0.3)' : 'rgba(255,255,255,0.04)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(s.x * TILE + 4, s.y * TILE + 4, TILE - 8, TILE - 8);
                ctx.setLineDash([]);
            }
        });

        // Spawn & Castle markers
        this.drawSpawn(ctx);
        this.drawCastle(ctx);

        // Range indicator
        if (this.selectedPlaced) {
            ctx.strokeStyle = 'rgba(212,168,67,0.2)';
            ctx.fillStyle = 'rgba(212,168,67,0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.selectedPlaced.x, this.selectedPlaced.y, this.selectedPlaced.range, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
        }

        this.towers.forEach(t => t.draw(ctx));
        this.enemies.forEach(e => e.draw(ctx));
        this.projectiles.forEach(p => p.draw(ctx));
        this.particles.forEach(p => p.draw(ctx));
    }

    drawSpawn(ctx) {
        const t = this.spawnTile;
        const cx = t.x * TILE + TILE / 2, cy = t.y * TILE + TILE / 2;
        const g = ctx.createRadialGradient(cx, cy, 5, cx, cy, TILE);
        g.addColorStop(0, 'rgba(139,26,26,0.8)');
        g.addColorStop(0.5, 'rgba(139,26,26,0.3)');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, TILE, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c0392b';
        ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
    }

    drawCastle(ctx) {
        const t = this.castleTile;
        const cx = t.x * TILE + TILE / 2, cy = t.y * TILE + TILE / 2;
        ctx.fillStyle = '#5a4a3a';
        ctx.fillRect(cx - 18, cy - 22, 36, 44);
        ctx.strokeStyle = '#3d3328'; ctx.lineWidth = 2;
        ctx.strokeRect(cx - 18, cy - 22, 36, 44);
        for (let i = -1; i <= 1; i++) {
            ctx.fillStyle = '#6a5a4a';
            ctx.fillRect(cx + i * 12 - 5, cy - 28, 10, 8);
        }
        ctx.fillStyle = '#3d2818';
        ctx.beginPath();
        ctx.arc(cx, cy + 10, 8, Math.PI, 0);
        ctx.rect(cx - 8, cy + 10, 16, 12);
        ctx.fill();
    }
}

// ══════════════════════════════════════════════
// TOWER CLASS
// ══════════════════════════════════════════════
class Tower {
    constructor(tx, ty, type, game) {
        this.tx = tx; this.ty = ty;
        this.x = tx * TILE + TILE / 2;
        this.y = ty * TILE + TILE / 2;
        this.type = type;
        this.game = game;
        this.level = 0;
        this.cooldown = 0;
        this.angle = 0;
        this.totalSpent = TOWERS[type].cost;
        this.applyLevel();
    }

    applyLevel() {
        const d = TOWERS[this.type].levels[this.level];
        this.damage = d.damage;
        this.range = d.range;
        this.rate = d.rate;
        this.splash = d.splash || 0;
        this.slow = d.slow || 0;
        this.slowDur = d.slowDur || 0;
        this.dot = d.dot || 0;
        this.dotDur = d.dotDur || 0;
        this.bonus = d.bonus || 0;
    }

    sellValue() { return Math.floor(this.totalSpent * 0.6); }

    update() {
        if (this.cooldown > 0) { this.cooldown--; return; }
        let closest = null, closestDist = Infinity;
        for (const e of this.game.enemies) {
            const d = Math.hypot(this.x - e.x, this.y - e.y);
            if (d < this.range && d < closestDist) { closest = e; closestDist = d; }
        }
        if (closest) {
            this.angle = Math.atan2(closest.y - this.y, closest.x - this.x);
            this.game.projectiles.push(new Projectile(this.x, this.y, closest, this));
            this.cooldown = this.rate;
            this.game.particles.push(new Particle(this.x, this.y, TOWERS[this.type].accent, 2));
        }
    }

    draw(ctx) {
        const data = TOWERS[this.type];
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = data.color;
        ctx.strokeStyle = '#1c1108'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(-16, -16, 32, 32, 3); ctx.fill(); ctx.stroke();

        // Level pips
        ctx.fillStyle = data.accent;
        for (let i = 0; i <= this.level; i++) {
            ctx.beginPath(); ctx.arc(-10 + i * 10, 12, 2.5, 0, Math.PI * 2); ctx.fill();
        }

        ctx.rotate(this.angle);
        ctx.fillStyle = data.accent;
        if (this.type === 'archer') {
            ctx.fillRect(0, -3, 18, 6); ctx.fillStyle = '#1c1108'; ctx.fillRect(14, -5, 4, 10);
        } else if (this.type === 'mage') {
            ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(192,57,43,0.3)';
            ctx.beginPath(); ctx.arc(0, 0, 11 + this.level * 2, 0, Math.PI * 2); ctx.fill();
        } else if (this.type === 'frost') {
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(107,181,212,0.2)';
            ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
        } else if (this.type === 'cannon') {
            ctx.fillRect(-2, -5, 22, 10); ctx.fillStyle = '#1c1108'; ctx.fillRect(16, -7, 6, 14);
        } else if (this.type === 'poison') {
            ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(76,175,80,0.25)';
            ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
        } else if (this.type === 'holy') {
            ctx.fillRect(-2, -10, 4, 20); ctx.fillRect(-10, -2, 20, 4);
            ctx.fillStyle = 'rgba(255,215,0,0.2)';
            ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

// ══════════════════════════════════════════════
// ENEMY CLASS
// ══════════════════════════════════════════════
class Enemy {
    constructor(type, wave, game, pathIdx) {
        this.game = game;
        this.type = type;
        this.path = game.paths[pathIdx];
        this.pathIndex = 0;
        const d = ENEMIES[type];
        const scale = 1 + wave * 0.08;
        this.hp = Math.floor(d.hp * scale);
        this.maxHp = this.hp;
        this.baseSpeed = d.speed;
        this.speed = d.speed;
        this.reward = d.reward;
        this.size = d.size;
        this.color = d.color;
        this.name = d.name;
        this.armor = d.armor || 0;
        this.healRadius = d.healRadius || 0;
        this.healAmt = d.healAmt || 0;
        this.undead = d.undead || false;
        this.demon = d.demon || false;
        this.reachedEnd = false;
        this.slowTimer = 0;
        this.slowFactor = 1;
        this.dotTimer = 0;
        this.dotDmg = 0;

        const start = this.path[0];
        this.x = start.x * TILE + TILE / 2;
        this.y = start.y * TILE + TILE / 2;
    }

    update() {
        if (this.slowTimer > 0) { this.slowTimer--; this.speed = this.baseSpeed * this.slowFactor; }
        else { this.speed = this.baseSpeed; }

        // DOT tick
        if (this.dotTimer > 0) { this.dotTimer--; this.hp -= this.dotDmg / 60; }

        if (this.pathIndex >= this.path.length - 1) { this.reachedEnd = true; return; }

        const next = this.path[this.pathIndex + 1];
        const tx = next.x * TILE + TILE / 2, ty = next.y * TILE + TILE / 2;
        const dx = tx - this.x, dy = ty - this.y;
        const dist = Math.hypot(dx, dy);

        if (dist < this.speed + 1) this.pathIndex++;
        else { this.x += (dx / dist) * this.speed; this.y += (dy / dist) * this.speed; }
    }

    draw(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + this.size + 2, this.size * 0.8, this.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // DOT indicator
        if (this.dotTimer > 0) {
            ctx.strokeStyle = 'rgba(76,175,80,0.5)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size + 4, 0, Math.PI * 2); ctx.stroke();
        }

        ctx.fillStyle = this.slowTimer > 0 ? '#6bb5d4' : this.color;
        ctx.strokeStyle = '#1c1108'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.arc(this.x - 2, this.y - 2, this.size * 0.4, 0, Math.PI * 2); ctx.fill();

        // Eyes
        const eyeColor = (this.type === 'boss' || this.type === 'miniboss' || this.type.includes('lord') || this.type.includes('king') || this.type.includes('fiend') || this.type.includes('giant')) ? '#f0c75e' : '#c0392b';
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(this.x - this.size * 0.25, this.y - this.size * 0.2, 1.5, 0, Math.PI * 2);
        ctx.arc(this.x + this.size * 0.25, this.y - this.size * 0.2, 1.5, 0, Math.PI * 2);
        ctx.fill();

        if (this.armor > 0) {
            ctx.strokeStyle = '#8888aa'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size + 3, 0, Math.PI * 2); ctx.stroke();
        }
        if (this.healRadius > 0) {
            ctx.strokeStyle = 'rgba(76,175,80,0.3)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.healRadius, 0, Math.PI * 2); ctx.stroke();
        }

        // HP bar
        const barW = this.size * 2.5;
        const bx = this.x - barW / 2, by = this.y - this.size - 8;
        ctx.fillStyle = '#111'; ctx.fillRect(bx - 1, by - 1, barW + 2, 5);
        const ratio = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = ratio > 0.5 ? '#6b8e23' : (ratio > 0.25 ? '#d4a843' : '#c0392b');
        ctx.fillRect(bx, by, barW * ratio, 3);

        // Boss label
        if (ENEMIES[this.type] && (ENEMIES[this.type].hp >= 400)) {
            ctx.fillStyle = '#f0c75e'; ctx.font = 'bold 9px Cinzel'; ctx.textAlign = 'center';
            ctx.fillText(this.name, this.x, by - 4);
        }
    }
}

// ══════════════════════════════════════════════
// PROJECTILE
// ══════════════════════════════════════════════
class Projectile {
    constructor(x, y, target, tower) {
        this.x = x; this.y = y;
        this.target = target;
        this.tower = tower;
        this.game = tower.game;
        this.speed = 7;
        this.damage = tower.damage;
        this.splash = tower.splash;
        this.slow = tower.slow;
        this.slowDur = tower.slowDur;
        this.dot = tower.dot;
        this.dotDur = tower.dotDur;
        this.bonus = tower.bonus;
        this.color = TOWERS[tower.type].accent;
    }

    update() {
        if (this.target.hp <= 0 && !this.splash) return false;
        const dx = this.target.x - this.x, dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < this.speed + this.target.size) { this.hit(); return false; }
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
        return true;
    }

    hit() {
        let dmg = this.damage * (1 - (this.target.armor || 0));
        // Holy bonus vs undead/demon
        if (this.bonus > 0 && (this.target.undead || this.target.demon)) dmg *= this.bonus;
        this.target.hp -= dmg;

        if (this.splash > 0) {
            this.game.enemies.forEach(e => {
                if (e !== this.target && Math.hypot(e.x - this.x, e.y - this.y) < this.splash) {
                    e.hp -= dmg * 0.5;
                }
            });
            for (let i = 0; i < 8; i++) this.game.particles.push(new Particle(this.x, this.y, this.color, 5));
        }
        if (this.slow > 0) { this.target.slowTimer = this.slowDur; this.target.slowFactor = 1 - this.slow; }
        if (this.dot > 0) { this.target.dotTimer = this.dotDur; this.target.dotDmg = this.dot; }
        for (let i = 0; i < 4; i++) this.game.particles.push(new Particle(this.x, this.y, this.color, 2));
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color; ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.arc(this.x, this.y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ══════════════════════════════════════════════
// PARTICLE
// ══════════════════════════════════════════════
class Particle {
    constructor(x, y, color, size) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = (Math.random() - 0.5) * 3;
        this.color = color; this.size = size; this.life = 1;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life -= 0.03; this.size *= 0.97; return this.life > 0; }
    draw(ctx) {
        ctx.globalAlpha = this.life; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }
}

window.onload = () => new Game();
