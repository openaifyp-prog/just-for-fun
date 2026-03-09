class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.player = null;
        this.projectiles = [];
        this.enemies = [];
        this.particles = [];
        this.powerups = [];
        this.clouds = [];
        this.boss = null;
        this.score = 0;
        this.combo = 0;
        this.multiplier = 1;
        this.comboTimer = 0;
        this.bombs = 3;
        this.shake = 0;
        this.gameState = 'start';
        this.keys = {};
        this.spawnTimer = 0;
        this.parallax = [0, 0, 0];

        this.init();
    }

    init() {
        window.addEventListener('keydown', e => {
            this.keys[e.key] = true;
            if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Shift') e.preventDefault();
            if (e.key === 'Shift' && this.gameState === 'playing') this.triggerBomb();
        });
        window.addEventListener('keyup', e => this.keys[e.key] = false);
        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        });

        document.getElementById('start-btn').addEventListener('click', (e) => {
            e.target.blur();
            this.startGame();
        });
        document.getElementById('restart-btn').addEventListener('click', (e) => {
            e.target.blur();
            this.startGame();
        });

        for(let i=0; i<6; i++) {
            this.clouds.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 250 + 150,
                speed: Math.random() * 0.8 + 0.3
            });
        }

        this.animate();
    }

    triggerBomb() {
        if (this.bombs <= 0) return;
        this.bombs--;
        this.shake = 50;
        this.createExplosion(this.width/2, this.height/2, '#ffffff', 200);
        
        this.enemies.forEach(enemy => {
            this.score += enemy.points * this.multiplier;
            this.createExplosion(enemy.x, enemy.y, enemy.color);
        });
        this.enemies = [];
        if (this.boss) {
            this.boss.takeDamage(40);
            this.boss.flash = 15;
        }
        this.updateHUD();
    }

    startGame() {
        this.score = 0;
        this.combo = 0;
        this.multiplier = 1;
        this.bombs = 3;
        this.projectiles = [];
        this.enemies = [];
        this.particles = [];
        this.powerups = [];
        this.boss = null;
        this.player = new Player(this);
        this.gameState = 'playing';
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('game-over-screen').classList.remove('active');
        this.updateHUD();
    }

    updateHUD() {
        document.getElementById('score-value').textContent = Math.floor(this.score).toString().padStart(6, '0');
        document.getElementById('combo-multiplier').textContent = `x${this.multiplier}`;
        const comboEl = document.querySelector('.combo');
        if (this.comboTimer > 0) comboEl.classList.add('active');
        else comboEl.classList.remove('active');

        const bombIcons = document.querySelectorAll('.bomb-icon');
        bombIcons.forEach((icon, i) => {
            if (i < this.bombs) icon.classList.remove('depleted');
            else icon.classList.add('depleted');
        });

        if (this.player) {
            const healthPercent = (this.player.health / this.player.maxHealth) * 100;
            const healthBar = document.getElementById('health-bar');
            healthBar.style.width = `${healthPercent}%`;
            healthBar.style.backgroundColor = healthPercent < 35 ? '#ff3e3e' : '#00f2ff';
        }
    }

    animate(timeStamp = 0) {
        this.ctx.save();
        if (this.shake > 0) {
            this.ctx.translate(Math.random() * this.shake - this.shake/2, Math.random() * this.shake - this.shake/2);
            this.shake *= 0.94;
            if (this.shake < 0.1) this.shake = 0;
        }

        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawBackground();

        if (this.gameState === 'playing') {
            if (this.comboTimer > 0) {
                this.comboTimer--;
                if (this.comboTimer === 0) {
                    this.combo = 0;
                    this.multiplier = 1;
                }
            }

            this.player.update(this.keys);
            this.player.draw();

            this.projectiles.forEach((p, i) => {
                p.update();
                p.draw();
                if (p.y < -100 || p.y > this.height + 100) this.projectiles.splice(i, 1);
            });

            this.handleEnemies();

            if (this.boss) {
                this.boss.update();
                this.boss.draw();
                if (this.boss.destroyed) this.boss = null;
            }

            this.powerups.forEach((pu, i) => {
                pu.update();
                pu.draw();
                if (pu.y > this.height + 100) this.powerups.splice(i, 1);
            });

            this.particles.forEach((p, i) => {
                p.update();
                p.draw();
                if (p.alpha <= 0) this.particles.splice(i, 1);
            });

            this.checkCollisions();
            this.updateHUD();
        }

        this.ctx.restore();
        this.drawClouds();
        
        requestAnimationFrame(t => this.animate(t));
    }

    drawBackground() {
        this.ctx.fillStyle = '#040609';
        this.ctx.fillRect(0, 0, this.width, this.height);
        [0.3, 1.1, 2.4].forEach((speed, i) => {
            this.ctx.fillStyle = i === 2 ? 'rgba(0, 242, 255, 0.4)' : 'rgba(255, 255, 255, 0.12)';
            this.parallax[i] += speed;
            if (this.parallax[i] > this.height) this.parallax[i] = 0;
            for (let y = -1; y < 1; y++) {
                const yPos = this.parallax[i] + (y * this.height);
                for (let x = 0; x < 6; x++) {
                    this.ctx.beginPath();
                    this.ctx.arc((x * (this.width / 5)), yPos + (x * 70), 1, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        });
    }

    drawClouds() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        this.clouds.forEach(c => {
            c.y += c.speed;
            if (c.y > this.height + c.size) {
                c.y = -c.size;
                c.x = Math.random() * this.width;
            }
            this.ctx.beginPath();
            this.ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    handleEnemies() {
        if (this.boss) return;

        if (this.score >= 10000 && !this.boss) {
            this.boss = new Boss(this);
        }

        this.spawnTimer++;
        const spawnDelay = Math.max(8, 40 - Math.floor(this.score / 1400));
        if (this.spawnTimer > spawnDelay) {
            const rand = Math.random();
            let type = 'scout';
            if (this.score > 3500 && rand > 0.4) type = 'interceptor';
            if (this.score > 7000 && rand > 0.7) type = 'bomber';
            
            this.enemies.push(new Enemy(this, type));
            this.spawnTimer = 0;
            
            if (this.score > 10000 && Math.random() < 0.3) {
                this.enemies.push(new Enemy(this, 'scout'));
            }
        }

        this.enemies.forEach((enemy, i) => {
            enemy.update();
            enemy.draw();
            if (enemy.y > this.height + 100) this.enemies.splice(i, 1);
        });
    }

    addCombo() {
        this.combo++;
        this.comboTimer = 180;
        this.multiplier = Math.min(10, 1 + Math.floor(this.combo / 4));
    }

    checkCollisions() {
        this.enemies.forEach((enemy, ei) => {
            const dist = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
            if (dist < 45) {
                if (this.player.shield > 0) {
                    this.player.shield = 0;
                    this.shake = 15;
                } else {
                    this.player.health -= 40;
                    this.shake = 35;
                }
                this.createExplosion(enemy.x, enemy.y, enemy.color, 25);
                this.enemies.splice(ei, 1);
                if (this.player.health <= 0) this.gameOver();
            }

            this.projectiles.forEach((proj, pi) => {
                if (proj.isEnemy) return; 
                const distPE = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
                if (distPE < 40) {
                    enemy.health--;
                    enemy.flash = 4;
                    this.createExplosion(proj.x, proj.y, '#ffffff', 4);
                    this.projectiles.splice(pi, 1);
                    if (enemy.health <= 0) {
                        this.score += enemy.points * this.multiplier;
                        this.addCombo();
                        this.shake = enemy.type === 'bomber' ? 15 : 6;
                        this.createExplosion(enemy.x, enemy.y, enemy.color, 35);
                        if (Math.random() < 0.25) this.powerups.push(new PowerUp(enemy.x, enemy.y));
                        this.enemies.splice(ei, 1);
                    }
                }
            });
        });

        if (this.boss) {
            this.projectiles.forEach((proj, pi) => {
                if (proj.isEnemy) return;
                
                // Wings Hitboxes
                if (this.boss.wingLActive && Math.hypot(proj.x - (this.boss.x - 130), proj.y - (this.boss.y + 40)) < 70) {
                    this.boss.wingLHealth -= 1;
                    this.boss.flash = 3;
                    this.projectiles.splice(pi, 1);
                    this.createExplosion(proj.x, proj.y, '#999999', 3);
                    return;
                }
                if (this.boss.wingRActive && Math.hypot(proj.x - (this.boss.x + 130), proj.y - (this.boss.y + 40)) < 70) {
                    this.boss.wingRHealth -= 1;
                    this.boss.flash = 3;
                    this.projectiles.splice(pi, 1);
                    this.createExplosion(proj.x, proj.y, '#999999', 3);
                    return;
                }

                // Main Body Hitbox
                const distBody = Math.hypot(proj.x - this.boss.x, proj.y - this.boss.y);
                if (distBody < 120) {
                    this.boss.takeDamage(1);
                    this.boss.flash = 5;
                    this.projectiles.splice(pi, 1);
                    this.score += 25 * this.multiplier;
                }
            });
            const distPB = Math.hypot(this.player.x - this.boss.x, this.player.y - this.boss.y);
            if (distPB < 140) {
                this.player.health -= 2.5;
                if (this.player.health <= 0) this.gameOver();
            }
        }

        this.projectiles.forEach((proj, pi) => {
            if (!proj.isEnemy) return;
            const dist = Math.hypot(proj.x - this.player.x, proj.y - this.player.y);
            if (dist < 32) {
                if (this.player.shield > 0) {
                    this.player.shield = 0;
                    this.shake = 15;
                } else {
                    this.player.health -= 20;
                    this.shake = 20;
                }
                this.createExplosion(this.player.x, this.player.y, '#ff3e3e', 15);
                this.projectiles.splice(pi, 1);
                if (this.player.health <= 0) this.gameOver();
            }
        });

        this.powerups.forEach((pu, i) => {
            const dist = Math.hypot(this.player.x - pu.x, this.player.y - pu.y);
            if (dist < 45) {
                this.player.applyPowerup(pu.type);
                this.powerups.splice(i, 1);
                for(let s=0; s<25; s++) this.particles.push(new Particle(pu.x, pu.y, pu.color, 4));
            }
        });
    }

    createExplosion(x, y, color, count = 25) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    gameOver() {
        if (this.gameState === 'gameOver') return;
        this.gameState = 'gameOver';
        document.getElementById('final-score').textContent = Math.floor(this.score);
        document.getElementById('game-over-screen').classList.add('active');
    }
}

class Player {
    constructor(game) {
        this.game = game;
        this.x = game.width / 2;
        this.y = game.height - 150;
        this.vX = 0;
        this.vY = 0;
        this.speed = 0.75;
        this.friction = 0.91;
        this.health = 100;
        this.maxHealth = 100;
        this.shootTimer = 0;
        this.shield = 0;
        this.powerups = { rapidFire: 0, tripleShot: 0 };
    }

    applyPowerup(type) {
        if (type === 'health') this.health = Math.min(this.maxHealth, this.health + 50);
        else if (type === 'rapidFire') this.powerups.rapidFire = 600;
        else if (type === 'tripleShot') this.powerups.tripleShot = 600;
        else if (type === 'shield') this.shield = 600;
    }

    update(keys) {
        if (keys['w'] || keys['ArrowUp']) this.vY -= this.speed;
        if (keys['s'] || keys['ArrowDown']) this.vY += this.speed;
        if (keys['a'] || keys['ArrowLeft']) this.vX -= this.speed;
        if (keys['d'] || keys['ArrowRight']) this.vX += this.speed;

        this.vX *= this.friction;
        this.vY *= this.friction;
        this.x += this.vX;
        this.y += this.vY;

        this.x = Math.max(30, Math.min(this.x, this.game.width - 30));
        this.y = Math.max(30, Math.min(this.y, this.game.height - 30));

        if (Math.abs(this.vX) > 0.4 || Math.abs(this.vY) > 0.4) {
            this.game.particles.push(new Particle(this.x, this.y + 20, 'rgba(0, 242, 255, 0.5)', 2, 0.04));
        }

        if (this.powerups.rapidFire > 0) this.powerups.rapidFire--;
        if (this.powerups.tripleShot > 0) this.powerups.tripleShot--;
        if (this.shield > 0) this.shield--;

        this.shootTimer++;
        const rate = this.powerups.rapidFire > 0 ? 3 : 7;
        if (keys[' '] && this.shootTimer > rate) {
            if (this.powerups.tripleShot > 0) {
                this.game.projectiles.push(new Projectile(this.x, this.y - 40));
                this.game.projectiles.push(new Projectile(this.x - 25, this.y - 15, -3));
                this.game.projectiles.push(new Projectile(this.x + 25, this.y - 15, 3));
            } else {
                this.game.projectiles.push(new Projectile(this.x, this.y - 40));
            }
            this.shootTimer = 0;
        }
    }

    draw() {
        const ctx = this.game.ctx;
        ctx.save();
        ctx.translate(this.x, this.y);
        
        if (this.shield > 0) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 4;
            ctx.setLineDash([15, 7]);
            ctx.beginPath();
            ctx.arc(0, 0, 60, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
            ctx.fill();
            ctx.lineWidth = 1; ctx.setLineDash([]);
        }

        const playerGrad = ctx.createLinearGradient(0, -40, 0, 25);
        playerGrad.addColorStop(0, '#a2d2ff');
        playerGrad.addColorStop(1, '#004daa');
        ctx.fillStyle = playerGrad;
        
        ctx.beginPath();
        ctx.moveTo(0, -42);
        ctx.lineTo(-32, 25);
        ctx.lineTo(0, 12);
        ctx.lineTo(32, 25);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#00f2ff';
        ctx.beginPath();
        ctx.ellipse(0, -8, 7, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 150, 0, ' + (Math.random() * 0.7 + 0.3) + ')';
        ctx.beginPath();
        ctx.arc(0, 22, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Enemy {
    constructor(game, type) {
        this.game = game;
        this.type = type;
        this.x = Math.random() * (game.width - 200) + 100;
        this.y = -100;
        this.angle = 0;
        this.flash = 0;

        switch(type) {
            case 'bomber': this.speed = 1.9; this.health = 8; this.points = 800; this.color = '#ff9900'; break;
            case 'interceptor': this.speed = 4.2; this.health = 1; this.points = 500; this.color = '#ff00ff'; break;
            default: this.speed = 4.8; this.health = 1; this.points = 250; this.color = '#ff3e3e';
        }
    }

    update() {
        this.y += this.speed;
        if (this.type === 'interceptor') { this.angle += 0.08; this.x += Math.sin(this.angle) * 10; }
        if (this.flash > 0) this.flash--;
    }

    draw() {
        const ctx = this.game.ctx;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = this.flash > 0 ? '#ffffff' : this.color;

        if (this.type === 'bomber') {
            ctx.roundRect(-45, -25, 90, 32, 5);
            ctx.fill();
            ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(-40, -20); ctx.lineTo(40, -20); ctx.fill();
        } else {
            ctx.beginPath(); ctx.moveTo(0, 42); ctx.lineTo(-25, -25); ctx.lineTo(0, -12); ctx.lineTo(25, -25); ctx.closePath(); ctx.fill();
        }

        ctx.fillStyle = this.flash > 0 ? '#ffffff' : 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath(); ctx.arc(0, 2, 7, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

class Boss {
    constructor(game) {
        this.game = game;
        this.x = game.width / 2;
        this.y = -500;
        this.health = 250;
        this.maxHealth = 250;
        this.wingLHealth = 60;
        this.wingRHealth = 60;
        this.wingLActive = true;
        this.wingRActive = true;
        this.targetY = 220;
        this.flash = 0;
        this.destroyed = false;
        this.timer = 0;
        this.ringAngle1 = 0;
        this.ringAngle2 = 0;
        this.angle = 0;
    }

    takeDamage(amount) {
        this.health -= amount;
        this.flash = 8;
        this.game.shake = Math.min(20, this.game.shake + amount/2);
    }

    update() {
        this.timer++;
        this.ringAngle1 += 0.05;
        this.ringAngle2 -= 0.07;
        
        if (this.y < this.targetY) this.y += 2.5;
        else {
            this.angle += 0.015;
            this.x = (this.game.width / 2) + Math.sin(this.angle) * (this.game.width / 3.5);
        }
        
        if (this.flash > 0) this.flash--;
        
        if (this.wingLActive && this.wingLHealth <= 0) {
            this.wingLActive = false;
            this.game.createExplosion(this.x - 130, this.y + 40, '#444444', 60);
            this.game.shake = 40;
        }
        if (this.wingRActive && this.wingRHealth <= 0) {
            this.wingRActive = false;
            this.game.createExplosion(this.x + 130, this.y + 40, '#444444', 60);
            this.game.shake = 40;
        }

        const fireRate = this.health < this.maxHealth * 0.4 ? 20 : 40;
        if (this.timer % fireRate === 0) {
            const count = this.health < this.maxHealth * 0.4 ? 10 : 6;
            for(let i=0; i<count; i++) {
                const spread = (i - (count-1)/2) * 1.8;
                this.game.projectiles.push(new Projectile(this.x + spread*25, this.y + 100, spread, true));
            }
        }
        
        if (this.timer % 120 === 0) {
            const dx = this.game.player.x - this.x;
            const dy = this.game.player.y - this.y;
            const angle = Math.atan2(dy, dx);
            this.game.projectiles.push(new Projectile(this.x, this.y + 110, Math.cos(angle) * 6, true));
        }

        if (this.health < this.maxHealth * 0.5 && this.timer % 8 === 0) {
            this.game.particles.push(new Particle(this.x + (Math.random()-0.5)*200, this.y + (Math.random()-0.5)*100, '#333333', 4, 0.01));
            if (this.health < this.maxHealth * 0.25) {
                this.game.particles.push(new Particle(this.x + (Math.random()-0.5)*120, this.y + (Math.random()-0.5)*60, '#ff6600', 3, 0.04));
            }
        }

        if (this.health <= 0) {
            this.game.createExplosion(this.x, this.y, '#ffffff', 250);
            this.game.createExplosion(this.x, this.y, '#00f2ff', 150);
            this.game.createExplosion(this.x, this.y, '#ff0000', 100);
            this.game.score += 15000 * this.game.multiplier;
            this.game.shake = 100;
            this.destroyed = true;
        }
    }

    draw() {
        const ctx = this.game.ctx;
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Jet-Style Fuselage
        const fuseGrad = ctx.createLinearGradient(0, -100, 0, 100);
        fuseGrad.addColorStop(0, '#2a2a2a');
        fuseGrad.addColorStop(0.5, '#4a4a4a');
        fuseGrad.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = this.flash > 0 ? '#ffffff' : fuseGrad;
        
        ctx.beginPath();
        ctx.moveTo(0, 180); // Pointed Nose
        ctx.lineTo(-60, 40);
        ctx.lineTo(-60, -100); // Widening
        ctx.lineTo(60, -100);
        ctx.lineTo(60, 40);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#666666'; ctx.lineWidth = 3; ctx.stroke();

        // Cockpit Canopy
        ctx.fillStyle = 'rgba(0, 242, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 100, 25, 45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00f2ff'; ctx.lineWidth = 2; ctx.stroke();
        
        // Wings (Interceptor Style)
        if (this.wingLActive) {
            ctx.fillStyle = this.flash > 0 ? '#ffffff' : '#3a3a3a';
            ctx.beginPath();
            ctx.moveTo(-60, 40);
            ctx.lineTo(-240, -20); // Swept back
            ctx.lineTo(-240, -80);
            ctx.lineTo(-60, -60);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            
            // Jet Engine L
            ctx.fillStyle = 'rgba(0, 242, 255, ' + (Math.random() * 0.4 + 0.6) + ')';
            ctx.beginPath(); ctx.ellipse(-140, -85, 20, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 20; ctx.shadowColor = '#00f2ff';
            ctx.fillRect(-150, -105, 20, 20); ctx.shadowBlur = 0;
        }
        if (this.wingRActive) {
            ctx.fillStyle = this.flash > 0 ? '#ffffff' : '#3a3a3a';
            ctx.beginPath();
            ctx.moveTo(60, 40);
            ctx.lineTo(240, -20);
            ctx.lineTo(240, -80);
            ctx.lineTo(60, -60);
            ctx.closePath(); ctx.fill(); ctx.stroke();

            // Jet Engine R
            ctx.fillStyle = 'rgba(0, 242, 255, ' + (Math.random() * 0.4 + 0.6) + ')';
            ctx.beginPath(); ctx.ellipse(140, -85, 20, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 20; ctx.shadowColor = '#00f2ff';
            ctx.fillRect(130, -105, 20, 20); ctx.shadowBlur = 0;
        }

        // Tail Stabilizers
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.moveTo(-40, -100); ctx.lineTo(-80, -150); ctx.lineTo(-20, -100); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(40, -100); ctx.lineTo(80, -150); ctx.lineTo(20, -100); ctx.closePath(); ctx.fill(); ctx.stroke();

        // Main Plasma Engines (Rear)
        ctx.fillStyle = 'rgba(0, 242, 255, ' + (Math.random() * 0.5 + 0.5) + ')';
        ctx.shadowBlur = 30; ctx.shadowColor = '#00f2ff';
        ctx.beginPath(); ctx.arc(-30, -100, 25, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(30, -100, 25, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Rotating Tech Core (Integrated)
        ctx.save();
        ctx.translate(0, -10);
        ctx.rotate(this.ringAngle1);
        ctx.strokeStyle = '#ff3e3e'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(0, 0, 60, 20, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        
        ctx.save();
        ctx.translate(0, -10);
        ctx.rotate(this.ringAngle2);
        ctx.strokeStyle = '#ffff00';
        ctx.beginPath(); ctx.ellipse(0, 0, 80, 25, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // BOSS UI
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(-150, -180, 300, 15);
        const hpPerc = Math.max(0, this.health / this.maxHealth);
        const barGrad = ctx.createLinearGradient(-150, 0, 150, 0);
        barGrad.addColorStop(0, '#770000');
        barGrad.addColorStop(1, '#ff0000');
        ctx.fillStyle = barGrad;
        ctx.fillRect(-150, -180, 300 * hpPerc, 15);
        ctx.strokeStyle = 'white'; ctx.strokeRect(-150, -180, 300, 15);
        
        ctx.restore();
    }
}

class PowerUp {
    constructor(x, y) {
        this.x = x; this.y = y; this.speed = 2.2;
        this.timer = 0;
        const types = ['health', 'rapidFire', 'tripleShot', 'shield'];
        this.type = types[Math.floor(Math.random() * types.length)];
        this.color = this.type === 'health' ? '#00ff55' : (this.type === 'rapidFire' ? '#00f2ff' : (this.type === 'shield' ? '#ffff00' : '#ff00ff'));
    }
    update() { this.y += this.speed; this.timer++; }
    draw() {
        const ctx = document.getElementById('gameCanvas').getContext('2d');
        ctx.save(); ctx.translate(this.x, this.y);
        
        const pulse = Math.sin(this.timer * 0.15) * 8 + 18;
        ctx.shadowBlur = pulse; ctx.shadowColor = this.color; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
        
        ctx.strokeStyle = 'white'; ctx.lineWidth = 3; ctx.stroke();
        
        ctx.fillStyle = 'black'; ctx.font = 'bold 18px Orbitron'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const icon = this.type === 'health' ? '+' : (this.type === 'rapidFire' ? 'R' : (this.type === 'shield' ? 'S' : 'T'));
        ctx.fillText(icon, 0, 0);
        ctx.restore();
    }
}

class Projectile {
    constructor(x, y, vX = 0, isEnemy = false) {
        this.x = x; this.y = y; this.vX = vX; this.isEnemy = isEnemy;
        this.speed = isEnemy ? 8.5 : -28;
    }
    update() { this.y += this.speed; this.x += this.vX; }
    draw() {
        const ctx = document.getElementById('gameCanvas').getContext('2d');
        if (this.isEnemy) {
            ctx.fillStyle = '#ff3e3e';
            ctx.shadowBlur = 15; ctx.shadowColor = '#ff3e3e';
            ctx.fillRect(this.x - 3, this.y, 6, 35);
        } else {
            ctx.fillStyle = '#f0faff';
            ctx.shadowBlur = 20; ctx.shadowColor = '#00f2ff';
            ctx.fillRect(this.x - 2, this.y, 4, 30);
        }
        ctx.shadowBlur = 0;
    }
}

class Particle {
    constructor(x, y, color, size = 2, decay = 0.02) {
        this.x = x; this.y = y; this.color = color;
        this.vX = (Math.random() - 0.5) * 12; this.vY = (Math.random() - 0.5) * 12;
        this.alpha = 1; this.decay = Math.random() * 0.03 + decay; this.size = size;
    }
    update() { this.x += this.vX; this.y += this.vY; this.alpha -= this.decay; }
    draw() {
        const ctx = document.getElementById('gameCanvas').getContext('2d');
        ctx.globalAlpha = Math.max(0, this.alpha); ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    }
}

window.onload = () => new Game();
